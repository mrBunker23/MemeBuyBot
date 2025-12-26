// Adapter que conecta eventos reais do bot aos workflows visuais
import { botEventEmitter, createEventListener, type BotEvent, type BotEventData } from './BotEventEmitter';
import { logger } from '../utils/logger';

// Interface para executar workflows (será implementada quando workflows estiverem rodando de verdade)
interface WorkflowExecutor {
  triggerWorkflow(triggerType: string, data: any): Promise<void>;
  isWorkflowActive(workflowId: string): boolean;
  getActiveWorkflows(): string[];
}

// Mapeamento de eventos do bot para triggers de workflows
const EVENT_TO_TRIGGER_MAPPING = {
  // Price events
  'jupiter:price_fetched': 'price_change',
  'monitor:price_check': 'price_change',

  // Trading events
  'trading:buy_initiated': 'buy_initiated',
  'trading:buy_confirmed': 'buy_confirmed',
  'trading:sell_confirmed': 'sell_confirmed',
  'takeprofit:triggered': 'take_profit',

  // Position events
  'position:created': 'position_opened',
  'position:updated': 'position_updated',
  'position:closed': 'position_closed',

  // Volume events (quando implementado)
  'jupiter:volume_fetched': 'volume_change',

  // Time events (será implementado no futuro)
  'system:time_interval': 'time_trigger',

  // Bot lifecycle
  'bot:started': 'bot_started',
  'bot:stopped': 'bot_stopped',
  'bot:error': 'bot_error'
} as const;

// Transformação de dados de eventos para formato de workflow
class WorkflowEventAdapter {
  private workflowExecutor: WorkflowExecutor | null = null;
  private eventSubscriptions: (() => void)[] = [];
  private isEnabled = false;

  constructor() {
    this.setupEventListeners();
  }

  setWorkflowExecutor(executor: WorkflowExecutor) {
    this.workflowExecutor = executor;
    this.isEnabled = true;
    logger.info('🔄 Workflow Event Adapter ativado');
  }

  disable() {
    this.isEnabled = false;
    this.workflowExecutor = null;
    logger.info('⏸️ Workflow Event Adapter desativado');
  }

  private setupEventListeners() {
    // === PRICE CHANGE EVENTS ===
    this.eventSubscriptions.push(
      createEventListener('monitor:price_check', (data) => {
        this.triggerWorkflows('price_change', {
          token: data.mint,
          currentPrice: data.currentPrice,
          multiple: data.multiple,
          timestamp: new Date().toISOString(),
          triggerType: 'price_change'
        });
      })
    );

    // === TRADING EVENTS ===
    this.eventSubscriptions.push(
      createEventListener('trading:buy_confirmed', (data) => {
        this.triggerWorkflows('buy_confirmed', {
          token: data.mint,
          ticker: data.ticker,
          signature: data.signature,
          actualPrice: data.actualPrice,
          timestamp: new Date().toISOString(),
          triggerType: 'buy_confirmed'
        });
      })
    );

    this.eventSubscriptions.push(
      createEventListener('trading:sell_confirmed', (data) => {
        this.triggerWorkflows('sell_confirmed', {
          token: data.mint,
          ticker: data.ticker,
          signature: data.signature,
          profit: data.profit,
          timestamp: new Date().toISOString(),
          triggerType: 'sell_confirmed'
        });
      })
    );

    // === TAKE PROFIT EVENTS ===
    this.eventSubscriptions.push(
      createEventListener('takeprofit:triggered', (data) => {
        this.triggerWorkflows('take_profit', {
          token: data.mint,
          ticker: data.ticker,
          stage: data.stage,
          multiple: data.multiple,
          percentage: data.percentage,
          timestamp: new Date().toISOString(),
          triggerType: 'take_profit'
        });
      })
    );

    // === POSITION EVENTS ===
    this.eventSubscriptions.push(
      createEventListener('position:created', (data) => {
        this.triggerWorkflows('position_opened', {
          token: data.mint,
          ticker: data.ticker,
          entryPrice: data.entryPrice,
          amount: data.amount,
          timestamp: new Date().toISOString(),
          triggerType: 'position_opened'
        });
      })
    );

    this.eventSubscriptions.push(
      createEventListener('position:updated', (data) => {
        this.triggerWorkflows('position_updated', {
          token: data.mint,
          ticker: data.ticker,
          currentPrice: data.currentPrice,
          multiple: data.multiple,
          percentChange: data.percentChange,
          highestMultiple: data.highestMultiple,
          timestamp: new Date().toISOString(),
          triggerType: 'position_updated'
        });
      })
    );

    // === BOT LIFECYCLE EVENTS ===
    this.eventSubscriptions.push(
      createEventListener('bot:started', (data) => {
        this.triggerWorkflows('bot_started', {
          timestamp: data.timestamp,
          config: data.config,
          triggerType: 'bot_started'
        });
      })
    );

    this.eventSubscriptions.push(
      createEventListener('bot:stopped', (data) => {
        this.triggerWorkflows('bot_stopped', {
          timestamp: data.timestamp,
          reason: data.reason,
          triggerType: 'bot_stopped'
        });
      })
    );

    // === SCRAPER EVENTS ===
    this.eventSubscriptions.push(
      createEventListener('scraper:token_detected', (data) => {
        this.triggerWorkflows('token_detected', {
          token: data.token,
          score: data.score,
          url: data.url,
          timestamp: new Date().toISOString(),
          triggerType: 'token_detected'
        });
      })
    );

    logger.info(`📡 ${this.eventSubscriptions.length} event listeners configurados para workflows`);
  }

  private async triggerWorkflows(triggerType: string, workflowData: any) {
    if (!this.isEnabled || !this.workflowExecutor) {
      return; // Silently ignore if not enabled
    }

    try {
      // Debug log
      logger.debug(`🔄 Triggering workflows for: ${triggerType}`, {
        triggerType,
        dataKeys: Object.keys(workflowData)
      });

      await this.workflowExecutor.triggerWorkflow(triggerType, workflowData);
    } catch (error) {
      logger.error(`Erro ao executar workflows para ${triggerType}:`, error);

      // Emitir evento de erro para o sistema
      botEventEmitter.emit('system:error', {
        error: `Workflow execution error: ${(error as Error).message}`,
        source: 'WorkflowEventAdapter',
        details: { triggerType, workflowData, error }
      });
    }
  }

  // Estatísticas e debug
  getStats() {
    return {
      isEnabled: this.isEnabled,
      hasExecutor: !!this.workflowExecutor,
      subscriptionCount: this.eventSubscriptions.length,
      supportedTriggers: Object.keys(EVENT_TO_TRIGGER_MAPPING),
      activeWorkflows: this.workflowExecutor?.getActiveWorkflows() || []
    };
  }

  // Cleanup
  destroy() {
    // Remover todos os listeners
    this.eventSubscriptions.forEach(unsubscribe => unsubscribe());
    this.eventSubscriptions = [];
    this.disable();
    logger.info('🗑️ Workflow Event Adapter destroyed');
  }
}

// Instância singleton do adapter
export const workflowEventAdapter = new WorkflowEventAdapter();

// Export types para uso em outros arquivos
export type { WorkflowExecutor };
export { EVENT_TO_TRIGGER_MAPPING };