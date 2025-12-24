import 'dotenv/config';
import { config, logConfig } from './config';
import { scraperService } from './services/scraper.service';
import { tradingService } from './services/trading.service';
import { stateService } from './services/state.service';
import { solanaService } from './services/solana.service';
import { jupiterService } from './services/jupiter.service';
import { logger } from './utils/logger';
import { statusMonitor } from './utils/status-monitor';

async function checkPausedPositions(): Promise<void> {
  const allPositions = stateService.getAllPositions();

  for (const [mint, position] of Object.entries(allPositions)) {
    if (!position.paused) continue;

    try {
      // Verificar se agora tem saldo
      const balance = await solanaService.getTokenBalance(mint);

      if (balance.amount > 0n) {
        // Reativar posição - obter preço atual como novo entry
        const currentPrice = await jupiterService.getUsdPrice(mint);
        if (currentPrice) {
          stateService.reactivatePosition(mint, currentPrice);
          logger.success(`${position.ticker} reativado - novo entry: $${currentPrice.toFixed(6)}`);

          // Iniciar monitoramento novamente
          tradingService
            .monitorPosition(mint)
            .catch((e) => logger.error(`Monitor ${position.ticker}`, e));
        }
      }
    } catch (error) {
      logger.error(`Erro verificando posição pausada ${position.ticker}`, error);
    }
  }
}

async function main(): Promise<void> {
  logConfig();

  console.log('🔐 Inicializando scraper...');
  await scraperService.initialize();

  // Iniciar monitor de status visual
  statusMonitor.printStatus(); // Mostra imediatamente
  // Auto-refresh a cada 1 segundo para manter interface sempre atualizada
  statusMonitor.startAutoRefresh(1000);

  // Retomar monitoramento apenas de posições ativas
  const activePositions = stateService.getActivePositions();
  for (const mint of Object.keys(activePositions)) {
    logger.info(`Retomando monitor: ${mint.substring(0, 8)}...`);
    tradingService
      .monitorPosition(mint)
      .catch((e) => logger.error(`Monitor ${mint.substring(0, 8)}`, e));
  }

  // Verificar posições pausadas pela primeira vez
  await checkPausedPositions();

  // Loop principal de scraping
  logger.info(`Loop de scraping iniciado (intervalo: ${config.checkIntervalMs}ms)`);

  setInterval(async () => {
    try {
      // Verificar posições pausadas que podem ser reativadas
      await checkPausedPositions();

      const tokens = await scraperService.extractTokens();

      for (const token of tokens) {
        const mint = token.mint;

        // Validar mint
        if (!mint || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
          continue;
        }

        // Ignorar se já foi visto
        if (stateService.isSeen(mint)) {
          continue;
        }

        // Filtrar por score mínimo (mas continua monitorando)
        const tokenScore = parseInt(token.score) || 0;
        if (config.minScore > 0 && tokenScore < config.minScore) {
          // NÃO marca como visto - continua verificando se o score aumenta
          continue;
        }

        logger.success(`NOVO: ${token.ticker} (score ${token.score}) ✅`);

        // Só marca como visto quando compra
        stateService.markAsSeen(mint);

        const bought = await tradingService.buyToken(mint, token.ticker);
        if (!bought) continue;

        const entryUsd = await tradingService.getEntryPrice(mint);
        stateService.createPosition(mint, token.ticker, entryUsd, config.amountSol);

        if (entryUsd) {
          logger.info(`${token.ticker} entrada: $${entryUsd.toFixed(6)}`);
        }

        tradingService
          .monitorPosition(mint)
          .catch((e) => logger.error(`Monitor ${token.ticker}`, e));
      }
    } catch (error) {
      logger.error('Erro no loop principal', error);
    }
  }, config.checkIntervalMs);
}

main().catch((error) => {
  console.error('❌ FATAL:', error);
  process.exit(1);
});
