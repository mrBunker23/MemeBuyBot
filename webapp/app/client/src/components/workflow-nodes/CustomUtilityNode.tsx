// Node Customizado para Utilidades - Estilo n8n

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Settings, MessageSquare, Database, Clock, FileText, Variable } from 'lucide-react';

interface NodeProps<T = any> {
  id: string;
  data: T;
  selected?: boolean;
  type: string;
}

interface UtilityNodeData {
  label: string;
  nodeType: 'utility';
  config: Record<string, any>;
  isExecuting?: boolean;
  lastExecutionTime?: string;
}

export function CustomUtilityNode({ data, selected }: NodeProps<UtilityNodeData>) {
  const { label, config, isExecuting, lastExecutionTime } = data;

  const getIcon = () => {
    if (label.includes('Log') || label.includes('Message')) return <MessageSquare size={14} />;
    if (label.includes('Save') || label.includes('Store')) return <Database size={14} />;
    if (label.includes('Wait') || label.includes('Delay')) return <Clock size={14} />;
    if (label.includes('File') || label.includes('Export')) return <FileText size={14} />;
    return <Settings size={14} />;
  };

  return (
    <div
      className={`relative bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl border-2 border-purple-700 shadow-lg transition-all duration-200 ${
        selected ? 'ring-4 ring-blue-400 ring-opacity-60' : ''
      } ${isExecuting ? 'animate-pulse' : ''}`}
      style={{ minWidth: 160, minHeight: 60 }}
    >
      {/* Handle de entrada - sempre à esquerda */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 !bg-white !border-2 !border-purple-600"
        style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }}
      />

      {/* Handle de saída - sempre à direita (para encadeamento) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 !bg-white !border-2 !border-purple-600"
        style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }}
      />

      {/* Header com ícone */}
      <div className="flex items-center justify-between p-2 pb-1">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-white">
            {getIcon()}
          </div>
          <span className="text-white font-semibold text-xs">UTILITY</span>
        </div>

        {isExecuting && (
          <div className="w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
        )}
      </div>

      {/* Título do node */}
      <div className="px-2 pb-2">
        <h4 className="text-white font-bold text-xs leading-tight">{label}</h4>
      </div>

      {/* Configurações principais (se houver espaço) */}
      {(config.message || config.level || config.delay) && (
        <div className="px-2 pb-2">
          <div className="text-white/80 text-xs space-y-1">
            {config.level && (
              <div className="flex justify-between">
                <span>Level:</span>
                <span className="font-mono">{config.level}</span>
              </div>
            )}
            {config.delay && (
              <div className="flex justify-between">
                <span>Delay:</span>
                <span className="font-mono">{config.delay}ms</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-xl">
        <div
          className={`h-full rounded-b-xl transition-all duration-300 ${
            isExecuting
              ? 'bg-yellow-300 w-full animate-pulse'
              : 'bg-white/40 w-1/3'
          }`}
        ></div>
      </div>

      {/* Indicador de variáveis */}
      {(() => {
        const isN8nReference = (value: any) =>
          typeof value === 'string' && /\{\{\s*\$/.test(value);

        const hasVariables = Object.values(config).some(value => isN8nReference(value));
        return hasVariables && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
            <Variable size={12} className="text-white" />
          </div>
        );
      })()}

      {/* Última execução */}
      {lastExecutionTime && (
        <div className="absolute -bottom-6 left-0 text-xs text-gray-500 font-mono">
          {new Date(lastExecutionTime).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}