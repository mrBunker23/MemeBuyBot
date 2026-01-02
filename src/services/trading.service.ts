import { config, STAGES, STOP_LOSSES } from '../config';
import { jupiterService } from './jupiter.service';
import { solanaService } from './solana.service';
import { stateService } from './state.service';
import { logger } from '../utils/logger';
import { statusMonitor } from '../utils/status-monitor';

class TradingService {
  async buyToken(mint: string, ticker?: string): Promise<boolean> {
    const lamports = BigInt(Math.floor(config.amountSol * 1e9));

    const result = await jupiterService.executeTrade({
      inputMint: config.solMint,
      outputMint: mint,
      amountInt: lamports.toString(),
    });

    // Registrar transação
    const tickerDisplay = ticker || mint.substring(0, 6);
    statusMonitor.addTransaction('COMPRA', tickerDisplay, `${config.amountSol} SOL`, result.ok);

    if (!result.ok) {
      logger.error('Compra falhou');
      return false;
    }

    logger.success(`Compra: ${config.amountSol} SOL`);
    return true;
  }

  async sellToken(mint: string, amountBaseUnits: bigint, ticker?: string, stage?: string): Promise<boolean> {
    if (amountBaseUnits <= 0n) return false;

    const result = await jupiterService.executeTrade({
      inputMint: mint,
      outputMint: config.solMint,
      amountInt: amountBaseUnits.toString(),
    });

    // Registrar transação com formatação legível
    const tickerDisplay = ticker || mint.substring(0, 6);
    // Tentar formatar o valor (assumindo 6-9 decimais)
    const balance = await solanaService.getTokenBalance(mint);
    const decimals = balance.decimals || 9;
    const amountFormatted = (Number(amountBaseUnits) / Math.pow(10, decimals)).toFixed(2);
    const amountDisplay = `${amountFormatted} tokens`;

    statusMonitor.addTransaction('VENDA', tickerDisplay, amountDisplay, result.ok, stage);

    if (!result.ok) {
      logger.error('Venda falhou');
      return false;
    }

    logger.success(`Venda executada`);
    return true;
  }

  async getEntryPrice(mint: string, maxRetries = 15): Promise<number | null> {
    for (let i = 0; i < maxRetries; i++) {
      const price = await jupiterService.getUsdPrice(mint);
      if (price) return price;
      await this.sleep(2000);
    }
    return null;
  }

  async monitorPosition(mint: string): Promise<void> {
    const pos = stateService.getPosition(mint);
    if (!pos) return;

    const ticker = mint.substring(0, 6);

    // Aguardar preço de entrada se não existir
    if (!pos.entryUsd) {
      logger.info(`${ticker} aguardando preço de entrada...`);
      for (let i = 0; i < 20; i++) {
        const price = await jupiterService.getUsdPrice(mint);
        if (price) {
          stateService.updatePositionEntry(mint, price);
          logger.success(`${ticker} entrada: $${price.toFixed(6)}`);
          break;
        }
        await this.sleep(2000);
      }

      // Se ainda não tem preço, avisar
      if (!pos.entryUsd && !stateService.getPosition(mint)?.entryUsd) {
        logger.warn(`${ticker} não conseguiu obter preço de entrada`);
        return;
      }
    } else {
      logger.info(`${ticker} monitorando - entrada: $${pos.entryUsd.toFixed(6)}`);
    }

    while (true) {
      // Verificar se TP4 foi executado ou se saldo é zero
      const balance = await solanaService.getTokenBalance(mint);

      // Se TP4 foi executado e saldo é zero, finalizar monitoramento
      if (pos.sold?.tp4 && balance.amount === 0n) {
        logger.info(`${pos.ticker || mint.substring(0, 6)} - Monitoramento finalizado (TP4 completo)`);
        return;
      }

      // Se saldo é zero mas TP4 não foi executado, pausar posição
      if (balance.amount === 0n && !pos.sold?.tp4) {
        stateService.pausePosition(mint);
        statusMonitor.pauseToken(mint);
        logger.warn(`${pos.ticker || mint.substring(0, 6)} - Posição pausada (saldo zero)`);
        return;
      }

      const currentPrice = await jupiterService.getUsdPrice(mint);
      if (!currentPrice || !pos.entryUsd) {
        // Usar intervalo otimizado baseado no número de API keys válidas
      const optimalInterval = jupiterService.getOptimalPriceCheckInterval();
      await this.sleep(optimalInterval * 1000);
        continue;
      }

      const multiple = currentPrice / pos.entryUsd;
      const percentChange = ((multiple - 1) * 100).toFixed(2);

      // Atualizar histórico de preços
      stateService.updatePrice(mint, currentPrice);

      // Encontrar próximo TP
      const nextTp = STAGES.find(s => !pos.sold?.[s.name as keyof typeof pos.sold]);
      const nextTpText = nextTp
        ? `→ ${nextTp.name.toUpperCase()} (${nextTp.multiple}x)`
        : 'Concluído';

      // Usar ticker do state ao invés de substring
      const ticker = pos.ticker || mint.substring(0, 6);

      // Calcular TPs e SLs vendidos
      const soldTPs = [];
      if (pos.sold?.tp1) soldTPs.push('tp1');
      if (pos.sold?.tp2) soldTPs.push('tp2');
      if (pos.sold?.tp3) soldTPs.push('tp3');
      if (pos.sold?.tp4) soldTPs.push('tp4');
      if (pos.sold?.sl1) soldTPs.push('sl1');
      if (pos.sold?.sl2) soldTPs.push('sl2');
      if (pos.sold?.sl3) soldTPs.push('sl3');
      if (pos.sold?.sl4) soldTPs.push('sl4');
      if (pos.sold?.sl5) soldTPs.push('sl5');

      // Formatar saldo
      const balanceFormatted = balance.amount > 0n
        ? (Number(balance.amount) / Math.pow(10, balance.decimals)).toFixed(2)
        : '0';

      // Atualizar status monitor (vai remover automaticamente se TP4 + saldo zero)
      statusMonitor.updatePosition(
        mint,
        ticker,
        multiple,
        (percentChange >= '0' ? '+' : '') + percentChange + '%',
        soldTPs,
        balanceFormatted
      );

      logger.position(
        ticker,
        multiple,
        (percentChange >= '0' ? '+' : '') + percentChange,
        nextTpText,
        pos.highestMultiple || multiple
      );

      for (const stage of STAGES) {
        pos.sold = pos.sold || {};
        if (pos.sold[stage.name as keyof typeof pos.sold]) continue;

        if (multiple >= stage.multiple) {
          // Buscar saldo atualizado antes de vender
          const currentBalance = await solanaService.getTokenBalance(mint);

          if (currentBalance.amount <= 0n) {
            logger.warn(`Sem saldo para ${stage.name}`);
            stateService.markStageSold(mint, stage.name);
            continue;
          }

          // Calcular quanto vender baseado no percentual
          let sellAmount: bigint;
          if (stage.sellPercent >= 100) {
            sellAmount = currentBalance.amount;
          } else {
            sellAmount = (currentBalance.amount * BigInt(stage.sellPercent)) / 100n;
            if (sellAmount <= 0n) sellAmount = currentBalance.amount;
          }

          logger.success(
            `${stage.name.toUpperCase()} atingido! ${multiple.toFixed(2)}x → Vendendo ${stage.sellPercent}%`
          );

          const success = await this.sellToken(mint, sellAmount, ticker, stage.name);
          if (success) {
            stateService.markStageSold(mint, stage.name);
          }
        }
      }

      // Verificar stop-losses se configurados
      if (STOP_LOSSES.length > 0) {
        for (const stopLoss of STOP_LOSSES) {
          // Verificar se este stop-loss já foi executado
          if (pos.sold?.[stopLoss.name as keyof typeof pos.sold]) continue;

          // Verificar se o múltiplo atual atingiu o stop-loss
          if (multiple <= stopLoss.multiple) {
            // Buscar saldo atualizado antes de vender
            const currentBalance = await solanaService.getTokenBalance(mint);

            if (currentBalance.amount <= 0n) {
              logger.warn(`Sem saldo para ${stopLoss.name}`);
              stateService.markStageSold(mint, stopLoss.name);
              continue;
            }

            // Calcular quanto vender baseado no percentual
            let sellAmount: bigint;
            if (stopLoss.sellPercent >= 100) {
              sellAmount = currentBalance.amount;
            } else {
              sellAmount = (currentBalance.amount * BigInt(stopLoss.sellPercent)) / 100n;
              if (sellAmount <= 0n) sellAmount = currentBalance.amount;
            }

            logger.warn(
              `🛡️ ${stopLoss.name.toUpperCase()} ativado! ${multiple.toFixed(2)}x (${percentChange}%) → Vendendo ${stopLoss.sellPercent}%`
            );

            const success = await this.sellToken(mint, sellAmount, ticker, stopLoss.name);
            if (success) {
              stateService.markStageSold(mint, stopLoss.name);

              // Se vendeu 100% no stop-loss, finalizar monitoramento
              if (stopLoss.sellPercent >= 100) {
                logger.info(`${ticker} - Monitoramento finalizado (Stop-Loss total)`);
                return;
              }
            }
          }
        }
      }

      // Usar intervalo otimizado baseado no número de API keys válidas
      const optimalInterval = jupiterService.getOptimalPriceCheckInterval();
      await this.sleep(optimalInterval * 1000);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const tradingService = new TradingService();
