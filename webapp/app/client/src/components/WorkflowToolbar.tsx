// Barra de Ferramentas do Workflow - Controles principais

import React from 'react';
import { Save, Play, Square, Trash2, Download, Upload, Zap, BarChart3, RefreshCw } from 'lucide-react';

interface WorkflowCanvasStats {
  triggers: number;
  conditions: number;
  actions: number;
  utilities: number;
  total: number;
  connections: number;
}

interface WorkflowToolbarProps {
  onSave?: () => void;
  onTest?: () => void;
  onClear?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  stats: WorkflowCanvasStats;
  readOnly?: boolean;
  isExecuting?: boolean;
  onStopExecution?: () => void;
}

export function WorkflowToolbar({
  onSave,
  onTest,
  onClear,
  onExport,
  onImport,
  stats,
  readOnly = false,
  isExecuting = false,
  onStopExecution
}: WorkflowToolbarProps) {
  const isWorkflowValid = stats.triggers > 0 && (stats.actions > 0 || stats.utilities > 0);

  return (
    <div className="absolute top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Lado esquerdo - Informações e stats */}
        <div className="flex items-center space-x-4">
          {/* Stats compactas */}
          <div className="flex items-center space-x-3 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium text-gray-700">{stats.triggers}</span>
              <span className="text-gray-500">T</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="font-medium text-gray-700">{stats.conditions}</span>
              <span className="text-gray-500">C</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="font-medium text-gray-700">{stats.actions}</span>
              <span className="text-gray-500">A</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="font-medium text-gray-700">{stats.utilities}</span>
              <span className="text-gray-500">U</span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <span className="text-sm text-gray-600">
              <BarChart3 size={14} className="inline mr-1" />
              {stats.connections} links
            </span>
          </div>

          {/* Status do workflow */}
          <div className="flex items-center space-x-2">
            {isExecuting ? (
              <div className="flex items-center space-x-2 text-blue-600">
                <RefreshCw size={14} className="animate-spin" />
                <span className="text-sm font-medium">Executando...</span>
              </div>
            ) : isWorkflowValid ? (
              <div className="flex items-center space-x-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Pronto</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-amber-600">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-medium">Incompleto</span>
              </div>
            )}
          </div>
        </div>

        {/* Centro - Título (se houver espaço) */}
        <div className="hidden md:block">
          <h2 className="text-lg font-semibold text-gray-900">Workflow Editor</h2>
        </div>

        {/* Lado direito - Ações */}
        <div className="flex items-center space-x-2">
          {/* Botões de ação do workflow */}
          {!readOnly && (
            <>
              {/* Testar workflow */}
              {isExecuting ? (
                <button
                  onClick={onStopExecution}
                  className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  <Square size={14} />
                  <span className="hidden sm:inline">Parar</span>
                </button>
              ) : (
                <button
                  onClick={onTest}
                  disabled={!isWorkflowValid}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    isWorkflowValid
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  title={isWorkflowValid ? 'Testar workflow' : 'Workflow incompleto - adicione triggers e ações'}
                >
                  <Play size={14} />
                  <span className="hidden sm:inline">Testar</span>
                </button>
              )}

              {/* Botão Salvar removido - mantido apenas no header da página */}
            </>
          )}

          {/* Menu de ações secundárias */}
          <div className="flex items-center space-x-1">
            {/* Exportar */}
            {onExport && (
              <button
                onClick={onExport}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Exportar workflow"
              >
                <Download size={16} />
              </button>
            )}

            {/* Importar */}
            {onImport && !readOnly && (
              <button
                onClick={onImport}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Importar workflow"
              >
                <Upload size={16} />
              </button>
            )}

            {/* Limpar tudo */}
            {onClear && !readOnly && stats.total > 0 && (
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja limpar todo o workflow? Esta ação não pode ser desfeita.')) {
                    onClear();
                  }
                }}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Limpar workflow"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barra de progresso para execução */}
      {isExecuting && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div className="h-full bg-blue-500 animate-pulse"></div>
        </div>
      )}
    </div>
  );
}