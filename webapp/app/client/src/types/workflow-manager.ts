// Tipos para o sistema de gerenciamento de workflows

import { type Node, type Edge } from '@xyflow/react';

export interface WorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  isActive: boolean;
  author?: string;
  version: string;
}

export interface SavedWorkflow extends WorkflowMetadata {
  nodes: Node[];
  edges: Edge[];
  nodeCount: number;
  triggerCount: number;
  conditionCount: number;
  actionCount: number;
  utilityCount: number;
}

export interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalNodes: number;
  totalConnections: number;
  recentActivity: {
    created: number;
    updated: number;
    executed: number;
  };
}

export interface WorkflowFilter {
  searchTerm: string;
  tags: string[];
  isActive?: boolean;
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'nodeCount';
  sortOrder: 'asc' | 'desc';
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  nodes: Node[];
  edges: Edge[];
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Categorias padrão para organização
export const WORKFLOW_CATEGORIES = {
  TRADING: '💰 Trading',
  MONITORING: '📊 Monitoring',
  ALERTS: '🚨 Alerts',
  ANALYTICS: '📈 Analytics',
  AUTOMATION: '🤖 Automation',
  CUSTOM: '⚙️ Custom'
} as const;

// Tags populares para autocomplete
export const POPULAR_TAGS = [
  'trading',
  'take-profit',
  'stop-loss',
  'price-alert',
  'volume-tracking',
  'position-management',
  'risk-management',
  'notification',
  'analytics',
  'automation',
  'beginner',
  'advanced'
];

// Templates predefinidos
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'simple-take-profit',
    name: 'Take Profit Simples',
    description: 'Vende 25% da posição quando atingir 2x',
    category: WORKFLOW_CATEGORIES.TRADING,
    icon: '🎯',
    difficulty: 'beginner',
    tags: ['trading', 'take-profit', 'beginner'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'triggerNode',
        position: { x: 100, y: 100 },
        data: {
          label: '📊 Position Updated',
          nodeType: 'trigger',
          triggerEventName: 'position:updated',
          config: {
            eventType: 'position:updated'
          }
        }
      },
      {
        id: 'condition-1',
        type: 'conditionNode',
        position: { x: 400, y: 100 },
        data: {
          label: 'Multiple Above 2x',
          nodeType: 'condition',
          config: {
            multipleThreshold: 2.0,
            compareValue: '{{ $json.multiple }}'
          }
        }
      },
      {
        id: 'action-1',
        type: 'actionNode',
        position: { x: 700, y: 100 },
        data: {
          label: 'Sell 25%',
          nodeType: 'action',
          config: {
            sellPercentage: 25,
            marketType: 'market'
          }
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'condition-1',
        type: 'smoothstep'
      },
      {
        id: 'edge-2',
        source: 'condition-1',
        target: 'action-1',
        type: 'smoothstep'
      }
    ]
  },
  {
    id: 'price-alert',
    name: 'Alerta de Preço',
    description: 'Envia notificação quando preço muda mais de 10%',
    category: WORKFLOW_CATEGORIES.ALERTS,
    icon: '🚨',
    difficulty: 'beginner',
    tags: ['price-alert', 'notification', 'monitoring'],
    nodes: [
      {
        id: 'trigger-2',
        type: 'triggerNode',
        position: { x: 100, y: 100 },
        data: {
          label: '📈 Price Updated',
          nodeType: 'trigger',
          triggerEventName: 'price:updated',
          config: {
            eventType: 'price:updated'
          }
        }
      },
      {
        id: 'condition-2',
        type: 'conditionNode',
        position: { x: 400, y: 100 },
        data: {
          label: 'Change > 10%',
          nodeType: 'condition',
          config: {
            changeThreshold: 10,
            compareValue: '{{ $json.percentChange }}'
          }
        }
      },
      {
        id: 'action-2',
        type: 'utilityNode',
        position: { x: 700, y: 100 },
        data: {
          label: 'Log Alert',
          nodeType: 'utility',
          config: {
            message: '🚨 Preço de {{ $json.ticker }} mudou {{ $json.percentChange }}%',
            level: 'warn'
          }
        }
      }
    ],
    edges: [
      {
        id: 'edge-3',
        source: 'trigger-2',
        target: 'condition-2',
        type: 'smoothstep'
      },
      {
        id: 'edge-4',
        source: 'condition-2',
        target: 'action-2',
        type: 'smoothstep'
      }
    ]
  }
];

// Utilitários para manipulação de workflows
export function createEmptyWorkflow(name: string = 'Novo Workflow'): SavedWorkflow {
  const now = new Date().toISOString();
  return {
    id: `workflow-${Date.now()}`,
    name,
    description: '',
    createdAt: now,
    updatedAt: now,
    tags: [],
    isActive: false,
    version: '1.0.0',
    nodes: [],
    edges: [],
    nodeCount: 0,
    triggerCount: 0,
    conditionCount: 0,
    actionCount: 0,
    utilityCount: 0
  };
}

export function calculateWorkflowStats(nodes: Node[]): {
  nodeCount: number;
  triggerCount: number;
  conditionCount: number;
  actionCount: number;
  utilityCount: number;
} {
  const stats = {
    nodeCount: nodes.length,
    triggerCount: 0,
    conditionCount: 0,
    actionCount: 0,
    utilityCount: 0
  };

  nodes.forEach(node => {
    const nodeType = node.data?.nodeType;
    switch (nodeType) {
      case 'trigger':
        stats.triggerCount++;
        break;
      case 'condition':
        stats.conditionCount++;
        break;
      case 'action':
        stats.actionCount++;
        break;
      case 'utility':
        stats.utilityCount++;
        break;
    }
  });

  return stats;
}

export function validateWorkflow(workflow: SavedWorkflow): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validações básicas
  if (!workflow.name.trim()) {
    errors.push('Nome do workflow é obrigatório');
  }

  if (workflow.nodes.length === 0) {
    warnings.push('Workflow não possui nenhum node');
  }

  if (workflow.triggerCount === 0) {
    warnings.push('Workflow não possui triggers - não será executado automaticamente');
  }

  if (workflow.edges.length === 0 && workflow.nodes.length > 1) {
    warnings.push('Nodes não estão conectados');
  }

  // Validar se há nodes órfãos (sem conexões)
  const connectedNodeIds = new Set();
  workflow.edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const orphanNodes = workflow.nodes.filter(node => !connectedNodeIds.has(node.id));
  if (orphanNodes.length > 0 && workflow.nodes.length > 1) {
    warnings.push(`${orphanNodes.length} node(s) não conectado(s)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function getWorkflowCategory(workflow: SavedWorkflow): string {
  // Detectar categoria baseada nos nodes e tags
  const tags = workflow.tags?.join(' ').toLowerCase() || '';
  const hasTrading = workflow.nodes.some(node =>
    node.data?.nodeType === 'action' &&
    (node.data?.config?.sellPercentage || node.data?.config?.buyAmount)
  );

  if (tags.includes('trading') || hasTrading) {
    return WORKFLOW_CATEGORIES.TRADING;
  }

  if (tags.includes('alert') || tags.includes('notification')) {
    return WORKFLOW_CATEGORIES.ALERTS;
  }

  if (tags.includes('monitoring') || tags.includes('tracking')) {
    return WORKFLOW_CATEGORIES.MONITORING;
  }

  if (tags.includes('analytics') || tags.includes('analysis')) {
    return WORKFLOW_CATEGORIES.ANALYTICS;
  }

  if (tags.includes('automation')) {
    return WORKFLOW_CATEGORIES.AUTOMATION;
  }

  return WORKFLOW_CATEGORIES.CUSTOM;
}