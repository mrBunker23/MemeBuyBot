// Controller para Workflows - APIs REST

import { Context } from 'elysia';
import { WorkflowStorageService } from '../services/workflow-storage.service';
import { workflowEngine } from '@/app/shared/workflows';
import { NodeRegistry } from '@/app/shared/workflows';
import { WORKFLOW_TEMPLATES } from '@/app/shared/workflows';
import { Workflow } from '@/app/shared/workflows/types/workflow.types';

export class WorkflowController {

  // === CRUD DE WORKFLOWS ===

  /**
   * Lista todos os workflows
   */
  static async getAllWorkflows(ctx: Context) {
    try {
      const workflows = await WorkflowStorageService.getAllWorkflows();
      return {
        success: true,
        data: workflows,
        count: workflows.length
      };
    } catch (error) {
      ctx.set.status = 500;
      return {
        success: false,
        error: `Erro ao buscar workflows: ${error}`
      };
    }
  }

  /**
   * Obtém workflow por ID
   */
  static async getWorkflowById(ctx: Context) {
    try {
      const { id } = ctx.params as { id: string };

      const workflow = await WorkflowStorageService.getWorkflowById(id);

      if (!workflow) {
        ctx.set.status = 404;
        return {
          success: false,
          error: 'Workflow não encontrado'
        };
      }

      return {
        success: true,
        data: workflow
      };
    } catch (error) {
      ctx.set.status = 500;
      return {
        success: false,
        error: `Erro ao buscar workflow: ${error}`
      };
    }
  }

  /**
   * Cria novo workflow
   */
  static async createWorkflow(ctx: Context) {
    try {
      const workflowData = ctx.body as Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>;

      // Validar dados básicos
      if (!workflowData.name?.trim()) {
        ctx.set.status = 400;
        return {
          success: false,
          error: 'Nome do workflow é obrigatório'
        };
      }

      // Permitir workflows vazios para começar a editar
      // if (!workflowData.nodes || workflowData.nodes.length === 0) {
      //   ctx.set.status = 400;
      //   return {
      //     success: false,
      //     error: 'Workflow deve ter pelo menos um node'
      //   };
      // }

      // Permitir criação de workflows vazios - validação só durante execução
      // const validation = await this.validateWorkflow(workflowData);
      // if (!validation.isValid) {
      //   ctx.set.status = 400;
      //   return {
      //     success: false,
      //     error: 'Validation failed',
      //     details: validation.errors
      //   };
      // }

      const workflow = await WorkflowStorageService.createWorkflow(workflowData);

      return {
        success: true,
        data: workflow
      };
    } catch (error) {
      ctx.set.status = 500;
      return {
        success: false,
        error: `Erro ao criar workflow: ${error}`
      };
    }
  }

  /**
   * Atualiza workflow existente
   */
  static async updateWorkflow(ctx: Context) {
    try {
      const { id } = ctx.params as { id: string };
      const updates = ctx.body as Partial<Workflow>;

      const workflow = await WorkflowStorageService.updateWorkflow(id, updates);

      return {
        success: true,
        data: workflow
      };
    } catch (error) {
      ctx.set.status = 500;
      return {
        success: false,
        error: `Erro ao atualizar workflow: ${error}`
      };
    }
  }

  /**
   * Remove workflow
   */
  static async deleteWorkflow(ctx: Context) {
    try {
      const { id } = ctx.params as { id: string };

      // Parar workflow se estiver rodando
      await workflowEngine.stopWorkflow(id);

      const deleted = await WorkflowStorageService.deleteWorkflow(id);

      if (!deleted) {
        ctx.set.status = 404;
        return {
          success: false,
          error: 'Workflow não encontrado'
        };
      }

      return {
        success: true,
        message: 'Workflow removido com sucesso'
      };
    } catch (error) {
      ctx.set.status = 500;
      return {
        success: false,
        error: `Erro ao remover workflow: ${error}`
      };
    }
  }

  // === CONTROLE DE EXECUÇÃO ===

  /**
   * Inicia execução de um workflow
   */
  static async startWorkflow(ctx: Context) {
    try {
      const { id } = ctx.params as { id: string };

      const workflow = await WorkflowStorageService.getWorkflowById(id);
      if (!workflow) {
        ctx.set.status = 404;
        return {
          success: false,
          error: 'Workflow não encontrado'
        };
      }

      // Ativar o workflow no storage
      await WorkflowStorageService.toggleWorkflowActive(id, true);

      // Iniciar no engine
      await workflowEngine.startWorkflow(workflow);

      return {
        success: true,
        message: `Workflow '${workflow.name}' iniciado com sucesso`
      };
    } catch (error) {
      ctx.set.status = 500;
      return {
        success: false,
        error: `Erro ao iniciar workflow: ${error}`
      };
    }
  }

  /**
   * Para execução de um workflow
   */
  static async stopWorkflow(ctx: Context) {
    try {
      const { id } = ctx.params as { id: string };

      const workflow = await WorkflowStorageService.getWorkflowById(id);
      if (!workflow) {
        ctx.set.status = 404;
        return {
          success: false,
          error: 'Workflow não encontrado'
        };
      }

      // Desativar no storage
      await WorkflowStorageService.toggleWorkflowActive(id, false);

      // Parar no engine
      await workflowEngine.stopWorkflow(id);

      return {
        success: true,
        message: `Workflow '${workflow.name}' parado com sucesso`
      };
    } catch (error) {
      ctx.set.status = 500;
      return {
        success: false,
        error: `Erro ao parar workflow: ${error}`
      };
    }
  }

  /**
   * Executa workflow manualmente
   */
  static async executeWorkflow(ctx: Context) {
    try {
      const { id } = ctx.params as { id: string };
      const { triggerNodeId, initialData, position } = ctx.body as {
        triggerNodeId?: string;
        initialData?: any;
        position?: any;
      };

      const workflow = await WorkflowStorageService.getWorkflowById(id);
      if (!workflow) {
        ctx.set.status = 404;
        return {
          success: false,
          error: 'Workflow não encontrado'
        };
      }

      // Encontrar trigger node se não especificado
      let targetTrigger = triggerNodeId;
      if (!targetTrigger) {
        const triggerNode = workflow.nodes.find(node => node.type.startsWith('trigger-'));
        if (!triggerNode) {
          ctx.set.status = 400;
          return {
            success: false,
            error: 'Nenhum trigger encontrado no workflow'
          };
        }
        targetTrigger = triggerNode.id;
      }

      const execution = await workflowEngine.executeWorkflow(
        workflow,
        targetTrigger,
        initialData,
        position
      );

      // Incrementar contador de execução
      await WorkflowStorageService.incrementExecutionCount(id);

      return {
        success: true,
        data: execution
      };
    } catch (error) {
      ctx.set.status = 500;
      return {
        success: false,
        error: `Erro ao executar workflow: ${error}`
      };
    }
  }

  // === STATUS E MONITORAMENTO ===

  /**
   * Obtém status dos workflows ativos
   */
  static async getActiveWorkflows(ctx: Context) {
    try {
      const activeWorkflows = workflowEngine.getActiveWorkflows();
      const activeExecutions = workflowEngine.getActiveExecutions();

      return {
        success: true,
        data: {
          workflows: activeWorkflows,
          executions: activeExecutions,
          stats: workflowEngine.getStats()
        }
      };
    } catch (error) {
      ctx.set.status = 500;
      return {
        success: false,
        error: `Erro ao obter workflows ativos: ${error}`
      };
    }
  }

  /**
   * Obtém estatísticas gerais
   */
  static async getStats(ctx: Context) {
    try {
      const storageStats = await WorkflowStorageService.getStats();
      const engineStats = workflowEngine.getStats();
      const nodeStats = NodeRegistry.getStats();

      return {
        success: true,
        data: {
          storage: storageStats,
          engine: engineStats,
          nodes: nodeStats
        }
      };
    } catch (error) {
      ctx.set.status = 500;
      return {
        success: false,
        error: `Erro ao obter estatísticas: ${error}`
      };
    }
  }

  // === TEMPLATES E LIBRARY ===

  /**
   * Lista nodes disponíveis
   */
  static async getAvailableNodes(ctx: Context) {
    try {
      const nodes = NodeRegistry.getAllNodes();

      return {
        success: true,
        data: {
          nodes,
          categories: {
            triggers: NodeRegistry.getNodesByCategory('trigger'),
            conditions: NodeRegistry.getNodesByCategory('condition'),
            actions: NodeRegistry.getNodesByCategory('action'),
            utilities: NodeRegistry.getNodesByCategory('utility')
          },
          stats: NodeRegistry.getStats()
        }
      };
    } catch (error) {
      ctx.set.status = 500;
      return {
        success: false,
        error: `Erro ao obter nodes: ${error}`
      };
    }
  }

  /**
   * Lista templates disponíveis
   */
  static async getTemplates(ctx: Context) {
    try {
      return {
        success: true,
        data: WORKFLOW_TEMPLATES
      };
    } catch (error) {
      ctx.set.status = 500;
      return {
        success: false,
        error: `Erro ao obter templates: ${error}`
      };
    }
  }

  /**
   * Cria workflow a partir de template
   */
  static async createFromTemplate(ctx: Context) {
    try {
      const { templateId, name, customData } = ctx.body as {
        templateId: string;
        name?: string;
        customData?: any;
      };

      const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
      if (!template) {
        ctx.set.status = 404;
        return {
          success: false,
          error: 'Template não encontrado'
        };
      }

      const workflowData = {
        ...template.workflow,
        name: name || template.name,
        ...customData
      };

      const workflow = await WorkflowStorageService.createWorkflow(workflowData);

      return {
        success: true,
        data: workflow,
        message: `Workflow criado a partir do template '${template.name}'`
      };
    } catch (error) {
      ctx.set.status = 500;
      return {
        success: false,
        error: `Erro ao criar workflow do template: ${error}`
      };
    }
  }

  // === VALIDAÇÃO ===

  /**
   * Valida um workflow
   */
  private static async validateWorkflow(workflow: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar nodes
    for (const node of workflow.nodes) {
      const nodeInstance = NodeRegistry.createNode(node.type, node.id, node.data);
      if (!nodeInstance) {
        errors.push(`Node type '${node.type}' não é válido`);
        continue;
      }

      const validation = nodeInstance.validate();
      errors.push(...validation.errors.map(e => `${node.name}: ${e}`));
      warnings.push(...validation.warnings.map(w => `${node.name}: ${w}`));
    }

    // Validar conexões
    for (const connection of workflow.connections) {
      const sourceNode = workflow.nodes.find((n: any) => n.id === connection.sourceNodeId);
      const targetNode = workflow.nodes.find((n: any) => n.id === connection.targetNodeId);

      if (!sourceNode) {
        errors.push(`Source node '${connection.sourceNodeId}' não encontrado`);
      }

      if (!targetNode) {
        errors.push(`Target node '${connection.targetNodeId}' não encontrado`);
      }
    }

    // Verificar se há pelo menos um trigger
    const hasTrigger = workflow.nodes.some((node: any) => node.type.startsWith('trigger-'));
    if (!hasTrigger) {
      warnings.push('Workflow não tem triggers - só pode ser executado manualmente');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}