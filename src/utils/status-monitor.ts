import { logger } from './logger';
import Table from 'cli-table3';
import chalk from 'chalk';

interface TokenStatus {
  ticker: string;
  mint: string;
  lastPrice: number | null;
  lastUpdate: Date;
  multiple: number | null;
  percentChange: string | null;
  soldTPs: string[];
  balance: string | null;
}

interface Transaction {
  type: 'COMPRA' | 'VENDA';
  ticker: string;
  amount: string;
  timestamp: Date;
  success: boolean;
  stage?: string; // Para vendas (TP1, TP2, etc)
}

class StatusMonitor {
  private tokens: Map<string, TokenStatus> = new Map();
  private transactions: Transaction[] = [];
  private lastApiCall: Date | null = null;
  private apiCallCount: number = 0;
  private readonly MAX_TRANSACTIONS = 10;

  updatePrice(mint: string, ticker: string, price: number | null, immediate: boolean = false): void {
    const existing = this.tokens.get(mint);

    if (price !== null) {
      this.lastApiCall = new Date();
      this.apiCallCount++;
    }

    this.tokens.set(mint, {
      ticker,
      mint,
      lastPrice: price,
      lastUpdate: new Date(),
      multiple: existing?.multiple || null,
      percentChange: existing?.percentChange || null,
      soldTPs: existing?.soldTPs || [],
      balance: existing?.balance || null,
    });

    if (immediate) {
      this.printStatus();
    }
  }

  updatePosition(mint: string, ticker: string, multiple: number, percentChange: string, soldTPs?: string[], balance?: string, immediate: boolean = true): void {
    const existing = this.tokens.get(mint);

    // Verificar se TP4 foi executado e saldo é zero
    const hasTP4 = soldTPs?.includes('tp4') || false;
    const balanceNum = parseFloat(balance || '0');

    if (hasTP4 && balanceNum === 0) {
      // Remover do monitoramento - posição finalizada
      this.removeToken(mint);
      logger.info(`${ticker} removido do monitoramento (TP4 completo, saldo zero)`);
      this.printStatus(); // Atualizar imediatamente
      return;
    }

    this.tokens.set(mint, {
      ticker,
      mint,
      lastPrice: existing?.lastPrice || null,
      lastUpdate: new Date(),
      multiple,
      percentChange,
      soldTPs: soldTPs || existing?.soldTPs || [],
      balance: balance || existing?.balance || null,
    });

    if (immediate) {
      this.printStatus();
    }
  }

  removeToken(mint: string): void {
    this.tokens.delete(mint);
  }

  pauseToken(mint: string): void {
    const existing = this.tokens.get(mint);
    if (existing) {
      logger.info(`${existing.ticker} removido do monitor (posição pausada)`);
      this.tokens.delete(mint);
      this.printStatus(); // Atualizar imediatamente
    }
  }

  addTransaction(type: 'COMPRA' | 'VENDA', ticker: string, amount: string, success: boolean, stage?: string, immediate: boolean = true): void {
    this.transactions.unshift({
      type,
      ticker,
      amount,
      timestamp: new Date(),
      success,
      stage
    });

    // Manter apenas as últimas N transações
    if (this.transactions.length > this.MAX_TRANSACTIONS) {
      this.transactions = this.transactions.slice(0, this.MAX_TRANSACTIONS);
    }

    if (immediate) {
      this.printStatus();
    }
  }

  printStatus(): void {
    console.clear();
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════════════'));
    console.log(chalk.bold.yellow('                    🤖 TOKEN FINDER BOT - STATUS                    '));
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════════════'));
    console.log('');

    // Status da API
    const now = new Date();
    const timeSinceLastCall = this.lastApiCall
      ? Math.floor((now.getTime() - this.lastApiCall.getTime()) / 1000)
      : null;

    console.log(chalk.bold.blue('📡 API Jupiter:'));
    console.log(chalk.gray(`   Chamadas: ${chalk.white(this.apiCallCount)}`));
    console.log(chalk.gray(`   Última: ${chalk.white(timeSinceLastCall !== null ? timeSinceLastCall + 's atrás' : 'Nenhuma ainda')}`));
    console.log('');

    // Tokens monitorados
    if (this.tokens.size === 0) {
      console.log(chalk.gray('📊 Nenhum token sendo monitorado'));
    } else {
      console.log(chalk.bold.cyan(`📊 Tokens Monitorados (${this.tokens.size}):`));

      const table = new Table({
        head: [
          chalk.bold('Ticker'),
          chalk.bold('Performance'),
          chalk.bold('Status'),
          chalk.bold('Saldo'),
          chalk.bold('Update')
        ],
        style: {
          head: [],
          border: ['cyan']
        },
        colWidths: [12, 25, 12, 14, 10]
      });

      // Ordenar por ticker para manter ordem estável (fallback por mint se ticker igual)
      const sortedTokens = Array.from(this.tokens.values()).sort((a, b) => {
        const tickerCompare = a.ticker.localeCompare(b.ticker);
        return tickerCompare !== 0 ? tickerCompare : a.mint.localeCompare(b.mint);
      });

      for (const token of sortedTokens) {
        const timeAgo = Math.floor((now.getTime() - token.lastUpdate.getTime()) / 1000);
        const ticker = token.ticker.substring(0, 10);

        // Performance com cores
        const multiple = token.multiple !== null ? token.multiple : 0;
        const multipleText = token.multiple !== null ? `${token.multiple.toFixed(2)}x` : 'N/A';
        const change = token.percentChange || 'N/A';

        const isProfit = multiple >= 1;
        const performanceColor = isProfit ? chalk.green : chalk.red;
        const performance = performanceColor(`${multipleText} (${change})`);

        // Status com cores e ícones
        let status = '';
        if (token.soldTPs && token.soldTPs.length > 0) {
          // Mostrar apenas o último TP executado
          const lastTP = token.soldTPs[token.soldTPs.length - 1]?.toUpperCase();
          status = lastTP ? chalk.yellow(`✅ ${lastTP}`) : chalk.gray('⏳ Aguard.');
        } else {
          status = chalk.gray('⏳ Aguard.');
        }

        // Saldo
        const balance = token.balance || 'N/A';
        const balanceText = balance !== 'N/A' && balance !== '0'
          ? chalk.white(balance)
          : chalk.gray(balance);

        // Update
        const updated = `${timeAgo}s`;

        table.push([ticker, performance, status, balanceText, updated]);
      }

      console.log(table.toString());
    }

    // Tabela de transações
    console.log('');
    if (this.transactions.length > 0) {
      console.log(chalk.bold.magenta(`📜 Últimas Transações (${this.transactions.length}):`));

      const txTable = new Table({
        head: [
          chalk.bold('Tipo'),
          chalk.bold('Ticker'),
          chalk.bold('Quantidade'),
          chalk.bold('Status'),
          chalk.bold('Quando')
        ],
        style: {
          head: [],
          border: ['magenta']
        },
        colWidths: [10, 12, 16, 12, 12]
      });

      for (const tx of this.transactions) {
        const timeAgo = Math.floor((now.getTime() - tx.timestamp.getTime()) / 1000);
        const timeText = timeAgo < 60 ? `${timeAgo}s` : `${Math.floor(timeAgo / 60)}m`;

        // Tipo com cor
        const typeText = tx.type === 'COMPRA'
          ? chalk.blue('🔵 COMPRA')
          : chalk.yellow(`🟡 VENDA${tx.stage ? ` ${tx.stage.toUpperCase()}` : ''}`);

        // Ticker
        const ticker = tx.ticker.substring(0, 10);

        // Quantidade
        const amount = tx.amount;

        // Status com ícone
        const status = tx.success
          ? chalk.green('✅ OK')
          : chalk.red('❌ FALHA');

        txTable.push([typeText, ticker, amount, status, timeText]);
      }

      console.log(txTable.toString());
    } else {
      console.log(chalk.gray('📜 Nenhuma transação ainda'));
    }

    console.log('');
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════════════'));
    console.log(chalk.gray(`⏰ ${now.toLocaleTimeString('pt-BR')} - ${chalk.yellow('Pressione Ctrl+C para sair')}`));
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════════════'));
  }

  startAutoRefresh(intervalMs: number = 5000): void {
    setInterval(() => this.printStatus(), intervalMs);
  }
}

export const statusMonitor = new StatusMonitor();
