import { Elysia, t } from 'elysia';
import { ConfigController } from '../controllers/config.controller';

export const configRoutes = new Elysia({ prefix: '/api/config' })
  // GET /api/config - Obter configuração completa
  .get('/', () => ConfigController.getFullConfig())

  // PUT /api/config - Atualizar configuração completa
  .put('/', ({ body }) => ConfigController.updateFullConfig(body), {
    body: t.Object({
      privateKey: t.Optional(t.String()),
      jupApiKeys: t.Optional(t.Array(t.String())),
      rpcUrl: t.Optional(t.String()),
      amountSol: t.Optional(t.Number()),
      slippageBps: t.Optional(t.Number()),
      checkIntervalMs: t.Optional(t.Number()),
      priceCheckSeconds: t.Optional(t.Number()),
      minScore: t.Optional(t.Number()),
      headless: t.Optional(t.Boolean()),
      stages: t.Optional(t.Array(t.Object({
        name: t.String(),
        multiple: t.Number(),
        sellPercent: t.Number()
      }))),
      autoRestart: t.Optional(t.Boolean()),
      notifications: t.Optional(t.Boolean()),
      maxPositions: t.Optional(t.Number()),
      stopLossEnabled: t.Optional(t.Boolean()),
      stopLossPercent: t.Optional(t.Number()),
    })
  })

  // POST /api/config/reset - Resetar para padrões
  .post('/reset', () => ConfigController.resetToDefaults())

  // POST /api/config/validate - Validar configuração
  .post('/validate', ({ body }) => ConfigController.validateConfig(body), {
    body: t.Object({
      privateKey: t.Optional(t.String()),
      jupApiKeys: t.Optional(t.Array(t.String())),
      rpcUrl: t.Optional(t.String()),
      amountSol: t.Optional(t.Number()),
      slippageBps: t.Optional(t.Number()),
      checkIntervalMs: t.Optional(t.Number()),
      priceCheckSeconds: t.Optional(t.Number()),
      minScore: t.Optional(t.Number()),
    })
  })

  // GET /api/config/current - Configuração atual para serviços internos
  .get('/current', () => ConfigController.getCurrentConfig())

  // GET /api/config/stages - Obter stages de take profit
  .get('/stages', () => ConfigController.getStages());