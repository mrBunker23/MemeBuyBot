import { botManagerService } from '../../shared/bot/services/bot-manager.service';
import { config } from '../../shared/bot/config';

export class BotController {

  // GET /api/bot/status
  static getStatus() {
    return botManagerService.getStatus();
  }

  // POST /api/bot/start
  static async start() {
    try {
      await botManagerService.start();
      return {
        success: true,
        message: 'Bot iniciado com sucesso',
        status: botManagerService.getStatus()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao iniciar bot: ${errorMessage}`);
    }
  }

  // POST /api/bot/stop
  static async stop() {
    try {
      await botManagerService.stop();
      return {
        success: true,
        message: 'Bot parado com sucesso',
        status: botManagerService.getStatus()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao parar bot: ${errorMessage}`);
    }
  }

  // GET /api/bot/positions
  static getPositions() {
    const allPositions = botManagerService.getAllPositions();
    const activePositions = botManagerService.getActivePositions();

    return {
      all: allPositions,
      active: activePositions,
      count: {
        total: Object.keys(allPositions).length,
        active: Object.keys(activePositions).length,
        paused: Object.keys(allPositions).length - Object.keys(activePositions).length
      }
    };
  }

  // GET /api/bot/logs
  static getLogs() {
    return {
      logs: botManagerService.getRecentLogs(),
      timestamp: new Date().toISOString()
    };
  }

  // GET /api/bot/config
  static getConfig() {
    return {
      config: {
        amountSol: config.amountSol,
        slippageBps: config.slippageBps,
        checkIntervalMs: config.checkIntervalMs,
        priceCheckSeconds: config.priceCheckSeconds,
        minScore: config.minScore,
        siteUrl: config.siteUrl,
        rpcUrl: config.rpcUrl
      }
    };
  }

  // PUT /api/bot/config
  static updateConfig(newConfig: any) {
    try {
      // Validar tipos básicos
      const validatedConfig: any = {};

      if (newConfig.amountSol !== undefined) {
        const amount = Number(newConfig.amountSol);
        if (isNaN(amount) || amount <= 0) {
          throw new Error('amountSol deve ser um número positivo');
        }
        validatedConfig.amountSol = amount;
      }

      if (newConfig.slippageBps !== undefined) {
        const slippage = Number(newConfig.slippageBps);
        if (isNaN(slippage) || slippage < 0) {
          throw new Error('slippageBps deve ser um número não-negativo');
        }
        validatedConfig.slippageBps = slippage;
      }

      if (newConfig.checkIntervalMs !== undefined) {
        const interval = Number(newConfig.checkIntervalMs);
        if (isNaN(interval) || interval < 1000) {
          throw new Error('checkIntervalMs deve ser pelo menos 1000ms');
        }
        validatedConfig.checkIntervalMs = interval;
      }

      if (newConfig.priceCheckSeconds !== undefined) {
        const priceCheck = Number(newConfig.priceCheckSeconds);
        if (isNaN(priceCheck) || priceCheck < 1) {
          throw new Error('priceCheckSeconds deve ser pelo menos 1 segundo');
        }
        validatedConfig.priceCheckSeconds = priceCheck;
      }

      if (newConfig.minScore !== undefined) {
        const minScore = Number(newConfig.minScore);
        if (isNaN(minScore) || minScore < 0) {
          throw new Error('minScore deve ser um número não-negativo');
        }
        validatedConfig.minScore = minScore;
      }

      // Aplicar configurações
      botManagerService.updateConfig(validatedConfig);

      return {
        success: true,
        message: 'Configuração atualizada com sucesso',
        config: BotController.getConfig().config
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao atualizar configuração: ${errorMessage}`);
    }
  }

  // GET /api/bot/stats
  static getStats() {
    const positions = botManagerService.getAllPositions();
    let totalProfit = 0;
    let totalPositions = 0;
    let profitablePositions = 0;
    let totalInvested = 0;

    Object.values(positions).forEach(position => {
      if (position.entryUsd && position.currentPrice) {
        totalPositions++;
        const profit = (position.currentPrice - position.entryUsd) * position.entryAmountSol;
        totalProfit += profit;
        totalInvested += position.entryAmountSol;

        if (profit > 0) profitablePositions++;
      }
    });

    return {
      totalPositions,
      profitablePositions,
      winRate: totalPositions > 0 ? (profitablePositions / totalPositions) * 100 : 0,
      totalProfit,
      totalInvested,
      roi: totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0,
      avgProfitPerPosition: totalPositions > 0 ? totalProfit / totalPositions : 0
    };
  }
}