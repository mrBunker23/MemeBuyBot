import { scraperService } from './scraper.service';
import { tradingService } from './trading.service';
import { stateService } from './state.service';
import { solanaService } from './solana.service';
import { jupiterService } from './jupiter.service';
import { priceMonitorService } from './price-monitor.service';
import { botWebSocketService } from './websocket.service';
import { logger } from '../utils/logger';
import { config } from '../config';
import { WebConfigManager } from '../config/web-config';
import { botEventEmitter, createEventListener } from '../events/BotEventEmitter';
import { workflowEventAdapter } from '../events/WorkflowEventAdapter';
import { realEventWorkflowExecutor } from '../../workflows/execution/RealEventWorkflowExecutor';
import type { BotStatus, TokenInfo, Position } from '../types';

class BotManagerService {
  private isRunning: boolean = false;
  private startedAt: string | null = null;
  private scrapeInterval: NodeJS.Timeout | null = null;
  private pausedCheckInterval: NodeJS.Timeout | null = null;

  // Event handlers para WebSocket
  private onStatusChangeCallbacks: Array<(status: BotStatus) => void> = [];

  private async logConfig(): Promise<void> {
    try {
      // Usar o novo WalletConfigService se disponível, senão usar WebConfigManager
      let config: any;
      let stages: any[];

      try {
        const { WalletConfigService } = require('../../../server/services/wallet-config.service');
        config = await WalletConfigService.loadConfig();

        // Para os stages, ainda usar WebConfigManager ou implementar no WalletConfigService
        const configManager = WebConfigManager.getInstance();
        stages = configManager.getStages();
      } catch {
        // Fallback para WebConfigManager
        const configManager = WebConfigManager.getInstance();
        config = configManager.getConfig();
        stages = configManager.getStages();
      }

      console.log('🔥 Configuração carregada');
      console.log('🎯 Compra por token:', config.amountSol, 'SOL');
      console.log('⚙️ Slippage:', config.slippageBps, 'bps');
      console.log('⏱️ Leitura do site:', config.checkIntervalMs, 'ms');
      console.log('📉 Check de preço:', config.priceCheckSeconds, 's');
      console.log('🎯 Score mínimo:', config.minScore > 0 ? config.minScore : 'Sem filtro');
      console.log('🧠 Headless:', config.headless);
      console.log(`🔑 API Keys Jupiter: ${config.jupApiKeys.length} key${config.jupApiKeys.length > 1 ? 's' : ''} (rotação ativada)`);
      console.log('\n📊 Estratégia de Take Profit:');
      stages.forEach(stage => {
        console.log(`   ${stage.name.toUpperCase()}: ${stage.multiple}x → vende ${stage.sellPercent}%`);
      });
      console.log('');

    } catch (error) {
      logger.error('Erro ao carregar configuração:', error);
    }
  }

  constructor() {
    // Configurar listeners de eventos dos serviços
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // === LOG EVENTS ===
    // Manter compatibilidade com callback do logger
    logger.onLog((log) => {
      // Emitir evento tipado
      botEventEmitter.emit('logger:log_created', {
        level: log.level,
        message: log.message,
        timestamp: log.timestamp,
        source: log.source || 'unknown'
      });
    });

    // Listener para logs tipados
    createEventListener('logger:log_created', (data) => {
      this.emitLogEvent(data);
    });

    // === TRADING EVENTS ===
    // Manter compatibilidade com callbacks do trading service
    tradingService.onPositionUpdate((mint, position) => {
      // Emitir evento tipado
      botEventEmitter.emit('position:updated', {
        mint,
        ticker: position.ticker || 'UNKNOWN',
        currentPrice: position.currentPrice,
        multiple: position.currentMultiple,
        percentChange: position.percentChange,
        highestMultiple: position.highestMultiple
      });
    });

    tradingService.onTransaction((transaction) => {
      // Emitir evento tipado baseado no tipo de transação
      if (transaction.type === 'BUY') {
        if (transaction.success) {
          botEventEmitter.emit('trading:buy_confirmed', {
            mint: transaction.mint || 'unknown',
            ticker: transaction.ticker,
            signature: transaction.signature || 'unknown',
            actualPrice: transaction.actualPrice || 0
          });
        } else {
          botEventEmitter.emit('trading:buy_failed', {
            mint: transaction.mint || 'unknown',
            ticker: transaction.ticker,
            error: transaction.error || 'Unknown error',
            reason: transaction.reason || 'Transaction failed'
          });
        }
      } else if (transaction.type === 'SELL') {
        if (transaction.success) {
          botEventEmitter.emit('trading:sell_confirmed', {
            mint: transaction.mint || 'unknown',
            ticker: transaction.ticker,
            signature: transaction.signature || 'unknown',
            profit: transaction.profit || 0
          });
        } else {
          botEventEmitter.emit('trading:sell_failed', {
            mint: transaction.mint || 'unknown',
            ticker: transaction.ticker,
            error: transaction.error || 'Unknown error',
            stage: transaction.stage || 'unknown'
          });
        }
      }
    });

    // === POSITION EVENTS ===
    // Listener para atualizações de posição tipadas
    createEventListener('position:updated', (data) => {
      this.emitPositionUpdate(data.mint, {
        ticker: data.ticker,
        currentPrice: data.currentPrice,
        currentMultiple: data.multiple,
        percentChange: data.percentChange,
        highestMultiple: data.highestMultiple
      });
    });

    // === BOT LIFECYCLE EVENTS ===
    createEventListener('bot:started', (data) => {
      logger.success(`🤖 Bot iniciado em ${data.timestamp}`);
    });

    createEventListener('bot:stopped', (data) => {
      logger.info(`⏹️ Bot parado em ${data.timestamp}${data.reason ? ` - ${data.reason}` : ''}`);
    });

    createEventListener('bot:error', (data) => {
      logger.error(`❌ Erro no bot [${data.source}]: ${data.error}`);
    });

    // === TRADING WORKFLOW EVENTS ===
    createEventListener('trading:buy_initiated', (data) => {
      logger.info(`💰 Iniciando compra: ${data.ticker} (${data.amount} tokens por $${data.usdValue})`);
    });

    createEventListener('trading:buy_confirmed', (data) => {
      logger.success(`✅ Compra confirmada: ${data.ticker} (${data.signature})`);
    });

    createEventListener('trading:sell_confirmed', (data) => {
      logger.success(`💵 Venda confirmada: ${data.ticker} - Lucro: $${data.profit.toFixed(2)}`);
    });

    createEventListener('takeprofit:triggered', (data) => {
      logger.success(`🎯 Take Profit atingido: ${data.ticker} - ${data.stage} (${data.multiple}x) - Vendendo ${data.percentage}%`);
    });

    // === SCRAPER EVENTS ===
    createEventListener('scraper:initialized', (data) => {
      logger.success(`🔍 Scraper conectado: ${data.url} (cookies: ${data.cookies ? 'OK' : 'NONE'})`);
    });

    createEventListener('scraper:token_detected', (data) => {
      logger.info(`🔍 Token detectado: ${data.token.ticker || 'UNKNOWN'} (Score: ${data.score})`);

      // Processar token detectado pelo scraper
      this.handleDetectedToken(data.token);
    });

    createEventListener('scraper:token_filtered', (data) => {
      logger.debug(`🚫 Token filtrado: ${data.token.ticker || 'UNKNOWN'} - ${data.reason}`);
    });

    createEventListener('scraper:error', (data) => {
      logger.error(`🌐 Erro no scraper: ${data.error}`);
    });

    createEventListener('scraper:cookies_expired', (data) => {
      logger.error(`🍪 Cookies expirados em ${data.timestamp} - Bot deve ser reconfigurado`);
    });

    // === SYSTEM EVENTS ===
    createEventListener('system:error', (data) => {
      logger.error(`⚠️ Erro do sistema [${data.source}]: ${data.error}`);
    });
  }

  // Event emission methods (serão conectados ao WebSocket)
  private statusChangeCallbacks: Array<(status: BotStatus) => void> = [];
  private logCallbacks: Array<(log: any) => void> = [];
  private positionUpdateCallbacks: Array<(mint: string, position: any) => void> = [];
  private transactionCallbacks: Array<(transaction: any) => void> = [];

  onStatusChange(callback: (status: BotStatus) => void): void {
    this.statusChangeCallbacks.push(callback);
  }

  onLog(callback: (log: any) => void): void {
    this.logCallbacks.push(callback);
  }

  onPositionUpdate(callback: (mint: string, position: any) => void): void {
    this.positionUpdateCallbacks.push(callback);
  }

  onTransaction(callback: (transaction: any) => void): void {
    this.transactionCallbacks.push(callback);
  }

  private emitStatusChange(status: BotStatus): void {
    this.statusChangeCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status change callback:', error);
      }
    });

    // Emitir via WebSocket
    botWebSocketService.emitBotStatus(status);
  }

  private emitLogEvent(log: any): void {
    this.logCallbacks.forEach(callback => {
      try {
        callback(log);
      } catch (error) {
        console.error('Error in log callback:', error);
      }
    });

    // Emitir via WebSocket
    botWebSocketService.emitLog(log);
  }

  private emitPositionUpdate(mint: string, position: any): void {
    this.positionUpdateCallbacks.forEach(callback => {
      try {
        callback(mint, position);
      } catch (error) {
        console.error('Error in position update callback:', error);
      }
    });

    // Emitir via WebSocket
    botWebSocketService.emitPositionUpdate(mint, position);
  }

  private emitTransaction(transaction: any): void {
    this.transactionCallbacks.forEach(callback => {
      try {
        callback(transaction);
      } catch (error) {
        console.error('Error in transaction callback:', error);
      }
    });

    // Emitir via WebSocket
    botWebSocketService.emitTransaction(transaction);
  }

  getStatus(): BotStatus {
    const positions = stateService.getAllPositions();
    const activePositions = stateService.getActivePositions();

    const status: BotStatus = {
      isRunning: this.isRunning,
      tokensMonitored: Object.keys(activePositions).length,
      totalTransactions: 0, // Pode ser calculado do state se necessário
      lastCheck: new Date().toISOString()
    };

    // Só incluir startedAt se o bot foi iniciado
    if (this.startedAt) {
      status.startedAt = this.startedAt;
    }

    return status;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot já está rodando');
      return;
    }

    try {
      logger.info('🚀 Iniciando bot...');
      await this.logConfig();

      // Verificar se a configuração é válida usando o novo sistema
      let config: any;
      try {
        const { WalletConfigService } = require('../../../server/services/wallet-config.service');
        config = await WalletConfigService.loadConfig();

        // Validar se a configuração é válida para trading
        const validation = await WalletConfigService.validateForTrading();
        if (!validation.valid) {
          throw new Error(`Configuração inválida: ${validation.errors.join(', ')}. Configure na aba Configurações.`);
        }
      } catch (error) {
        // Fallback para WebConfigManager
        const configManager = WebConfigManager.getInstance();
        config = configManager.getConfig();

        if (!config.privateKey || config.jupApiKeys.length === 0) {
          throw new Error('Configuração inválida: Private Key e Jupiter API Keys são obrigatórias. Configure na aba Configurações.');
        }
      }

      // Atualizar SolanaService com a configuração web
      logger.info('🔐 Atualizando carteira...');
      const { solanaService } = require('./solana.service');
      await solanaService.updateFromWebConfig();

      // Inicializar scraper
      logger.info('🔐 Inicializando scraper...');
      await scraperService.initialize();

      // Configurar trading service
      tradingService.setRunning(true);

      // 🚀 INICIALIZAR PRICE MONITOR SERVICE (EVENT-DRIVEN)
      logger.info('📊 Iniciando sistema de monitoramento centralizado...');
      priceMonitorService.startMonitoring();

      // Retomar monitoramento de posições ativas
      const activePositions = stateService.getActivePositions();
      for (const mint of Object.keys(activePositions)) {
        logger.info(`Retomando monitor: ${mint.substring(0, 8)}...`);
        tradingService.monitorPosition(mint).catch((e) =>
          logger.error(`Monitor ${mint.substring(0, 8)}`, e)
        );
      }

      // Iniciar verificação de posições pausadas
      this.startPausedPositionsCheck();

      // Iniciar loop principal de scraping (agora event-driven)
      scraperService.startScrapingLoop();

      // Ativar sistema de workflows com eventos reais
      workflowEventAdapter.setWorkflowExecutor(realEventWorkflowExecutor);

      this.isRunning = true;
      this.startedAt = new Date().toISOString();

      // Emitir evento de bot iniciado
      botEventEmitter.emit('bot:started', {
        timestamp: this.startedAt,
        config: config
      });

      const status = this.getStatus();
      this.emitStatusChange(status);

      // Log info sobre event system
      const adapterStats = workflowEventAdapter.getStats();
      const executorStats = realEventWorkflowExecutor.getStats();

      logger.success('🚀 Bot iniciado com sucesso!');
      logger.info(`📡 Event System: ${adapterStats.subscriptionCount} listeners ativos`);
      logger.info(`🔄 Workflow Adapter: ${adapterStats.isEnabled ? 'Ativo' : 'Inativo'} (${adapterStats.supportedTriggers.length} triggers suportados)`);
      logger.info(`⚡ Workflow Executor: Conectado aos eventos reais do bot (${executorStats.totalExecutions} execuções até agora)`);

    } catch (error) {
      // Emitir evento de erro
      botEventEmitter.emit('bot:error', {
        error: (error as Error).message,
        source: 'BotManager.start',
        details: error
      });

      logger.error('Erro ao iniciar bot:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Bot já está parado');
      return;
    }

    try {
      logger.info('⏹️ Parando bot...');

      // Parar scraping (agora no próprio service)
      scraperService.stopScrapingLoop();

      if (this.pausedCheckInterval) {
        clearInterval(this.pausedCheckInterval);
        this.pausedCheckInterval = null;
      }

      // 🚀 PARAR PRICE MONITOR SERVICE (EVENT-DRIVEN)
      logger.info('📊 Parando sistema de monitoramento centralizado...');
      priceMonitorService.stopMonitoring('Bot stopped');

      // Parar monitoramento de posições
      tradingService.stopAllMonitoring();
      tradingService.setRunning(false);

      // Desativar workflow system
      workflowEventAdapter.disable();

      this.isRunning = false;
      this.startedAt = null;

      // Emitir evento de bot parado
      botEventEmitter.emit('bot:stopped', {
        timestamp: new Date().toISOString(),
        reason: 'Manual stop'
      });

      const status = this.getStatus();
      this.emitStatusChange(status);

      logger.success('⏹️ Bot parado com sucesso!');

    } catch (error) {
      // Emitir evento de erro
      botEventEmitter.emit('bot:error', {
        error: (error as Error).message,
        source: 'BotManager.stop',
        details: error
      });

      logger.error('Erro ao parar bot:', error);
      throw error;
    }
  }

  private startPausedPositionsCheck(): void {
    this.pausedCheckInterval = setInterval(async () => {
      await this.checkPausedPositions();
    }, 30000); // Verificar a cada 30 segundos

    // Verificação inicial
    this.checkPausedPositions();
  }

  /**
   * Processa token detectado pelo scraper via evento
   * Este método substitui o processToken() que era chamado diretamente
   */
  private async handleDetectedToken(token: TokenInfo): Promise<void> {
    const mint = token.mint;

    // Validar mint
    if (!mint || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
      return;
    }

    // Ignorar se já foi visto
    if (stateService.isSeen(mint)) {
      return;
    }

    // Filtrar por score mínimo (verificação dupla, já que o scraper também filtra)
    const tokenScore = parseInt(token.score) || 0;
    if (config.minScore > 0 && tokenScore < config.minScore) {
      // NÃO marca como visto - continua verificando se o score aumenta
      return;
    }

    logger.success(`NOVO: ${token.ticker} (score ${token.score}) ✅`);

    // Só marca como visto quando compra
    stateService.markAsSeen(mint);

    const bought = await tradingService.buyToken(mint, token.ticker);
    if (!bought) return;

    const entryUsd = await tradingService.getEntryPrice(mint);
    stateService.createPosition(mint, token.ticker, entryUsd, config.amountSol);

    if (entryUsd) {
      logger.info(`${token.ticker} entrada: $${entryUsd.toFixed(6)}`);
    }

    tradingService.monitorPosition(mint).catch((e) =>
      logger.error(`Monitor ${token.ticker}`, e)
    );
  }

  private async checkPausedPositions(): Promise<void> {
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
            tradingService.monitorPosition(mint).catch((e) =>
              logger.error(`Monitor ${position.ticker}`, e)
            );
          }
        }
      } catch (error) {
        logger.error(`Erro verificando posição pausada ${position.ticker}`, error);
      }
    }
  }

  // OLD SCRAPING METHODS REMOVED - Now using event-driven architecture
  // The ScraperService is now autonomous and emits events that are handled by event listeners

  // Métodos para obter dados
  getAllPositions(): Record<string, Position> {
    return stateService.getAllPositions();
  }

  getActivePositions(): Record<string, Position> {
    return stateService.getActivePositions();
  }

  getRecentLogs(): any[] {
    return logger.getRecentLogs();
  }

  // Método para atualizar configurações em tempo real
  updateConfig(newConfig: Partial<typeof config>): void {
    const changes = { ...newConfig };
    Object.assign(config, newConfig);

    // Emitir evento de configuração atualizada
    botEventEmitter.emit('bot:config_updated', {
      changes,
      timestamp: new Date().toISOString()
    });

    logger.info('Configuração atualizada via web');

    // Se o bot estiver rodando, reinicias alguns componentes se necessário
    if (this.isRunning && newConfig.checkIntervalMs) {
      // Reiniciar scraper com novo intervalo (event-driven)
      logger.info('🔄 Reiniciando scraper com novo intervalo...');
      scraperService.stopScrapingLoop();
      scraperService.startScrapingLoop();
    }
  }
}

export const botManagerService = new BotManagerService();