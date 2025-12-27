import { config } from '../config';
import { WebConfigManager } from '../config/web-config';
import { jupiterService } from './jupiter.service';
import { solanaService } from './solana.service';
import { stateService } from './state.service';
import { priceMonitorService } from './price-monitor.service';
import { logger } from '../utils/logger';
import { botEventEmitter, createEventListener } from '../events/BotEventEmitter';

class TradingService {
  private isRunning: boolean = false;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map(); // TODO: Remover após refatoração completa

  // Event handlers para WebSocket
  private onPositionUpdateCallbacks: Array<(mint: string, position: any) => void> = [];
  private onTransactionCallbacks: Array<(transaction: any) => void> = [];

  constructor() {
    this.setupPriceEventListeners();
  }

  /**
   * Configurar listeners para eventos de preço do PriceMonitorService
   */
  private setupPriceEventListeners(): void {
    // Escutar atualizações de preço
    createEventListener('price:updated', (data) => {
      this.handlePriceUpdate(data.mint, data.price, data.previousPrice);
    });

    // Escutar preços stale (sem atualizações)
    createEventListener('price:stale', (data) => {
      this.handleStalePrice(data.mint, data.attempts);
    });

    logger.debug('📊 TradingService: Event listeners de preço configurados');
  }

  /**
   * Verificar e executar take profits para uma posição
   */
  private async checkTakeProfits(
    mint: string,
    position: any,
    multiple: number,
    stages: any[],
    currentBalance: any
  ): Promise<void> {
    const ticker = position.ticker || mint.substring(0, 6);

    // Verificar TPs dinâmicos
    for (const stage of stages) {
      if (position.sold?.[stage.id]) continue;

      if (multiple >= stage.multiple) {
        // Verificar saldo atualizado antes de vender (pode ter mudado desde o último check)
        const freshBalance = await solanaService.getTokenBalance(mint);

        if (freshBalance.amount <= 0n) {
          logger.warn(`Sem saldo para ${stage.name} - ${ticker}`);
          stateService.markStageSold(mint, stage.id);
          continue;
        }

        // Calcular quanto vender baseado no percentual
        let sellAmount: bigint;
        if (stage.sellPercent >= 100) {
          sellAmount = freshBalance.amount;
        } else {
          sellAmount = (freshBalance.amount * BigInt(stage.sellPercent)) / 100n;
          if (sellAmount <= 0n) sellAmount = freshBalance.amount;
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

  /**
   * Processar atualização de preço recebida via evento
   */
  private async handlePriceUpdate(mint: string, price: number, previousPrice?: number): Promise<void> {
    const pos = stateService.getPosition(mint);
    if (!pos || !pos.entryUsd) return;

    const ticker = pos.ticker || mint.substring(0, 6);

    try {
      // Calcular múltiplo e variação
      const multiple = price / pos.entryUsd;
      const percentChange = ((multiple - 1) * 100).toFixed(2);

      // Atualizar histórico de preços
      stateService.updatePrice(mint, price);

      // Obter posição atualizada após update
      const updatedPos = stateService.getPosition(mint);
      if (!updatedPos) return;

      // Verificar saldo atual
      const balance = await solanaService.getTokenBalance(mint);

      // Emitir evento de atualização de posição (mantém compatibilidade)
      const positionData = {
        ticker: updatedPos.ticker || mint.substring(0, 6),
        currentPrice: price,
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

      // Verificar se precisa parar monitoramento
      const webConfigManager = WebConfigManager.getInstance();
      const enabledStages = webConfigManager.getStages().filter(s => s.enabled);
      const allTPsCompleted = enabledStages.every(stage => updatedPos.sold?.[stage.id]);

      // Se todos os TPs foram executados e saldo é zero, finalizar monitoramento
      if (allTPsCompleted && balance.amount === 0n) {
        this.stopMonitoring(mint);
        logger.info(`${ticker} - Monitoramento finalizado (todos TPs completos)`);
        return;
      }

      // Se saldo é zero mas nem todos os TPs foram executados, pausar posição
      if (balance.amount === 0n && !allTPsCompleted) {
        this.stopMonitoring(mint);
        stateService.pausePosition(mint);
        logger.warn(`${ticker} - Posição pausada (saldo zero)`);
        return;
      }

      // Encontrar próximo TP
      const stages = enabledStages;
      const nextTp = stages.find(s => !updatedPos.sold?.[s.id]);
      const nextTpText = nextTp
        ? `→ ${nextTp.name.toUpperCase()} (${nextTp.multiple}x)`
        : 'Concluído';

      logger.position(
        ticker,
        multiple,
        (percentChange >= '0' ? '+' : '') + percentChange,
        nextTpText,
        updatedPos.highestMultiple || multiple
      );

      // Verificar TPs dinâmicos
      await this.checkTakeProfits(mint, updatedPos, multiple, stages, balance);

    } catch (error) {
      logger.error(`❌ Erro processando atualização de preço para ${ticker}:`, error);

      // Emitir evento de erro
      botEventEmitter.emit('system:error', {
        error: (error as Error).message,
        source: `TradingService.handlePriceUpdate.${ticker}`,
        details: error
      });
    }
  }

  /**
   * Processar preço stale (sem atualizações) recebido via evento
   */
  private handleStalePrice(mint: string, attempts: number): void {
    const pos = stateService.getPosition(mint);
    if (!pos) return;

    const ticker = pos.ticker || mint.substring(0, 6);

    // Log baseado no número de tentativas
    if (attempts <= 3) {
      logger.debug(`⏳ ${ticker} - Preço não disponível (tentativa ${attempts})`);
    } else if (attempts <= 10) {
      logger.warn(`⚠️ ${ticker} - Múltiplas falhas obtendo preço (${attempts} tentativas)`);
    } else {
      logger.error(`❌ ${ticker} - Preço não disponível há muito tempo (${attempts} tentativas)`);
      // Considerar pausar a posição após muitas falhas?
    }

    // Emitir evento original para manter compatibilidade
    botEventEmitter.emit('monitor:price_stale', {
      mint,
      lastUpdate: pos.priceHistory?.slice(-1)[0]?.timestamp || 'never',
      staleSince: Date.now()
    });
  }

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

  /**
   * Registrar posição para monitoramento via PriceMonitorService (EVENT-DRIVEN)
   */
  async monitorPosition(mint: string): Promise<void> {
    const pos = stateService.getPosition(mint);
    if (!pos) return;

    const ticker = pos.ticker || mint.substring(0, 6);

    // Verificar se precisa obter preço de entrada
    if (!pos.entryUsd) {
      logger.info(`${ticker} aguardando preço de entrada...`);

      // Tentar obter preço de entrada (máximo 20 tentativas)
      for (let i = 0; i < 20; i++) {
        const price = await jupiterService.getUsdPrice(mint);
        if (price && price > 0) {
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

      // Verificar se conseguiu obter preço de entrada
      const updatedPos = stateService.getPosition(mint);
      if (!updatedPos?.entryUsd) {
        logger.error(`❌ ${ticker} falhou ao obter preço de entrada após 20 tentativas`);

        // Emitir evento de erro crítico
        botEventEmitter.emit('system:error', {
          error: 'Failed to obtain entry price after 20 attempts',
          source: `TradingService.monitorPosition.${ticker}`,
          details: { mint, attempts: 20 }
        });
        return;
      }
    } else {
      logger.info(`📊 ${ticker} monitorando - entrada: $${pos.entryUsd.toFixed(6)}`);
    }

    // 🚀 USAR PRICE MONITOR SERVICE AO INVÉS DE setInterval
    // Registrar token para monitoramento centralizado com alta prioridade
    priceMonitorService.registerToken(mint, ticker, 'high');

    // Emitir evento de monitoramento iniciado (event-driven)
    botEventEmitter.emit('monitor:started', {
      mint,
      ticker,
      interval: jupiterService.getOptimalPriceCheckInterval()
    });

    logger.debug(`📈 ${ticker} registrado no PriceMonitorService (event-driven)`);
  }

  // ✅ MÉTODO REMOVIDO: checkPosition() era usado com setInterval
  // Toda lógica foi migrada para handlePriceUpdate() que é chamado via eventos

  /**
   * Parar monitoramento de uma posição (EVENT-DRIVEN)
   */
  stopMonitoring(mint: string, reason: string = 'Manual stop or completion'): void {
    const pos = stateService.getPosition(mint);
    const ticker = pos?.ticker || mint.substring(0, 6);

    // 🚀 REMOVER DO PRICE MONITOR SERVICE AO INVÉS DE clearInterval
    if (priceMonitorService.isMonitoring(mint)) {
      priceMonitorService.unregisterToken(mint, reason);
      logger.debug(`📉 ${ticker} removido do PriceMonitorService (${reason})`);
    }

    // Limpar interval antigo (compatibilidade durante migração)
    const intervalId = this.monitoringIntervals.get(mint);
    if (intervalId) {
      clearInterval(intervalId);
      this.monitoringIntervals.delete(mint);
      logger.debug(`🔄 ${ticker} interval legado removido`);
    }

    // Emitir evento de monitoramento parado
    botEventEmitter.emit('monitor:stopped', {
      mint,
      ticker,
      reason
    });

    logger.info(`⏹️ ${ticker} monitoramento parado: ${reason}`);
  }

  /**
   * Parar todo monitoramento (EVENT-DRIVEN)
   */
  stopAllMonitoring(): void {
    // 🚀 USAR PRICE MONITOR SERVICE PARA OBTER LISTA DE TOKENS
    const monitoredTokens = priceMonitorService.getMonitoredTokens();

    logger.info(`⏹️ Parando monitoramento de ${monitoredTokens.length} posições...`);

    // Parar monitoramento de cada token
    monitoredTokens.forEach(token => {
      this.stopMonitoring(token.mint, 'Bot stopped - stopping all monitoring');
    });

    // Limpar intervals legados (compatibilidade durante migração)
    this.monitoringIntervals.forEach((intervalId, mint) => {
      clearInterval(intervalId);
    });
    this.monitoringIntervals.clear();

    logger.success('✅ Todo monitoramento de preços parado');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const tradingService = new TradingService();