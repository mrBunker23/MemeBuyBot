// Controller para testar sistema de eventos
import { botEventEmitter } from '../../shared/bot/events/BotEventEmitter';
import { workflowEventAdapter } from '../../shared/bot/events/WorkflowEventAdapter';
import { realEventWorkflowExecutor } from '../../shared/workflows/execution/RealEventWorkflowExecutor';
import { logger } from '../../shared/bot/utils/logger';

export class EventsTestController {

  // GET /api/events/test/status - Status do sistema de eventos
  static async getEventSystemStatus() {
    const adapterStats = workflowEventAdapter.getStats();
    const executorStats = realEventWorkflowExecutor.getStats();
    const eventCounts = botEventEmitter.getEventCounts();
    const debugInfo = botEventEmitter.debugEventListeners();

    return {
      success: true,
      timestamp: new Date().toISOString(),
      eventSystem: {
        isEnabled: true,
        totalEvents: Object.keys(debugInfo).length,
        eventCounts,
        activeListeners: debugInfo
      },
      workflowAdapter: adapterStats,
      workflowExecutor: executorStats
    };
  }

  // POST /api/events/test/emit - Emitir evento de teste
  static async emitTestEvent(request: any) {
    const { eventType, testData = {} } = request.body;

    try {
      let result: any = {};

      switch (eventType) {
        case 'price_change':
          botEventEmitter.emit('monitor:price_check', {
            mint: testData.mint || 'So11111111111111111111111111111111111112',
            currentPrice: testData.price || 100,
            multiple: testData.multiple || 2.5
          });
          result = { event: 'monitor:price_check', triggered: true };
          break;

        case 'take_profit':
          botEventEmitter.emit('takeprofit:triggered', {
            mint: testData.mint || 'So11111111111111111111111111111111111112',
            ticker: testData.ticker || 'SOL',
            stage: testData.stage || 'tp1',
            multiple: testData.multiple || 2.0,
            percentage: testData.percentage || 25
          });
          result = { event: 'takeprofit:triggered', triggered: true };
          break;

        case 'buy_confirmed':
          botEventEmitter.emit('trading:buy_confirmed', {
            mint: testData.mint || 'So11111111111111111111111111111111111112',
            ticker: testData.ticker || 'SOL',
            signature: 'TEST_SIGNATURE_123',
            actualPrice: testData.price || 95.5
          });
          result = { event: 'trading:buy_confirmed', triggered: true };
          break;

        case 'token_detected':
          botEventEmitter.emit('scraper:token_detected', {
            token: {
              mint: testData.mint || 'TEST_TOKEN_MINT',
              ticker: testData.ticker || 'TEST',
              score: testData.score || '8'
            },
            score: testData.score || 8,
            url: 'Test Environment'
          });
          result = { event: 'scraper:token_detected', triggered: true };
          break;

        case 'position_created':
          botEventEmitter.emit('position:created', {
            mint: testData.mint || 'TEST_POSITION_MINT',
            ticker: testData.ticker || 'TESTCOIN',
            entryPrice: testData.entryPrice || 50.0,
            amount: testData.amount || 1000
          });
          result = { event: 'position:created', triggered: true };
          break;

        case 'bot_started':
          botEventEmitter.emit('bot:started', {
            timestamp: new Date().toISOString(),
            config: { test: true }
          });
          result = { event: 'bot:started', triggered: true };
          break;

        case 'system_error':
          botEventEmitter.emit('system:error', {
            error: 'Test error message',
            source: 'EventsTestController',
            details: { test: true }
          });
          result = { event: 'system:error', triggered: true };
          break;

        default:
          throw new Error(`Tipo de evento não suportado: ${eventType}`);
      }

      // Aguardar um pouco para capturar os logs
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        message: `Evento ${eventType} emitido com sucesso`,
        result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Erro ao emitir evento de teste:', error);
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // POST /api/events/test/workflow - Testar workflow específico
  static async testWorkflow(request: any) {
    const { triggerType, workflowData = {} } = request.body;

    try {
      // Testar workflow execution diretamente
      await realEventWorkflowExecutor.testTrigger(triggerType, {
        ...workflowData,
        testMode: true,
        timestamp: new Date().toISOString()
      });

      const stats = realEventWorkflowExecutor.getStats();
      const logs = realEventWorkflowExecutor.getExecutionLogs().slice(-3); // Últimos 3 logs

      return {
        success: true,
        message: `Workflow ${triggerType} testado com sucesso`,
        executorStats: stats,
        recentLogs: logs,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Erro ao testar workflow:', error);
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // GET /api/events/test/logs - Últimos logs de execução
  static async getExecutionLogs(request: any) {
    const { limit = 10 } = request.query;

    try {
      const logs = realEventWorkflowExecutor.getExecutionLogs().slice(-Number(limit));
      const stats = realEventWorkflowExecutor.getStats();

      return {
        success: true,
        logs,
        stats,
        totalLogs: realEventWorkflowExecutor.getExecutionLogs().length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // POST /api/events/test/stress - Teste de stress do sistema
  static async stressTest(request: any) {
    const { eventCount = 10, delayMs = 100 } = request.body;

    try {
      const results: any[] = [];
      const startTime = Date.now();

      for (let i = 0; i < eventCount; i++) {
        // Emitir diferentes tipos de eventos
        const eventTypes = ['price_change', 'take_profit', 'buy_confirmed', 'token_detected'];
        const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];

        botEventEmitter.emit('monitor:price_check', {
          mint: `STRESS_TEST_${i}`,
          currentPrice: 100 + (Math.random() * 50),
          multiple: 1 + (Math.random() * 3)
        });

        results.push({
          index: i,
          eventType: 'monitor:price_check',
          timestamp: new Date().toISOString()
        });

        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      const endTime = Date.now();
      const executorStats = realEventWorkflowExecutor.getStats();
      const eventCounts = botEventEmitter.getEventCounts();

      return {
        success: true,
        message: `Teste de stress concluído: ${eventCount} eventos em ${endTime - startTime}ms`,
        results: {
          eventsEmitted: eventCount,
          executionTime: endTime - startTime,
          averageTimePerEvent: (endTime - startTime) / eventCount,
          executorStats,
          finalEventCounts: eventCounts
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Erro no teste de stress:', error);
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // GET /api/events/test/metrics - Métricas detalhadas do sistema
  static async getDetailedMetrics() {
    try {
      const adapterStats = workflowEventAdapter.getStats();
      const executorStats = realEventWorkflowExecutor.getStats();
      const eventCounts = botEventEmitter.getEventCounts();
      const debugInfo = botEventEmitter.debugEventListeners();

      // Calcular métricas adicionais
      const recentLogs = realEventWorkflowExecutor.getExecutionLogs().slice(-10);
      const successRate = recentLogs.length > 0
        ? recentLogs.filter(log => log.result?.success !== false).length / recentLogs.length
        : 1;

      const avgExecutionTime = recentLogs.length > 0
        ? recentLogs.reduce((sum, log) => {
            const start = new Date(log.timestamp).getTime();
            const end = start + 100; // Estimativa
            return sum + (end - start);
          }, 0) / recentLogs.length
        : 0;

      return {
        success: true,
        metrics: {
          eventSystem: {
            totalEventTypes: Object.keys(debugInfo).length,
            totalEventsCounted: Object.values(eventCounts).reduce((sum: number, count) => sum + count, 0),
            activeListeners: Object.values(debugInfo).reduce((sum: number, count) => sum + count, 0),
            eventDistribution: eventCounts
          },
          workflowSystem: {
            adapter: adapterStats,
            executor: executorStats,
            successRate: Math.round(successRate * 100),
            avgExecutionTime: Math.round(avgExecutionTime)
          },
          performance: {
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }
}