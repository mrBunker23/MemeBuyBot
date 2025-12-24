import fs from 'fs';
import path from 'path';

type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';

class Logger {
  private lastError: string = '';
  private errorCount: Map<string, number> = new Map();
  private logDir = './logs';
  private currentLogFile: string = '';
  private maxFileSize = 5 * 1024 * 1024; // 5MB
  private maxFiles = 5; // Manter últimos 5 arquivos

  constructor() {
    this.initLogDir();
    this.rotateIfNeeded();
  }

  private initLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getCurrentLogFile(): string {
    if (!this.currentLogFile) {
      const date = new Date().toISOString().split('T')[0];
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      this.currentLogFile = path.join(this.logDir, `bot-${date}-${time}.log`);
    }
    return this.currentLogFile;
  }

  private rotateIfNeeded(): void {
    const logFile = this.getCurrentLogFile();

    // Verificar tamanho do arquivo
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      if (stats.size >= this.maxFileSize) {
        this.currentLogFile = ''; // Forçar criação de novo arquivo
        this.cleanOldLogs();
      }
    }
  }

  private cleanOldLogs(): void {
    const files = fs.readdirSync(this.logDir)
      .filter(f => f.startsWith('bot-') && f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: path.join(this.logDir, f),
        time: fs.statSync(path.join(this.logDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Remover arquivos mais antigos que maxFiles
    files.slice(this.maxFiles).forEach(f => {
      try {
        fs.unlinkSync(f.path);
      } catch (e) {
        // Ignorar erro ao deletar
      }
    });
  }

  private writeToFile(message: string): void {
    try {
      this.rotateIfNeeded();
      const logFile = this.getCurrentLogFile();
      fs.appendFileSync(logFile, message + '\n', 'utf8');
    } catch (e) {
      // Não quebrar se falhar ao escrever log
    }
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const icons = {
      INFO: 'ℹ️',
      SUCCESS: '✅',
      WARN: '⚠️',
      ERROR: '❌',
    };
    return `[${timestamp}] ${icons[level]} ${message}`;
  }

  private formatMessageFile(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  info(message: string): void {
    const formatted = this.formatMessage('INFO', message);
    console.log(formatted);
    this.writeToFile(this.formatMessageFile('INFO', message));
  }

  success(message: string): void {
    const formatted = this.formatMessage('SUCCESS', message);
    console.log(formatted);
    this.writeToFile(this.formatMessageFile('SUCCESS', message));
  }

  warn(message: string): void {
    const formatted = this.formatMessage('WARN', message);
    console.log(formatted);
    this.writeToFile(this.formatMessageFile('WARN', message));
  }

  error(message: string, error?: any): void {
    // Evitar spam de erros repetidos
    const errorKey = message + (error?.code || '');
    const count = this.errorCount.get(errorKey) || 0;

    let fullMessage = message;
    if (error?.code) {
      fullMessage += ` (${error.code})`;
    }
    if (error?.body) {
      fullMessage += ` | Body: ${error.body.substring(0, 200)}`;
    }

    if (count === 0) {
      // Mostrar primeira vez
      console.error(this.formatMessage('ERROR', message));
      if (error?.code) {
        console.error(`  → Código: ${error.code}`);
      }
      if (error?.body) {
        console.error(`  → Resposta: ${error.body.substring(0, 300)}`);
      }
      this.writeToFile(this.formatMessageFile('ERROR', fullMessage));
    } else if (count % 10 === 0) {
      // Mostrar a cada 10 ocorrências
      const msg = `${message} (${count}x)`;
      console.error(this.formatMessage('ERROR', msg));
      this.writeToFile(this.formatMessageFile('ERROR', msg));
    }

    this.errorCount.set(errorKey, count + 1);
  }

  // Log de posição (substituirá os logs repetitivos)
  position(ticker: string, multiple: number, percent: string, nextTp: string, highestMultiple?: number): void {
    const symbol = multiple >= 1 ? '📈' : '📉';
    const maxInfo = highestMultiple ? ` | Máx: ${highestMultiple.toFixed(2)}x` : '';
    const msg = `${symbol} ${ticker.padEnd(10)} | Atual: ${multiple.toFixed(2)}x (${percent}%)${maxInfo} | ${nextTp}`;
    console.log(msg);
    this.writeToFile(
      this.formatMessageFile('INFO', `${ticker} | Atual: ${multiple.toFixed(2)}x (${percent}%)${maxInfo} | ${nextTp}`)
    );
  }
}

export const logger = new Logger();
