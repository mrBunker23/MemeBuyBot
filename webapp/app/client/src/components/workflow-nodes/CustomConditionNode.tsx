// Node Customizado para Condições - Estilo n8n

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, CheckCircle, XCircle, Activity, Variable } from 'lucide-react';

interface NodeProps<T = any> {
  id: string;
  data: T;
  selected?: boolean;
  type: string;
}

interface ConditionNodeData {
  label: string;
  nodeType: 'condition';
  config: Record<string, any>;
  lastResult?: boolean;
  isEvaluating?: boolean;
}

export function CustomConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  const { label, config, lastResult, isEvaluating } = data;

  const getIcon = () => {
    if (isEvaluating) return <Activity size={16} className="animate-spin" />;
    if (lastResult === true) return <CheckCircle size={16} />;
    if (lastResult === false) return <XCircle size={16} />;
    return <GitBranch size={16} />;
  };

  const getStatusColor = () => {
    if (isEvaluating) return 'text-blue-300';
    if (lastResult === true) return 'text-green-300';
    if (lastResult === false) return 'text-red-300';
    return 'text-white';
  };

  return (
    <div
      className={`relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl border-2 border-orange-700 shadow-lg transition-all duration-200 ${
        selected ? 'ring-4 ring-blue-400 ring-opacity-60' : ''
      } ${isEvaluating ? 'animate-pulse' : ''}`}
      style={{ minWidth: 180, minHeight: 70 }}
    >
      {/* Handle de entrada - sempre à esquerda */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 !bg-white !border-2 !border-orange-600"
        style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }}
      />

      {/* Handles de saída - sempre à direita (TRUE e FALSE) */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-3 h-3 !bg-green-400 !border-2 !border-green-600"
        style={{ right: -6, top: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="w-3 h-3 !bg-red-400 !border-2 !border-red-600"
        style={{ right: -6, top: '70%' }}
      />

      {/* Header com ícone e status */}
      <div className="flex items-center justify-between p-3 pb-1">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white">
            {getIcon()}
          </div>
          <span className="text-white font-semibold text-sm">CONDITION</span>
        </div>

        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}>
          {lastResult !== undefined && (
            <div className={`w-2 h-2 rounded-full ${lastResult ? 'bg-green-300' : 'bg-red-300'}`}></div>
          )}
        </div>
      </div>

      {/* Título do node */}
      <div className="px-3 pb-2">
        <h4 className="text-white font-bold text-sm leading-tight">{label}</h4>
      </div>

      {/* Configurações principais */}
      <div className="px-3 pb-3">
        <div className="text-white/80 text-xs space-y-1">
          {config.multipleThreshold && (
            <div className="flex justify-between">
              <span>Múltiplo:</span>
              <span className="font-mono">{config.multipleThreshold}x</span>
            </div>
          )}
          {config.priceThreshold && (
            <div className="flex justify-between">
              <span>Preço:</span>
              <span className="font-mono">${config.priceThreshold}</span>
            </div>
          )}
          {config.operator && (
            <div className="flex justify-between">
              <span>Op:</span>
              <span className="font-mono">{config.operator}</span>
            </div>
          )}
        </div>
      </div>

      {/* Labels dos outputs */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-white/60 space-y-3">
        <div style={{ marginTop: '-10px' }} className="text-green-300 font-bold">TRUE</div>
        <div style={{ marginTop: '10px' }} className="text-red-300 font-bold">FALSE</div>
      </div>

      {/* Status bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-xl">
        <div
          className={`h-full rounded-b-xl transition-all duration-300 ${
            isEvaluating
              ? 'bg-blue-300 w-full animate-pulse'
              : lastResult === true
              ? 'bg-green-300 w-full'
              : lastResult === false
              ? 'bg-red-300 w-full'
              : 'bg-white/40 w-1/2'
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
    </div>
  );
}