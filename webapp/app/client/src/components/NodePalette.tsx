// Paleta de Nodes para Drag & Drop - Estilo n8n

import React, { useState } from 'react';
import { Play, GitBranch, Zap, Settings, ChevronDown, ChevronRight, Search, Info } from 'lucide-react';

interface NodePaletteProps {
  onNodeAdd: (nodeType: string, position: { x: number; y: number }) => void;
  stats: {
    triggers: number;
    conditions: number;
    actions: number;
    utilities: number;
    total: number;
    connections: number;
  };
}

interface NodeTemplate {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'utility';
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: string;
}

const nodeTemplates: NodeTemplate[] = [
  // TRIGGERS
  {
    id: 'price-change-trigger',
    type: 'trigger',
    name: 'Price Change',
    description: 'Dispara quando o preço de um token muda',
    icon: <Play size={16} />,
    color: 'from-green-500 to-green-600',
    category: 'Market'
  },
  {
    id: 'time-trigger',
    type: 'trigger',
    name: 'Schedule',
    description: 'Dispara em intervalos de tempo específicos',
    icon: <Play size={16} />,
    color: 'from-green-500 to-green-600',
    category: 'Time'
  },
  {
    id: 'volume-trigger',
    type: 'trigger',
    name: 'Volume Change',
    description: 'Dispara quando volume de trading muda',
    icon: <Play size={16} />,
    color: 'from-green-500 to-green-600',
    category: 'Market'
  },

  // CONDITIONS
  {
    id: 'multiple-above',
    type: 'condition',
    name: 'Multiple Above',
    description: 'Verifica se múltiplo está acima do threshold',
    icon: <GitBranch size={16} />,
    color: 'from-amber-500 to-orange-600',
    category: 'Math'
  },
  {
    id: 'price-compare',
    type: 'condition',
    name: 'Price Compare',
    description: 'Compara preço atual com valor de referência',
    icon: <GitBranch size={16} />,
    color: 'from-amber-500 to-orange-600',
    category: 'Market'
  },
  {
    id: 'time-window',
    type: 'condition',
    name: 'Time Window',
    description: 'Verifica se está dentro de janela de tempo',
    icon: <GitBranch size={16} />,
    color: 'from-amber-500 to-orange-600',
    category: 'Time'
  },

  // ACTIONS
  {
    id: 'sell-percentage',
    type: 'action',
    name: 'Sell Percentage',
    description: 'Vende uma porcentagem da posição',
    icon: <Zap size={16} />,
    color: 'from-red-500 to-red-600',
    category: 'Trading'
  },
  {
    id: 'buy-amount',
    type: 'action',
    name: 'Buy Amount',
    description: 'Compra uma quantidade específica',
    icon: <Zap size={16} />,
    color: 'from-red-500 to-red-600',
    category: 'Trading'
  },
  {
    id: 'send-notification',
    type: 'action',
    name: 'Send Alert',
    description: 'Envia notificação ou alerta',
    icon: <Zap size={16} />,
    color: 'from-red-500 to-red-600',
    category: 'Communication'
  },

  // UTILITIES
  {
    id: 'log-message',
    type: 'utility',
    name: 'Log Message',
    description: 'Registra mensagem no log do sistema',
    icon: <Settings size={14} />,
    color: 'from-purple-500 to-purple-600',
    category: 'Debug'
  },
  {
    id: 'delay',
    type: 'utility',
    name: 'Delay',
    description: 'Adiciona delay antes da próxima ação',
    icon: <Settings size={14} />,
    color: 'from-purple-500 to-purple-600',
    category: 'Flow'
  },
  {
    id: 'calculate',
    type: 'utility',
    name: 'Calculate',
    description: 'Realiza cálculos matemáticos',
    icon: <Settings size={14} />,
    color: 'from-purple-500 to-purple-600',
    category: 'Math'
  }
];

export function NodePalette({ onNodeAdd, stats }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Market', 'Trading', 'Math', 'Debug'])
  );
  const [selectedType, setSelectedType] = useState<string>('all');

  // Filtrar nodes por busca e tipo
  const filteredNodes = nodeTemplates.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || node.type === selectedType;
    return matchesSearch && matchesType;
  });

  // Agrupar por categoria
  const nodesByCategory = filteredNodes.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = [];
    }
    acc[node.category].push(node);
    return acc;
  }, {} as Record<string, NodeTemplate[]>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const typeFilters = [
    { id: 'all', name: 'Todos', count: nodeTemplates.length, color: 'bg-gray-100' },
    { id: 'trigger', name: 'Triggers', count: stats.triggers, color: 'bg-green-100' },
    { id: 'condition', name: 'Conditions', count: stats.conditions, color: 'bg-amber-100' },
    { id: 'action', name: 'Actions', count: stats.actions, color: 'bg-red-100' },
    { id: 'utility', name: 'Utilities', count: stats.utilities, color: 'bg-purple-100' },
  ];

  return (
    <div className="w-80 bg-white border-r border-gray-200 shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Settings size={16} className="text-white" />
          </div>
          <h3 className="font-bold text-gray-900">Node Palette</h3>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/70 rounded-lg p-2 text-center">
            <div className="font-bold text-blue-600">{stats.total}</div>
            <div className="text-gray-600">Nodes</div>
          </div>
          <div className="bg-white/70 rounded-lg p-2 text-center">
            <div className="font-bold text-purple-600">{stats.connections}</div>
            <div className="text-gray-600">Links</div>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Filtros por tipo */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-1">
          {typeFilters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setSelectedType(filter.id)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                selectedType === filter.id
                  ? 'bg-blue-500 text-white'
                  : `${filter.color} text-gray-700 hover:bg-blue-100`
              }`}
            >
              {filter.name} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {/* Lista de nodes por categoria */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(nodesByCategory).map(([category, nodes]) => (
          <div key={category} className="border-b border-gray-100">
            {/* Header da categoria */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                {expandedCategories.has(category) ? (
                  <ChevronDown size={14} className="text-gray-500" />
                ) : (
                  <ChevronRight size={14} className="text-gray-500" />
                )}
                <span className="font-medium text-sm text-gray-900">{category}</span>
                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                  {nodes.length}
                </span>
              </div>
            </button>

            {/* Nodes da categoria */}
            {expandedCategories.has(category) && (
              <div className="pb-2">
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type)}
                    className="mx-3 mb-2 p-3 border border-gray-200 rounded-lg cursor-grab hover:shadow-md transition-all duration-200 bg-white hover:bg-gray-50 active:cursor-grabbing"
                  >
                    <div className="flex items-start space-x-3">
                      {/* Ícone colorido */}
                      <div className={`w-8 h-8 bg-gradient-to-r ${node.color} rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                        {node.icon}
                      </div>

                      {/* Informações do node */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 truncate">
                          {node.name}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {node.description}
                        </p>

                        {/* Badge do tipo */}
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            node.type === 'trigger' ? 'bg-green-100 text-green-800' :
                            node.type === 'condition' ? 'bg-amber-100 text-amber-800' :
                            node.type === 'action' ? 'bg-red-100 text-red-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {node.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Mensagem quando não há resultados */}
        {Object.keys(nodesByCategory).length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Info size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-sm">Nenhum node encontrado</p>
            <p className="text-xs text-gray-400 mt-1">
              Tente ajustar os filtros ou busca
            </p>
          </div>
        )}
      </div>

      {/* Footer com dica */}
      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-600 text-center">
          💡 Arraste os nodes para o canvas
        </div>
      </div>
    </div>
  );
}