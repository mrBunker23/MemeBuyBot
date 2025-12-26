// Library de Nodes Disponíveis - Estilo n8n

import { NodeDefinition, NodeCategory, NodeType } from '../types/workflow.types';

export const NODE_LIBRARY: Record<NodeType, NodeDefinition> = {
  // === TRIGGERS ===
  'trigger-price-change': {
    type: 'trigger-price-change',
    category: NodeCategory.TRIGGERS,
    name: 'Mudança de Preço',
    description: 'Dispara quando o preço de uma moeda muda em X%',
    icon: '📈',
    color: '#10B981', // green-500
    inputs: [],
    outputs: [
      {
        id: 'execution',
        name: 'Quando Ativado',
        type: 'execution'
      },
      {
        id: 'position-data',
        name: 'Dados da Posição',
        type: 'data'
      }
    ],
    defaultData: {
      changePercentage: 5,
      direction: 'both',
      timeframe: 60
    }
  },

  'trigger-new-position': {
    type: 'trigger-new-position',
    category: NodeCategory.TRIGGERS,
    name: 'Nova Posição',
    description: 'Dispara quando uma nova posição é criada',
    icon: '🎯',
    color: '#3B82F6', // blue-500
    inputs: [],
    outputs: [
      {
        id: 'execution',
        name: 'Nova Posição',
        type: 'execution'
      },
      {
        id: 'position-data',
        name: 'Dados da Posição',
        type: 'data'
      }
    ],
    defaultData: {}
  },

  'trigger-timer': {
    type: 'trigger-timer',
    category: NodeCategory.TRIGGERS,
    name: 'Timer',
    description: 'Dispara em intervalos regulares de tempo',
    icon: '⏰',
    color: '#F59E0B', // amber-500
    inputs: [],
    outputs: [
      {
        id: 'execution',
        name: 'Tempo Atingido',
        type: 'execution'
      }
    ],
    defaultData: {
      interval: 300, // 5 minutos
      repeatCount: undefined
    }
  },

  'trigger-manual': {
    type: 'trigger-manual',
    category: NodeCategory.TRIGGERS,
    name: 'Manual',
    description: 'Dispara manualmente via interface',
    icon: '👆',
    color: '#6B7280', // gray-500
    inputs: [],
    outputs: [
      {
        id: 'execution',
        name: 'Executar',
        type: 'execution'
      }
    ],
    defaultData: {}
  },

  // === CONDITIONS ===
  'condition-price-above': {
    type: 'condition-price-above',
    category: NodeCategory.CONDITIONS,
    name: 'Preço Acima',
    description: 'Verifica se o preço está acima de um valor',
    icon: '⬆️',
    color: '#10B981', // green-500
    inputs: [
      {
        id: 'execution',
        name: 'Verificar',
        type: 'execution',
        required: true
      },
      {
        id: 'position-data',
        name: 'Dados da Posição',
        type: 'data',
        required: false
      }
    ],
    outputs: [
      {
        id: 'true',
        name: 'Verdadeiro',
        type: 'execution'
      },
      {
        id: 'false',
        name: 'Falso',
        type: 'execution'
      }
    ],
    defaultData: {
      comparison: 'greater',
      value: 2,
      valueType: 'multiple',
      basePrice: 'entry'
    }
  },

  'condition-price-below': {
    type: 'condition-price-below',
    category: NodeCategory.CONDITIONS,
    name: 'Preço Abaixo',
    description: 'Verifica se o preço está abaixo de um valor',
    icon: '⬇️',
    color: '#EF4444', // red-500
    inputs: [
      {
        id: 'execution',
        name: 'Verificar',
        type: 'execution',
        required: true
      },
      {
        id: 'position-data',
        name: 'Dados da Posição',
        type: 'data',
        required: false
      }
    ],
    outputs: [
      {
        id: 'true',
        name: 'Verdadeiro',
        type: 'execution'
      },
      {
        id: 'false',
        name: 'Falso',
        type: 'execution'
      }
    ],
    defaultData: {
      comparison: 'less',
      value: 0.8,
      valueType: 'multiple',
      basePrice: 'entry'
    }
  },

  'condition-multiple-above': {
    type: 'condition-multiple-above',
    category: NodeCategory.CONDITIONS,
    name: 'Múltiplo Acima',
    description: 'Verifica se o múltiplo está acima de X',
    icon: '✖️',
    color: '#8B5CF6', // violet-500
    inputs: [
      {
        id: 'execution',
        name: 'Verificar',
        type: 'execution',
        required: true
      },
      {
        id: 'position-data',
        name: 'Dados da Posição',
        type: 'data',
        required: false
      }
    ],
    outputs: [
      {
        id: 'true',
        name: 'Verdadeiro',
        type: 'execution'
      },
      {
        id: 'false',
        name: 'Falso',
        type: 'execution'
      }
    ],
    defaultData: {
      minMultiple: 2.0,
      basePrice: 'entry'
    }
  },

  'condition-if-else': {
    type: 'condition-if-else',
    category: NodeCategory.CONDITIONS,
    name: 'Se/Senão',
    description: 'Condição lógica avançada com múltiplos critérios',
    icon: '🔀',
    color: '#6366F1', // indigo-500
    inputs: [
      {
        id: 'execution',
        name: 'Verificar',
        type: 'execution',
        required: true
      },
      {
        id: 'position-data',
        name: 'Dados da Posição',
        type: 'data',
        required: false
      }
    ],
    outputs: [
      {
        id: 'true',
        name: 'Verdadeiro',
        type: 'execution'
      },
      {
        id: 'false',
        name: 'Falso',
        type: 'execution'
      }
    ],
    defaultData: {
      conditions: []
    }
  },

  // === ACTIONS ===
  'action-sell-percentage': {
    type: 'action-sell-percentage',
    category: NodeCategory.ACTIONS,
    name: 'Vender %',
    description: 'Vende uma porcentagem da posição',
    icon: '💰',
    color: '#10B981', // green-500
    inputs: [
      {
        id: 'execution',
        name: 'Executar',
        type: 'execution',
        required: true
      },
      {
        id: 'position-data',
        name: 'Dados da Posição',
        type: 'data',
        required: false
      }
    ],
    outputs: [
      {
        id: 'success',
        name: 'Sucesso',
        type: 'execution'
      },
      {
        id: 'error',
        name: 'Erro',
        type: 'execution'
      }
    ],
    defaultData: {
      percentage: 25,
      priceType: 'market',
      slippage: 1
    }
  },

  'action-sell-all': {
    type: 'action-sell-all',
    category: NodeCategory.ACTIONS,
    name: 'Vender Tudo',
    description: 'Vende toda a posição',
    icon: '💸',
    color: '#EF4444', // red-500
    inputs: [
      {
        id: 'execution',
        name: 'Executar',
        type: 'execution',
        required: true
      },
      {
        id: 'position-data',
        name: 'Dados da Posição',
        type: 'data',
        required: false
      }
    ],
    outputs: [
      {
        id: 'success',
        name: 'Sucesso',
        type: 'execution'
      },
      {
        id: 'error',
        name: 'Erro',
        type: 'execution'
      }
    ],
    defaultData: {
      percentage: 100,
      priceType: 'market',
      slippage: 1
    }
  },

  'action-pause-position': {
    type: 'action-pause-position',
    category: NodeCategory.ACTIONS,
    name: 'Pausar Posição',
    description: 'Pausa o monitoramento da posição',
    icon: '⏸️',
    color: '#F59E0B', // amber-500
    inputs: [
      {
        id: 'execution',
        name: 'Executar',
        type: 'execution',
        required: true
      },
      {
        id: 'position-data',
        name: 'Dados da Posição',
        type: 'data',
        required: false
      }
    ],
    outputs: [
      {
        id: 'success',
        name: 'Pausado',
        type: 'execution'
      }
    ],
    defaultData: {
      reason: 'Pausado por workflow'
    }
  },

  'action-resume-position': {
    type: 'action-resume-position',
    category: NodeCategory.ACTIONS,
    name: 'Retomar Posição',
    description: 'Retoma o monitoramento da posição',
    icon: '▶️',
    color: '#10B981', // green-500
    inputs: [
      {
        id: 'execution',
        name: 'Executar',
        type: 'execution',
        required: true
      },
      {
        id: 'position-data',
        name: 'Dados da Posição',
        type: 'data',
        required: false
      }
    ],
    outputs: [
      {
        id: 'success',
        name: 'Retomado',
        type: 'execution'
      }
    ],
    defaultData: {}
  },

  'action-notify': {
    type: 'action-notify',
    category: NodeCategory.ACTIONS,
    name: 'Notificar',
    description: 'Envia notificação/alerta',
    icon: '🔔',
    color: '#6366F1', // indigo-500
    inputs: [
      {
        id: 'execution',
        name: 'Executar',
        type: 'execution',
        required: true
      },
      {
        id: 'position-data',
        name: 'Dados da Posição',
        type: 'data',
        required: false
      }
    ],
    outputs: [
      {
        id: 'sent',
        name: 'Enviado',
        type: 'execution'
      }
    ],
    defaultData: {
      title: 'Alerta do Bot',
      message: 'Condição atingida',
      channels: ['console'],
      priority: 'medium'
    }
  },

  'action-webhook': {
    type: 'action-webhook',
    category: NodeCategory.ACTIONS,
    name: 'Webhook',
    description: 'Faz chamada HTTP para endpoint externo',
    icon: '🔗',
    color: '#8B5CF6', // violet-500
    inputs: [
      {
        id: 'execution',
        name: 'Executar',
        type: 'execution',
        required: true
      },
      {
        id: 'data',
        name: 'Dados',
        type: 'data',
        required: false
      }
    ],
    outputs: [
      {
        id: 'success',
        name: 'Sucesso',
        type: 'execution'
      },
      {
        id: 'error',
        name: 'Erro',
        type: 'execution'
      }
    ],
    defaultData: {
      url: 'https://api.exemplo.com/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  },

  // === UTILITIES ===
  'util-delay': {
    type: 'util-delay',
    category: NodeCategory.UTILITIES,
    name: 'Delay',
    description: 'Aguarda X segundos antes de continuar',
    icon: '⏱️',
    color: '#6B7280', // gray-500
    inputs: [
      {
        id: 'execution',
        name: 'Aguardar',
        type: 'execution',
        required: true
      }
    ],
    outputs: [
      {
        id: 'execution',
        name: 'Continuar',
        type: 'execution'
      }
    ],
    defaultData: {
      duration: 60,
      reason: 'Aguardando execução'
    }
  },

  'util-log': {
    type: 'util-log',
    category: NodeCategory.UTILITIES,
    name: 'Log',
    description: 'Registra mensagem no log do sistema',
    icon: '📝',
    color: '#6B7280', // gray-500
    inputs: [
      {
        id: 'execution',
        name: 'Registrar',
        type: 'execution',
        required: true
      },
      {
        id: 'data',
        name: 'Dados',
        type: 'data',
        required: false
      }
    ],
    outputs: [
      {
        id: 'execution',
        name: 'Continuar',
        type: 'execution'
      }
    ],
    defaultData: {
      message: 'Workflow executado',
      level: 'info',
      includePositionData: true
    }
  },

  'util-loop': {
    type: 'util-loop',
    category: NodeCategory.UTILITIES,
    name: 'Loop',
    description: 'Executa ações em loop até condição ser atingida',
    icon: '🔄',
    color: '#8B5CF6', // violet-500
    inputs: [
      {
        id: 'execution',
        name: 'Iniciar Loop',
        type: 'execution',
        required: true
      },
      {
        id: 'break-condition',
        name: 'Condição de Parada',
        type: 'condition',
        required: false
      }
    ],
    outputs: [
      {
        id: 'iteration',
        name: 'Iteração',
        type: 'execution'
      },
      {
        id: 'complete',
        name: 'Completo',
        type: 'execution'
      }
    ],
    defaultData: {
      maxIterations: 10
    }
  }
};

// Helper para obter nodes por categoria
export const getNodesByCategory = (category: NodeCategory): NodeDefinition[] => {
  return Object.values(NODE_LIBRARY).filter(node => node.category === category);
};

// Helper para obter definição de um node
export const getNodeDefinition = (type: NodeType): NodeDefinition | null => {
  return NODE_LIBRARY[type] || null;
};

// Categorias organizadas para a UI
export const NODE_CATEGORIES = [
  {
    id: NodeCategory.TRIGGERS,
    name: 'Disparadores',
    description: 'Iniciam a execução do workflow',
    icon: '🎯',
    color: '#10B981'
  },
  {
    id: NodeCategory.CONDITIONS,
    name: 'Condições',
    description: 'Verificam critérios e direcionam o fluxo',
    icon: '⚖️',
    color: '#3B82F6'
  },
  {
    id: NodeCategory.ACTIONS,
    name: 'Ações',
    description: 'Executam operações de trading',
    icon: '⚡',
    color: '#EF4444'
  },
  {
    id: NodeCategory.UTILITIES,
    name: 'Utilitários',
    description: 'Ferramentas auxiliares para o workflow',
    icon: '🔧',
    color: '#6B7280'
  }
];