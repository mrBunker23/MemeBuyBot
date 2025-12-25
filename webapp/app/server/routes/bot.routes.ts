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