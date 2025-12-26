// Rotas para testar sistema de eventos
import { Elysia } from 'elysia';
import { EventsTestController } from '../controllers/events-test.controller';

export const eventsTestRoutes = new Elysia({ prefix: '/events/test' })

  // GET /api/events/test/status - Status do sistema de eventos
  .get('/status', async () => {
    return await EventsTestController.getEventSystemStatus();
  })

  // POST /api/events/test/emit - Emitir evento de teste
  .post('/emit', async ({ body }: any) => {
    return await EventsTestController.emitTestEvent({ body });
  })

  // POST /api/events/test/workflow - Testar workflow específico
  .post('/workflow', async ({ body }: any) => {
    return await EventsTestController.testWorkflow({ body });
  })

  // GET /api/events/test/logs - Últimos logs de execução
  .get('/logs', async ({ query }: any) => {
    return await EventsTestController.getExecutionLogs({ query });
  })

  // POST /api/events/test/stress - Teste de stress
  .post('/stress', async ({ body }: any) => {
    return await EventsTestController.stressTest({ body });
  })

  // GET /api/events/test/metrics - Métricas detalhadas
  .get('/metrics', async () => {
    return await EventsTestController.getDetailedMetrics();
  });