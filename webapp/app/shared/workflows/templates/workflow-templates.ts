// Templates de Workflows Pré-configurados

import { WorkflowTemplate, Workflow, WorkflowNode, NodeConnection } from '../types/workflow.types';

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'basic-take-profit',
    name: 'Take Profit Básico',
    description: 'Vende 25% quando atinge 2x o preço de entrada',
    category: 'basic',
    thumbnail: '💰',
    workflow: {
      name: 'Take Profit Básico',
      description: 'Estratégia simples de take profit',
      active: false,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger-price-change',
          name: 'Mudança de Preço',
          position: { x: 100, y: 200 },
          data: {
            changePercentage: 5,
            direction: 'up',
            timeframe: 60
          },
          inputs: [],
          outputs: [
            { id: 'execution', name: 'Quando Ativado', type: 'execution' },
            { id: 'position-data', name: 'Dados da Posição', type: 'data' }
          ]
        },
        {
          id: 'condition-1',
          type: 'condition-multiple-above',
          name: 'Múltiplo > 2x',
          position: { x: 400, y: 200 },
          data: {
            minMultiple: 2.0,
            basePrice: 'entry'
          },
          inputs: [
            { id: 'execution', name: 'Verificar', type: 'execution', required: true },
            { id: 'position-data', name: 'Dados da Posição', type: 'data', required: false }
          ],
          outputs: [
            { id: 'true', name: 'Verdadeiro', type: 'execution' },
            { id: 'false', name: 'Falso', type: 'execution' }
          ]
        },
        {
          id: 'action-1',
          type: 'action-sell-percentage',
          name: 'Vender 25%',
          position: { x: 700, y: 150 },
          data: {
            percentage: 25,
            priceType: 'market',
            slippage: 1
          },
          inputs: [
            { id: 'execution', name: 'Executar', type: 'execution', required: true },
            { id: 'position-data', name: 'Dados da Posição', type: 'data', required: false }
          ],
          outputs: [
            { id: 'success', name: 'Sucesso', type: 'execution' },
            { id: 'error', name: 'Erro', type: 'execution' }
          ]
        },
        {
          id: 'log-1',
          type: 'util-log',
          name: 'Log Sucesso',
          position: { x: 1000, y: 150 },
          data: {
            message: 'Take profit executado com sucesso - 25% vendido',
            level: 'success',
            includePositionData: true
          },
          inputs: [
            { id: 'execution', name: 'Registrar', type: 'execution', required: true }
          ],
          outputs: [
            { id: 'execution', name: 'Continuar', type: 'execution' }
          ]
        }
      ],
      connections: [
        {
          id: 'conn-1',
          sourceNodeId: 'trigger-1',
          sourceOutputId: 'execution',
          targetNodeId: 'condition-1',
          targetInputId: 'execution'
        },
        {
          id: 'conn-2',
          sourceNodeId: 'trigger-1',
          sourceOutputId: 'position-data',
          targetNodeId: 'condition-1',
          targetInputId: 'position-data'
        },
        {
          id: 'conn-3',
          sourceNodeId: 'condition-1',
          sourceOutputId: 'true',
          targetNodeId: 'action-1',
          targetInputId: 'execution'
        },
        {
          id: 'conn-4',
          sourceNodeId: 'action-1',
          sourceOutputId: 'success',
          targetNodeId: 'log-1',
          targetInputId: 'execution'
        }
      ],
      executionCount: 0
    }
  },

  {
    id: 'advanced-tp-strategy',
    name: 'Take Profit Avançado',
    description: 'Múltiplos níveis: 25% em 2x, 50% em 5x, resto em 10x',
    category: 'advanced',
    thumbnail: '🎯',
    workflow: {
      name: 'Take Profit Avançado',
      description: 'Estratégia de take profit em múltiplos níveis',
      active: false,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger-price-change',
          name: 'Monitor de Preço',
          position: { x: 100, y: 300 },
          data: {
            changePercentage: 3,
            direction: 'up',
            timeframe: 30
          },
          inputs: [],
          outputs: [
            { id: 'execution', name: 'Quando Ativado', type: 'execution' },
            { id: 'position-data', name: 'Dados da Posição', type: 'data' }
          ]
        },
        {
          id: 'condition-2x',
          type: 'condition-multiple-above',
          name: '2x Atingido?',
          position: { x: 400, y: 200 },
          data: {
            minMultiple: 2.0,
            basePrice: 'entry'
          },
          inputs: [
            { id: 'execution', name: 'Verificar', type: 'execution', required: true }
          ],
          outputs: [
            { id: 'true', name: 'Sim', type: 'execution' },
            { id: 'false', name: 'Não', type: 'execution' }
          ]
        },
        {
          id: 'condition-5x',
          type: 'condition-multiple-above',
          name: '5x Atingido?',
          position: { x: 400, y: 350 },
          data: {
            minMultiple: 5.0,
            basePrice: 'entry'
          },
          inputs: [
            { id: 'execution', name: 'Verificar', type: 'execution', required: true }
          ],
          outputs: [
            { id: 'true', name: 'Sim', type: 'execution' },
            { id: 'false', name: 'Não', type: 'execution' }
          ]
        },
        {
          id: 'condition-10x',
          type: 'condition-multiple-above',
          name: '10x Atingido?',
          position: { x: 400, y: 500 },
          data: {
            minMultiple: 10.0,
            basePrice: 'entry'
          },
          inputs: [
            { id: 'execution', name: 'Verificar', type: 'execution', required: true }
          ],
          outputs: [
            { id: 'true', name: 'Sim', type: 'execution' },
            { id: 'false', name: 'Não', type: 'execution' }
          ]
        },
        {
          id: 'sell-25',
          type: 'action-sell-percentage',
          name: 'Vender 25%',
          position: { x: 700, y: 200 },
          data: {
            percentage: 25,
            priceType: 'market',
            slippage: 1
          },
          inputs: [
            { id: 'execution', name: 'Executar', type: 'execution', required: true }
          ],
          outputs: [
            { id: 'success', name: 'Sucesso', type: 'execution' }
          ]
        },
        {
          id: 'sell-50',
          type: 'action-sell-percentage',
          name: 'Vender 50%',
          position: { x: 700, y: 350 },
          data: {
            percentage: 50,
            priceType: 'market',
            slippage: 1
          },
          inputs: [
            { id: 'execution', name: 'Executar', type: 'execution', required: true }
          ],
          outputs: [
            { id: 'success', name: 'Sucesso', type: 'execution' }
          ]
        },
        {
          id: 'sell-all',
          type: 'action-sell-all',
          name: 'Vender Resto',
          position: { x: 700, y: 500 },
          data: {
            percentage: 100,
            priceType: 'market',
            slippage: 1
          },
          inputs: [
            { id: 'execution', name: 'Executar', type: 'execution', required: true }
          ],
          outputs: [
            { id: 'success', name: 'Sucesso', type: 'execution' }
          ]
        }
      ],
      connections: [
        // Trigger para todas as condições
        {
          id: 'conn-t1',
          sourceNodeId: 'trigger-1',
          sourceOutputId: 'execution',
          targetNodeId: 'condition-2x',
          targetInputId: 'execution'
        },
        {
          id: 'conn-t2',
          sourceNodeId: 'trigger-1',
          sourceOutputId: 'execution',
          targetNodeId: 'condition-5x',
          targetInputId: 'execution'
        },
        {
          id: 'conn-t3',
          sourceNodeId: 'trigger-1',
          sourceOutputId: 'execution',
          targetNodeId: 'condition-10x',
          targetInputId: 'execution'
        },
        // Condições para ações
        {
          id: 'conn-2x',
          sourceNodeId: 'condition-2x',
          sourceOutputId: 'true',
          targetNodeId: 'sell-25',
          targetInputId: 'execution'
        },
        {
          id: 'conn-5x',
          sourceNodeId: 'condition-5x',
          sourceOutputId: 'true',
          targetNodeId: 'sell-50',
          targetInputId: 'execution'
        },
        {
          id: 'conn-10x',
          sourceNodeId: 'condition-10x',
          sourceOutputId: 'true',
          targetNodeId: 'sell-all',
          targetInputId: 'execution'
        }
      ],
      executionCount: 0
    }
  },

  {
    id: 'stop-loss-protection',
    name: 'Stop Loss Proteção',
    description: 'Vende tudo se perder mais de 20% do valor de entrada',
    category: 'basic',
    thumbnail: '🛡️',
    workflow: {
      name: 'Stop Loss Proteção',
      description: 'Proteção contra grandes perdas',
      active: false,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger-price-change',
          name: 'Monitor Queda',
          position: { x: 100, y: 200 },
          data: {
            changePercentage: 2,
            direction: 'down',
            timeframe: 30
          },
          inputs: [],
          outputs: [
            { id: 'execution', name: 'Quando Ativado', type: 'execution' },
            { id: 'position-data', name: 'Dados da Posição', type: 'data' }
          ]
        },
        {
          id: 'condition-1',
          type: 'condition-price-below',
          name: 'Preço < 80% Entrada',
          position: { x: 400, y: 200 },
          data: {
            comparison: 'less',
            value: 0.8,
            valueType: 'multiple',
            basePrice: 'entry'
          },
          inputs: [
            { id: 'execution', name: 'Verificar', type: 'execution', required: true }
          ],
          outputs: [
            { id: 'true', name: 'Verdadeiro', type: 'execution' },
            { id: 'false', name: 'Falso', type: 'execution' }
          ]
        },
        {
          id: 'notify-1',
          type: 'action-notify',
          name: 'Alerta Stop Loss',
          position: { x: 700, y: 150 },
          data: {
            title: '⚠️ STOP LOSS ATIVADO',
            message: 'Posição sendo vendida por proteção - perda de 20%',
            channels: ['console', 'webhook'],
            priority: 'high'
          },
          inputs: [
            { id: 'execution', name: 'Executar', type: 'execution', required: true }
          ],
          outputs: [
            { id: 'sent', name: 'Enviado', type: 'execution' }
          ]
        },
        {
          id: 'sell-all',
          type: 'action-sell-all',
          name: 'Vender Tudo',
          position: { x: 1000, y: 150 },
          data: {
            percentage: 100,
            priceType: 'market',
            slippage: 2
          },
          inputs: [
            { id: 'execution', name: 'Executar', type: 'execution', required: true }
          ],
          outputs: [
            { id: 'success', name: 'Sucesso', type: 'execution' }
          ]
        }
      ],
      connections: [
        {
          id: 'conn-1',
          sourceNodeId: 'trigger-1',
          sourceOutputId: 'execution',
          targetNodeId: 'condition-1',
          targetInputId: 'execution'
        },
        {
          id: 'conn-2',
          sourceNodeId: 'condition-1',
          sourceOutputId: 'true',
          targetNodeId: 'notify-1',
          targetInputId: 'execution'
        },
        {
          id: 'conn-3',
          sourceNodeId: 'notify-1',
          sourceOutputId: 'sent',
          targetNodeId: 'sell-all',
          targetInputId: 'execution'
        }
      ],
      executionCount: 0
    }
  },

  {
    id: 'time-based-strategy',
    name: 'Estratégia por Tempo',
    description: 'Vende automaticamente após 30 minutos, independente do preço',
    category: 'basic',
    thumbnail: '⏰',
    workflow: {
      name: 'Estratégia por Tempo',
      description: 'Venda automática baseada em tempo',
      active: false,
      nodes: [
        {
          id: 'trigger-new',
          type: 'trigger-new-position',
          name: 'Nova Posição',
          position: { x: 100, y: 200 },
          data: {},
          inputs: [],
          outputs: [
            { id: 'execution', name: 'Nova Posição', type: 'execution' },
            { id: 'position-data', name: 'Dados da Posição', type: 'data' }
          ]
        },
        {
          id: 'delay-1',
          type: 'util-delay',
          name: 'Aguardar 30min',
          position: { x: 400, y: 200 },
          data: {
            duration: 1800, // 30 minutos
            reason: 'Aguardando tempo de saída'
          },
          inputs: [
            { id: 'execution', name: 'Aguardar', type: 'execution', required: true }
          ],
          outputs: [
            { id: 'execution', name: 'Continuar', type: 'execution' }
          ]
        },
        {
          id: 'sell-all',
          type: 'action-sell-all',
          name: 'Vender Tudo',
          position: { x: 700, y: 200 },
          data: {
            percentage: 100,
            priceType: 'market',
            slippage: 1
          },
          inputs: [
            { id: 'execution', name: 'Executar', type: 'execution', required: true }
          ],
          outputs: [
            { id: 'success', name: 'Sucesso', type: 'execution' }
          ]
        },
        {
          id: 'log-1',
          type: 'util-log',
          name: 'Log Time Exit',
          position: { x: 1000, y: 200 },
          data: {
            message: 'Posição vendida por tempo - 30 minutos decorridos',
            level: 'info',
            includePositionData: true
          },
          inputs: [
            { id: 'execution', name: 'Registrar', type: 'execution', required: true }
          ],
          outputs: [
            { id: 'execution', name: 'Continuar', type: 'execution' }
          ]
        }
      ],
      connections: [
        {
          id: 'conn-1',
          sourceNodeId: 'trigger-new',
          sourceOutputId: 'execution',
          targetNodeId: 'delay-1',
          targetInputId: 'execution'
        },
        {
          id: 'conn-2',
          sourceNodeId: 'delay-1',
          sourceOutputId: 'execution',
          targetNodeId: 'sell-all',
          targetInputId: 'execution'
        },
        {
          id: 'conn-3',
          sourceNodeId: 'sell-all',
          sourceOutputId: 'success',
          targetNodeId: 'log-1',
          targetInputId: 'execution'
        }
      ],
      executionCount: 0
    }
  }
];

// Helper functions
export const getTemplate = (id: string): WorkflowTemplate | null => {
  return WORKFLOW_TEMPLATES.find(template => template.id === id) || null;
};

export const getTemplatesByCategory = (category: 'basic' | 'advanced' | 'custom'): WorkflowTemplate[] => {
  return WORKFLOW_TEMPLATES.filter(template => template.category === category);
};