// Sistema de Workflows Visuais - Tipos Base

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  position: {
    x: number;
    y: number;
  };
  data: NodeData;
  inputs: NodeInput[];
  outputs: NodeOutput[];
}

export interface NodeConnection {
  id: string;
  sourceNodeId: string;
  sourceOutputId: string;
  targetNodeId: string;
  targetInputId: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: NodeConnection[];
  createdAt: string;
  updatedAt: string;
  executionCount?: number;
  lastExecution?: string;
}

// Tipos de Nodes
export type NodeType =
  | 'trigger-price-change'
  | 'trigger-new-position'
  | 'trigger-timer'
  | 'trigger-manual'
  | 'condition-price-above'
  | 'condition-price-below'
  | 'condition-multiple-above'
  | 'condition-if-else'
  | 'action-sell-percentage'
  | 'action-sell-all'
  | 'action-pause-position'
  | 'action-resume-position'
  | 'action-notify'
  | 'action-webhook'
  | 'util-delay'
  | 'util-log'
  | 'util-loop';

// Categorias de Nodes para organizar na UI
export enum NodeCategory {
  TRIGGERS = 'triggers',
  CONDITIONS = 'conditions',
  ACTIONS = 'actions',
  UTILITIES = 'utilities'
}

// Dados específicos de cada node
export type NodeData =
  | TriggerPriceChangeData
  | TriggerNewPositionData
  | TriggerTimerData
  | TriggerManualData
  | ConditionPriceData
  | ConditionMultipleData
  | ConditionIfElseData
  | ActionSellData
  | ActionPauseData
  | ActionNotifyData
  | ActionWebhookData
  | UtilDelayData
  | UtilLogData
  | UtilLoopData;

// Inputs e Outputs dos nodes
export interface NodeInput {
  id: string;
  name: string;
  type: 'execution' | 'data' | 'condition';
  required: boolean;
}

export interface NodeOutput {
  id: string;
  name: string;
  type: 'execution' | 'data' | 'condition';
}

// === TRIGGER NODE DATA ===

export interface TriggerPriceChangeData {
  mint?: string; // Se vazio, aplica a todas as posições
  changePercentage: number; // % de mudança para disparar
  direction: 'up' | 'down' | 'both';
  timeframe: number; // em segundos
}

export interface TriggerNewPositionData {
  mint?: string; // Se vazio, aplica a qualquer nova posição
  minInvestment?: number; // Valor mínimo em SOL
}

export interface TriggerTimerData {
  interval: number; // em segundos
  repeatCount?: number; // Se undefined, repete infinitamente
}

export interface TriggerManualData {
  // Trigger manual não precisa de dados específicos
}

// === CONDITION NODE DATA ===

export interface ConditionPriceData {
  comparison: 'greater' | 'less' | 'equal' | 'greater_equal' | 'less_equal';
  value: number;
  valueType: 'absolute' | 'percentage' | 'multiple';
  basePrice?: 'entry' | 'current' | 'highest';
}

export interface ConditionMultipleData {
  minMultiple: number; // Ex: 2.5x
  basePrice: 'entry' | 'lowest';
}

export interface ConditionIfElseData {
  conditions: {
    id: string;
    type: 'price' | 'multiple' | 'time' | 'custom';
    operator: 'and' | 'or';
    data: any;
  }[];
}

// === ACTION NODE DATA ===

export interface ActionSellData {
  percentage: number; // % para vender (1-100)
  priceType: 'market' | 'limit';
  limitPrice?: number;
  slippage?: number;
}

export interface ActionPauseData {
  duration?: number; // em segundos, se undefined pausa indefinidamente
  reason?: string;
}

export interface ActionNotifyData {
  title: string;
  message: string;
  channels: ('console' | 'webhook' | 'telegram')[];
  priority: 'low' | 'medium' | 'high';
}

export interface ActionWebhookData {
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: any;
}

// === UTILITY NODE DATA ===

export interface UtilDelayData {
  duration: number; // em segundos
  reason?: string;
}

export interface UtilLogData {
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
  includePositionData: boolean;
}

export interface UtilLoopData {
  maxIterations: number;
  breakCondition?: any;
}

// === EXECUTION CONTEXT ===

export interface WorkflowExecutionContext {
  workflowId: string;
  executionId: string;
  startedAt: string;
  triggeredBy: {
    nodeId: string;
    reason: string;
    data?: any;
  };
  variables: Record<string, any>;
  position?: {
    mint: string;
    ticker: string;
    entryPrice: number;
    currentPrice: number;
    multiple: number;
  };
}

// === WORKFLOW TEMPLATE ===

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'advanced' | 'custom';
  thumbnail?: string;
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>;
}

// === NODE LIBRARY DEFINITION ===

export interface NodeDefinition {
  type: NodeType;
  category: NodeCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  defaultData: NodeData;
  configComponent?: string; // Nome do componente React para configurar
}