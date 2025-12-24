import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as bs58 from 'bs58';
import 'dotenv/config';

function parsePrivateKey(privateKey: string): Keypair {
  if (privateKey.startsWith('[')) {
    const parsed = JSON.parse(privateKey);
    return Keypair.fromSecretKey(Uint8Array.from(parsed));
  }
  return Keypair.fromSecretKey(bs58.decode(privateKey));
}

async function listTokensAdvanced() {
  try {
    console.log('🔍 Listando tokens da carteira (modo avançado)...\n');

    const rpcUrl = 'https://solana-mainnet.g.alchemy.com/v2/kU1OgkqX3WhMTUzHhjMNDSGLiE_xVrK5';
    console.log(`🌐 Usando RPC: Alchemy\n`);
    const connection = new Connection(rpcUrl, 'confirmed');

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY não encontrada no .env');
    }

    const wallet = parsePrivateKey(privateKey);
    console.log('💼 Wallet:', wallet.publicKey.toString());
    console.log('');

    const solBalance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Saldo SOL: ${(solBalance / 1e9).toFixed(6)} SOL`);
    console.log('');

    // Buscar usando método 1: Token Program (regular)
    console.log('🔎 Método 1: Token Program (SPL Token)');
    const tokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const tokenAccounts1 = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: tokenProgramId }
    );
    console.log(`   Encontrados: ${tokenAccounts1.value.length} accounts\n`);

    // Buscar usando método 2: Token-2022 Program
    console.log('🔎 Método 2: Token-2022 Program');
    const token2022ProgramId = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    let tokenAccounts2 = { value: [] as any[] };
    try {
      tokenAccounts2 = await connection.getParsedTokenAccountsByOwner(
        wallet.publicKey,
        { programId: token2022ProgramId }
      );
      console.log(`   Encontrados: ${tokenAccounts2.value.length} accounts\n`);
    } catch (e) {
      console.log('   Token-2022 não disponível ou erro\n');
    }

    // Combinar todos os accounts
    const allAccounts = [...tokenAccounts1.value, ...tokenAccounts2.value];

    console.log(`📊 Total combinado: ${allAccounts.length} token accounts\n`);

    if (allAccounts.length === 0) {
      console.log('❌ Nenhum token encontrado');
      return;
    }

    const tokensWithBalance: any[] = [];
    const tokensZeroBalance: any[] = [];

    for (const { account } of allAccounts) {
      const parsedInfo = account.data.parsed.info;
      const mint = parsedInfo.mint;
      const amount = parsedInfo.tokenAmount.amount;
      const decimals = parsedInfo.tokenAmount.decimals;
      const uiAmount = parsedInfo.tokenAmount.uiAmountString || '0';

      const tokenInfo = { mint, amount, decimals, uiAmount };

      if (BigInt(amount) > 0n) {
        tokensWithBalance.push(tokenInfo);
      } else {
        tokensZeroBalance.push(tokenInfo);
      }
    }

    console.log(`✅ Com saldo: ${tokensWithBalance.length}`);
    console.log(`⚪ Sem saldo (vendidos/vazios): ${tokensZeroBalance.length}\n`);

    if (tokensWithBalance.length > 0) {
      console.log('═══════════════════════════════════════════════════════════════════════');
      console.log('                        TOKENS COM SALDO                                ');
      console.log('═══════════════════════════════════════════════════════════════════════');
      console.log('');

      for (let i = 0; i < tokensWithBalance.length; i++) {
        const token = tokensWithBalance[i];
        console.log(`${i + 1}. Mint: ${token.mint}`);
        console.log(`   Amount: ${token.uiAmount}`);
        console.log(`   Decimals: ${token.decimals}`);
        console.log('');
      }
    }

    if (tokensZeroBalance.length > 0) {
      console.log('═══════════════════════════════════════════════════════════════════════');
      console.log('                    TOKENS VAZIOS (JÁ VENDIDOS)                        ');
      console.log('═══════════════════════════════════════════════════════════════════════');
      console.log('');

      for (let i = 0; i < Math.min(5, tokensZeroBalance.length); i++) {
        const token = tokensZeroBalance[i];
        console.log(`${i + 1}. Mint: ${token.mint}`);
        console.log(`   (Saldo zerado - possivelmente já vendido)\n`);
      }

      if (tokensZeroBalance.length > 5) {
        console.log(`   ... e mais ${tokensZeroBalance.length - 5} tokens vazios\n`);
      }
    }

    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('\n💡 Observação:');
    console.log('   - O Solscan mostra histórico de TODOS os token accounts criados');
    console.log('   - A RPC só retorna accounts que ainda existem na blockchain');
    console.log('   - Accounts vazios podem ser "fechados" para recuperar rent');
    console.log('   - Por isso a diferença entre Solscan (12) e RPC (2)\n');

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

listTokensAdvanced();
