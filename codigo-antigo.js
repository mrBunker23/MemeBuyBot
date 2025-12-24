cd ~/tokenfinder-bot

cat > bot.js <<'JS'
import 'dotenv/config';
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import fs from 'fs';
import bs58 from 'bs58';
import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

// ============================
// CONFIG
// ============================
const SITE_URL = 'https://gangue.macaco.club/ferramentas/tokenfinder/';
const BASE_URL = 'https://gangue.macaco.club/';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const JUP_API_KEY = process.env.JUP_API_KEY;
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

const AMOUNT_SOL = Number(process.env.AMOUNT_SOL || '0.10');
const SLIPPAGE_BPS = Number(process.env.SLIPPAGE_BPS || '300');

const CHECK_INTERVAL_MS = Number(process.env.CHECK_INTERVAL_MS || '2000');     // 2s
const PRICE_CHECK_SECONDS = Number(process.env.PRICE_CHECK_SECONDS || '10');  // 10s

const HEADLESS = (process.env.HEADLESS || 'true').toLowerCase() === 'true';

const STATE_FILE = './state.json';

if (!PRIVATE_KEY) throw new Error('Faltou PRIVATE_KEY no .env');
if (!JUP_API_KEY) throw new Error('Faltou JUP_API_KEY no .env');

const connection = new Connection(RPC_URL, 'confirmed');
const wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

console.log('🔥 Wallet:', wallet.publicKey.toString());
console.log('🎯 Compra por token:', AMOUNT_SOL, 'SOL');
console.log('⚙️ Slippage:', SLIPPAGE_BPS, 'bps');
console.log('⏱️ Leitura do site:', CHECK_INTERVAL_MS, 'ms');
console.log('📉 Check de preço:', PRICE_CHECK_SECONDS, 's');
console.log('🧠 Headless:', HEADLESS);

// +100% = 2x, +400% = 5x, +900% = 10x, +1900% = 20x
const STAGES = [
  { name: 'tp1', multiple: 2,  sellType: 'half' },
  { name: 'tp2', multiple: 5,  sellType: 'half' },
  { name: 'tp3', multiple: 10, sellType: 'half' },
  { name: 'tp4', multiple: 20, sellType: 'all'  },
];

// ============================
// STATE
// ============================
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { seen: {}, positions: {} }; }
}
function saveState(st) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 2));
}
const state = loadState();
const nowISO = () => new Date().toISOString();

// ============================
// SESSION INJECT (cookies.json + storage.json optional)
// ============================
function readJson(path, fallback) {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); } catch { return fallback; }
}

async function injectSession(page) {
  const cookies = readJson('./cookies.json', []);
  const storage = readJson('./storage.json', {});

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  if (Array.isArray(cookies) && cookies.length) {
    const normalized = cookies.map(c => ({
      url: BASE_URL,
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
      httpOnly: !!c.httpOnly,
      secure: !!c.secure,
    }));
    await page.setCookie(...normalized);
  }

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((storageObj) => {
    if (!storageObj) return;
    for (const [k, v] of Object.entries(storageObj)) {
      try { localStorage.setItem(k, String(v)); } catch {}
    }
  }, storage);

  await page.goto(SITE_URL, { waitUntil: 'networkidle2' });
}

// ============================
// JUP PRICE (USD)
// ============================
async function getJupUsdPrice(mint) {
  const url = `https://price.jup.ag/v6/price?ids=${mint}`;
  const r = await fetch(url);
  const j = await r.json();
  const p = j?.data?.[mint]?.price;
  return (typeof p === 'number' && p > 0) ? p : null;
}

// ============================
// TOKEN BALANCE (base units)
// ============================
async function getTokenBalanceBaseUnits(mint) {
  const mintPk = new PublicKey(mint);
  const ata = await getAssociatedTokenAddress(mintPk, wallet.publicKey);
  const info = await connection.getTokenAccountBalance(ata).catch(() => null);
  if (!info?.value) return { ata: ata.toString(), amount: 0n, decimals: 0 };
  return { ata: ata.toString(), amount: BigInt(info.value.amount), decimals: info.value.decimals };
}

// ============================
// ULTRA: ORDER -> (EITHER) TX DIRECT OR EXECUTE -> TX
// ============================

async function signAndSendBase64Tx(txB64) {
  const tx = VersionedTransaction.deserialize(Buffer.from(txB64, 'base64'));
  tx.sign([wallet]);
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  return sig;
}

/**
 * Ultra order:
 * - Some responses include { tx: base64 } or { transaction: base64 } (manual mode) => sign & send directly.
 * - Some include { order: { requestId } } (or { requestId }) => call /execute to get { tx }.
 */
async function ultraBuyOrSell({ inputMint, outputMint, amountInt }) {
  const orderUrl =
    `https://api.jup.ag/ultra/v1/order` +
    `?inputMint=${inputMint}` +
    `&outputMint=${outputMint}` +
    `&amount=${amountInt}` +
    `&slippageBps=${SLIPPAGE_BPS}` +
    `&taker=${wallet.publicKey}`;

  const orderRes = await fetch(orderUrl, { headers: { 'x-api-key': JUP_API_KEY } });
  const orderJson = await orderRes.json();

  // ✅ DIRECT TX PATH (manual/order returns transaction)
  const directTx = orderJson?.tx || orderJson?.transaction;
  if (directTx) {
    const sig = await signAndSendBase64Tx(directTx);
    return { ok: true, signature: sig, mode: 'direct_tx', raw: orderJson };
  }

  // ✅ REQUEST ID PATH (execute needed)
  const requestId = orderJson?.order?.requestId || orderJson?.requestId;
  if (!requestId) {
    console.log('❌ ORDER sem tx e sem requestId:', JSON.stringify(orderJson));
    return { ok: false, step: 'order', raw: orderJson };
  }

  const execRes = await fetch('https://api.jup.ag/ultra/v1/execute', {
    method: 'POST',
    headers: { 'x-api-key': JUP_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, taker: String(wallet.publicKey) })
  });

  const execJson = await execRes.json();
  if (!execJson?.tx) {
    console.log('❌ EXECUTE falhou:', JSON.stringify(execJson));
    return { ok: false, step: 'execute', raw: execJson };
  }

  const sig = await signAndSendBase64Tx(execJson.tx);
  return { ok: true, signature: sig, mode: 'execute_tx', requestId, raw: execJson };
}

async function buyToken(mint) {
  const lamports = BigInt(Math.floor(AMOUNT_SOL * 1e9));
  console.log(`🟢 BUY ${mint} | ${AMOUNT_SOL} SOL`);
  const r = await ultraBuyOrSell({ inputMint: SOL_MINT, outputMint: mint, amountInt: lamports.toString() });
  if (!r.ok) { console.log('❌ BUY falhou'); return false; }
  console.log(`✅ BUY OK (${r.mode}) | sig:`, r.signature);
  return true;
}

async function sellToken(mint, amountBaseUnits) {
  if (amountBaseUnits <= 0n) return false;
  console.log(`🔴 SELL ${mint} | baseUnits=${amountBaseUnits.toString()}`);
  const r = await ultraBuyOrSell({ inputMint: mint, outputMint: SOL_MINT, amountInt: amountBaseUnits.toString() });
  if (!r.ok) { console.log('❌ SELL falhou'); return false; }
  console.log(`✅ SELL OK (${r.mode}) | sig:`, r.signature);
  return true;
}

// ============================
// TP MONITOR
// ============================
async function monitorPosition(mint) {
  const pos = state.positions[mint];
  if (!pos) return;

  if (!pos.entryUsd) {
    for (let i = 0; i < 20; i++) {
      const p = await getJupUsdPrice(mint);
      if (p) { pos.entryUsd = p; saveState(state); break; }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  while (true) {
    if (pos.sold?.tp4) return;

    const cur = await getJupUsdPrice(mint);
    if (!cur || !pos.entryUsd) {
      await new Promise(r => setTimeout(r, PRICE_CHECK_SECONDS * 1000));
      continue;
    }

    const multiple = cur / pos.entryUsd;

    for (const stage of STAGES) {
      pos.sold = pos.sold || {};
      if (pos.sold[stage.name]) continue;

      if (multiple >= stage.multiple) {
        const bal = await getTokenBalanceBaseUnits(mint);

        if (bal.amount <= 0n) {
          console.log(`⚠️ Sem saldo em ${mint} no ${stage.name}. Marcando como executado.`);
          pos.sold[stage.name] = true;
          saveState(state);
          continue;
        }

        let sellAmount;
        if (stage.sellType === 'all') {
          sellAmount = bal.amount;
        } else {
          sellAmount = bal.amount / 2n;
          if (sellAmount <= 0n) sellAmount = bal.amount;
        }

        console.log(`📈 ${mint} atingiu ${stage.name} | ${multiple.toFixed(2)}x | vendendo ${sellAmount.toString()} baseUnits`);
        const ok = await sellToken(mint, sellAmount);
        if (ok) {
          pos.sold[stage.name] = true;
          saveState(state);
        }
      }
    }

    await new Promise(r => setTimeout(r, PRICE_CHECK_SECONDS * 1000));
  }
}

// ============================
// SCRAPE DOM
// ============================
async function extractTokensFromPage(page) {
  return await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    return rows.map(row => {
      const tds = row.querySelectorAll('td');
      return {
        ticker: tds[0]?.innerText?.trim() || '',
        mint: tds[1]?.innerText?.trim() || '',
        score: tds[2]?.innerText?.trim() || ''
      };
    });
  });
}

// ============================
// MAIN
// ============================
async function main() {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('🔐 Aplicando sessão (cookies/localStorage)...');
  await injectSession(page);

  const hasTable = await page.evaluate(() => !!document.querySelector('table'));
  if (!hasTable) {
    console.log('❌ Não achei a tabela. Cookie de sessão expirou ou faltam cookies extras do domínio.');
    process.exit(1);
  }

  console.log('✅ Logado e lendo tokens!');

  for (const mint of Object.keys(state.positions)) {
    console.log('♻️ Retomando monitor:', mint);
    monitorPosition(mint).catch(e => console.log('monitor error', mint, e.message));
  }

  setInterval(async () => {
    try {
      const list = await extractTokensFromPage(page);

      for (const item of list) {
        const mint = item.mint;

        if (!mint || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) continue;
        if (state.seen[mint]) continue;

        console.log(`\n🆕 NOVO TOKEN: ${item.ticker} | ${mint} | score=${item.score}`);

        state.seen[mint] = true;
        saveState(state);

        const bought = await buyToken(mint);
        if (!bought) continue;

        let entryUsd = null;
        for (let i = 0; i < 15; i++) {
          entryUsd = await getJupUsdPrice(mint);
          if (entryUsd) break;
          await new Promise(r => setTimeout(r, 2000));
        }

        state.positions[mint] = {
          entryUsd: entryUsd || null,
          createdAt: nowISO(),
          sold: { tp1: false, tp2: false, tp3: false, tp4: false }
        };
        saveState(state);

        console.log('📌 Entrada USD:', state.positions[mint].entryUsd);

        monitorPosition(mint).catch(e => console.log('monitor error', mint, e.message));
      }
    } catch (e) {
      console.log('❌ Loop erro:', e.message);
    }
  }, CHECK_INTERVAL_MS);
}

main().catch(e => {
  console.error('❌ FATAL:', e);
  process.exit(1);
});
JS
