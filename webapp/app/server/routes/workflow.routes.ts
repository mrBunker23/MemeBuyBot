// Rotas para Workflows - APIs REST

import { Elysia, t } from 'elysia';
import { WorkflowController } from '../controllers/workflow.controller';

export const workflowRoutes = new Elysia({ prefix: '/workflows' })

  // === CRUD DE WORKFLOWS ===

  /**
   * GET /api/workflows
   * Lista todos os workflows
   */
  .get('/', WorkflowController.getAllWorkflows, {
    detail: {
      summary: 'Lista workflows',
      description: 'Obtém lista de todos os workflows criados',
      tags: ['Workflows']
    }
  })

  /**
   * GET /api/workflows/:id
   * Obtém workflow por ID
   */
  .get('/:id', WorkflowController.getWorkflowById, {
    params: t.Object({
      id: t.String({ description: 'ID do workflow' })
    }),
    detail: {
      summary: 'Obter workflow',
      description: 'Obtém detalhes de um workflow específico',
      tags: ['Workflows']
    }
  })

  /**
   * POST /api/workflows
   * Cria novo workflow
   */
  .post('/', WorkflowController.createWorkflow, {
    body: t.Object({
      name: t.String({ description: 'Nome do workflow' }),
      description: t.Optional(t.String({ description: 'Descrição do workflow' })),
      active: t.Optional(t.Boolean({ description: 'Se o workflow está ativo', default: false })),
      nodes: t.Array(t.Object({
        id: t.String(),
        type: t.String(),
        name: t.String(),
        description: t.Optional(t.String()),
        position: t.Object({
          x: t.Number(),
          y: t.Number()
        }),
        data: t.Record(t.String(), t.Any()),
        inputs: t.Array(t.Any()),
        outputs: t.Array(t.Any())
      })),
      connections: t.Array(t.Object({
        id: t.String(),
        sourceNodeId: t.String(),
        sourceOutputId: t.String(),
        targetNodeId: t.String(),
        targetInputId: t.String()
      }))
    }),
    detail: {
      summary: 'Criar workflow',
      description: 'Cria um novo workflow',
      tags: ['Workflows']
    }
  })

  /**
   * PUT /api/workflows/:id
   * Atualiza workflow existente
   */
  .put('/:id', WorkflowController.updateWorkflow, {
    params: t.Object({
      id: t.String({ description: 'ID do workflow' })
    }),
    body: t.Partial(t.Object({
      name: t.String(),
      description: t.String(),
      active: t.Boolean(),
      nodes: t.Array(t.Any()),
      connections: t.Array(t.Any())
    })),
    detail: {
      summary: 'Atualizar workflow',
      description: 'Atualiza dados de um workflow existente',
      tags: ['Workflows']
    }
  })

  /**
   * DELETE /api/workflows/:id
   * Remove workflow
   */
  .delete('/:id', WorkflowController.deleteWorkflow, {
    params: t.Object({
      id: t.String({ description: 'ID do workflow' })
    }),
    detail: {
      summary: 'Remover workflow',
      description: 'Remove um workflow permanentemente',
      tags: ['Workflows']
    }
  })

  // === CONTROLE DE EXECUÇÃO ===

  /**
   * POST /api/workflows/:id/start
   * Inicia execução de workflow (ativa triggers)
   */
  .post('/:id/start', WorkflowController.startWorkflow, {
    params: t.Object({
      id: t.String({ description: 'ID do workflow' })
    }),
    detail: {
      summary: 'Iniciar workflow',
      description: 'Inicia a execução de um workflow (ativa os triggers)',
      tags: ['Workflows', 'Execução']
    }
  })

  /**
   * POST /api/workflows/:id/stop
   * Para execução de workflow
   */
  .post('/:id/stop', WorkflowController.stopWorkflow, {
    params: t.Object({
      id: t.String({ description: 'ID do workflow' })
    }),
    detail: {
      summary: 'Parar workflow',
      description: 'Para a execução de um workflow (desativa os triggers)',
      tags: ['Workflows', 'Execução']
    }
  })

  /**
   * POST /api/workflows/:id/execute
   * Executa workflow manualmente (uma vez)
   */
  .post('/:id/execute', WorkflowController.executeWorkflow, {
    params: t.Object({
      id: t.String({ description: 'ID do workflow' })
    }),
    body: t.Optional(t.Object({
      triggerNodeId: t.Optional(t.String({ description: 'ID do node trigger específico' })),
      initialData: t.Optional(t.Any({ description: 'Dados iniciais para o workflow' })),
      position: t.Optional(t.Object({
        mint: t.String(),
        ticker: t.String(),
        entryPrice: t.Number(),
        currentPrice: t.Number(),
        multiple: t.Number()
      }, { description: 'Dados da posição para contexto' }))
    })),
    detail: {
      summary: 'Executar workflow',
      description: 'Executa um workflow manualmente uma única vez',
      tags: ['Workflows', 'Execução']
    }
  })

  // === STATUS E MONITORAMENTO ===

  /**
   * GET /api/workflows/active
   * Lista workflows ativos e execuções
   */
  .get('/active', WorkflowController.getActiveWorkflows, {
    detail: {
      summary: 'Workflows ativos',
      description: 'Lista workflows ativos e suas execuções em andamento',
      tags: ['Workflows', 'Monitoramento']
    }
  })

  /**
   * GET /api/workflows/stats
   * Estatísticas gerais dos workflows
   */
  .get('/stats', WorkflowController.getStats, {
    detail: {
      summary: 'Estatísticas',
      description: 'Obtém estatísticas gerais dos workflows e nodes',
      tags: ['Workflows', 'Estatísticas']
    }
  })

  // === NODES E TEMPLATES ===

  /**
   * GET /api/workflows/nodes
   * Lista nodes disponíveis
   */
  .get('/nodes', WorkflowController.getAvailableNodes, {
    detail: {
      summary: 'Nodes disponíveis',
      description: 'Lista todos os tipos de nodes disponíveis para criar workflows',
      tags: ['Workflows', 'Nodes']
    }
  })

  /**
   * GET /api/workflows/templates
   * Lista templates de workflow
   */
  .get('/templates', WorkflowController.getTemplates, {
    detail: {
      summary: 'Templates',
      description: 'Lista templates pré-configurados de workflows',
      tags: ['Workflows', 'Templates']
    }
  })

  /**
   * POST /api/workflows/templates
   * Cria workflow a partir de template
   */
  .post('/templates', WorkflowController.createFromTemplate, {
    body: t.Object({
      templateId: t.String({ description: 'ID do template' }),
      name: t.Optional(t.String({ description: 'Nome personalizado para o workflow' })),
      customData: t.Optional(t.Any({ description: 'Dados personalizados para o workflow' }))
    }),
    detail: {
      summary: 'Criar do template',
      description: 'Cria um novo workflow baseado em um template',
      tags: ['Workflows', 'Templates']
    }
  });