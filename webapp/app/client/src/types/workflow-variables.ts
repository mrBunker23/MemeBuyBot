// Sistema de Variáveis para Workflows - Tipos

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  value?: any;
  description?: string;
  source: string; // ID do node que produziu a variável
}

export interface NodeVariableOutput {
  nodeId: string;
  nodeName: string;
  variables: WorkflowVariable[];
}

export interface VariableReference {
  nodeId: string;
  variableName: string;
  displayName?: string;
}

export interface NodeExecutionContext {
  nodeId: string;
  inputVariables: Record<string, any>;
  outputVariables: Record<string, any>;
  executionId: string;
  timestamp: string;
}

// Configurações padrão de variáveis por tipo de node
export const NODE_VARIABLE_DEFINITIONS: Record<string, WorkflowVariable[]> = {
  trigger: [
    { name: 'token', type: 'string', description: 'Symbol do token disparador', source: 'trigger' },
    { name: 'currentPrice', type: 'number', description: 'Preço atual do token', source: 'trigger' },
    { name: 'priceChange', type: 'number', description: 'Variação de preço (%)', source: 'trigger' },
    { name: 'volume24h', type: 'number', description: 'Volume 24h', source: 'trigger' },
    { name: 'marketCap', type: 'number', description: 'Market cap atual', source: 'trigger' },
    { name: 'triggerTime', type: 'string', description: 'Timestamp do disparo', source: 'trigger' }
  ],
  condition: [
    { name: 'conditionMet', type: 'boolean', description: 'Se a condição foi atendida', source: 'condition' },
    { name: 'evaluatedValue', type: 'number', description: 'Valor avaliado na condição', source: 'condition' },
    { name: 'comparisonResult', type: 'string', description: 'Resultado da comparação', source: 'condition' }
  ],
  action: [
    { name: 'actionExecuted', type: 'boolean', description: 'Se a ação foi executada', source: 'action' },
    { name: 'transactionId', type: 'string', description: 'ID da transação', source: 'action' },
    { name: 'executedAmount', type: 'number', description: 'Quantidade executada', source: 'action' },
    { name: 'executedPrice', type: 'number', description: 'Preço de execução', source: 'action' },
    { name: 'slippage', type: 'number', description: 'Slippage real', source: 'action' },
    { name: 'fees', type: 'number', description: 'Taxas pagas', source: 'action' }
  ],
  utility: [
    { name: 'processed', type: 'boolean', description: 'Se foi processado', source: 'utility' },
    { name: 'result', type: 'string', description: 'Resultado do processamento', source: 'utility' },
    { name: 'processingTime', type: 'number', description: 'Tempo de processamento (ms)', source: 'utility' }
  ]
};

// Funções utilitárias
export function getAvailableVariables(
  nodeId: string,
  nodes: Array<{id: string, data: any}>,
  edges: Array<{source: string, target: string}>
): NodeVariableOutput[] {
  // Encontrar todos os nodes que estão conectados como entrada para este node
  const inputConnections = edges.filter(edge => edge.target === nodeId);
  const connectedNodes = inputConnections.map(conn => conn.source);

  return nodes
    .filter(node => connectedNodes.includes(node.id))
    .map(node => ({
      nodeId: node.id,
      nodeName: node.data?.label || node.id,
      variables: NODE_VARIABLE_DEFINITIONS[node.data?.nodeType] || []
    }));
}

export function formatVariableReference(nodeId: string, variableName: string, nodes: Array<{id: string, data: any}>): string {
  const node = nodes.find(n => n.id === nodeId);
  const nodeName = node?.data?.label || nodeId;
  return `{{ ${nodeName}.${variableName} }}`;
}

export function parseVariableReference(reference: string): VariableReference | null {
  const match = reference.match(/\{\{\s*(.+)\.(.+)\s*\}\}/);
  if (!match) return null;

  return {
    nodeId: match[1], // Isso vai precisar ser mapeado para o ID real
    variableName: match[2],
    displayName: reference
  };
}

export function isVariableReference(value: string): boolean {
  return typeof value === 'string' && /\{\{\s*.+\..+\s*\}\}/.test(value);
}