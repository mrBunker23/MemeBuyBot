import { config, STAGES } from '../config';
import { jupiterService } from './jupiter.service';
import { solanaService } from './solana.service';
import { stateService } from './state.service';
import { logger } from '../utils/logger';
import { statusMonitor } from '../utils/status-monitor';

class TradingService {
  async buyToken(mint: string): Promise<boolean> {
    const lamports = BigInt(Math.floor(config.amountSol * 1e9));

    const result = await jupiterService.executeTrade({
      inputMint: config.solMint,
      outputMint: mint,
      amountInt: lamports.toString(),
    });

    if (!result.ok) {
      logger.error('Compra falhou');
      return false;
    }

    logger.success(`Compra: ${config.amountSol} SOL`);
    return true;
  }

  async sellToken(mint: string, amountBaseUnits: bigint): Promise<boolean> {
    if (amountBaseUnits <= 0n) return false;

    const result = await jupiterService.executeTrade({
      inputMint: mint,
      outputMint: config.solMint,
      amountInt: amountBaseUnits.toString(),
    });

    if (!result.ok) {
      logger.error('Venda falhou');
      return false;
    }

    logger.success(`Venda executada`);
    return true;
  }

  async getEntryPrice(mint: string, maxRetries = 15): Promise<number | null> {
    for (let i = 0; i < maxRetries; i++) {
      const price = await jupiterService.getUsdPrice(mint);
      if (price) return price;
      await this.sleep(2000);
    }
    return null;
  }

  async monitorPosition(mint: string): Promise<void> {
    const pos = stateService.getPosition(mint);
    if (!pos) return;

    const ticker = mint.substring(0, 6);

    // Aguardar preço de entrada se não existir
    if (!pos.entryUsd) {
      logger.info(`${ticker} aguardando preço de entrada...`);
      for (let i = 0; i < 20; i++) {
        const price = await jupiterService.getUsdPrice(mint);
        if (price) {
          stateService.updatePositionEntry(mint, price);
          logger.success(`${ticker} entrada: $${price.toFixed(6)}`);
          break;
        }
        await this.sleep(2000);
      }

      // Se ainda não tem preço, avisar
      if (!pos.entryUsd && !stateService.getPosition(mint)?.entryUsd) {
        logger.warn(`${ticker} não conseguiu obter preço de entrada`);
        return;
      }
    } else {
      logger.info(`${ticker} monitorando - entrada: $${pos.entryUsd.toFixed(6)}`);
    }

    while (true) {
      // Verificar se TP4 foi executado ou se saldo é zero
      const balance = await solanaService.getTokenBalance(mint);

      if (pos.sold?.tp4 && balance.amount === 0n) {
        logger.info(`${pos.ticker || mint.substring(0, 6)} - Monitoramento finalizado (TP4 completo)`);
        return;
      }

      const currentPrice = await jupiterService.getUsdPrice(mint);
      if (!currentPrice || !pos.entryUsd) {
        await this.sleep(config.priceCheckSeconds * 1000);
        continue;
      }

      const multiple = currentPrice / pos.entryUsd;
      const percentChange = ((multiple - 1) * 100).toFixed(2);

      // Atualizar histórico de preços
      stateService.updatePrice(mint, currentPrice);

      // Encontrar próximo TP
      const nextTp = STAGES.find(s => !pos.sold?.[s.name as keyof typeof pos.sold]);
      const nextTpText = nextTp
        ? `→ ${nextTp.name.toUpperCase()} (${nextTp.multiple}x)`
        : 'Concluído';

      // Usar ticker do state ao invés de substring
      const ticker = pos.ticker || mint.substring(0, 6);

      // Calcular TPs vendidos
      const soldTPs = [];
      if (pos.sold?.tp1) soldTPs.push('tp1');
      if (pos.sold?.tp2) soldTPs.push('tp2');
      if (pos.sold?.tp3) soldTPs.push('tp3');
      if (pos.sold?.tp4) soldTPs.push('tp4');

      // Formatar saldo
      const balanceFormatted = balance.amount > 0n
        ? (Number(balance.amount) / Math.pow(10, balance.decimals)).toFixed(2)
        : '0';

      // Atualizar status monitor (vai remover automaticamente se TP4 + saldo zero)
      statusMonitor.updatePosition(
        mint,
        ticker,
        multiple,
        (percentChange >= '0' ? '+' : '') + percentChange + '%',
        soldTPs,
        balanceFormatted
      );

      logger.position(
        ticker,
        multiple,
        (percentChange >= '0' ? '+' : '') + percentChange,
        nextTpText,
        pos.highestMultiple || multiple
      );

      for (const stage of STAGES) {
        pos.sold = pos.sold || {};
        if (pos.sold[stage.name as keyof typeof pos.sold]) continue;

        if (multiple >= stage.multiple) {
          // Buscar saldo atualizado antes de vender
          const currentBalance = await solanaService.getTokenBalance(mint);

          if (currentBalance.amount <= 0n) {
            logger.warn(`Sem saldo para ${stage.name}`);
            stateService.markStageSold(mint, stage.name);
            continue;
          }

          // Calcular quanto vender baseado no percentual
          let sellAmount: bigint;
          if (stage.sellPercent >= 100) {
            sellAmount = currentBalance.amount;
          } else {
            sellAmount = (currentBalance.amount * BigInt(stage.sellPercent)) / 100n;
            if (sellAmount <= 0n) sellAmount = currentBalance.amount;
          }

          logger.success(
            `${stage.name.toUpperCase()} atingido! ${multiple.toFixed(2)}x → Vendendo ${stage.sellPercent}%`
          );

          const success = await this.sellToken(mint, sellAmount);
          if (success) {
            stateService.markStageSold(mint, stage.name);
          }
        }
      }

      await this.sleep(config.priceCheckSeconds * 1000);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const tradingService = new TradingService();
