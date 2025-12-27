// Utilitários de workflow para o cliente - sem dependências do servidor

// Definição completa de todos os eventos do bot (copiado do BotEventMap)
export type BotEvent =
  // BOT LIFECYCLE
  | 'bot:started'
  | 'bot:stopped'
  | 'bot:error'
  | 'bot:config_updated'

  // SCRAPER EVENTS
  | 'scraper:initialized'
  | 'scraper:token_detected'
  | 'scraper:token_filtered'
  | 'scraper:error'
  | 'scraper:cookies_expired'
  | 'scraper:rate_limited'

  // TRADING EVENTS
  | 'trading:buy_initiated'
  | 'trading:buy_confirmed'
  | 'trading:buy_failed'
  | 'trading:sell_initiated'
  | 'trading:sell_confirmed'
  | 'trading:sell_failed'

  // POSITION EVENTS
  | 'position:created'
  | 'position:updated'
  | 'position:paused'
  | 'position:resumed'
  | 'position:closed'

  // TAKE PROFIT EVENTS
  | 'takeprofit:triggered'
  | 'takeprofit:configured'
  | 'takeprofit:disabled'

  // JUPITER EVENTS
  | 'jupiter:api_validated'
  | 'jupiter:api_failed'
  | 'jupiter:price_fetched'
  | 'jupiter:price_failed'
  | 'jupiter:trade_executed'
  | 'jupiter:trade_failed'
  | 'jupiter:rate_limited'

  // SOLANA EVENTS
  | 'solana:wallet_loaded'
  | 'solana:balance_updated'
  | 'solana:transaction_signed'
  | 'solana:transaction_confirmed'
  | 'solana:transaction_failed'
  | 'solana:rpc_error'
  | 'solana:rpc_switched'

  // STATE EVENTS
  | 'state:saved'
  | 'state:loaded'
  | 'state:error'
  | 'state:position_persisted'
  | 'state:price_history_updated'

  // MONITORING EVENTS
  | 'monitor:started'
  | 'monitor:stopped'
  | 'monitor:price_check'
  | 'monitor:price_stale'
  | 'monitor:position_registered'
  | 'monitor:position_unregistered'

  // PRICE MONITOR EVENTS (NEW!)
  | 'price:updated'
  | 'price:stale'
  | 'price:batch_check_started'
  | 'price:batch_check_completed'
  | 'price:monitor_started'
  | 'price:monitor_stopped'

  // WEBSOCKET EVENTS
  | 'websocket:client_connected'
  | 'websocket:client_disconnected'
  | 'websocket:broadcast_sent'
  | 'websocket:error'

  // LOGGER EVENTS
  | 'logger:log_created'
  | 'logger:buffer_full'

  // SYSTEM EVENTS
  | 'system:memory_warning'
  | 'system:performance_slow'
  | 'system:file_error'
  | 'system:network_error';

// Função para descobrir automaticamente todos os eventos disponíveis
export function getAllAvailableEvents(): BotEvent[] {
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
  ];
}

// Converter nome do evento para nome do trigger (formato amigável)
export function eventToTriggerName(eventName: BotEvent): string {
  // Remove namespace e converte para formato amigável
  // Ex: 'trading:buy_confirmed' -> 'Buy Confirmed'
  return eventName
    .split(':')[1] // Remove namespace (trading:, bot:, etc)
    .split('_') // Separa por underscore
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize
    .join(' '); // Junta com espaços
}

// Mapear categorias para organizar triggers
export function getEventCategory(eventName: BotEvent): string {
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
export function createTriggerInfo(eventName: BotEvent) {
  return {
    id: eventName,
    name: eventToTriggerName(eventName),
    category: getEventCategory(eventName),
    description: `Triggered when ${eventToTriggerName(eventName).toLowerCase()} event occurs`,
    eventName: eventName,
    namespace: eventName.split(':')[0]
  };
}