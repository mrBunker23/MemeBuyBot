// Visualizador de Contexto de Execução dos Nodes - Estilo n8n

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Eye, Database, Clock, CheckCircle, AlertCircle, Play } from 'lucide-react';
import type { NodeExecutionContext, NodeExecutionData } from '../types/workflow-execution';

interface NodeContextViewerProps {
  context: NodeExecutionContext;
  onFieldSelect?: (jsonPath: string, value: any) => void;
  compact?: boolean;
}

export function NodeContextViewer({ context, onFieldSelect, compact = false }: NodeContextViewerProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]));
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={14} className="text-green-600" />;
      case 'error': return <AlertCircle size={14} className="text-red-600" />;
      case 'running': return <Play size={14} className="text-blue-600" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'running': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const renderJsonValue = (value: any, path: string, depth: number = 0): React.ReactNode => {
    if (value === null) return <span className="text-gray-500 italic">null</span>;
    if (value === undefined) return <span className="text-gray-500 italic">undefined</span>;

    const indent = depth * 20;

    if (typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value);
      const isExpanded = expandedPaths.has(path);

      return (
        <div style={{ marginLeft: `${indent}px` }}>
          <button
            onClick={() => togglePath(path)}
            className="flex items-center hover:bg-gray-100 rounded px-1 -mx-1"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="text-purple-600 font-mono ml-1">object ({keys.length} keys)</span>
          </button>

          {isExpanded && (
            <div className="ml-4 border-l border-gray-200 pl-3 mt-1">
              {keys.map(key => {
                const newPath = path ? `${path}.${key}` : key;
                return (
                  <div key={key} className="py-1 group">
                    <div className="flex items-center">
                      <span className="text-blue-600 font-mono text-sm mr-2">{key}:</span>
                      <div className="flex-1 flex items-center">
                        {renderJsonValue(value[key], newPath, depth + 1)}
                        {onFieldSelect && typeof value[key] !== 'object' && (
                          <button
                            onClick={() => onFieldSelect(newPath, value[key])}
                            className="ml-2 opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 transition-opacity"
                            title="Usar este campo"
                          >
                            <Eye size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (Array.isArray(value)) {
      const isExpanded = expandedPaths.has(path);
      return (
        <div style={{ marginLeft: `${indent}px` }}>
          <button
            onClick={() => togglePath(path)}
            className="flex items-center hover:bg-gray-100 rounded px-1 -mx-1"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="text-orange-600 font-mono ml-1">array [{value.length}]</span>
          </button>

          {isExpanded && (
            <div className="ml-4 border-l border-gray-200 pl-3 mt-1">
              {value.map((item, index) => {
                const newPath = `${path}[${index}]`;
                return (
                  <div key={index} className="py-1">
                    <span className="text-gray-500 font-mono text-sm mr-2">[{index}]:</span>
                    {renderJsonValue(item, newPath, depth + 1)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Primitive values
    const getValueColor = (val: any) => {
      if (typeof val === 'string') return 'text-green-600';
      if (typeof val === 'number') return 'text-blue-600';
      if (typeof val === 'boolean') return 'text-purple-600';
      return 'text-gray-600';
    };

    const formatValue = (val: any) => {
      if (typeof val === 'string') return `"${val}"`;
      return String(val);
    };

    return (
      <span className={`font-mono text-sm ${getValueColor(value)}`}>
        {formatValue(value)}
      </span>
    );
  };

  if (compact) {
    return (
      <div className={`border rounded-lg p-3 ${getStatusColor(context.status)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {getStatusIcon(context.status)}
            <span className="font-medium text-sm">{context.nodeName}</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Database size={12} />
            <span>{context.data?.length || 0} items</span>
          </div>
        </div>

        {context.data && context.data.length > 0 && (
          <div className="max-h-32 overflow-y-auto">
            <div className="text-xs text-gray-600 font-mono">
              {Object.keys(context.data[0].json).slice(0, 3).map(key => (
                <div key={key} className="truncate">
                  {key}: {typeof context.data[0].json[key]}
                </div>
              ))}
              {Object.keys(context.data[0].json).length > 3 && (
                <div className="text-gray-400">+{Object.keys(context.data[0].json).length - 3} more...</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`border rounded-lg ${getStatusColor(context.status)}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(context.status)}
            <div>
              <h3 className="font-bold text-gray-900">{context.nodeName}</h3>
              <p className="text-sm text-gray-600">ID: {context.nodeId}</p>
            </div>
          </div>

          <div className="text-right text-sm">
            <div className="text-gray-600">
              {context.executionTime ? `${context.executionTime}ms` : 'N/A'}
            </div>
            <div className="text-xs text-gray-500">
              {context.itemsProcessed} items processados
            </div>
          </div>
        </div>

        {context.startTime && (
          <div className="mt-2 text-xs text-gray-500">
            Executado em: {new Date(context.startTime).toLocaleString()}
          </div>
        )}
      </div>

      {/* Data Items */}
      <div className="p-4">
        {context.data && context.data.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 flex items-center">
                <Database size={16} className="mr-2" />
                Dados de Saída ({context.data.length} items)
              </h4>
            </div>

            {context.data.map((item, index) => {
              const isExpanded = expandedItems.has(index);

              return (
                <div key={index} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span className="font-medium">Item {index}</span>
                      <span className="text-sm text-gray-500">
                        ({Object.keys(item.json).length} propriedades)
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(JSON.stringify(item.json, null, 2));
                      }}
                      className="text-gray-400 hover:text-gray-600"
                      title="Copiar JSON"
                    >
                      <Copy size={14} />
                    </button>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 p-3 bg-gray-50">
                      <div className="font-mono text-sm">
                        {renderJsonValue(item.json, '', 0)}
                      </div>

                      {item.error && (
                        <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded">
                          <div className="text-red-800 font-medium text-sm">Erro:</div>
                          <div className="text-red-600 text-sm">{item.error.message}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Database size={48} className="mx-auto mb-2 text-gray-300" />
            <p>Nenhum dado disponível</p>
            <p className="text-sm">Este node ainda não foi executado</p>
          </div>
        )}
      </div>
    </div>
  );
}