import { config } from '../config';
import { WebConfigManager } from '../config/web-config';
import { jupiterService } from './jupiter.service';
import { solanaService } from './solana.service';
import { stateService } from './state.service';
import { logger } from '../utils/logger';
import { botEventEmitter } from '../events/BotEventEmitter';

class TradingService {
  private isRunning: boolean = false;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Event handlers para WebSocket
  private onPositionUpdateCallbacks: Array<(mint: string, position: any) => void> = [];
  private onTransactionCallbacks: Array<(transaction: any) => void> = [];

  isRunningBot(): boolean {
    return this.isRunning;
  }

  setRunning(running: boolean): void {
    this.isRunning = running;
  }

  onPositionUpdate(callback: (mint: string, position: any) => void): void {
    this.onPositionUpdateCallbacks.push(callback);
  }

  onTransaction(callback: (transaction: any) => void): void {
    this.onTransactionCallbacks.push(callback);
  }

  private emitPositionUpdate(mint: string, position: any): void {
    this.onPositionUpdateCallbacks.forEach(callback => {
      try {
        callback(mint, position);
      } catch (error) {
        console.error('Error in position update callback:', error);
      }
    });
  }

  private emitTransaction(transaction: any): void {
    this.onTransactionCallbacks.forEach(callback => {
      try {
        callback(transaction);
      } catch (error) {
        console.error('Error in transaction callback:', error);
      }
    });
  }

  async buyToken(mint: string, ticker?: string): Promise<boolean> {
    const lamports = BigInt(Math.floor(config.amountSol * 1e9));
    const tokenTicker = ticker || mint.substring(0, 6);
    const usdValue = config.amountSol * 100; // Estimativa SOL = $100 (placeholder)

    // Emitir evento de compra iniciada
    botEventEmitter.emit('trading:buy_initiated', {
      mint,
      ticker: tokenTicker,
      amount: lamports.toString(),
      usdValue
    });

    const result = await jupiterService.executeTrade({
      inputMint: config.solMint,
      outputMint: mint,
      amountInt: lamports.toString(),
    });

    // Emitir evento baseado no resultado
    if (result.ok) {
      botEventEmitter.emit('trading:buy_confirmed', {
        mint,
        ticker: tokenTicker,
        signature: result.signature || 'unknown',
        actualPrice: result.executionPrice || 0
      });

      logger.success(`Compra: ${config.amountSol} SOL`);
    } else {
      botEventEmitter.emit('trading:buy_failed', {
        mint,
        ticker: tokenTicker,
        error: result.error || 'Unknown error',
        reason: 'Jupiter execution failed'
      });

      logger.error('Compra falhou');
    }

    // Manter compatibilidade com callback antigo
    const transaction = {
      type: 'BUY',
      ticker: tokenTicker,
      amount: `${config.amountSol} SOL`,
      success: result.ok,
      timestamp: new Date().toISOString(),
      signature: result.signature,
      mint,
      actualPrice: result.executionPrice,
      error: result.error
    };
    this.emitTransaction(transaction);

    return result.ok;
  }

  async sellToken(mint: string, amountBaseUnits: bigint, ticker?: string, stage?: string): Promise<boolean> {
    if (amountBaseUnits <= 0n) return false;

    const tokenTicker = ticker || mint.substring(0, 6);
    const stageLabel = stage || 'manual';

    // Formatar valor para display
    const balance = await solanaService.getTokenBalance(mint);
    const decimals = balance.decimals || 9;
    const amountFormatted = (Number(amountBaseUnits) / Math.pow(10, decimals));
    const percentage = stage ? 25 : 100; // Placeholder para porcentagem

    // Emitir evento de venda iniciada
    botEventEmitter.emit('trading:sell_initiated', {
      mint,
      ticker: tokenTicker,
      stage: stageLabel,
      percentage
    });

    const result = await jupiterService.executeTrade({
      inputMint: mint,
      outputMint: config.solMint,
      amountInt: amountBaseUnits.toString(),
    });

    // Emitir evento baseado no resultado
    if (result.ok) {
      const profit = result.outputValue || 0; // Placeholder para cálculo de lucro

      botEventEmitter.emit('trading:sell_confirmed', {
        mint,
        ticker: tokenTicker,
        signature: result.signature || 'unknown',
        profit
      });

      logger.success(`Venda executada`);
    } else {
      botEventEmitter.emit('trading:sell_failed', {
        mint,
        ticker: tokenTicker,
        error: result.error || 'Unknown error',
        stage: stageLabel
      });

      logger.error('Venda falhou');
    }

    // Manter compatibilidade com callback antigo
    const transaction = {
      type: 'SELL',
      ticker: tokenTicker,
      amount: `${amountFormatted.toFixed(2)} tokens`,
      success: result.ok,
      timestamp: new Date().toISOString(),
      signature: result.signature,
      stage,
      mint,
      profit: result.outputValue,
      error: result.error
    };
    this.emitTransaction(transaction);

    return result.ok;
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

    const ticker = pos.ticker || mint.substring(0, 6);

    // Emitir evento de monitoramento iniciado
    botEventEmitter.emit('monitor:started', {
      mint,
      ticker,
      interval: jupiterService.getOptimalPriceCheckInterval()
    });

    // Aguardar preço de entrada se não existir
    if (!pos.entryUsd) {
      logger.info(`${ticker} aguardando preço de entrada...`);
      for (let i = 0; i < 20; i++) {
        const price = await jupiterService.getUsdPrice(mint);
        if (price) {
          stateService.updatePositionEntry(mint, price);

          // Emitir evento de posição criada com preço de entrada
          botEventEmitter.emit('position:created', {
            mint,
            ticker,
            entryPrice: price,
            amount: pos.currentBalance ? Number(pos.currentBalance) : 0
          });

          logger.success(`${ticker} entrada: $${price.toFixed(6)}`);
          break;
        }
        await this.sleep(2000);
      }

      // Se ainda não tem preço, avisar
      const updatedPos = stateService.getPosition(mint);
      if (!updatedPos?.entryUsd) {
        logger.warn(`${ticker} não conseguiu obter preço de entrada`);
        return;
      }
    } else {
      logger.info(`${ticker} monitorando - entrada: $${pos.entryUsd.toFixed(6)}`);
    }

    // Criar interval para monitoramento contínuo
    const intervalId = setInterval(async () => {
      try {
        await this.checkPosition(mint);
      } catch (error) {
        // Emitir evento de erro no monitoramento
        botEventEmitter.emit('system:error', {
          error: (error as Error).message,
          source: `TradingService.monitorPosition.${ticker}`,
          details: error
        });

        logger.error(`Erro no monitoramento de ${ticker}:`, error);
      }
    }, jupiterService.getOptimalPriceCheckInterval() * 1000);

    this.monitoringIntervals.set(mint, intervalId);

    // Primeira verificação imediata
    await this.checkPosition(mint);
  }

  private async checkPosition(mint: string): Promise<void> {
    const pos = stateService.getPosition(mint);
    if (!pos || !pos.entryUsd) return;

    // Verificar se TP4 foi executado ou se saldo é zero
    const balance = await solanaService.getTokenBalance(mint);

    // Verificar se todos os TPs foram executados
    const webConfigManager = WebConfigManager.getInstance();
    const enabledStages = webConfigManager.getStages().filter(s => s.enabled);
    const allTPsCompleted = enabledStages.every(stage => pos.sold?.[stage.id]);

    // Se todos os TPs foram executados e saldo é zero, finalizar monitoramento
    if (allTPsCompleted && balance.amount === 0n) {
      this.stopMonitoring(mint);
      logger.info(`${pos.ticker || mint.substring(0, 6)} - Monitoramento finalizado (todos TPs completos)`);
      return;
    }

    // Se saldo é zero mas nem todos os TPs foram executados, pausar posição
    if (balance.amount === 0n && !allTPsCompleted) {
      this.stopMonitoring(mint);
      stateService.pausePosition(mint);
      logger.warn(`${pos.ticker || mint.substring(0, 6)} - Posição pausada (saldo zero)`);
      return;
    }

    const currentPrice = await jupiterService.getUsdPrice(mint);
    if (!currentPrice) {
      // Emitir evento de preço não encontrado
      botEventEmitter.emit('monitor:price_stale', {
        mint,
        lastUpdate: pos.priceHistory?.slice(-1)[0]?.timestamp || 'never',
        staleSince: Date.now()
      });
      return;
    }

    const multiple = currentPrice / pos.entryUsd;
    const percentChange = ((multiple - 1) * 100).toFixed(2);

    // Emitir evento de verificação de preço
    botEventEmitter.emit('monitor:price_check', {
      mint,
      currentPrice,
      multiple
    });

    // Atualizar histórico de preços
    stateService.updatePrice(mint, currentPrice);

    // Obter posição atualizada após update
    const updatedPos = stateService.getPosition(mint);
    if (!updatedPos) return;

    // Emitir evento de atualização de posição (both typed and legacy)
    const positionData = {
      ticker: updatedPos.ticker || mint.substring(0, 6),
      currentPrice,
      multiple,
      percentChange: Number(percentChange),
      highestMultiple: updatedPos.highestMultiple || multiple
    };

    botEventEmitter.emit('position:updated', {
      mint,
      ...positionData
    });

    // Manter compatibilidade com callback antigo
    this.emitPositionUpdate(mint, {
      ...updatedPos,
      currentMultiple: multiple,
      percentChange: Number(percentChange),
      currentBalance: balance.amount,
      balanceFormatted: balance.amount > 0n
        ? (Number(balance.amount) / Math.pow(10, balance.decimals)).toFixed(2)
        : '0'
    });

    // Encontrar próximo TP usando WebConfigManager
    const stages = webConfigManager.getStages().filter(s => s.enabled);
    const nextTp = stages.find(s => !updatedPos.sold?.[s.id]);
    const nextTpText = nextTp
      ? `→ ${nextTp.name.toUpperCase()} (${nextTp.multiple}x)`
      : 'Concluído';

    const ticker = updatedPos.ticker || mint.substring(0, 6);

    logger.position(
      ticker,
      multiple,
      (percentChange >= '0' ? '+' : '') + percentChange,
      nextTpText,
      updatedPos.highestMultiple || multiple
    );

    // Verificar TPs dinâmicos
    for (const stage of stages) {
      if (updatedPos.sold?.[stage.id]) continue;

      if (multiple >= stage.multiple) {
        // Buscar saldo atualizado antes de vender
        const currentBalance = await solanaService.getTokenBalance(mint);

        if (currentBalance.amount <= 0n) {
          logger.warn(`Sem saldo para ${stage.name}`);
          stateService.markStageSold(mint, stage.id);
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

        // Emitir evento de take profit atingido
        botEventEmitter.emit('takeprofit:triggered', {
          mint,
          ticker,
          stage: stage.name,
          multiple,
          percentage: stage.sellPercent
        });

        logger.success(
          `${stage.name.toUpperCase()} atingido! ${multiple.toFixed(2)}x → Vendendo ${stage.sellPercent}%`
        );

        const success = await this.sellToken(mint, sellAmount, ticker, stage.id);
        if (success) {
          stateService.markStageSold(mint, stage.id);
        }
      }
    }
  }

  stopMonitoring(mint: string): void {
    const intervalId = this.monitoringIntervals.get(mint);
    if (intervalId) {
      clearInterval(intervalId);
      this.monitoringIntervals.delete(mint);

      // Emitir evento de monitoramento parado
      const pos = stateService.getPosition(mint);
      botEventEmitter.emit('monitor:stopped', {
        mint,
        ticker: pos?.ticker || mint.substring(0, 6),
        reason: 'Manual stop or completion'
      });
    }
  }

  stopAllMonitoring(): void {
    this.monitoringIntervals.forEach((intervalId, mint) => {
      clearInterval(intervalId);
    });
    this.monitoringIntervals.clear();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const tradingService = new TradingService();