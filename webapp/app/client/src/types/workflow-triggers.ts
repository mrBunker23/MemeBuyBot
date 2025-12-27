// Triggers dinâmicos baseados em eventos reais do bot
import {
  getAllAvailableEvents,
  getEventCategory,
  createTriggerInfo,
  eventToTriggerName,
  type BotEvent
} from './workflow-utils';

// Definições específicas de dados para cada categoria de evento
const EVENT_DATA_DEFINITIONS: Record<string, Record<string, { type: string; description: string }>> = {
  'trading': {
    mint: { type: 'string', description: 'Token mint address' },
    ticker: { type: 'string', description: 'Token symbol/ticker' },
    signature: { type: 'string', description: 'Transaction signature' },
    actualPrice: { type: 'number', description: 'Executed price' },
    profit: { type: 'number', description: 'Profit amount' },
    amount: { type: 'string', description: 'Amount traded' },
    usdValue: { type: 'number', description: 'USD value' }
  },
  'position': {
    mint: { type: 'string', description: 'Token mint address' },
    ticker: { type: 'string', description: 'Token symbol/ticker' },
    currentPrice: { type: 'number', description: 'Current token price' },
    multiple: { type: 'number', description: 'Price multiple (current/entry)' },
    percentChange: { type: 'number', description: 'Percentage change' },
    highestMultiple: { type: 'number', description: 'Highest multiple reached' },
    entryPrice: { type: 'number', description: 'Entry price' },
    amount: { type: 'number', description: 'Position amount' }
  },
  'price': {
    mint: { type: 'string', description: 'Token mint address' },
    ticker: { type: 'string', description: 'Token symbol/ticker' },
    price: { type: 'number', description: 'Current price' },
    previousPrice: { type: 'number', description: 'Previous price' },
    timestamp: { type: 'number', description: 'Update timestamp' },
    tokenCount: { type: 'number', description: 'Number of tokens monitored' },
    successfulUpdates: { type: 'number', description: 'Successful price updates' },
    staleTokens: { type: 'number', description: 'Tokens with stale prices' },
    executionTime: { type: 'number', description: 'Batch execution time (ms)' },
    attempts: { type: 'number', description: 'Failed attempts' },
    lastSeen: { type: 'number', description: 'Last successful update' }
  },
  'takeprofit': {
    mint: { type: 'string', description: 'Token mint address' },
    ticker: { type: 'string', description: 'Token symbol/ticker' },
    stage: { type: 'string', description: 'Take profit stage name' },
    multiple: { type: 'number', description: 'Multiple reached' },
    percentage: { type: 'number', description: 'Percentage to sell' }
  },
  'bot': {
    timestamp: { type: 'string', description: 'Event timestamp' },
    reason: { type: 'string', description: 'Reason for action' },
    config: { type: 'object', description: 'Bot configuration' }
  },
  'scraper': {
    url: { type: 'string', description: 'Scraped URL' },
    cookies: { type: 'boolean', description: 'Cookies status' },
    token: { type: 'object', description: 'Detected token data' },
    score: { type: 'number', description: 'Token score' },
    error: { type: 'string', description: 'Error message' },
    retryAfter: { type: 'number', description: 'Retry after (ms)' }
  },
  'jupiter': {
    keyUsed: { type: 'string', description: 'API key used' },
    success: { type: 'boolean', description: 'Operation success' },
    mint: { type: 'string', description: 'Token mint address' },
    price: { type: 'number', description: 'Token price' },
    source: { type: 'string', description: 'Price source' },
    error: { type: 'string', description: 'Error message' },
    attempt: { type: 'number', description: 'Attempt number' },
    type: { type: 'string', description: 'Trade type (BUY/SELL)' },
    signature: { type: 'string', description: 'Transaction signature' },
    inputAmount: { type: 'number', description: 'Input amount' },
    outputAmount: { type: 'number', description: 'Output amount' },
    slippage: { type: 'number', description: 'Slippage percentage' },
    retryAfter: { type: 'number', description: 'Rate limit retry time' }
  },
  'solana': {
    address: { type: 'string', description: 'Wallet address' },
    balance: { type: 'number', description: 'Wallet balance' },
    oldBalance: { type: 'number', description: 'Previous balance' },
    newBalance: { type: 'number', description: 'New balance' },
    signature: { type: 'string', description: 'Transaction signature' },
    slot: { type: 'number', description: 'Blockchain slot' },
    error: { type: 'string', description: 'Error message' },
    endpoint: { type: 'string', description: 'RPC endpoint' },
    retrying: { type: 'boolean', description: 'Is retrying' },
    oldEndpoint: { type: 'string', description: 'Previous RPC endpoint' },
    newEndpoint: { type: 'string', description: 'New RPC endpoint' }
  },
  'state': {
    positions: { type: 'number', description: 'Number of positions' },
    timestamp: { type: 'string', description: 'Operation timestamp' },
    fileSize: { type: 'number', description: 'File size (bytes)' },
    lastModified: { type: 'string', description: 'Last modification time' },
    operation: { type: 'string', description: 'State operation' },
    error: { type: 'string', description: 'Error message' },
    mint: { type: 'string', description: 'Token mint address' },
    ticker: { type: 'string', description: 'Token symbol/ticker' },
    priceCount: { type: 'number', description: 'Number of price records' },
    oldestPrice: { type: 'string', description: 'Oldest price timestamp' }
  },
  'monitor': {
    mint: { type: 'string', description: 'Token mint address' },
    ticker: { type: 'string', description: 'Token symbol/ticker' },
    interval: { type: 'number', description: 'Monitor interval (ms)' },
    reason: { type: 'string', description: 'Monitor action reason' },
    currentPrice: { type: 'number', description: 'Current price' },
    multiple: { type: 'number', description: 'Price multiple' },
    lastUpdate: { type: 'string', description: 'Last update timestamp' },
    staleSince: { type: 'number', description: 'Stale since timestamp' },
    registeredAt: { type: 'number', description: 'Registration timestamp' }
  },
  'websocket': {
    clientId: { type: 'string', description: 'WebSocket client ID' },
    ip: { type: 'string', description: 'Client IP address' },
    duration: { type: 'number', description: 'Connection duration (ms)' },
    event: { type: 'string', description: 'Broadcasted event' },
    clientCount: { type: 'number', description: 'Number of clients' },
    error: { type: 'string', description: 'Error message' }
  },
  'logger': {
    level: { type: 'string', description: 'Log level' },
    message: { type: 'string', description: 'Log message' },
    timestamp: { type: 'string', description: 'Log timestamp' },
    source: { type: 'string', description: 'Log source' },
    droppedLogs: { type: 'number', description: 'Number of dropped logs' },
    bufferSize: { type: 'number', description: 'Buffer size' }
  },
  'system': {
    usage: { type: 'number', description: 'Memory usage' },
    threshold: { type: 'number', description: 'Memory threshold' },
    operation: { type: 'string', description: 'System operation' },
    duration: { type: 'number', description: 'Operation duration (ms)' },
    file: { type: 'string', description: 'File path' },
    error: { type: 'string', description: 'Error message' },
    url: { type: 'string', description: 'Network URL' },
    retrying: { type: 'boolean', description: 'Is retrying operation' }
  }
};

// Gerar triggers automaticamente para todos os eventos
export function generateAllTriggers() {
  const allEvents = getAllAvailableEvents();

  return allEvents.map(eventName => {
    const triggerInfo = createTriggerInfo(eventName);
    const namespace = eventName.split(':')[0];
    const eventFields = EVENT_DATA_DEFINITIONS[namespace] || {};

    return {
      id: eventName,
      name: triggerInfo.name,
      label: triggerInfo.name,
      category: triggerInfo.category,
      description: triggerInfo.description,
      eventName: eventName,
      namespace: namespace,
      icon: getCategoryIcon(namespace),
      color: getCategoryColor(namespace),
      fields: {
        // Campos sempre disponíveis
        timestamp: { type: 'string', description: 'Event timestamp' },
        eventName: { type: 'string', description: 'Original event name' },
        triggerType: { type: 'string', description: 'Trigger type' },
        triggerCategory: { type: 'string', description: 'Trigger category' },
        // Campos específicos do evento
        ...eventFields
      },
      defaultConfig: {
        eventType: eventName,
        filterEnabled: false,
        conditions: []
      }
    };
  });
}

// Organizar triggers por categoria
export function getTriggersByCategory() {
  const triggers = generateAllTriggers();

  return triggers.reduce((acc, trigger) => {
    const category = trigger.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(trigger);
    return acc;
  }, {} as Record<string, typeof triggers>);
}

// Obter ícones por categoria
function getCategoryIcon(namespace: string): string {
  const iconMap: Record<string, string> = {
    'bot': '🤖',
    'trading': '💰',
    'position': '📊',
    'takeprofit': '🎯',
    'price': '📈',
    'monitor': '🔍',
    'scraper': '🕷️',
    'jupiter': '🪐',
    'solana': '🌐',
    'state': '💾',
    'websocket': '🔌',
    'logger': '📝',
    'system': '⚙️'
  };
  return iconMap[namespace] || '❓';
}

// Obter cores por categoria
function getCategoryColor(namespace: string): string {
  const colorMap: Record<string, string> = {
    'bot': '#16a34a',         // verde
    'trading': '#dc2626',     // vermelho
    'position': '#3b82f6',    // azul
    'takeprofit': '#f59e0b',  // laranja
    'price': '#8b5cf6',       // roxo
    'monitor': '#06b6d4',     // cyan
    'scraper': '#84cc16',     // lime
    'jupiter': '#6366f1',     // indigo
    'solana': '#10b981',      // emerald
    'state': '#64748b',       // slate
    'websocket': '#ec4899',   // pink
    'logger': '#6b7280',      // gray
    'system': '#ef4444'       // red
  };
  return colorMap[namespace] || '#6b7280';
}

// Verificar se um evento é válido para triggers
export function isValidTriggerEvent(eventName: string): boolean {
  return getAllAvailableEvents().includes(eventName as any);
}

// Obter dados mock para um trigger específico
export function getMockDataForTrigger(eventName: string): any {
  const namespace = eventName.split(':')[0];
  const eventFields = EVENT_DATA_DEFINITIONS[namespace] || {};

  const mockData: any = {
    timestamp: new Date().toISOString(),
    eventName: eventName,
    triggerType: eventToTriggerName(eventName).toLowerCase().replace(/\s+/g, '_'),
    triggerCategory: getEventCategory(eventName)
  };

  // Gerar dados mock para cada campo
  Object.entries(eventFields).forEach(([field, definition]) => {
    switch (definition.type) {
      case 'string':
        mockData[field] = field.includes('mint') ? 'So11111111111111111111111111111111111112' :
                         field.includes('ticker') ? 'SOL' :
                         field.includes('signature') ? 'ABC123def456...' :
                         `mock_${field}`;
        break;
      case 'number':
        mockData[field] = field.includes('price') ? 89.45 :
                         field.includes('percentage') || field.includes('multiple') ? 2.15 :
                         field.includes('timestamp') ? Date.now() :
                         Math.floor(Math.random() * 100);
        break;
      case 'boolean':
        mockData[field] = Math.random() > 0.5;
        break;
      case 'object':
        mockData[field] = { example: 'data' };
        break;
      default:
        mockData[field] = null;
    }
  });

  return mockData;
}