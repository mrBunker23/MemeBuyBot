import { Elysia, t } from "elysia"
import { BotController } from "../controllers/bot.controller"

// Schemas para validação
const BotStatusSchema = t.Object({
  isRunning: t.Boolean(),
  startedAt: t.Optional(t.String()),
  tokensMonitored: t.Number(),
  totalTransactions: t.Number(),
  lastCheck: t.Optional(t.String())
});

const BotResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  status: BotStatusSchema
});

const PositionSchema = t.Object({
  ticker: t.String(),
  mint: t.String(),
  entryUsd: t.Union([t.Number(), t.Null()]),
  entryAmountSol: t.Number(),
  currentPrice: t.Union([t.Number(), t.Null()]),
  highestPrice: t.Union([t.Number(), t.Null()]),
  highestMultiple: t.Union([t.Number(), t.Null()]),
  createdAt: t.String(),
  lastUpdated: t.String(),
  sold: t.Object({
    tp1: t.Optional(t.Boolean()),
    tp2: t.Optional(t.Boolean()),
    tp3: t.Optional(t.Boolean()),
    tp4: t.Optional(t.Boolean())
  }),
  paused: t.Optional(t.Boolean()),
  pausedAt: t.Optional(t.String())
});

const ConfigUpdateSchema = t.Object({
  amountSol: t.Optional(t.Number()),
  slippageBps: t.Optional(t.Number()),
  checkIntervalMs: t.Optional(t.Number()),
  priceCheckSeconds: t.Optional(t.Number()),
  minScore: t.Optional(t.Number())
});

export const botRoutes = new Elysia({ prefix: "/bot" })

  // GET /api/bot/status
  .get("/status", () => BotController.getStatus(), {
    response: BotStatusSchema,
    detail: {
      tags: ['Bot'],
      summary: 'Obter status do bot',
      description: 'Retorna o status atual do bot de trading'
    }
  })

  // POST /api/bot/start
  .post("/start", async () => BotController.start(), {
    response: BotResponseSchema,
    detail: {
      tags: ['Bot'],
      summary: 'Iniciar bot',
      description: 'Inicia o bot de trading'
    }
  })

  // POST /api/bot/stop
  .post("/stop", async () => BotController.stop(), {
    response: BotResponseSchema,
    detail: {
      tags: ['Bot'],
      summary: 'Parar bot',
      description: 'Para o bot de trading'
    }
  })

  // GET /api/bot/positions
  .get("/positions", () => BotController.getPositions(), {
    response: t.Object({
      all: t.Record(t.String(), PositionSchema),
      active: t.Record(t.String(), PositionSchema),
      count: t.Object({
        total: t.Number(),
        active: t.Number(),
        paused: t.Number()
      })
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Obter posições',
      description: 'Retorna todas as posições do bot (ativas e pausadas)'
    }
  })

  // GET /api/bot/logs
  .get("/logs", () => BotController.getLogs(), {
    response: t.Object({
      logs: t.Array(t.Any()),
      timestamp: t.String()
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Obter logs',
      description: 'Retorna os logs recentes do bot'
    }
  })

  // GET /api/bot/config
  .get("/config", () => BotController.getConfig(), {
    response: t.Object({
      config: t.Object({
        amountSol: t.Number(),
        slippageBps: t.Number(),
        checkIntervalMs: t.Number(),
        priceCheckSeconds: t.Number(),
        minScore: t.Number(),
        siteUrl: t.String(),
        rpcUrl: t.String()
      })
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Obter configuração',
      description: 'Retorna a configuração atual do bot'
    }
  })

  // PUT /api/bot/config
  .put("/config", ({ body }: { body: any }) => BotController.updateConfig(body), {
    body: ConfigUpdateSchema,
    response: t.Object({
      success: t.Boolean(),
      message: t.String(),
      config: t.Object({
        amountSol: t.Number(),
        slippageBps: t.Number(),
        checkIntervalMs: t.Number(),
        priceCheckSeconds: t.Number(),
        minScore: t.Number(),
        siteUrl: t.String(),
        rpcUrl: t.String()
      })
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Atualizar configuração',
      description: 'Atualiza a configuração do bot'
    }
  })

  // GET /api/bot/stats
  .get("/stats", () => BotController.getStats(), {
    response: t.Object({
      totalPositions: t.Number(),
      profitablePositions: t.Number(),
      winRate: t.Number(),
      totalProfit: t.Number(),
      totalInvested: t.Number(),
      roi: t.Number(),
      avgProfitPerPosition: t.Number()
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Obter estatísticas',
      description: 'Retorna estatísticas de performance do bot'
    }
  })

  // GET /api/bot/takeprofit - Rota simples para testar TPs
  .get("/takeprofit", () => {
    return {
      success: true,
      stages: [
        {
          id: 'tp1-default',
          name: 'Quick Profit',
          multiple: 2,
          sellPercent: 50,
          enabled: true,
          order: 1
        },
        {
          id: 'tp2-default',
          name: 'Medium Gain',
          multiple: 5,
          sellPercent: 50,
          enabled: true,
          order: 2
        },
        {
          id: 'tp3-default',
          name: 'Big Profit',
          multiple: 10,
          sellPercent: 50,
          enabled: true,
          order: 3
        },
        {
          id: 'tp4-default',
          name: 'Moon Shot',
          multiple: 20,
          sellPercent: 100,
          enabled: true,
          order: 4
        }
      ],
      validation: { valid: true, errors: [] }
    };
  }, {
    response: t.Object({
      success: t.Boolean(),
      stages: t.Array(t.Object({
        id: t.String(),
        name: t.String(),
        multiple: t.Number(),
        sellPercent: t.Number(),
        enabled: t.Boolean(),
        order: t.Number()
      })),
      validation: t.Object({
        valid: t.Boolean(),
        errors: t.Array(t.String())
      })
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Obter Take Profits',
      description: 'Retorna a configuração de Take Profits'
    }
  })

  // POST /api/bot/takeprofit - Criar novo TP
  .post("/takeprofit", ({ body }: { body: any }) => {
    try {
      const { name, multiple, sellPercent, enabled } = body;

      // Validação básica
      if (!name || typeof name !== 'string') {
        throw new Error('Nome é obrigatório');
      }
      if (!multiple || multiple <= 1) {
        throw new Error('Múltiplo deve ser maior que 1');
      }
      if (!sellPercent || sellPercent <= 0 || sellPercent > 100) {
        throw new Error('Percentual de venda deve estar entre 1% e 100%');
      }

      // Simular criação por enquanto (API em desenvolvimento)
      const newStage = {
        id: `tp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name.toString(),
        multiple: Number(multiple),
        sellPercent: Number(sellPercent),
        enabled: enabled !== undefined ? Boolean(enabled) : true,
        order: 5 // Simular nova ordem
      };

      return {
        success: true,
        message: 'Take Profit criado com sucesso',
        stage: newStage
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao criar Take Profit: ${errorMessage}`);
    }
  }, {
    body: t.Object({
      name: t.String(),
      multiple: t.Number(),
      sellPercent: t.Number(),
      enabled: t.Optional(t.Boolean())
    }),
    response: t.Object({
      success: t.Boolean(),
      message: t.String(),
      stage: t.Object({
        id: t.String(),
        name: t.String(),
        multiple: t.Number(),
        sellPercent: t.Number(),
        enabled: t.Boolean(),
        order: t.Number()
      })
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Criar Take Profit',
      description: 'Cria um novo Take Profit'
    }
  })

  // PUT /api/bot/takeprofit/:id - Atualizar TP
  .put("/takeprofit/:id", ({ params, body }: { params: { id: string }, body: any }) => {
    try {
      const { id } = params;

      return {
        success: true,
        message: 'Take Profit atualizado com sucesso',
        id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao atualizar Take Profit: ${errorMessage}`);
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      multiple: t.Optional(t.Number()),
      sellPercent: t.Optional(t.Number()),
      enabled: t.Optional(t.Boolean())
    }),
    response: t.Object({
      success: t.Boolean(),
      message: t.String(),
      id: t.String()
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Atualizar Take Profit',
      description: 'Atualiza um Take Profit existente'
    }
  })

  // DELETE /api/bot/takeprofit/:id - Deletar TP
  .delete("/takeprofit/:id", ({ params }: { params: { id: string } }) => {
    try {
      const { id } = params;

      return {
        success: true,
        message: 'Take Profit removido com sucesso',
        id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao remover Take Profit: ${errorMessage}`);
    }
  }, {
    response: t.Object({
      success: t.Boolean(),
      message: t.String(),
      id: t.String()
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Remover Take Profit',
      description: 'Remove um Take Profit'
    }
  })

  // POST /api/bot/takeprofit/:id/toggle - Habilitar/Desabilitar TP
  .post("/takeprofit/:id/toggle", ({ params, body }: { params: { id: string }, body: any }) => {
    try {
      const { id } = params;
      const { enabled } = body;

      if (typeof enabled !== 'boolean') {
        throw new Error('Campo enabled deve ser boolean');
      }

      return {
        success: true,
        message: `Take Profit ${enabled ? 'habilitado' : 'desabilitado'} com sucesso`,
        id,
        enabled
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao alterar status do Take Profit: ${errorMessage}`);
    }
  }, {
    body: t.Object({
      enabled: t.Boolean()
    }),
    response: t.Object({
      success: t.Boolean(),
      message: t.String(),
      id: t.String(),
      enabled: t.Boolean()
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Toggle Take Profit',
      description: 'Habilita ou desabilita um Take Profit'
    }
  })