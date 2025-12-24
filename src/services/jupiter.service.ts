import { config } from '../config';
import { solanaService } from './solana.service';
import { logger } from '../utils/logger';
import { jupiterRateLimiter } from '../utils/rate-limiter';
import { statusMonitor } from '../utils/status-monitor';
import type { UltraOrderParams, UltraOrderResponse, JupiterPriceResponse } from '../types';

class JupiterService {
  private apiKeyIndex: number = 0;
  private readonly apiKeys: string[] = config.jupApiKeys;
  private validKeysCount: number = 0;

  constructor() {
    this.validateApiKeys();
  }

  // Retorna número de keys válidas
  getValidKeysCount(): number {
    return this.validKeysCount;
  }

  // Calcula intervalo ideal baseado no número de keys válidas
  getOptimalPriceCheckInterval(): number {
    // Cada key pode fazer ~10 req/s
    // Intervalo base: 10s com 1 key, 5s com 2 keys, 3s com 3 keys, 2s com 4+ keys
    const intervals = [10, 5, 3, 2, 1];
    const validKeys = this.validKeysCount || 1;
    return intervals[Math.min(validKeys - 1, intervals.length - 1)];
  }

  // Validar todas as API keys na inicialização (em paralelo)
  private async validateApiKeys(): Promise<void> {
    if (this.apiKeys.length === 0) {
      logger.error('❌ Nenhuma API key configurada!');
      this.validKeysCount = 0;
      return;
    }

    logger.info(`🔑 Validando ${this.apiKeys.length} API key(s) do Jupiter...`);

    // Validar todas as keys em paralelo para ser rápido
    const validations = this.apiKeys.map(async (key, i) => {
      const keyPreview = `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;

      try {
        // Testar com um mint conhecido (SOL)
        const testUrl = `https://api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112`;
        const response = await fetch(testUrl, {
          headers: { 'x-api-key': key },
          signal: AbortSignal.timeout(3000), // Timeout de 3s por key
        });

        if (response.ok) {
          logger.success(`✅ Key ${i + 1}: ${keyPreview} - OK`);
          return true;
        } else {
          logger.error(`❌ Key ${i + 1}: ${keyPreview} - Erro HTTP ${response.status}`);
          return false;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Falha na conexão';
        logger.error(`❌ Key ${i + 1}: ${keyPreview} - ${errorMsg}`);
        return false;
      }
    });

    // Aguardar todas as validações em paralelo
    const results = await Promise.all(validations);
    this.validKeysCount = results.filter(r => r).length;

    const optimalInterval = this.getOptimalPriceCheckInterval();
    logger.info(`🔑 Resultado: ${this.validKeysCount}/${this.apiKeys.length} keys válidas`);
    logger.info(`⚡ Intervalo otimizado: ${optimalInterval}s entre verificações de preço`);
  }

  // Rotação round-robin de API keys
  private getNextApiKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error('Nenhuma API key do Jupiter configurada');
    }

    const key = this.apiKeys[this.apiKeyIndex];
    this.apiKeyIndex = (this.apiKeyIndex + 1) % this.apiKeys.length;

    return key;
  }

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
            'x-api-key': this.getNextApiKey(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error(
            `API Jupiter V3 retornou HTTP ${response.status} (Key: ...${this.apiKeys[(this.apiKeyIndex - 1 + this.apiKeys.length) % this.apiKeys.length].substring(0, 8)})`,
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
          headers: { 'x-api-key': this.getNextApiKey() },
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
            'x-api-key': this.getNextApiKey(),
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
