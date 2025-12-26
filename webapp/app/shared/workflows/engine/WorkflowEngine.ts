// Engine de Execução de Workflows

import { BaseWorkflowNode, BaseTriggerNode } from '../nodes/base/BaseWorkflowNode';
import { NodeRegistry } from '../nodes/registry/NodeRegistry';
import { Workflow, WorkflowNode, NodeConnection, WorkflowExecutionContext } from '../types/workflow.types';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startedAt: string;
  finishedAt?: string;
  triggeredBy: {
    nodeId: string;
    reason: string;
    data?: any;
  };
  executedNodes: Array<{
    nodeId: string;
    status: 'completed' | 'failed' | 'skipped';
    startedAt: string;
    finishedAt?: string;
    outputs?: Record<string, any>;
    error?: string;
  }>;
  variables: Record<string, any>;
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
    nodeId?: string;
  }>;
}

class WorkflowEngine {
  private activeExecutions = new Map<string, WorkflowExecution>();
  private runningWorkflows = new Map<string, Workflow>();
  private triggerInstances = new Map<string, BaseTriggerNode>();
  private executionCounter = 0;

  /**
   * Inicia um workflow (ativa triggers)
   */
  async startWorkflow(workflow: Workflow): Promise<void> {
    if (this.runningWorkflows.has(workflow.id)) {
      console.log(`⚠️ Workflow ${workflow.name} já está rodando`);
      return;
    }

    console.log(`🚀 Iniciando workflow: ${workflow.name} [${workflow.id}]`);

    this.runningWorkflows.set(workflow.id, workflow);

    // Inicializar todos os triggers
    await this.initializeTriggers(workflow);

    console.log(`✅ Workflow ativo: ${workflow.name}`);
  }

  /**
   * Para um workflow (para triggers)
   */
  async stopWorkflow(workflowId: string): Promise<void> {
    const workflow = this.runningWorkflows.get(workflowId);
    if (!workflow) {
      console.log(`⚠️ Workflow ${workflowId} não está rodando`);
      return;
    }

    console.log(`🛑 Parando workflow: ${workflow.name} [${workflowId}]`);

    // Parar todos os triggers deste workflow
    await this.stopTriggers(workflowId);

    // Remover das execuções ativas
    this.runningWorkflows.delete(workflowId);

    console.log(`✅ Workflow parado: ${workflow.name}`);
  }

  /**
   * Executa um workflow manualmente (sem triggers)
   */
  async executeWorkflow(
    workflow: Workflow,
    triggerNodeId: string,
    initialData?: any,
    position?: any
  ): Promise<WorkflowExecution> {
    const executionId = this.generateExecutionId();

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      status: 'running',
      startedAt: new Date().toISOString(),
      triggeredBy: {
        nodeId: triggerNodeId,
        reason: 'Manual execution',
        data: initialData
      },
      executedNodes: [],
      variables: {},
      logs: []
    };

    this.activeExecutions.set(executionId, execution);

    const context: WorkflowExecutionContext = {
      workflowId: workflow.id,
      executionId,
      startedAt: execution.startedAt,
      triggeredBy: execution.triggeredBy,
      variables: execution.variables,
      position
    };

    try {
      await this.executeFromNode(workflow, triggerNodeId, {}, context);
      execution.status = 'completed';
    } catch (error) {
      execution.status = 'failed';
      this.addExecutionLog(execution, 'error', `Workflow falhou: ${error}`);
    } finally {
      execution.finishedAt = new Date().toISOString();
      this.activeExecutions.delete(executionId);
    }

    return execution;
  }

  /**
   * Inicializa triggers de um workflow
   */
  private async initializeTriggers(workflow: Workflow): Promise<void> {
    const triggerNodes = workflow.nodes.filter(node =>
      node.type.startsWith('trigger-')
    );

    for (const nodeData of triggerNodes) {
      const nodeInstance = NodeRegistry.createNode(
        nodeData.type,
        nodeData.id,
        nodeData.data,
        nodeData.position
      );

      if (nodeInstance && nodeInstance instanceof BaseTriggerNode) {
        const triggerKey = `${workflow.id}:${nodeData.id}`;
        this.triggerInstances.set(triggerKey, nodeInstance);

        // Configurar callback para quando trigger disparar
        const context: WorkflowExecutionContext = {
          workflowId: workflow.id,
          executionId: '', // Será criado quando executar
          startedAt: '',
          triggeredBy: {
            nodeId: nodeData.id,
            reason: 'Trigger activated'
          },
          variables: {}
        };

        await nodeInstance.startListening(context);
        console.log(`🎯 Trigger ativo: ${nodeData.name} [${nodeData.id}]`);
      }
    }
  }

  /**
   * Para triggers de um workflow
   */
  private async stopTriggers(workflowId: string): Promise<void> {
    const triggersToStop: string[] = [];

    for (const [key, trigger] of this.triggerInstances) {
      if (key.startsWith(`${workflowId}:`)) {
        await trigger.stopListening();
        triggersToStop.push(key);
      }
    }

    triggersToStop.forEach(key => {
      this.triggerInstances.delete(key);
    });
  }

  /**
   * Executa a partir de um node específico
   */
  private async executeFromNode(
    workflow: Workflow,
    nodeId: string,
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<void> {
    const nodeData = workflow.nodes.find(n => n.id === nodeId);
    if (!nodeData) {
      throw new Error(`Node ${nodeId} não encontrado no workflow`);
    }

    // Criar instância do node
    const nodeInstance = NodeRegistry.createNode(
      nodeData.type,
      nodeData.id,
      nodeData.data,
      nodeData.position
    );

    if (!nodeInstance) {
      throw new Error(`Não foi possível criar instância do node ${nodeData.type}`);
    }

    const execution = this.activeExecutions.get(context.executionId);
    if (!execution) {
      throw new Error(`Execução ${context.executionId} não encontrada`);
    }

    // Registrar início da execução do node
    const nodeExecution = {
      nodeId,
      status: 'completed' as const,
      startedAt: new Date().toISOString()
    };

    execution.executedNodes.push(nodeExecution);

    try {
      // Executar o node
      const result = await nodeInstance.execute(inputs, context);

      nodeExecution.finishedAt = new Date().toISOString();

      if (result.success) {
        nodeExecution.outputs = result.outputs;

        // Adicionar logs do node à execução
        if (result.logs) {
          result.logs.forEach(log => {
            this.addExecutionLog(execution, log.level, log.message, nodeId);
          });
        }

        // Encontrar próximos nodes para executar baseado nas saídas
        await this.executeNextNodes(workflow, nodeId, result.outputs, context);

      } else {
        nodeExecution.status = 'failed';
        nodeExecution.error = result.error;
        throw new Error(result.error || 'Node execution failed');
      }

    } catch (error) {
      nodeExecution.status = 'failed';
      nodeExecution.error = String(error);
      nodeExecution.finishedAt = new Date().toISOString();
      throw error;
    }
  }

  /**
   * Executa próximos nodes baseado nas conexões
   */
  private async executeNextNodes(
    workflow: Workflow,
    currentNodeId: string,
    outputs: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<void> {
    // Encontrar conexões que saem do node atual
    const outgoingConnections = workflow.connections.filter(
      conn => conn.sourceNodeId === currentNodeId
    );

    for (const connection of outgoingConnections) {
      // Verificar se a saída específica foi ativada
      const outputActivated = outputs[connection.sourceOutputId];

      if (outputActivated) {
        // Preparar inputs para o próximo node
        const nextInputs = { [connection.targetInputId]: outputActivated };

        // Incluir dados de outras saídas se necessário
        for (const [outputId, outputValue] of Object.entries(outputs)) {
          if (outputId !== connection.sourceOutputId && outputValue !== undefined) {
            nextInputs[`data-${outputId}`] = outputValue;
          }
        }

        console.log(`🔗 Executando próximo node: ${connection.targetNodeId}`);

        // Executar próximo node
        await this.executeFromNode(
          workflow,
          connection.targetNodeId,
          nextInputs,
          context
        );
      }
    }
  }

  /**
   * Adiciona log à execução
   */
  private addExecutionLog(
    execution: WorkflowExecution,
    level: string,
    message: string,
    nodeId?: string
  ): void {
    execution.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      nodeId
    });
  }

  /**
   * Gera ID único para execução
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${++this.executionCounter}`;
  }

  // === MÉTODOS PÚBLICOS DE CONSULTA ===

  /**
   * Lista workflows ativos
   */
  getActiveWorkflows(): Workflow[] {
    return Array.from(this.runningWorkflows.values());
  }

  /**
   * Lista execuções ativas
   */
  getActiveExecutions(): WorkflowExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Obtém estatísticas
   */
  getStats() {
    return {
      activeWorkflows: this.runningWorkflows.size,
      activeExecutions: this.activeExecutions.size,
      activeTriggers: this.triggerInstances.size,
      totalExecutions: this.executionCounter
    };
  }

  /**
   * Para todos os workflows (cleanup)
   */
  async stopAll(): Promise<void> {
    console.log('🛑 Parando todos os workflows...');

    const workflowIds = Array.from(this.runningWorkflows.keys());
    for (const workflowId of workflowIds) {
      await this.stopWorkflow(workflowId);
    }

    this.activeExecutions.clear();
    console.log('✅ Todos os workflows parados');
  }
}

export const workflowEngine = new WorkflowEngine();
export { WorkflowEngine };