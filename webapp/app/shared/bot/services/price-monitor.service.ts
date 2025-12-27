// Serviço centralizado de monitoramento de preços via eventos
import { jupiterService } from './jupiter.service';
import { stateService } from './state.service';
import { botEventEmitter, createEventListener } from '../events/BotEventEmitter';
import { logger } from '../utils/logger';

interface MonitoredToken {
  mint: string;
  ticker?: string;
  lastPrice?: number;
  lastUpdate?: number;
  consecutiveFailures: number;
  priority: 'high' | 'medium' | 'low'; // Para ordenação de requests
}

class PriceMonitorService {
  private monitoredTokens: Map<string, MonitoredToken> = new Map();
  private globalInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private currentInterval: number = 5000; // 5s padrão
  private batchSize: number = 5; // Máximo de requests paralelos

  // Métricas para debugging
  private stats = {
    totalChecks: 0,
    successfulUpdates: 0,
    failures: 0,
    averageExecutionTime: 0
  };

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Escutar quando posições são criadas/removidas para auto-register
    createEventListener('position:created', (data) => {
      this.registerToken(data.mint, data.ticker, 'high');
    });

    createEventListener('position:closed', (data) => {
      this.unregisterToken(data.mint, 'Position closed');
    });

    createEventListener('position:paused', (data) => {
      // Tokens pausados têm prioridade baixa mas ainda monitora
      this.updateTokenPriority(data.mint, 'low');
    });

    createEventListener('position:resumed', (data) => {
      this.updateTokenPriority(data.mint, 'high');
    });
  }

  /**
   * Iniciar monitoramento global de preços
   */
  startMonitoring(): void {
    if (this.isRunning) {
      logger.warn('⚠️ Price Monitor já está rodando');
      return;
    }

    this.isRunning = true;

    // Usar intervalo otimizado baseado nas keys disponíveis
    this.currentInterval = jupiterService.getOptimalPriceCheckInterval() * 1000;

    logger.info(`📊 Price Monitor iniciado (intervalo: ${this.currentInterval}ms)`);

    // Emitir evento de monitor iniciado
    botEventEmitter.emit('price:monitor_started', {
      interval: this.currentInterval,
      tokenCount: this.monitoredTokens.size
    });

    // Primeira verificação imediata
    this.performBatchCheck();

    // Agendar verificações periódicas
    this.globalInterval = setInterval(() => {
      this.performBatchCheck();
    }, this.currentInterval);
  }

  /**
   * Parar monitoramento global
   */
  stopMonitoring(reason: string = 'Manual stop'): void {
    if (!this.isRunning) {
      logger.warn('⚠️ Price Monitor já está parado');
      return;
    }

    this.isRunning = false;

    if (this.globalInterval) {
      clearInterval(this.globalInterval);
      this.globalInterval = null;
    }

    // Emitir evento de monitor parado
    botEventEmitter.emit('price:monitor_stopped', {
      reason,
      tokensMonitored: this.monitoredTokens.size
    });

    logger.info(`⏹️ Price Monitor parado: ${reason} (${this.monitoredTokens.size} tokens monitorados)`);
  }

  /**
   * Registrar token para monitoramento
   */
  registerToken(mint: string, ticker?: string, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const existing = this.monitoredTokens.get(mint);

    if (existing) {
      // Atualizar prioridade se já existe
      existing.priority = priority;
      existing.ticker = ticker || existing.ticker;
    } else {
      // Adicionar novo token
      this.monitoredTokens.set(mint, {
        mint,
        ticker,
        consecutiveFailures: 0,
        priority
      });

      logger.debug(`📋 Token registrado para monitoramento: ${ticker || mint.substring(0, 8)}... (${priority})`);

      // Emitir evento de registro
      botEventEmitter.emit('monitor:position_registered', {
        mint,
        ticker: ticker || mint.substring(0, 8) + '...',
        registeredAt: Date.now()
      });
    }
  }

  /**
   * Remover token do monitoramento
   */
  unregisterToken(mint: string, reason: string): void {
    const token = this.monitoredTokens.get(mint);
    if (!token) return;

    this.monitoredTokens.delete(mint);

    logger.debug(`📋 Token removido do monitoramento: ${token.ticker || mint.substring(0, 8)}... - ${reason}`);

    // Emitir evento de remoção
    botEventEmitter.emit('monitor:position_unregistered', {
      mint,
      ticker: token.ticker || mint.substring(0, 8) + '...',
      reason
    });
  }

  /**
   * Atualizar prioridade de um token
   */
  updateTokenPriority(mint: string, priority: 'high' | 'medium' | 'low'): void {
    const token = this.monitoredTokens.get(mint);
    if (token) {
      token.priority = priority;
      logger.debug(`🎯 Prioridade atualizada para ${token.ticker || mint.substring(0, 8)}...: ${priority}`);
    }
  }

  /**
   * Verificação em lote de todos os preços
   */
  private async performBatchCheck(): Promise<void> {
    const startTime = Date.now();
    const tokens = Array.from(this.monitoredTokens.values());

    if (tokens.length === 0) {
      return;
    }

    logger.debug(`🔍 Verificando preços em lote: ${tokens.length} tokens`);

    // Emitir evento de início do batch
    botEventEmitter.emit('price:batch_check_started', {
      tokenCount: tokens.length,
      interval: this.currentInterval,
      timestamp: startTime
    });

    // Ordenar por prioridade (high -> medium -> low)
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    tokens.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    let successfulUpdates = 0;
    let staleTokens = 0;
    const errors: string[] = [];

    // Processar em batches para não sobrecarregar API
    for (let i = 0; i < tokens.length; i += this.batchSize) {
      const batch = tokens.slice(i, i + this.batchSize);

      // Processar batch em paralelo
      const batchPromises = batch.map(async (token) => {
        try {
          const price = await jupiterService.getUsdPrice(token.mint);

          if (price && price > 0) {
            const previousPrice = token.lastPrice;
            token.lastPrice = price;
            token.lastUpdate = Date.now();
            token.consecutiveFailures = 0;
            successfulUpdates++;

            // Emitir evento de preço atualizado
            botEventEmitter.emit('price:updated', {
              mint: token.mint,
              ticker: token.ticker,
              price,
              previousPrice,
              timestamp: Date.now()
            });

          } else {
            token.consecutiveFailures++;
            staleTokens++;

            // Emitir evento de preço stale
            botEventEmitter.emit('price:stale', {
              mint: token.mint,
              ticker: token.ticker,
              lastSeen: token.lastUpdate || 0,
              attempts: token.consecutiveFailures
            });

            // Se muitas falhas consecutivas, reduzir prioridade
            if (token.consecutiveFailures >= 5 && token.priority === 'high') {
              token.priority = 'medium';
              logger.warn(`⚠️ ${token.ticker || token.mint.substring(0, 8)}... prioridade reduzida por falhas consecutivas`);
            }
          }
        } catch (error) {
          token.consecutiveFailures++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`${token.ticker || token.mint.substring(0, 8)}: ${errorMsg}`);

          logger.error(`❌ Erro obtendo preço para ${token.ticker || token.mint.substring(0, 8)}...`, error);
        }
      });

      await Promise.allSettled(batchPromises);

      // Pequena pausa entre batches para não spam a API
      if (i + this.batchSize < tokens.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const executionTime = Date.now() - startTime;

    // Atualizar estatísticas
    this.stats.totalChecks++;
    this.stats.successfulUpdates += successfulUpdates;
    this.stats.failures += staleTokens;
    this.stats.averageExecutionTime = (this.stats.averageExecutionTime + executionTime) / 2;

    // Emitir evento de conclusão do batch
    botEventEmitter.emit('price:batch_check_completed', {
      tokenCount: tokens.length,
      successfulUpdates,
      staleTokens,
      executionTime,
      errors: errors.length > 0 ? errors : undefined
    });

    logger.debug(`✅ Batch concluído: ${successfulUpdates}/${tokens.length} atualizados em ${executionTime}ms`);
  }

  /**
   * Obter estatísticas do monitor
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      currentInterval: this.currentInterval,
      tokensMonitored: this.monitoredTokens.size,
      tokensByPriority: {
        high: Array.from(this.monitoredTokens.values()).filter(t => t.priority === 'high').length,
        medium: Array.from(this.monitoredTokens.values()).filter(t => t.priority === 'medium').length,
        low: Array.from(this.monitoredTokens.values()).filter(t => t.priority === 'low').length,
      },
      recentTokens: Array.from(this.monitoredTokens.values()).slice(-5).map(t => ({
        mint: t.mint.substring(0, 8) + '...',
        ticker: t.ticker,
        priority: t.priority,
        lastUpdate: t.lastUpdate ? new Date(t.lastUpdate).toISOString() : 'never',
        failures: t.consecutiveFailures
      }))
    };
  }

  /**
   * Força verificação de um token específico
   */
  async forceCheckToken(mint: string): Promise<number | null> {
    const token = this.monitoredTokens.get(mint);
    if (!token) {
      logger.warn(`⚠️ Token não está sendo monitorado: ${mint.substring(0, 8)}...`);
      return null;
    }

    logger.info(`🔍 Verificação forçada: ${token.ticker || mint.substring(0, 8)}...`);

    try {
      const price = await jupiterService.getUsdPrice(mint);

      if (price && price > 0) {
        const previousPrice = token.lastPrice;
        token.lastPrice = price;
        token.lastUpdate = Date.now();
        token.consecutiveFailures = 0;

        // Emitir evento de preço atualizado
        botEventEmitter.emit('price:updated', {
          mint,
          ticker: token.ticker,
          price,
          previousPrice,
          timestamp: Date.now()
        });

        return price;
      } else {
        token.consecutiveFailures++;

        // Emitir evento de preço stale
        botEventEmitter.emit('price:stale', {
          mint,
          ticker: token.ticker,
          lastSeen: token.lastUpdate || 0,
          attempts: token.consecutiveFailures
        });

        return null;
      }
    } catch (error) {
      token.consecutiveFailures++;
      logger.error(`❌ Erro na verificação forçada para ${token.ticker || mint.substring(0, 8)}...`, error);
      return null;
    }
  }

  /**
   * Listar todos os tokens monitorados
   */
  getMonitoredTokens(): MonitoredToken[] {
    return Array.from(this.monitoredTokens.values());
  }

  /**
   * Verificar se um token está sendo monitorado
   */
  isMonitoring(mint: string): boolean {
    return this.monitoredTokens.has(mint);
  }

  /**
   * Limpar tokens inativos (sem atualizações há muito tempo)
   */
  cleanupInactiveTokens(maxAgeMs: number = 24 * 60 * 60 * 1000): number { // 24h padrão
    const now = Date.now();
    let removed = 0;

    for (const [mint, token] of this.monitoredTokens.entries()) {
      const age = token.lastUpdate ? (now - token.lastUpdate) : now;

      if (age > maxAgeMs && token.consecutiveFailures >= 10) {
        this.unregisterToken(mint, `Inactive for ${Math.round(age / (60 * 60 * 1000))}h with ${token.consecutiveFailures} failures`);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info(`🧹 Limpeza realizada: ${removed} tokens inativos removidos`);
    }

    return removed;
  }

  /**
   * Ajustar intervalo dinamicamente baseado na carga
   */
  updateInterval(): void {
    const newInterval = jupiterService.getOptimalPriceCheckInterval() * 1000;

    if (newInterval !== this.currentInterval) {
      this.currentInterval = newInterval;

      logger.info(`⚡ Intervalo de preços atualizado: ${newInterval}ms`);

      // Reiniciar com novo intervalo se estiver rodando
      if (this.isRunning) {
        this.stopMonitoring('Interval update');
        this.startMonitoring();
      }
    }
  }

  /**
   * Destruir serviço (cleanup)
   */
  async destroy(): Promise<void> {
    logger.info('🔄 Finalizando Price Monitor...');

    this.stopMonitoring('Service destroyed');
    this.monitoredTokens.clear();

    logger.success('✅ Price Monitor finalizado');
  }
}

// Instância singleton
export const priceMonitorService = new PriceMonitorService();