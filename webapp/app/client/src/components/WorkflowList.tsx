// Lista de workflows com busca avançada e filtros

import React, { useState, useEffect } from 'react';
import { Search, Filter, SortAsc, SortDesc, Grid, List, Plus } from 'lucide-react';
import { WorkflowCard } from './WorkflowCard';
import { workflowApiService } from '../services/workflow-api.service';
import type { SavedWorkflow, WorkflowFilter } from '../types/workflow-manager';
import { WORKFLOW_CATEGORIES, POPULAR_TAGS } from '../types/workflow-manager';
import { clientLogger } from '../utils/client-logger';

interface WorkflowListProps {
  onEditWorkflow?: (workflow: SavedWorkflow) => void;
  onCreateWorkflow?: () => void;
  maxHeight?: string;
  showCreateButton?: boolean;
  title?: string;
}

export function WorkflowList({
  onEditWorkflow,
  onCreateWorkflow,
  maxHeight = '70vh',
  showCreateButton = true,
  title = 'Meus Workflows'
}: WorkflowListProps) {
  // Estados
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState<SavedWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Estados dos filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'updatedAt' | 'nodeCount'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Estados da UI
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Carregar workflows e tags disponíveis
  useEffect(() => {
    loadWorkflows();
  }, []);

  // Aplicar filtros sempre que os parâmetros mudarem
  useEffect(() => {
    applyFilters();
  }, [workflows, searchTerm, selectedCategory, selectedTags, activeFilter, sortBy, sortOrder]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const allWorkflows = workflowStorageService.getAllWorkflows();
      setWorkflows(allWorkflows);

      // Extrair tags únicas de todos os workflows
      const tags = new Set<string>();
      allWorkflows.forEach(workflow => {
        workflow.tags?.forEach(tag => tags.add(tag));
      });
      setAvailableTags([...POPULAR_TAGS, ...Array.from(tags)].filter((tag, index, arr) => arr.indexOf(tag) === index));

      clientLogger.info(`📋 ${allWorkflows.length} workflows carregados na lista`);
    } catch (error) {
      clientLogger.error('❌ Erro carregando workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const filter: Partial<WorkflowFilter> = {
      searchTerm,
      tags: selectedTags,
      isActive: activeFilter,
      sortBy,
      sortOrder
    };

    let filtered = workflowStorageService.getWorkflowsByFilter(filter);

    // Filtro adicional por categoria
    if (selectedCategory) {
      filtered = filtered.filter(workflow => {
        const category = getWorkflowCategory(workflow);
        return category === selectedCategory;
      });
    }

    setFilteredWorkflows(filtered);
  };

  // Função auxiliar para detectar categoria do workflow
  const getWorkflowCategory = (workflow: SavedWorkflow): string => {
    const tags = workflow.tags?.join(' ').toLowerCase() || '';

    if (tags.includes('trading')) return WORKFLOW_CATEGORIES.TRADING;
    if (tags.includes('alert') || tags.includes('notification')) return WORKFLOW_CATEGORIES.ALERTS;
    if (tags.includes('monitoring') || tags.includes('tracking')) return WORKFLOW_CATEGORIES.MONITORING;
    if (tags.includes('analytics') || tags.includes('analysis')) return WORKFLOW_CATEGORIES.ANALYTICS;
    if (tags.includes('automation')) return WORKFLOW_CATEGORIES.AUTOMATION;

    return WORKFLOW_CATEGORIES.CUSTOM;
  };

  // Handlers para ações dos cards
  const handleEditWorkflow = (workflow: SavedWorkflow) => {
    if (onEditWorkflow) {
      onEditWorkflow(workflow);
    } else {
      clientLogger.info(`✏️ Editando workflow: ${workflow.name}`);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    const success = await workflowStorageService.deleteWorkflow(workflowId);
    if (success) {
      await loadWorkflows(); // Recarregar lista
    }
  };

  const handleDuplicateWorkflow = async (workflowId: string) => {
    const duplicated = await workflowStorageService.duplicateWorkflow(workflowId);
    if (duplicated) {
      await loadWorkflows(); // Recarregar lista
    }
  };

  const handleToggleActive = async (workflowId: string) => {
    await workflowStorageService.toggleWorkflowActive(workflowId);
    await loadWorkflows(); // Recarregar lista
  };

  const handleExportWorkflow = async (workflowId: string) => {
    const exported = await workflowStorageService.exportWorkflow(workflowId);
    if (exported) {
      const blob = new Blob([exported], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow_${workflowId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      clientLogger.success('📥 Workflow exportado com sucesso');
    }
  };

  const handleRenameWorkflow = async (workflowId: string, newName: string) => {
    const success = await workflowStorageService.updateWorkflowMetadata(workflowId, { name: newName });
    if (success) {
      await loadWorkflows(); // Recarregar lista
    }
  };

  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedTags([]);
    setActiveFilter(undefined);
    setSortBy('updatedAt');
    setSortOrder('desc');
  };

  // Toggle tag selecionada
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Carregando workflows...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {filteredWorkflows.length} de {workflows.length} workflows
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Busca */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>

            {/* Toggle filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Filtros"
            >
              <Filter size={16} />
            </button>

            {/* Toggle view mode */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="Grade"
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="Lista"
              >
                <List size={16} />
              </button>
            </div>

            {/* Botão criar */}
            {showCreateButton && (
              <button
                onClick={onCreateWorkflow}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Criar</span>
              </button>
            )}
          </div>
        </div>

        {/* Painel de filtros */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Categoria */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-1"
                >
                  <option value="">Todas as categorias</option>
                  {Object.values(WORKFLOW_CATEGORIES).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={activeFilter === undefined ? '' : activeFilter.toString()}
                  onChange={(e) => setActiveFilter(
                    e.target.value === '' ? undefined : e.target.value === 'true'
                  )}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-1"
                >
                  <option value="">Todos</option>
                  <option value="true">Ativos</option>
                  <option value="false">Inativos</option>
                </select>
              </div>

              {/* Ordenação */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ordenar por</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-1"
                >
                  <option value="name">Nome</option>
                  <option value="createdAt">Data de criação</option>
                  <option value="updatedAt">Última modificação</option>
                  <option value="nodeCount">Número de nodes</option>
                </select>
              </div>

              {/* Direção da ordenação */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Direção</label>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                >
                  {sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />}
                  {sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
                </button>
              </div>
            </div>

            {/* Tags */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.slice(0, 15).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Limpar filtros */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de workflows */}
      <div
        className="p-6 overflow-y-auto"
        style={{ maxHeight }}
      >
        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {workflows.length === 0
                ? 'Nenhum workflow criado ainda'
                : 'Nenhum workflow encontrado com os filtros aplicados'
              }
            </p>
            {showCreateButton && (
              <button
                onClick={onCreateWorkflow}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Criar Primeiro Workflow
              </button>
            )}
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'space-y-4'
          }>
            {filteredWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onEdit={handleEditWorkflow}
                onDelete={handleDeleteWorkflow}
                onDuplicate={handleDuplicateWorkflow}
                onToggleActive={handleToggleActive}
                onExport={handleExportWorkflow}
                onRename={handleRenameWorkflow}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}