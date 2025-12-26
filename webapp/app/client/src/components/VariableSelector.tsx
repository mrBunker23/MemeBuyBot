// Seletor de Variáveis com Contextos Reais - Estilo n8n

import React, { useState, useEffect } from 'react';
import { ChevronDown, Variable, Eye, Code, Database, Play, ChevronRight, Type, Zap } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import {
  WorkflowDataAccessor,
  createMockExecutionState,
  formatNodeReference,
  parseNodeReference,
  type NodeExecutionContext,
  type WorkflowExecutionState
} from '../types/workflow-execution';
import { getAvailableVariables, NODE_VARIABLE_DEFINITIONS } from '../types/workflow-variables';
import { AutoCompleteInput } from './AutoCompleteInput';

interface VariableSelectorProps {
  nodeId: string;
  fieldValue: string;
  onVariableSelect: (variableReference: string) => void;
  onTextChange: (value: string) => void;
  nodes: Node[];
  edges: Edge[];
  placeholder?: string;
  fieldType?: 'text' | 'number' | 'select';
  executionState?: WorkflowExecutionState;
}

// Atualizar função para detectar referências do n8n
function isN8nVariableReference(value: any): boolean {
  if (typeof value !== 'string') return false;
  if (!value || value.trim() === '') return false;

  return (
    /\{\{\s*\$node\[.+?\].*?\s*\}\}/.test(value) ||
    /\{\{\s*\$json\..+?\s*\}\}/.test(value) ||
    /\{\{\s*\$input\..+?\s*\}\}/.test(value)
  );
}

export function VariableSelector({
  nodeId,
  fieldValue,
  onVariableSelect,
  onTextChange,
  nodes,
  edges,
  placeholder = "Digite um valor ou selecione uma variável",
  fieldType = 'text',
  executionState
}: VariableSelectorProps) {
  const [showVariables, setShowVariables] = useState(false);
  const [isExpressionMode, setIsExpressionMode] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Usar a mesma lógica simples que funciona no NodePropertiesPanel
  const availableVariables = getAvailableVariables(nodeId, nodes, edges);
  const hasVariables = availableVariables.length > 0;

  // Debug temporário
  console.log('VariableSelector render:', {
    fieldValue,
    fieldValueType: typeof fieldValue,
    isExpressionMode,
    nodeId
  });

  // Detectar automaticamente modo expressão quando há variáveis (uma única vez)
  useEffect(() => {
    const hasVariable = isN8nVariableReference(fieldValue);
    if (hasVariable && !isExpressionMode) {
      setIsExpressionMode(true);
    }
  }, [fieldValue]); // Remover isExpressionMode da dependência para evitar loops

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const togglePath = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const handleFieldSelect = (nodeName: string, jsonPath: string, value: any) => {
    const reference = formatNodeReference(nodeName, jsonPath);

    if (isExpressionMode) {
      // No modo expressão, inserir a variável na posição atual ou no final
      const currentValue = typeof fieldValue === 'string' ? fieldValue : '';
      const newValue = currentValue + (currentValue && !currentValue.endsWith(' ') ? ' ' : '') + reference;
      onTextChange(newValue);
    } else {
      // Mudar para modo expressão e definir o valor
      setIsExpressionMode(true);
      onTextChange(reference);
    }

    setShowVariables(false);
  };

  const handlePreviousNodeData = () => {
    const reference = '{{ $json }}';

    if (isExpressionMode) {
      // No modo expressão, inserir a variável na posição atual ou no final
      const currentValue = typeof fieldValue === 'string' ? fieldValue : '';
      const newValue = currentValue + (currentValue && !currentValue.endsWith(' ') ? ' ' : '') + reference;
      onTextChange(newValue);
    } else {
      // Mudar para modo expressão e definir o valor
      setIsExpressionMode(true);
      onTextChange(reference);
    }

    setShowVariables(false);
  };

  const handleTextMode = () => {
    setIsExpressionMode(false);
    if (isN8nVariableReference(fieldValue)) {
      onTextChange(''); // Limpar variáveis quando mudar para modo texto
    }
  };

  const handleExpressionMode = () => {
    setIsExpressionMode(true);
    setShowVariables(true);
  };


  return (
    <div className="relative">
      {/* Campo principal */}
      <div className="flex items-stretch border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
        {/* Toggle de modo */}
        <div className="flex border-r border-gray-200">
          <button
            onClick={handleTextMode}
            className={`px-2 py-2 transition-colors flex items-center justify-center ${
              !isExpressionMode
                ? 'bg-blue-500 text-white'
                : 'bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Modo Texto"
          >
            <Type size={14} />
          </button>
          <button
            onClick={handleExpressionMode}
            className={`px-2 py-2 transition-colors flex items-center justify-center border-l border-gray-200 ${
              isExpressionMode
                ? 'bg-blue-500 text-white'
                : 'bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Modo Expressão (variáveis)"
          >
            <Zap size={14} />
          </button>
        </div>

        {/* Input */}
        <div className="flex-1">
          {isExpressionMode ? (
            <input
              type="text"
              value={fieldValue == null ? '' : String(fieldValue)}
              onChange={(e) => {
                console.log('Expression mode onChange:', e.target.value);
                onTextChange(e.target.value);
              }}
              placeholder="Digite expressões, ex: {{ $json.currentPrice * 1.1 }}"
              className="w-full px-3 py-2 border-0 focus:outline-none text-sm font-mono"
              spellCheck="false"
              autoComplete="off"
            />
          ) : (
            <input
              type={fieldType === 'number' ? 'number' : 'text'}
              value={fieldValue == null ? '' : String(fieldValue)}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border-0 focus:outline-none text-sm"
            />
          )}
        </div>

        {/* Botões de ação */}
        {isExpressionMode && (
          <div className="flex items-center border-l border-gray-200">
            <button
              onClick={() => setShowVariables(!showVariables)}
              className={`px-3 py-2 transition-colors ${
                hasVariables
                  ? 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
              title={hasVariables ? "Ver variáveis disponíveis" : "Conecte nodes para ver variáveis"}
            >
              <Eye size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Dropdown de contextos de nodes */}
      {showVariables && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <h4 className="font-medium text-gray-900 flex items-center">
              <Database size={16} className="mr-2" />
              Inserir Variáveis
            </h4>
            <p className="text-xs text-gray-600 mt-1">
              Clique para inserir variáveis na expressão
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {hasVariables ? (
              <>
                {/* Botão para dados do node anterior */}
                <div className="border-b border-gray-100">
                  <div className="px-3 py-2 bg-blue-50 border-b border-gray-200">
                    <h5 className="font-medium text-gray-800 text-sm flex items-center">
                      <Play size={14} className="mr-2" />
                      Node Anterior ($json)
                    </h5>
                    <p className="text-xs text-gray-600">Dados do node conectado diretamente</p>
                  </div>
                  <button
                    onClick={handlePreviousNodeData}
                    className="w-full px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">⬅️</span>
                      <span className="font-mono text-sm font-medium text-gray-900">$json</span>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">+ inserir</span>
                    </div>
                    <div className="mt-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                        {"{{ $json }}"}
                      </code>
                    </div>
                  </button>
                </div>

                {availableVariables.map((nodeVariableOutput) => (
              <div key={nodeVariableOutput.nodeId} className="border-b border-gray-100 last:border-b-0">
                {/* Header do node */}
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <button
                    onClick={() => toggleNode(nodeVariableOutput.nodeId)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      {expandedNodes.has(nodeVariableOutput.nodeId) ?
                        <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <Code size={14} />
                      <span className="font-medium text-gray-800 text-sm">{nodeVariableOutput.nodeName}</span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        conectado
                      </span>
                    </div>
                    <span className="text-xs text-gray-600">
                      {nodeVariableOutput.variables.length} campos
                    </span>
                  </button>
                </div>

                {/* Variáveis do node expandidas */}
                {expandedNodes.has(nodeVariableOutput.nodeId) && (
                  <div className="px-4 py-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-2 flex items-center justify-between">
                      <span>Variáveis Disponíveis:</span>
                      <span className="text-blue-600">Clique no 👁️ para inserir</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto bg-white rounded border p-2 text-sm variable-scroll">
                      <div className="space-y-2">
                        {nodeVariableOutput.variables.map((variable, index) => (
                          <div key={variable.name} className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-sm font-medium text-blue-600">{variable.name}</span>
                                <span className="text-xs px-1 py-0.5 rounded bg-blue-100 text-blue-700">
                                  {variable.type}
                                </span>
                              </div>
                              {variable.description && (
                                <div className="text-xs text-gray-500 mt-0.5">{variable.description}</div>
                              )}
                            </div>
                            <button
                              onClick={() => handleFieldSelect(nodeVariableOutput.nodeName, variable.name, null)}
                              className="text-blue-500 hover:text-blue-700 text-xs ml-2"
                              title="Inserir esta variável"
                            >
                              <Eye size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Botão para usar node completo */}
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => handleFieldSelect(nodeVariableOutput.nodeName, '', null)}
                        className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                      >
                        + Inserir Node: $node["{nodeVariableOutput.nodeName}"].json
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
              </>
            ) : (
              /* Quando não há variáveis disponíveis */
              <div className="p-6 text-center">
                <div className="text-gray-400 mb-4">
                  <Database size={32} className="mx-auto" />
                </div>
                <h5 className="font-medium text-gray-700 mb-2">Nenhuma variável disponível</h5>
                <p className="text-sm text-gray-600 mb-4">
                  Conecte outros nodes antes deste para acessar suas variáveis
                </p>
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                  <div className="font-medium mb-2">💡 Como usar variáveis:</div>
                  <ul className="text-left space-y-1 text-xs">
                    <li>• <code className="bg-white px-1 rounded">&#123;&#123; $json.campo &#125;&#125;</code> - Node anterior</li>
                    <li>• <code className="bg-white px-1 rounded">&#123;&#123; $node["Nome"].json.campo &#125;&#125;</code> - Node específico</li>
                    <li>• Digite <code className="bg-white px-1 rounded">&#123;&#123;</code> em qualquer campo para ver auto complete</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                {hasVariables
                  ? "💡 Clique em 👁️ para inserir campos específicos"
                  : "🔗 Conecte nodes para ver variáveis disponíveis"
                }
              </span>
              <button
                onClick={() => setShowVariables(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indicadores informativos */}
      <div className="mt-1 flex items-center justify-between">
        <div className="text-xs text-gray-500 flex items-center">
          {isExpressionMode ? (
            <>
              <Zap size={12} className="mr-1 text-blue-600" />
              <span>Modo expressão ativo - digite livremente ou use auto complete</span>
            </>
          ) : (
            <>
              <Type size={12} className="mr-1" />
              <span>Modo texto simples</span>
            </>
          )}
        </div>

        {isExpressionMode && !hasVariables && (
          <span className="text-xs text-amber-600 flex items-center">
            <Variable size={12} className="mr-1" />
            Conecte nodes para variáveis
          </span>
        )}
      </div>
    </div>
  );
}