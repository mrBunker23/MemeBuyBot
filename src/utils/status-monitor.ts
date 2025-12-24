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

class StatusMonitor {
  private tokens: Map<string, TokenStatus> = new Map();
  private lastApiCall: Date | null = null;
  private apiCallCount: number = 0;

  updatePrice(mint: string, ticker: string, price: number | null): void {
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
  }

  updatePosition(mint: string, ticker: string, multiple: number, percentChange: string, soldTPs?: string[], balance?: string): void {
    const existing = this.tokens.get(mint);
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

      const sortedTokens = Array.from(this.tokens.values()).sort((a, b) =>
        b.lastUpdate.getTime() - a.lastUpdate.getTime()
      );

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
          const tps = token.soldTPs.map(tp => tp.toUpperCase()).join(',');
          status = chalk.yellow(`✅ ${tps}`);
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
