// Adapter que conecta eventos reais do bot aos workflows visuais
import { botEventEmitter, createEventListener, type BotEvent, type BotEventData, type BotEventMap } from './BotEventEmitter';
import { logger } from '../utils/logger';

// Interface para executar workflows (será implementada quando workflows estiverem rodando de verdade)
interface WorkflowExecutor {
  triggerWorkflow(triggerType: string, data: any): Promise<void>;
  isWorkflowActive(workflowId: string): boolean;
  getActiveWorkflows(): string[];
}

// 🚀 AUTO-DISCOVERY: Todos os eventos do BotEventEmitter viram triggers automaticamente!

// Função para descobrir automaticamente todos os eventos disponíveis
function getAllAvailableEvents(): BotEvent[] {
  // Estes são todos os eventos tipados do BotEventMap
  return [
    // BOT LIFECYCLE
    'bot:started',
    'bot:stopped',
    'bot:error',
    'bot:config_updated',

    // SCRAPER EVENTS
    'scraper:initialized',
    'scraper:token_detected',
    'scraper:token_filtered',
    'scraper:error',
    'scraper:cookies_expired',
    'scraper:rate_limited',

    // TRADING EVENTS
    'trading:buy_initiated',
    'trading:buy_confirmed',
    'trading:buy_failed',
    'trading:sell_initiated',
    'trading:sell_confirmed',
    'trading:sell_failed',

    // POSITION EVENTS
    'position:created',
    'position:updated',
    'position:paused',
    'position:resumed',
    'position:closed',

    // TAKE PROFIT EVENTS
    'takeprofit:triggered',
    'takeprofit:configured',
    'takeprofit:disabled',

    // JUPITER EVENTS
    'jupiter:api_validated',
    'jupiter:api_failed',
    'jupiter:price_fetched',
    'jupiter:price_failed',
    'jupiter:trade_executed',
    'jupiter:trade_failed',
    'jupiter:rate_limited',

    // SOLANA EVENTS
    'solana:wallet_loaded',
    'solana:balance_updated',
    'solana:transaction_signed',
    'solana:transaction_confirmed',
    'solana:transaction_failed',
    'solana:rpc_error',
    'solana:rpc_switched',

    // STATE EVENTS
    'state:saved',
    'state:loaded',
    'state:error',
    'state:position_persisted',
    'state:price_history_updated',

    // MONITORING EVENTS
    'monitor:started',
    'monitor:stopped',
    'monitor:price_check',
    'monitor:price_stale',
    'monitor:position_registered',
    'monitor:position_unregistered',

    // PRICE MONITOR EVENTS (NEW!)
    'price:updated',
    'price:stale',
    'price:batch_check_started',
    'price:batch_check_completed',
    'price:monitor_started',
    'price:monitor_stopped',

    // WEBSOCKET EVENTS
    'websocket:client_connected',
    'websocket:client_disconnected',
    'websocket:broadcast_sent',
    'websocket:error',

    // LOGGER EVENTS
    'logger:log_created',
    'logger:buffer_full',

    // SYSTEM EVENTS
    'system:memory_warning',
    'system:performance_slow',
    'system:file_error',
    'system:network_error'
  ] as BotEvent[];
}

// Converter nome do evento para nome do trigger (formato amigável)
function eventToTriggerName(eventName: BotEvent): string {
  // Remove namespace e converte para formato amigável
  // Ex: 'trading:buy_confirmed' -> 'Buy Confirmed'
  return eventName
    .split(':')[1] // Remove namespace (trading:, bot:, etc)
    .split('_') // Separa por underscore
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize
    .join(' '); // Junta com espaços
}

// Mapear categorias para organizar triggers
function getEventCategory(eventName: BotEvent): string {
  const namespace = eventName.split(':')[0];
  const categoryMap: Record<string, string> = {
    'bot': '🤖 Bot Lifecycle',
    'trading': '💰 Trading',
    'position': '📊 Positions',
    'takeprofit': '🎯 Take Profits',
    'price': '📈 Price Monitoring',
    'monitor': '🔍 Monitoring',
    'scraper': '🕷️ Scraper',
    'jupiter': '🪐 Jupiter DEX',
    'solana': '🌐 Solana',
    'state': '💾 State Management',
    'websocket': '🔌 WebSocket',
    'logger': '📝 Logging',
    'system': '⚙️ System'
  };
  return categoryMap[namespace] || '❓ Other';
}

// Criar informações do trigger automaticamente
function createTriggerInfo(eventName: BotEvent) {
  return {
    id: eventName,
    name: eventToTriggerName(eventName),
    category: getEventCategory(eventName),
    description: `Triggered when ${eventToTriggerName(eventName).toLowerCase()} event occurs`,
    eventName: eventName,
    namespace: eventName.split(':')[0]
  };
}

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
    // 🚀 AUTO-SETUP: Criar listeners automaticamente para TODOS os eventos!
    const allEvents = getAllAvailableEvents();

    for (const eventName of allEvents) {
      const triggerInfo = createTriggerInfo(eventName);

      // Criar listener genérico para cada evento
      this.eventSubscriptions.push(
        createEventListener(eventName, (data: BotEventData<typeof eventName>) => {
          // Transformar dados do evento para formato padrão do workflow
          const workflowData = {
            ...data, // Todos os dados originais do evento
            timestamp: new Date().toISOString(),
            eventName: eventName,
            triggerType: triggerInfo.name.toLowerCase().replace(/\s+/g, '_'),
            triggerCategory: triggerInfo.category,
            triggerDescription: triggerInfo.description
          };

          this.triggerWorkflows(triggerInfo.id, workflowData);
        })
      );
    }

    logger.info(`📡 ${this.eventSubscriptions.length} event listeners configurados automaticamente para workflows`);
    logger.info(`🎯 Triggers disponíveis: ${allEvents.length} eventos de ${new Set(allEvents.map(e => e.split(':')[0])).size} categorias`);
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
    const allEvents = getAllAvailableEvents();
    const triggersByCategory = allEvents.reduce((acc, event) => {
      const category = getEventCategory(event);
      if (!acc[category]) acc[category] = [];
      acc[category].push(createTriggerInfo(event));
      return acc;
    }, {} as Record<string, ReturnType<typeof createTriggerInfo>[]>);

    return {
      isEnabled: this.isEnabled,
      hasExecutor: !!this.workflowExecutor,
      subscriptionCount: this.eventSubscriptions.length,
      totalEvents: allEvents.length,
      eventCategories: Object.keys(triggersByCategory).length,
      triggersByCategory,
      supportedTriggers: allEvents, // Todos os eventos são triggers agora!
      activeWorkflows: this.workflowExecutor?.getActiveWorkflows() || []
    };
  }

  // Obter todos os triggers disponíveis (para uso na interface)
  getAllAvailableTriggers() {
    return getAllAvailableEvents().map(eventName => createTriggerInfo(eventName));
  }

  // Obter triggers por categoria (para organizar na UI)
  getTriggersByCategory() {
    const allEvents = getAllAvailableEvents();
    return allEvents.reduce((acc, event) => {
      const category = getEventCategory(event);
      if (!acc[category]) acc[category] = [];
      acc[category].push(createTriggerInfo(event));
      return acc;
    }, {} as Record<string, ReturnType<typeof createTriggerInfo>[]>);
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

// 🚀 EXPORTS para uso em outros arquivos
export type { WorkflowExecutor };

// Funções utilitárias para o sistema de workflows
export {
  getAllAvailableEvents,
  eventToTriggerName,
  getEventCategory,
  createTriggerInfo
};