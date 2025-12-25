import { Elysia } from 'elysia';
import { defaultStages } from '../../shared/bot/config/web-config';
import type { Stage } from '../../shared/bot/types';

export const takeProfitRoutes = new Elysia({ prefix: '/api/takeprofit' })

  // GET /api/takeprofit - Listar todos os TPs
  .get('/', () => {
    try {
      return {
        success: true,
        stages: defaultStages,
        validation: { valid: true, errors: [] }
      };
    } catch (error) {
      console.error('Erro ao buscar TPs:', error);
      throw new Error('Falha ao buscar Take Profits');
    }
  })

  // TODO: Implementar outras rotas CRUD depois que GET funcionar
  /*
  .post('/', async ({ body }: { body: any }) => {
    // Implementar criar TP
  })
  .put('/:id', async ({ params, body }: { params: { id: string }, body: any }) => {
    // Implementar atualizar TP
  })
  .delete('/:id', async ({ params }: { params: { id: string } }) => {
    // Implementar deletar TP
  })
  .post('/reorder', async ({ body }: { body: any }) => {
    // Implementar reordenar TPs
  })
  .post('/:id/toggle', async ({ params, body }: { params: { id: string }, body: any }) => {
    // Implementar habilitar/desabilitar TP
  })
  */;