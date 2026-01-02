import type { ScheduledBuy } from '../types';
import { logger } from '../utils/logger';
import { configManager } from '../config/config-manager';
import { tradingService } from './trading.service';
import { stateService } from './state.service';

/**
 * Serviço para gerenciar compras agendadas com delay
 * Permite agendar compras de tokens com um delay configurável
 */
class BuySchedulerService {
  private scheduledBuys = new Map<string, ScheduledBuy>();

  /**
   * Agenda uma compra para ser executada após o delay configurado
   * @param mint Endereço mint do token
   * @param ticker Símbolo do token
   */
  public scheduleTokenBuy(mint: string, ticker: string): void {
    // Verifica se já existe uma compra agendada para este mint
    if (this.scheduledBuys.has(mint)) {
      logger.warn(`🕒 Compra de ${ticker} já está agendada - ignorando`);
      return;
    }

    const config = configManager.config;
    const delayMs = config.buyDelayMs;

    if (delayMs <= 0) {
      // Se delay é 0 ou negativo, executa imediatamente
      this.executeBuyNow(mint, ticker);
      return;
    }

    const scheduledAt = new Date(Date.now() + delayMs);
    logger.info(`🕒 ${ticker} agendado para compra em ${delayMs}ms (${scheduledAt.toLocaleTimeString()})`);

    // Criar timeout para executar a compra
    const timeoutId = setTimeout(() => {
      this.executeBuy(mint, ticker);
    }, delayMs);

    // Armazenar informações da compra agendada
    const scheduledBuy: ScheduledBuy = {
      mint,
      ticker,
      scheduledAt,
      timeoutId
    };

    this.scheduledBuys.set(mint, scheduledBuy);
  }

  /**
   * Cancela uma compra agendada
   * @param mint Endereço mint do token
   */
  public cancelScheduledBuy(mint: string): boolean {
    const scheduledBuy = this.scheduledBuys.get(mint);

    if (!scheduledBuy) {
      return false;
    }

    // Limpar timeout
    clearTimeout(scheduledBuy.timeoutId);

    // Remover do mapa
    this.scheduledBuys.delete(mint);

    logger.info(`❌ Compra agendada de ${scheduledBuy.ticker} foi cancelada`);
    return true;
  }

  /**
   * Executa a compra imediatamente (sem delay)
   */
  private async executeBuyNow(mint: string, ticker: string): Promise<void> {
    logger.info(`⚡ ${ticker} - comprando imediatamente`);
    await this.performBuyLogic(mint, ticker);
  }

  /**
   * Executa a compra agendada
   */
  private async executeBuy(mint: string, ticker: string): Promise<void> {
    // Remover do mapa de agendados antes de executar
    this.scheduledBuys.delete(mint);

    logger.success(`🎯 ${ticker} - executando compra agendada!`);
    await this.performBuyLogic(mint, ticker);
  }

  /**
   * Lógica principal de compra
   */
  private async performBuyLogic(mint: string, ticker: string): Promise<void> {
    try {
      // Verificar novamente se já foi visto (pode ter mudado durante o delay)
      if (stateService.isSeen(mint)) {
        logger.warn(`⚠️ ${ticker} já foi processado durante o delay - ignorando compra`);
        return;
      }

      // Marcar como visto para evitar compras duplicadas
      stateService.markAsSeen(mint);

      // Executar a compra
      const bought = await tradingService.buyToken(mint, ticker);
      if (!bought) {
        logger.error(`❌ Falha na compra de ${ticker}`);
        return;
      }

      // Obter preço de entrada e criar posição
      const entryUsd = await tradingService.getEntryPrice(mint);
      const config = configManager.config;
      stateService.createPosition(mint, ticker, entryUsd, config.amountSol);

      if (entryUsd) {
        logger.info(`💰 ${ticker} entrada: $${entryUsd.toFixed(6)}`);
      }

      // Iniciar monitoramento da posição
      tradingService
        .monitorPosition(mint)
        .catch((e) => logger.error(`❌ Erro no monitor ${ticker}`, e));

    } catch (error) {
      logger.error(`❌ Erro na compra agendada de ${ticker}`, error);
    }
  }

  /**
   * Retorna lista de compras atualmente agendadas
   */
  public getScheduledBuys(): ScheduledBuy[] {
    return Array.from(this.scheduledBuys.values());
  }

  /**
   * Retorna quantidade de compras agendadas
   */
  public getScheduledCount(): number {
    return this.scheduledBuys.size;
  }

  /**
   * Cancela todas as compras agendadas (útil para shutdown)
   */
  public cancelAllScheduled(): void {
    const count = this.scheduledBuys.size;

    for (const scheduledBuy of this.scheduledBuys.values()) {
      clearTimeout(scheduledBuy.timeoutId);
    }

    this.scheduledBuys.clear();

    if (count > 0) {
      logger.info(`🚫 ${count} compra(s) agendada(s) cancelada(s)`);
    }
  }

  /**
   * Retorna informações de debug sobre compras agendadas
   */
  public getDebugInfo(): { [key: string]: any } {
    const scheduled = Array.from(this.scheduledBuys.values()).map(buy => ({
      ticker: buy.ticker,
      mint: buy.mint.substring(0, 8) + '...',
      scheduledAt: buy.scheduledAt.toLocaleTimeString(),
      remainingMs: Math.max(0, buy.scheduledAt.getTime() - Date.now())
    }));

    return {
      totalScheduled: this.scheduledBuys.size,
      delayConfigured: configManager.config.buyDelayMs,
      scheduled
    };
  }
}

export const buySchedulerService = new BuySchedulerService();