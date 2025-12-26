// Node Customizado para Ações - Estilo n8n

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, DollarSign, ShoppingCart, Send, Loader, Variable } from 'lucide-react';

interface NodeProps<T = any> {
  id: string;
  data: T;
  selected?: boolean;
  type: string;
}

interface ActionNodeData {
  label: string;
  nodeType: 'action';
  config: Record<string, any>;
  isExecuting?: boolean;
  lastExecutionResult?: 'success' | 'error' | 'pending';
}

export function CustomActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  const { label, config, isExecuting, lastExecutionResult } = data;

  const getIcon = () => {
    if (isExecuting) return <Loader size={16} className="animate-spin" />;
    if (label.includes('Sell') || label.includes('Buy')) return <DollarSign size={16} />;
    if (label.includes('Send') || label.includes('Notify')) return <Send size={16} />;
    if (label.includes('Trade')) return <ShoppingCart size={16} />;
    return <Zap size={16} />;
  };

  const getStatusColor = () => {
    if (isExecuting) return 'from-blue-500 to-blue-600 border-blue-700';
    if (lastExecutionResult === 'success') return 'from-green-500 to-green-600 border-green-700';
    if (lastExecutionResult === 'error') return 'from-red-600 to-red-700 border-red-800';
    return 'from-red-500 to-red-600 border-red-700';
  };

  return (
    <div
      className={`relative bg-gradient-to-br ${getStatusColor()} rounded-xl border-2 shadow-lg transition-all duration-200 ${
        selected ? 'ring-4 ring-blue-400 ring-opacity-60' : ''
      } ${isExecuting ? 'animate-pulse' : ''}`}
      style={{ minWidth: 180, minHeight: 70 }}
    >
      {/* Handle de entrada - sempre à esquerda */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 !bg-white !border-2 !border-red-600"
        style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }}
      />

      {/* Handle de saída - sempre à direita (para encadeamento) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 !bg-white !border-2 !border-red-600"
        style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }}
      />

      {/* Header com ícone e status */}
      <div className="flex items-center justify-between p-3 pb-1">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white">
            {getIcon()}
          </div>
          <span className="text-white font-semibold text-sm">ACTION</span>
        </div>

        {/* Indicador de status */}
        {lastExecutionResult && !isExecuting && (
          <div className={`w-2 h-2 rounded-full ${
            lastExecutionResult === 'success' ? 'bg-green-300' :
            lastExecutionResult === 'error' ? 'bg-red-300' : 'bg-yellow-300'
          }`}></div>
        )}

        {isExecuting && (
          <div className="w-2 h-2 bg-blue-300 rounded-full animate-ping"></div>
        )}
      </div>

      {/* Título do node */}
      <div className="px-3 pb-2">
        <h4 className="text-white font-bold text-sm leading-tight">{label}</h4>
      </div>

      {/* Configurações principais */}
      <div className="px-3 pb-3">
        <div className="text-white/80 text-xs space-y-1">
          {config.sellPercentage && (
            <div className="flex justify-between">
              <span>Venda:</span>
              <span className="font-mono">{config.sellPercentage}%</span>
            </div>
          )}
          {config.buyAmount && (
            <div className="flex justify-between">
              <span>Compra:</span>
              <span className="font-mono">${config.buyAmount}</span>
            </div>
          )}
          {config.marketType && (
            <div className="flex justify-between">
              <span>Tipo:</span>
              <span className="font-mono">{config.marketType}</span>
            </div>
          )}
          {config.slippage && (
            <div className="flex justify-between">
              <span>Slip:</span>
              <span className="font-mono">{config.slippage}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-xl">
        <div
          className={`h-full rounded-b-xl transition-all duration-300 ${
            isExecuting
              ? 'bg-blue-300 w-full animate-pulse'
              : lastExecutionResult === 'success'
              ? 'bg-green-300 w-full'
              : lastExecutionResult === 'error'
              ? 'bg-red-300 w-full'
              : 'bg-white/40 w-2/3'
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

      {/* Resultado da última execução */}
      {lastExecutionResult && !isExecuting && (
        <div className={`absolute -bottom-6 left-0 text-xs font-mono ${
          lastExecutionResult === 'success' ? 'text-green-600' :
          lastExecutionResult === 'error' ? 'text-red-600' : 'text-yellow-600'
        }`}>
          {lastExecutionResult === 'success' ? '✓ Sucesso' :
           lastExecutionResult === 'error' ? '✗ Erro' : '⏳ Pendente'}
        </div>
      )}
    </div>
  );
}