// Painel de Propriedades dos Nodes - Configuração dinâmica

import React, { useState, useEffect } from 'react';
import { type Node, type Edge } from '@xyflow/react';
import { X, Settings, Save, Trash2, Play, Info, AlertCircle, Variable, Database } from 'lucide-react';
import { VariableSelector } from './VariableSelector';
import { getAvailableVariables, NODE_VARIABLE_DEFINITIONS } from '../types/workflow-variables';

interface NodePropertiesPanelProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, newData: any) => void;
  onDelete: (nodeId: string) => void;
  nodes: Node[];
  edges: Edge[];
}

export function NodePropertiesPanel({
  node,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  nodes,
  edges
}: NodePropertiesPanelProps) {
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [nodeName, setNodeName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Atualizar estado local quando node muda
  useEffect(() => {
    if (node) {
      setLocalConfig(node.data?.config || {});
      setNodeName(node.data?.label || '');
      setHasChanges(false);
    }
  }, [node]);

  // Marcar como alterado quando config muda
  useEffect(() => {
    if (node) {
      const originalConfig = node.data?.config || {};
      const originalName = node.data?.label || '';
      setHasChanges(
        JSON.stringify(originalConfig) !== JSON.stringify(localConfig) ||
        originalName !== nodeName
      );
    }
  }, [localConfig, nodeName, node]);

  const handleConfigChange = (key: string, value: any) => {
    console.log('handleConfigChange:', { key, value, prevValue: localConfig[key] });
    setLocalConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    if (!node) return;

    onUpdate(node.id, {
      label: nodeName,
      config: localConfig
    });
    setHasChanges(false);
  };

  const handleDelete = () => {
    if (!node) return;

    if (confirm(`Tem certeza que deseja deletar o node "${node.data?.label}"?`)) {
      onDelete(node.id);
    }
  };

  const renderConfigField = (key: string, value: any, type: string = 'text') => {
    const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm";

    // Campos que suportam variáveis
    if (type === 'text' || type === 'number') {
      return (
        <VariableSelector
          nodeId={node?.id || ''}
          fieldValue={value || ''}
          onVariableSelect={(variableReference) => handleConfigChange(key, variableReference)}
          onTextChange={(textValue) => {
            console.log('NodePropertiesPanel onTextChange:', { key, textValue, type });
            if (type === 'number') {
              // Só converter para número se não for uma expressão (contém {{}}) e não for string vazia
              if (textValue === '' || textValue.includes('{{')) {
                handleConfigChange(key, textValue);
              } else {
                const numValue = parseFloat(textValue);
                handleConfigChange(key, isNaN(numValue) ? textValue : numValue);
              }
            } else {
              handleConfigChange(key, textValue);
            }
          }}
          nodes={nodes}
          edges={edges}
          fieldType={type}
          placeholder={type === 'number' ? 'Digite um número ou use variável' : 'Digite texto ou use variável'}
        />
      );
    }

    switch (type) {
      case 'select':
        const options = getSelectOptions(key, node?.data?.nodeType);
        return (
          <select
            value={value || ''}
            onChange={(e) => handleConfigChange(key, e.target.value)}
            className={inputClasses}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleConfigChange(key, e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-600">
              {value ? 'Ativado' : 'Desativado'}
            </span>
          </div>
        );

      case 'textarea':
        return (
          <VariableSelector
            nodeId={node?.id || ''}
            fieldValue={value || ''}
            onVariableSelect={(variableReference) => handleConfigChange(key, variableReference)}
            onTextChange={(textValue) => handleConfigChange(key, textValue)}
            nodes={nodes}
            edges={edges}
            placeholder="Digite texto ou use variável..."
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleConfigChange(key, e.target.value)}
            className={inputClasses}
          />
        );
    }
  };

  const getFieldConfig = (nodeType: string) => {
    const configs: Record<string, Array<{key: string, label: string, type: string, description?: string}>> = {
      trigger: [
        { key: 'token', label: 'Token Symbol', type: 'text', description: 'Ex: SOL, BTC, ETH' },
        { key: 'changePercentage', label: 'Variação (%)', type: 'number', description: 'Porcentagem de mudança para disparar' },
        { key: 'direction', label: 'Direção', type: 'select', description: 'Direção da variação' },
        { key: 'interval', label: 'Intervalo (s)', type: 'number', description: 'Intervalo de verificação em segundos' }
      ],
      condition: [
        { key: 'multipleThreshold', label: 'Múltiplo Mínimo', type: 'number', description: 'Múltiplo mínimo para condição passar' },
        { key: 'compareValue', label: 'Comparar com', type: 'select', description: 'Valor de referência para comparação' },
        { key: 'operator', label: 'Operador', type: 'select', description: 'Operador de comparação' },
        { key: 'threshold', label: 'Threshold', type: 'number', description: 'Valor limite para comparação' }
      ],
      action: [
        { key: 'sellPercentage', label: 'Venda (%)', type: 'number', description: 'Porcentagem da posição para vender' },
        { key: 'buyAmount', label: 'Valor Compra ($)', type: 'number', description: 'Valor em dólares para comprar' },
        { key: 'marketType', label: 'Tipo de Ordem', type: 'select', description: 'Tipo de ordem no mercado' },
        { key: 'slippage', label: 'Slippage (%)', type: 'number', description: 'Tolerância de slippage' }
      ],
      utility: [
        { key: 'message', label: 'Mensagem', type: 'textarea', description: 'Mensagem para log ou notificação' },
        { key: 'level', label: 'Level', type: 'select', description: 'Nível do log' },
        { key: 'delay', label: 'Delay (ms)', type: 'number', description: 'Delay em milissegundos' },
        { key: 'filepath', label: 'Arquivo', type: 'text', description: 'Caminho do arquivo' }
      ]
    };

    return configs[nodeType] || [];
  };

  const getSelectOptions = (key: string, nodeType?: string) => {
    const options: Record<string, Array<{value: string, label: string}>> = {
      direction: [
        { value: 'increase', label: 'Aumento' },
        { value: 'decrease', label: 'Diminuição' },
        { value: 'any', label: 'Qualquer' }
      ],
      compareValue: [
        { value: 'entryPrice', label: 'Preço de Entrada' },
        { value: 'currentPrice', label: 'Preço Atual' },
        { value: 'highestPrice', label: 'Maior Preço' },
        { value: 'custom', label: 'Valor Custom' }
      ],
      operator: [
        { value: 'greater', label: 'Maior que (>)' },
        { value: 'less', label: 'Menor que (<)' },
        { value: 'equals', label: 'Igual a (=)' },
        { value: 'greaterEquals', label: 'Maior ou igual (>=)' },
        { value: 'lessEquals', label: 'Menor ou igual (<=)' }
      ],
      marketType: [
        { value: 'market', label: 'Market Order' },
        { value: 'limit', label: 'Limit Order' },
        { value: 'stop', label: 'Stop Loss' }
      ],
      level: [
        { value: 'info', label: 'Info' },
        { value: 'warn', label: 'Warning' },
        { value: 'error', label: 'Error' },
        { value: 'debug', label: 'Debug' }
      ]
    };

    return options[key] || [];
  };

  if (!isOpen || !node) return null;

  const nodeTypeColors = {
    trigger: 'from-green-500 to-green-600',
    condition: 'from-amber-500 to-orange-600',
    action: 'from-red-500 to-red-600',
    utility: 'from-purple-500 to-purple-600'
  };

  const nodeTypeColor = nodeTypeColors[node.data?.nodeType as keyof typeof nodeTypeColors] || 'from-gray-500 to-gray-600';
  const fieldConfigs = getFieldConfig(node.data?.nodeType);

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className={`bg-gradient-to-r ${nodeTypeColor} text-white p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings size={20} />
            <h3 className="font-bold text-lg">Node Properties</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-white/80 text-sm mt-1 capitalize">
          {node.data?.nodeType} Node
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Nome do Node */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Node
          </label>
          <input
            type="text"
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Digite o nome do node..."
          />
        </div>

        {/* Configurações dinâmicas */}
        {fieldConfigs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Settings size={16} className="mr-2" />
              Configurações
            </h4>

            <div className="space-y-3">
              {fieldConfigs.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  {renderConfigField(field.key, localConfig[field.key], field.type)}
                  {field.description && (
                    <p className="text-xs text-gray-500 mt-1 flex items-start">
                      <Info size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                      {field.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informações do Node */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Informações</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>ID:</span>
              <span className="font-mono">{node.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Tipo:</span>
              <span className="capitalize">{node.data?.nodeType}</span>
            </div>
            <div className="flex justify-between">
              <span>Posição:</span>
              <span className="font-mono">
                {Math.round(node.position.x)}, {Math.round(node.position.y)}
              </span>
            </div>
          </div>
        </div>

        {/* Variáveis Disponíveis */}
        {(() => {
          const availableVariables = getAvailableVariables(node.id, nodes, edges);
          const nodeOutputs = NODE_VARIABLE_DEFINITIONS[node.data?.nodeType] || [];

          return (availableVariables.length > 0 || nodeOutputs.length > 0) && (
            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Database size={16} className="mr-2 text-blue-600" />
                Sistema de Variáveis
              </h4>

              {/* Variáveis de entrada (de nodes conectados) */}
              {availableVariables.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-gray-600 mb-2 flex items-center">
                    <Variable size={12} className="mr-1 text-green-600" />
                    Entradas Disponíveis
                  </h5>
                  <div className="max-h-40 overflow-y-auto space-y-2 variable-scroll">
                    {availableVariables.map(nodeVar => (
                      <div key={nodeVar.nodeId} className="bg-white rounded p-2 text-xs border border-gray-200">
                        <div className="font-medium text-gray-700 mb-1 flex items-center justify-between">
                          <span>{nodeVar.nodeName}</span>
                          <span className="text-green-600 text-xs">({nodeVar.variables.length} campos)</span>
                        </div>
                        <div className="max-h-24 overflow-y-auto variable-scroll">
                          <div className="space-y-1">
                            {nodeVar.variables.map(variable => (
                              <div key={variable.name} className="flex items-center justify-between text-gray-600 py-0.5 hover:bg-gray-50 px-1 rounded">
                                <span className="font-mono text-xs">{variable.name}</span>
                                <span className="text-green-600 text-xs">{variable.type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {availableVariables.length > 2 && (
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      ↑ Role para ver todos os nodes conectados ↑
                    </div>
                  )}
                </div>
              )}

              {/* Variáveis de saída (que este node produz) */}
              {nodeOutputs.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-600 mb-2 flex items-center">
                    <Variable size={12} className="mr-1 text-blue-600" />
                    Saídas Produzidas ({nodeOutputs.length} campos)
                  </h5>
                  <div className="bg-white rounded p-2 text-xs max-h-32 overflow-y-auto variable-scroll border border-gray-200">
                    <div className="space-y-1">
                      {nodeOutputs.map(variable => (
                        <div key={variable.name} className="flex items-center justify-between text-gray-600 py-0.5 hover:bg-gray-50 px-1 rounded">
                          <span className="font-mono text-xs">{variable.name}</span>
                          <span className="text-blue-600 text-xs">{variable.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {nodeOutputs.length > 8 && (
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      ↑ Role para ver todas as variáveis ↑
                    </div>
                  )}
                </div>
              )}

              {availableVariables.length === 0 && nodeOutputs.length === 0 && (
                <div className="text-xs text-gray-500 text-center py-2">
                  Conecte nodes para ver variáveis disponíveis
                </div>
              )}
            </div>
          );
        })()}

        {/* Avisos e validações */}
        {node.data?.nodeType === 'trigger' && !localConfig.token && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start">
            <AlertCircle size={16} className="text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <strong>Token obrigatório:</strong> Configure um símbolo de token para o trigger funcionar.
            </div>
          </div>
        )}

        {node.data?.nodeType === 'action' && !localConfig.sellPercentage && !localConfig.buyAmount && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
            <AlertCircle size={16} className="text-red-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <strong>Ação necessária:</strong> Configure uma porcentagem de venda ou valor de compra.
            </div>
          </div>
        )}
      </div>

      {/* Footer com ações */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              hasChanges
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save size={16} />
            <span>Salvar</span>
          </button>
        </div>

        <button
          onClick={handleDelete}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          <Trash2 size={16} />
          <span>Deletar Node</span>
        </button>

        {hasChanges && (
          <p className="text-xs text-amber-600 text-center flex items-center justify-center">
            <AlertCircle size={12} className="mr-1" />
            Há alterações não salvas
          </p>
        )}
      </div>
    </div>
  );
}