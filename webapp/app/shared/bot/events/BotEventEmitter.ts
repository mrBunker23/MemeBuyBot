// Sistema de Eventos Tipado para o Bot - Event System
import { EventEmitter } from 'events';

// Definição completa de todos os eventos do bot
export interface BotEventMap {
  // === BOT LIFECYCLE ===
  'bot:started': { timestamp: string; config: any };
  'bot:stopped': { timestamp: string; reason?: string };
  'bot:error': { error: string; source: string; details?: any };
  'bot:config_updated': { changes: Record<string, any>; timestamp: string };

  // === SCRAPER EVENTS ===
  'scraper:initialized': { url: string; cookies: boolean };
  'scraper:token_detected': { token: any; score: number; url: string };
  'scraper:token_filtered': { token: any; reason: string; score: number };
  'scraper:error': { error: string; url?: string; attempt?: number };
  'scraper:cookies_expired': { timestamp: string };
  'scraper:rate_limited': { retryAfter: number };

  // === TRADING EVENTS ===
  'trading:buy_initiated': { mint: string; ticker: string; amount: number; usdValue: number };
  'trading:buy_confirmed': { mint: string; ticker: string; signature: string; actualPrice: number };
  'trading:buy_failed': { mint: string; ticker: string; error: string; reason: string };
  'trading:sell_initiated': { mint: string; ticker: string; stage: string; percentage: number };
  'trading:sell_confirmed': { mint: string; ticker: string; signature: string; profit: number };
  'trading:sell_failed': { mint: string; ticker: string; error: string; stage: string };

  // === POSITION EVENTS ===
  'position:created': { mint: string; ticker: string; entryPrice: number; amount: number };
  'position:updated': {
    mint: string;
    ticker: string;
    currentPrice: number;
    multiple: number;
    percentChange: number;
    highestMultiple: number;
  };
  'position:paused': { mint: string; ticker: string; reason: string };
  'position:resumed': { mint: string; ticker: string };
  'position:closed': { mint: string; ticker: string; finalProfit: number; reason: string };

  // === TAKE PROFIT EVENTS ===
  'takeprofit:triggered': {
    mint: string;
    ticker: string;
    stage: string;
    multiple: number;
    percentage: number;
  };
  'takeprofit:configured': { mint: string; stages: any[] };
  'takeprofit:disabled': { mint: string; reason: string };

  // === JUPITER EVENTS ===
  'jupiter:api_validated': { keyUsed: string; success: boolean };
  'jupiter:api_failed': { keyUsed: string; error: string };
  'jupiter:price_fetched': { mint: string; price: number; source: string };
  'jupiter:price_failed': { mint: string; error: string; attempt: number };
  'jupiter:trade_executed': {
    mint: string;
    type: 'BUY' | 'SELL';
    signature: string;
    inputAmount: number;
    outputAmount: number;
    slippage: number;
  };
  'jupiter:trade_failed': { mint: string; type: 'BUY' | 'SELL'; error: string };
  'jupiter:rate_limited': { retryAfter: number; keyUsed: string };

  // === SOLANA EVENTS ===
  'solana:wallet_loaded': { address: string; balance: number };
  'solana:balance_updated': { address: string; oldBalance: number; newBalance: number };
  'solana:transaction_signed': { signature: string; mint?: string };
  'solana:transaction_confirmed': { signature: string; slot: number };
  'solana:transaction_failed': { signature: string; error: string };
  'solana:rpc_error': { endpoint: string; error: string; retrying: boolean };
  'solana:rpc_switched': { oldEndpoint: string; newEndpoint: string };

  // === STATE EVENTS ===
  'state:saved': { positions: number; timestamp: string; fileSize: number };
  'state:loaded': { positions: number; lastModified: string };
  'state:error': { operation: string; error: string };
  'state:position_persisted': { mint: string; ticker: string };
  'state:price_history_updated': { mint: string; priceCount: number; oldestPrice: string };

  // === MONITORING EVENTS ===
  'monitor:started': { mint: string; ticker: string; interval: number };
  'monitor:stopped': { mint: string; ticker: string; reason: string };
  'monitor:price_check': { mint: string; currentPrice: number; multiple: number };
  'monitor:price_stale': { mint: string; lastUpdate: string; staleSince: number };
  'monitor:position_registered': { mint: string; ticker: string; registeredAt: number };
  'monitor:position_unregistered': { mint: string; ticker: string; reason: string };

  // === PRICE MONITOR EVENTS ===
  'price:updated': { mint: string; ticker?: string; price: number; previousPrice?: number; timestamp: number };
  'price:stale': { mint: string; ticker?: string; lastSeen: number; attempts: number };
  'price:batch_check_started': { tokenCount: number; interval: number; timestamp: number };
  'price:batch_check_completed': {
    tokenCount: number;
    successfulUpdates: number;
    staleTokens: number;
    executionTime: number;
    errors?: string[];
  };
  'price:monitor_started': { interval: number; tokenCount: number };
  'price:monitor_stopped': { reason: string; tokensMonitored: number };

  // === WEBSOCKET EVENTS ===
  'websocket:client_connected': { clientId: string; ip: string };
  'websocket:client_disconnected': { clientId: string; duration: number };
  'websocket:broadcast_sent': { event: string; clientCount: number };
  'websocket:error': { error: string; clientId?: string };

  // === LOGGER EVENTS ===
  'logger:log_created': { level: string; message: string; timestamp: string; source?: string };
  'logger:buffer_full': { droppedLogs: number; bufferSize: number };

  // === SYSTEM EVENTS ===
  'system:memory_warning': { usage: number; threshold: number };
  'system:performance_slow': { operation: string; duration: number; threshold: number };
  'system:file_error': { file: string; operation: string; error: string };
  'system:network_error': { url: string; error: string; retrying: boolean };
}

// Event Emitter tipado com TypeScript
export class BotEventEmitter extends EventEmitter {
  // Metrics helper - conta eventos emitidos por namespace
  private eventCounts: Record<string, number> = {};

  // On com tipagem segura
  on<K extends keyof BotEventMap>(event: K, listener: (data: BotEventMap[K]) => void): this {
    return super.on(event, listener);
  }

  // Once com tipagem segura
  once<K extends keyof BotEventMap>(event: K, listener: (data: BotEventMap[K]) => void): this {
    return super.once(event, listener);
  }

  // Off com tipagem segura
  off<K extends keyof BotEventMap>(event: K, listener: (data: BotEventMap[K]) => void): this {
    return super.off(event, listener);
  }

  // Namespace helper - retorna eventos de um namespace específico
  getNamespaceEvents(namespace: string): string[] {
    return Object.keys(this.eventNames()).filter(event =>
      typeof event === 'string' && event.startsWith(`${namespace}:`)
    );
  }

  // Debug helper - lista todos os eventos e seus listeners
  debugEventListeners(): Record<string, number> {
    const debug: Record<string, number> = {};
    for (const event of this.eventNames()) {
      if (typeof event === 'string') {
        debug[event] = this.listenerCount(event);
      }
    }
    return debug;
  }

  // Emit com tipagem segura e contador de eventos
  emit<K extends keyof BotEventMap>(event: K, data: BotEventMap[K]): boolean {
    // Incrementar contador
    const namespace = String(event).split(':')[0];
    this.eventCounts[namespace] = (this.eventCounts[namespace] || 0) + 1;
    this.eventCounts[String(event)] = (this.eventCounts[String(event)] || 0) + 1;

    return super.emit(event, data);
  }

  getEventCounts(): Record<string, number> {
    return { ...this.eventCounts };
  }

  resetEventCounts(): void {
    this.eventCounts = {};
  }
}

// Instância singleton do Event Emitter
export const botEventEmitter = new BotEventEmitter();

// Helper function para criar listeners seguros
export function createEventListener<K extends keyof BotEventMap>(
  event: K,
  handler: (data: BotEventMap[K]) => void | Promise<void>,
  options?: {
    once?: boolean;
    errorHandler?: (error: Error) => void;
  }
) {
  const safeHandler = async (data: BotEventMap[K]) => {
    try {
      await handler(data);
    } catch (error) {
      if (options?.errorHandler) {
        options.errorHandler(error as Error);
      } else {
        console.error(`Error in event handler for ${String(event)}:`, error);
        botEventEmitter.emit('system:error', {
          error: `Event handler error: ${(error as Error).message}`,
          source: `${String(event)} handler`,
          details: { event, data, error }
        });
      }
    }
  };

  if (options?.once) {
    botEventEmitter.once(event, safeHandler);
  } else {
    botEventEmitter.on(event, safeHandler);
  }

  return () => botEventEmitter.off(event, safeHandler);
}

// Helper para eventos condicionais
export function createConditionalEventListener<K extends keyof BotEventMap>(
  event: K,
  condition: (data: BotEventMap[K]) => boolean,
  handler: (data: BotEventMap[K]) => void | Promise<void>,
  options?: {
    errorHandler?: (error: Error) => void;
  }
) {
  return createEventListener(
    event,
    (data) => {
      if (condition(data)) {
        return handler(data);
      }
    },
    options
  );
}

// Export types para uso em outros arquivos
export type BotEvent = keyof BotEventMap;
export type BotEventData<T extends BotEvent> = BotEventMap[T];