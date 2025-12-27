// Logger específico para o cliente (browser) - sem APIs do Node.js

type LogLevel = 'DEBUG' | 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';

interface LogMessage {
  level: LogLevel;
  message: string;
  timestamp: string;
  error?: any;
}

class ClientLogger {
  private logBuffer: LogMessage[] = [];
  private maxLogBuffer = 100; // Menor buffer para o cliente

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const icons = {
      DEBUG: '🐛',
      INFO: 'ℹ️',
      SUCCESS: '✅',
      WARN: '⚠️',
      ERROR: '❌',
    };
    return `[${timestamp}] ${icons[level]} ${message}`;
  }

  private emitLog(level: LogLevel, message: string, error?: any): void {
    const logMessage: LogMessage = {
      level,
      message,
      timestamp: new Date().toISOString(),
      error
    };

    // Adicionar ao buffer
    this.logBuffer.push(logMessage);
    if (this.logBuffer.length > this.maxLogBuffer) {
      this.logBuffer.shift();
    }
  }

  debug(message: string): void {
    const formatted = this.formatMessage('DEBUG', message);
    console.log(formatted);
    this.emitLog('DEBUG', message);
  }

  info(message: string): void {
    const formatted = this.formatMessage('INFO', message);
    console.log(formatted);
    this.emitLog('INFO', message);
  }

  success(message: string): void {
    const formatted = this.formatMessage('SUCCESS', message);
    console.log(formatted);
    this.emitLog('SUCCESS', message);
  }

  warn(message: string): void {
    const formatted = this.formatMessage('WARN', message);
    console.log(formatted);
    this.emitLog('WARN', message);
  }

  error(message: string, error?: any): void {
    const formatted = this.formatMessage('ERROR', message);
    console.error(formatted);
    if (error) {
      console.error('  → Error details:', error);
    }
    this.emitLog('ERROR', message, error);
  }

  // Obter logs recentes para interface
  getRecentLogs(): LogMessage[] {
    return [...this.logBuffer];
  }

  // Método para debugging de workflows no cliente
  workflow(message: string, data?: any): void {
    const formatted = this.formatMessage('INFO', `🔄 WORKFLOW: ${message}`);
    console.log(formatted);
    if (data) {
      console.log('  → Data:', data);
    }
    this.emitLog('INFO', `🔄 WORKFLOW: ${message}`, data);
  }
}

export const clientLogger = new ClientLogger();