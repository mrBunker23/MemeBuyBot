import { scraperService } from './scraper.service';
import { tradingService } from './trading.service';
import { stateService } from './state.service';
import { solanaService } from './solana.service';
import { jupiterService } from './jupiter.service';
import { botWebSocketService } from './websocket.service';
import { logger } from '../utils/logger';
import { config } from '../config';
import { WebConfigManager } from '../config/web-config';
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
    // Log listener para WebSocket
    logger.onLog((log) => {
      // Pode ser usado para emitir logs via WebSocket
      this.emitLogEvent(log);
    });

    // Trading service listeners
    tradingService.onPositionUpdate((mint, position) => {
      this.emitPositionUpdate(mint, position);
    });

    tradingService.onTransaction((transaction) => {
      this.emitTransaction(transaction);
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

      // Iniciar loop principal de scraping
      this.startScrapingLoop();

      this.isRunning = true;
      this.startedAt = new Date().toISOString();

      const status = this.getStatus();
      this.emitStatusChange(status);

      logger.success('🚀 Bot iniciado com sucesso!');

    } catch (error) {
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

      // Parar loops
      if (this.scrapeInterval) {
        clearInterval(this.scrapeInterval);
        this.scrapeInterval = null;
      }

      if (this.pausedCheckInterval) {
        clearInterval(this.pausedCheckInterval);
        this.pausedCheckInterval = null;
      }

      // Parar monitoramento de posições
      tradingService.stopAllMonitoring();
      tradingService.setRunning(false);

      this.isRunning = false;
      this.startedAt = null;

      const status = this.getStatus();
      this.emitStatusChange(status);

      logger.success('⏹️ Bot parado com sucesso!');

    } catch (error) {
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

  private startScrapingLoop(): void {
    logger.info(`Loop de scraping iniciado (intervalo: ${config.checkIntervalMs}ms)`);

    this.scrapeInterval = setInterval(async () => {
      try {
        const tokens = await scraperService.extractTokens();

        for (const token of tokens) {
          await this.processToken(token);
        }
      } catch (error) {
        logger.error('Erro no loop principal', error);
      }
    }, config.checkIntervalMs);

    // Primeira verificação imediata
    this.processScrapedTokens();
  }

  private async processScrapedTokens(): Promise<void> {
    try {
      const tokens = await scraperService.extractTokens();
      for (const token of tokens) {
        await this.processToken(token);
      }
    } catch (error) {
      logger.error('Erro ao processar tokens', error);
    }
  }

  private async processToken(token: TokenInfo): Promise<void> {
    const mint = token.mint;

    // Validar mint
    if (!mint || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
      return;
    }

    // Ignorar se já foi visto
    if (stateService.isSeen(mint)) {
      return;
    }

    // Filtrar por score mínimo
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
    Object.assign(config, newConfig);
    logger.info('Configuração atualizada via web');

    // Se o bot estiver rodando, reinicias alguns componentes se necessário
    if (this.isRunning && newConfig.checkIntervalMs) {
      // Reiniciar loop de scraping com novo intervalo
      if (this.scrapeInterval) {
        clearInterval(this.scrapeInterval);
        this.startScrapingLoop();
      }
    }
  }
}

export const botManagerService = new BotManagerService();