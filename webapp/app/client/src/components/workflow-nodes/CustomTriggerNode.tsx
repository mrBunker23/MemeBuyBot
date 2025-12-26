// Node Customizado para Triggers - Estilo n8n

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, Clock, TrendingUp, Zap, Variable } from 'lucide-react';
import { parseNodeReference } from '../../types/workflow-execution';

interface NodeProps<T = any> {
  id: string;
  data: T;
  selected?: boolean;
  type: string;
}

interface TriggerNodeData {
  label: string;
  nodeType: 'trigger';
  config: Record<string, any>;
  isExecuting?: boolean;
  lastExecution?: string;
}

export function CustomTriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  const { label, config, isExecuting, lastExecution } = data;

  const getIcon = () => {
    if (label.includes('Price')) return <TrendingUp size={16} />;
    if (label.includes('Time')) return <Clock size={16} />;
    if (label.includes('Event')) return <Zap size={16} />;
    return <Play size={16} />;
  };

  return (
    <div
      className={`relative bg-gradient-to-br from-green-500 to-green-600 rounded-xl border-2 border-green-700 shadow-lg transition-all duration-200 ${
        selected ? 'ring-4 ring-blue-400 ring-opacity-60' : ''
      } ${isExecuting ? 'animate-pulse' : ''}`}
      style={{ minWidth: 200, minHeight: 80 }}
    >
      {/* Handle de saída (triggers só têm saída - sempre à direita) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 !bg-white !border-2 !border-green-600"
        style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }}
      />

      {/* Header com ícone e status */}
      <div className="flex items-center justify-between p-3 pb-1">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white">
            {getIcon()}
          </div>
          <span className="text-white font-semibold text-sm">TRIGGER</span>
        </div>

        {isExecuting && (
          <div className="w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
        )}
      </div>

      {/* Título do node */}
      <div className="px-3 pb-2">
        <h4 className="text-white font-bold text-sm leading-tight">{label}</h4>
      </div>

      {/* Configurações principais */}
      <div className="px-3 pb-3">
        <div className="text-white/80 text-xs space-y-1">
          {config.token && (
            <div className="flex justify-between">
              <span>Token:</span>
              <span className="font-mono">{config.token}</span>
            </div>
          )}
          {config.changePercentage && (
            <div className="flex justify-between">
              <span>Variação:</span>
              <span className="font-mono">{config.changePercentage}%</span>
            </div>
          )}
          {config.interval && (
            <div className="flex justify-between">
              <span>Intervalo:</span>
              <span className="font-mono">{config.interval}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-xl">
        <div
          className={`h-full rounded-b-xl transition-all duration-300 ${
            isExecuting
              ? 'bg-yellow-300 w-full animate-pulse'
              : 'bg-white/40 w-3/4'
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
      {lastExecution && (
        <div className="absolute -bottom-6 left-0 text-xs text-gray-500 font-mono">
          Last: {new Date(lastExecution).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}