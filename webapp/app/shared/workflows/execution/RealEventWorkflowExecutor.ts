// Executor de workflows que usa eventos reais do bot
import { WorkflowExecutor } from '../../bot/events/WorkflowEventAdapter';
import { WorkflowDataAccessor, createMockExecutionState, type NodeExecutionData } from '../../../client/src/types/workflow-execution';
import { logger } from '../../bot/utils/logger';

// Helper function to simulate node execution with the old signature
async function simulateNodeExecution(
  nodeType: string,
  subType: string,
  configData: any,
  inputData: any
): Promise<NodeExecutionData[]> {
  // Create a mock execution state
  const executionState = createMockExecutionState('test-workflow');

  // Create a data accessor
  const dataAccessor = new WorkflowDataAccessor(executionState);

  // Create a mock node ID that includes the type information
  const nodeId = `${nodeType}_${subType}_${Date.now()}`;

  // Add the node to the execution state
  executionState.nodes[nodeId] = {
    nodeId,
    nodeName: `${subType.replace('_', ' ')} ${nodeType}`,
    executionId: executionState.executionId,
    startTime: new Date().toISOString(),
    status: 'success',
    data: [],
    itemsProcessed: 1
  };

  // Convert inputData to proper format if provided
  let formattedInputData: NodeExecutionData[] | undefined;
  if (inputData && typeof inputData === 'object') {
    formattedInputData = [{
      json: inputData.json || inputData,
    }];
  }

  // Use the simulateNodeExecution method from the WorkflowDataAccessor
  return dataAccessor.simulateNodeExecution(nodeId, formattedInputData);
}

export class RealEventWorkflowExecutor implements WorkflowExecutor {
  private activeWorkflows: Map<string, any> = new Map();
  private executionLogs: Array<{ timestamp: string; triggerType: string; data: any; result: any }> = [];

  async triggerWorkflow(triggerType: string, data: any): Promise<void> {
    const timestamp = new Date().toISOString();

    // Simular execução de workflows baseada em triggers reais
    const workflowResult = await this.executeWorkflowForTrigger(triggerType, data);

    // Log da execução
    this.executionLogs.push({
      timestamp,
      triggerType,
      data,
      result: workflowResult
    });

    // Manter apenas os últimos 100 logs
    if (this.executionLogs.length > 100) {
      this.executionLogs.shift();
    }

    logger.info(`🔄 Workflow executado para ${triggerType}: ${workflowResult.nodesExecuted || 0} nodes`);
  }

  private async executeWorkflowForTrigger(triggerType: string, eventData: any): Promise<any> {
    // Simular diferentes workflows baseados no tipo de trigger
    switch (triggerType) {
      case 'price_change':
        return this.executePriceChangeWorkflow(eventData);

      case 'take_profit':
        return this.executeTakeProfitWorkflow(eventData);

      case 'position_updated':
        return this.executePositionUpdateWorkflow(eventData);

      case 'buy_confirmed':
        return this.executeBuyConfirmedWorkflow(eventData);

      case 'sell_confirmed':
        return this.executeSellConfirmedWorkflow(eventData);

      case 'token_detected':
        return this.executeTokenDetectedWorkflow(eventData);

      default:
        return this.executeGenericWorkflow(triggerType, eventData);
    }
  }

  private async executePriceChangeWorkflow(data: any) {
    // Simular workflow de mudança de preço
    const nodes = [];

    // Node 1: Price Change Trigger (dados reais do evento)
    const triggerResult = await simulateNodeExecution('trigger', 'price_change', {
      token: data.token,
      changePercentage: ((data.multiple - 1) * 100),
      direction: data.multiple > 1 ? 'up' : 'down'
    }, {});

    nodes.push(triggerResult[0]);

    // Node 2: Condition - Multiple Above 2x
    if (data.multiple > 2) {
      const conditionResult = await simulateNodeExecution('condition', 'multiple_above', {
        inputPrice: data.currentPrice,
        threshold: 2.0,
        multiple: data.multiple
      }, triggerResult[0]);

      nodes.push(conditionResult[0]);

      // Node 3: Action - Log Message
      const actionResult = await simulateNodeExecution('action', 'log_message', {
        message: `🎯 ${data.token} atingiu ${data.multiple.toFixed(2)}x!`
      }, conditionResult[0]);

      nodes.push(actionResult[0]);
    }

    return {
      triggerType: 'price_change',
      nodesExecuted: nodes.length,
      nodes,
      realEventData: data,
      success: true
    };
  }

  private async executeTakeProfitWorkflow(data: any) {
    // Simular workflow de take profit
    const nodes = [];

    // Node 1: Take Profit Trigger
    const triggerResult = await simulateNodeExecution('trigger', 'take_profit', {
      stage: data.stage,
      multiple: data.multiple,
      percentage: data.percentage
    }, {});

    nodes.push(triggerResult[0]);

    // Node 2: Action - Log Success
    const actionResult = await simulateNodeExecution('action', 'log_message', {
      message: `✅ Take Profit ${data.stage} executado para ${data.ticker} - ${data.percentage}% vendido a ${data.multiple.toFixed(2)}x`
    }, triggerResult[0]);

    nodes.push(actionResult[0]);

    return {
      triggerType: 'take_profit',
      nodesExecuted: nodes.length,
      nodes,
      realEventData: data,
      success: true
    };
  }

  private async executePositionUpdateWorkflow(data: any) {
    // Simular workflow de atualização de posição
    const nodes = [];

    // Node 1: Position Update Trigger
    const triggerResult = await simulateNodeExecution('trigger', 'position_update', {
      ticker: data.ticker,
      currentPrice: data.currentPrice,
      multiple: data.multiple,
      percentChange: data.percentChange
    }, {});

    nodes.push(triggerResult[0]);

    // Node 2: Condition - Check if new high
    if (data.multiple >= data.highestMultiple) {
      const conditionResult = await simulateNodeExecution('condition', 'new_high', {
        currentMultiple: data.multiple,
        previousHigh: data.highestMultiple
      }, triggerResult[0]);

      nodes.push(conditionResult[0]);

      // Node 3: Action - Celebrate new high
      const actionResult = await simulateNodeExecution('action', 'log_message', {
        message: `🚀 ${data.ticker} novo recorde: ${data.multiple.toFixed(2)}x!`
      }, conditionResult[0]);

      nodes.push(actionResult[0]);
    }

    return {
      triggerType: 'position_updated',
      nodesExecuted: nodes.length,
      nodes,
      realEventData: data,
      success: true
    };
  }

  private async executeBuyConfirmedWorkflow(data: any) {
    // Simular workflow de compra confirmada
    const nodes = [];

    const triggerResult = await simulateNodeExecution('trigger', 'buy_confirmed', {
      ticker: data.ticker,
      signature: data.signature,
      actualPrice: data.actualPrice
    }, {});

    nodes.push(triggerResult[0]);

    const actionResult = await simulateNodeExecution('action', 'log_message', {
      message: `💰 Compra confirmada: ${data.ticker} por $${data.actualPrice?.toFixed(6) || 'N/A'}`
    }, triggerResult[0]);

    nodes.push(actionResult[0]);

    return {
      triggerType: 'buy_confirmed',
      nodesExecuted: nodes.length,
      nodes,
      realEventData: data,
      success: true
    };
  }

  private async executeSellConfirmedWorkflow(data: any) {
    // Simular workflow de venda confirmada
    const nodes = [];

    const triggerResult = await simulateNodeExecution('trigger', 'sell_confirmed', {
      ticker: data.ticker,
      signature: data.signature,
      profit: data.profit
    }, {});

    nodes.push(triggerResult[0]);

    const actionResult = await simulateNodeExecution('action', 'log_message', {
      message: `💵 Venda confirmada: ${data.ticker} - Lucro: $${data.profit?.toFixed(2) || 'N/A'}`
    }, triggerResult[0]);

    nodes.push(actionResult[0]);

    return {
      triggerType: 'sell_confirmed',
      nodesExecuted: nodes.length,
      nodes,
      realEventData: data,
      success: true
    };
  }

  private async executeTokenDetectedWorkflow(data: any) {
    // Simular workflow de token detectado
    const nodes = [];

    const triggerResult = await simulateNodeExecution('trigger', 'token_detected', {
      token: data.token,
      score: data.score
    }, {});

    nodes.push(triggerResult[0]);

    // Condition - Score above threshold
    if (data.score >= 5) {
      const conditionResult = await simulateNodeExecution('condition', 'score_above', {
        score: data.score,
        threshold: 5
      }, triggerResult[0]);

      nodes.push(conditionResult[0]);

      const actionResult = await simulateNodeExecution('action', 'log_message', {
        message: `🔍 Token promissor detectado: ${data.token.ticker || 'Unknown'} (Score: ${data.score})`
      }, conditionResult[0]);

      nodes.push(actionResult[0]);
    }

    return {
      triggerType: 'token_detected',
      nodesExecuted: nodes.length,
      nodes,
      realEventData: data,
      success: true
    };
  }

  private async executeGenericWorkflow(triggerType: string, data: any) {
    // Workflow genérico para triggers não específicos
    const nodes = [];

    const triggerResult = await simulateNodeExecution('trigger', 'generic', {
      triggerType,
      eventData: data
    }, {});

    nodes.push(triggerResult[0]);

    const actionResult = await simulateNodeExecution('action', 'log_message', {
      message: `📡 Evento ${triggerType} processado por workflow`
    }, triggerResult[0]);

    nodes.push(actionResult[0]);

    return {
      triggerType: 'generic',
      nodesExecuted: nodes.length,
      nodes,
      realEventData: data,
      success: true
    };
  }

  // Interface implementation
  isWorkflowActive(workflowId: string): boolean {
    return this.activeWorkflows.has(workflowId);
  }

  getActiveWorkflows(): string[] {
    return Array.from(this.activeWorkflows.keys());
  }

  // Debug methods
  getExecutionLogs() {
    return [...this.executionLogs];
  }

  getStats() {
    const last10 = this.executionLogs.slice(-10);
    const triggerCounts = last10.reduce((acc, log) => {
      acc[log.triggerType] = (acc[log.triggerType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalExecutions: this.executionLogs.length,
      activeWorkflows: this.getActiveWorkflows(),
      recentTriggerCounts: triggerCounts,
      lastExecution: this.executionLogs[this.executionLogs.length - 1]?.timestamp || null
    };
  }

  // Test method to manually trigger workflows
  async testTrigger(triggerType: string, testData: any = {}) {
    logger.info(`🧪 Teste manual de workflow: ${triggerType}`);
    await this.triggerWorkflow(triggerType, {
      ...testData,
      isTest: true,
      timestamp: new Date().toISOString()
    });
  }
}

// Instância singleton do executor
export const realEventWorkflowExecutor = new RealEventWorkflowExecutor();