import { config } from '../config';
import { solanaService } from './solana.service';
import { logger } from '../utils/logger';
import { jupiterRateLimiter } from '../utils/rate-limiter';
import { statusMonitor } from '../utils/status-monitor';
import type { UltraOrderParams, UltraOrderResponse, JupiterPriceResponse } from '../types';

class JupiterService {
  private async fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        });
        return response;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('Max retries reached');
  }

  async getUsdPrice(mint: string): Promise<number | null> {
    return jupiterRateLimiter.execute(async () => {
      try {
        // API V3: https://api.jup.ag/price/v3?ids=MINT
        const url = `https://api.jup.ag/price/v3?ids=${mint}`;
        const response = await fetch(url, {
          headers: {
            'x-api-key': config.jupApiKey,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error(
            `API Jupiter V3 retornou HTTP ${response.status}`,
            { code: response.statusText, body: errorText }
          );
          statusMonitor.updatePrice(mint, mint.substring(0, 6), null);
          return null;
        }

        const json = (await response.json()) as JupiterPriceResponse;

        // API V3 retorna: { "MINT": { "usdPrice": 123.45 } }
        const tokenData = json[mint];
        const price = tokenData?.usdPrice;
        const result = typeof price === 'number' && price > 0 ? price : null;

        if (result === null && json) {
          logger.warn(`Preço não encontrado para ${mint.substring(0, 8)}... | Resposta: ${JSON.stringify(json)}`);
        }

        // Atualizar status monitor
        statusMonitor.updatePrice(mint, mint.substring(0, 6), result);

        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Falha ao obter preço Jupiter V3: ${errorMsg}`, error);
        statusMonitor.updatePrice(mint, mint.substring(0, 6), null);
        return null;
      }
    });
  }

  async executeTrade(params: UltraOrderParams): Promise<UltraOrderResponse> {
    return jupiterRateLimiter.execute(async () => {
      try {
        const orderUrl =
          `https://api.jup.ag/ultra/v1/order` +
          `?inputMint=${params.inputMint}` +
          `&outputMint=${params.outputMint}` +
          `&amount=${params.amountInt}` +
          `&slippageBps=${config.slippageBps}` +
          `&taker=${solanaService.wallet.publicKey}`;

        const orderRes = await fetch(orderUrl, {
          headers: { 'x-api-key': config.jupApiKey },
        });

        if (!orderRes.ok) {
          const errorText = await orderRes.text();
          logger.error(
            `API Jupiter Ultra retornou HTTP ${orderRes.status}`,
            { code: orderRes.statusText, body: errorText }
          );
          return { ok: false, step: 'order_http', raw: errorText };
        }

        const orderJson = await orderRes.json();

        // DIRECT TX PATH
        const directTx = orderJson?.tx || orderJson?.transaction;
        if (directTx) {
          const sig = await solanaService.signAndSendTransaction(directTx);
          return { ok: true, signature: sig, mode: 'direct_tx', raw: orderJson };
        }

        // REQUEST ID PATH
        const requestId = orderJson?.order?.requestId || orderJson?.requestId;
        if (!requestId) {
          logger.error('ORDER sem tx e sem requestId');
          return { ok: false, step: 'order', raw: orderJson };
        }

        const execRes = await fetch('https://api.jup.ag/ultra/v1/execute', {
          method: 'POST',
          headers: {
            'x-api-key': config.jupApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId,
            taker: String(solanaService.wallet.publicKey),
          }),
        });

        const execJson = await execRes.json();
        if (!execJson?.tx) {
          logger.error('EXECUTE falhou');
          return { ok: false, step: 'execute', raw: execJson };
        }

        const sig = await solanaService.signAndSendTransaction(execJson.tx);
        return {
          ok: true,
          signature: sig,
          mode: 'execute_tx',
          requestId,
          raw: execJson,
        };
      } catch (error) {
        logger.error('Erro ao executar trade', error);
        return { ok: false, step: 'error', raw: error };
      }
    });
  }
}

export const jupiterService = new JupiterService();
