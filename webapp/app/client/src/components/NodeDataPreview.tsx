// Preview dos Dados que cada Node Produz - Exemplos Reais

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Database, Info, Eye, Copy } from 'lucide-react';
import { WorkflowDataAccessor, createMockExecutionState } from '../types/workflow-execution';

interface NodeDataPreviewProps {
  nodeType: 'trigger' | 'condition' | 'action' | 'utility';
  subType?: string; // ex: 'price_change', 'volume_change', etc.
  compact?: boolean;
}

export function NodeDataPreview({ nodeType, subType, compact = false }: NodeDataPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']));

  // Gerar dados de exemplo
  const mockState = createMockExecutionState('preview');
  const accessor = new WorkflowDataAccessor(mockState);

  // Determinar o nome do node para simulação
  const getNodeName = () => {
    if (nodeType === 'trigger') {
      if (subType === 'volume') return 'Volume Change Trigger';
      if (subType === 'time') return 'Time Trigger';
      return 'Price Change Trigger';
    }
    if (nodeType === 'condition') return 'Multiple Above Condition';
    if (nodeType === 'action') return 'Sell Percentage Action';
    return 'Log Utility';
  };

  const nodeName = getNodeName();
  const sampleData = accessor.simulateNodeExecution('preview-node-' + nodeType + (subType || ''));

  const togglePath = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const copyToClipboard = (value: any) => {
    const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    navigator.clipboard.writeText(text);
  };

  const getTypeIcon = (value: any) => {
    if (typeof value === 'string') return '📝';
    if (typeof value === 'number') return '🔢';
    if (typeof value === 'boolean') return '✅';
    if (Array.isArray(value)) return '📋';
    if (typeof value === 'object' && value !== null) return '🗂️';
    return '📄';
  };

  const getTypeColor = (value: any) => {
    if (typeof value === 'string') return 'bg-green-100 text-green-800';
    if (typeof value === 'number') return 'bg-blue-100 text-blue-800';
    if (typeof value === 'boolean') return 'bg-purple-100 text-purple-800';
    if (Array.isArray(value)) return 'bg-indigo-100 text-indigo-800';
    if (typeof value === 'object') return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'string') {
      if (value.length > 50) return `"${value.slice(0, 47)}..."`;
      return `"${value}"`;
    }
    if (typeof value === 'number') return value.toFixed(6).replace(/\.?0+$/, '');
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object' && value !== null) return `{${Object.keys(value).length} keys}`;
    return String(value);
  };

  const renderProperty = (key: string, value: any, path: string, depth: number = 0): React.ReactNode => {
    const currentPath = `${path}.${key}`;
    const isExpanded = expandedPaths.has(currentPath);
    const hasChildren = (typeof value === 'object' && value !== null);
    const indent = depth * 16;

    return (
      <div key={key} style={{ marginLeft: `${indent}px` }} className="py-1">
        <div className="flex items-center space-x-2 group">
          {hasChildren && (
            <button
              onClick={() => togglePath(currentPath)}
              className="flex items-center hover:bg-gray-100 rounded p-1 -m-1"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}

          {!hasChildren && <div className="w-5" />}

          <span className="font-mono text-sm font-medium text-blue-600 min-w-0">
            {key}:
          </span>

          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(value)}`}>
            {getTypeIcon(value)} {typeof value === 'object' && value !== null ?
              Array.isArray(value) ? 'array' : 'object' : typeof value}
          </span>

          {!hasChildren && (
            <span className="text-sm font-mono text-gray-700 truncate">
              {formatValue(value)}
            </span>
          )}

          <button
            onClick={() => copyToClipboard(value)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
            title="Copiar valor"
          >
            <Copy size={12} />
          </button>

          <div className="text-xs text-gray-500 ml-auto">
            {`{{ $json.${key} }}`}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1 ml-4 border-l border-gray-200 pl-3">
            {Array.isArray(value) ? (
              value.slice(0, 3).map((item, index) =>
                renderProperty(`[${index}]`, item, currentPath, depth + 1)
              )
            ) : (
              Object.entries(value).map(([subKey, subValue]) =>
                renderProperty(subKey, subValue, currentPath, depth + 1)
              )
            )}
            {Array.isArray(value) && value.length > 3 && (
              <div className="text-xs text-gray-500 italic ml-4">
                +{value.length - 3} items mais...
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const getNodeTypeColor = () => {
    switch (nodeType) {
      case 'trigger': return 'from-green-500 to-green-600';
      case 'condition': return 'from-amber-500 to-orange-600';
      case 'action': return 'from-red-500 to-red-600';
      case 'utility': return 'from-purple-500 to-purple-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getNodeDescription = () => {
    switch (nodeType) {
      case 'trigger':
        if (subType === 'volume') return 'Dispara quando volume de trading muda significativamente';
        if (subType === 'time') return 'Dispara em intervalos de tempo programados';
        return 'Dispara quando preço de token muda além do threshold';
      case 'condition':
        return 'Avalia condições e decide o fluxo do workflow';
      case 'action':
        return 'Executa operações de trading (buy/sell) ou notificações';
      case 'utility':
        return 'Ferramentas auxiliares (logs, delays, cálculos)';
      default:
        return 'Node de workflow genérico';
    }
  };

  if (compact) {
    return (
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${getNodeTypeColor()}`}></span>
            <span className="text-sm font-medium text-gray-700">{nodeName}</span>
          </div>
          <span className="text-xs text-gray-500">
            {Object.keys(sampleData[0].json).length} campos
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className={`bg-gradient-to-r ${getNodeTypeColor()} text-white p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database size={20} />
            <div>
              <h3 className="font-bold text-lg">{nodeName}</h3>
              <p className="text-white/80 text-sm">{getNodeDescription()}</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 flex items-center">
              <Info size={16} className="mr-2" />
              Dados de Saída (Exemplo Real)
            </h4>
            <span className="text-sm text-gray-500">
              {Object.keys(sampleData[0].json).length} campos disponíveis
            </span>
          </div>

          {/* Lista de propriedades */}
          <div className="bg-gray-50 rounded-lg p-3 max-h-96 overflow-y-auto">
            <div className="space-y-1">
              {Object.entries(sampleData[0].json).map(([key, value]) =>
                renderProperty(key, value, 'root', 0)
              )}
            </div>
          </div>

          {/* Instruções de uso */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-2">
              <Eye size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Como usar estes dados:</p>
                <ul className="text-blue-800 space-y-1 text-xs">
                  <li>• Para dados do node anterior: <code className="bg-white px-1 rounded">{"{{ $json.campo }}"}</code></li>
                  <li>• Para dados de node específico: <code className="bg-white px-1 rounded">{"{{ $node[\"Nome\"].json.campo }}"}</code></li>
                  <li>• Clique no ícone 👁️ nos campos de configuração para selecionar</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}