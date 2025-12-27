// Card individual de workflow com ações CRUD

import React, { useState } from 'react';
import {
  Play,
  Pause,
  Edit3,
  Trash2,
  Copy,
  Download,
  MoreHorizontal,
  Calendar,
  Hash,
  Tag,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { SavedWorkflow, getWorkflowCategory, validateWorkflow } from '../types/workflow-manager';
import { clientLogger } from '../utils/client-logger';

interface WorkflowCardProps {
  workflow: SavedWorkflow;
  onEdit: (workflow: SavedWorkflow) => void;
  onDelete: (workflowId: string) => void;
  onDuplicate: (workflowId: string) => void;
  onToggleActive: (workflowId: string) => void;
  onExport: (workflowId: string) => void;
  onRename: (workflowId: string, newName: string) => void;
}

export function WorkflowCard({
  workflow,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive,
  onExport,
  onRename
}: WorkflowCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(workflow.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const category = getWorkflowCategory(workflow);
  const validation = validateWorkflow(workflow);

  const handleRename = () => {
    if (newName.trim() && newName !== workflow.name) {
      onRename(workflow.id, newName.trim());
      clientLogger.info(`✏️ Workflow renomeado para: ${newName.trim()}`);
    }
    setIsRenaming(false);
    setNewName(workflow.name);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setNewName(workflow.name);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryIcon = () => {
    const categoryMap: Record<string, string> = {
      '💰 Trading': '💰',
      '📊 Monitoring': '📊',
      '🚨 Alerts': '🚨',
      '📈 Analytics': '📈',
      '🤖 Automation': '🤖',
      '⚙️ Custom': '⚙️'
    };
    return categoryMap[category] || '⚙️';
  };

  const getStatusColor = () => {
    if (!validation.isValid) return 'text-red-500 bg-red-50';
    if (workflow.isActive) return 'text-green-500 bg-green-50';
    return 'text-gray-500 bg-gray-50';
  };

  const getStatusIcon = () => {
    if (!validation.isValid) return <AlertCircle size={16} />;
    if (workflow.isActive) return <CheckCircle size={16} />;
    return <Clock size={16} />;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Nome do Workflow */}
            {isRenaming ? (
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyPress}
                className="w-full text-lg font-semibold text-gray-900 border-0 border-b-2 border-blue-500 bg-transparent outline-none pb-1"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg">{getCategoryIcon()}</span>
                <h3
                  className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => setIsRenaming(true)}
                  title="Clique para renomear"
                >
                  {workflow.name}
                </h3>
              </div>
            )}

            {/* Descrição */}
            {workflow.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {workflow.description}
              </p>
            )}

            {/* Tags */}
            {workflow.tags && workflow.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {workflow.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
                  >
                    <Tag size={10} className="mr-1" />
                    {tag}
                  </span>
                ))}
                {workflow.tags.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600">
                    +{workflow.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Menu de ações */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Mais ações"
            >
              <MoreHorizontal size={16} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => { onEdit(workflow); setIsMenuOpen(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit3 size={14} className="mr-2" />
                    Editar
                  </button>
                  <button
                    onClick={() => { onDuplicate(workflow.id); setIsMenuOpen(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy size={14} className="mr-2" />
                    Duplicar
                  </button>
                  <button
                    onClick={() => { onExport(workflow.id); setIsMenuOpen(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Download size={14} className="mr-2" />
                    Exportar
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => { setShowDeleteConfirm(true); setIsMenuOpen(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status e Categoria */}
        <div className="flex items-center gap-4 mt-3">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getStatusIcon()}
            {workflow.isActive ? 'Ativo' : validation.isValid ? 'Inativo' : 'Erro'}
          </div>
          <span className="text-xs text-gray-500">{category}</span>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-sm font-medium text-gray-900">{workflow.nodeCount}</div>
            <div className="text-xs text-gray-500">Nodes</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{workflow.triggerCount}</div>
            <div className="text-xs text-gray-500">Triggers</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{workflow.conditionCount}</div>
            <div className="text-xs text-gray-500">Conditions</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{workflow.actionCount}</div>
            <div className="text-xs text-gray-500">Actions</div>
          </div>
        </div>

        {/* Validação */}
        {validation.warnings.length > 0 && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-700">
              ⚠️ {validation.warnings[0]}
              {validation.warnings.length > 1 && ` (+${validation.warnings.length - 1})`}
            </p>
          </div>
        )}

        {validation.errors.length > 0 && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">
              ❌ {validation.errors[0]}
              {validation.errors.length > 1 && ` (+${validation.errors.length - 1})`}
            </p>
          </div>
        )}
      </div>

      {/* Footer com ações principais */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar size={12} />
            <span>Criado: {formatDate(workflow.createdAt)}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Ativo/Inativo */}
            <button
              onClick={() => onToggleActive(workflow.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                workflow.isActive
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled={!validation.isValid}
              title={!validation.isValid ? 'Corrija os erros antes de ativar' : workflow.isActive ? 'Desativar' : 'Ativar'}
            >
              {workflow.isActive ? <Pause size={12} /> : <Play size={12} />}
              {workflow.isActive ? 'Pausar' : 'Ativar'}
            </button>

            {/* Editar */}
            <button
              onClick={() => onEdit(workflow)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
            >
              <Edit3 size={12} />
              Editar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-4">
              Tem certeza que deseja excluir o workflow <strong>"{workflow.name}"</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDelete(workflow.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop para fechar menu */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
}