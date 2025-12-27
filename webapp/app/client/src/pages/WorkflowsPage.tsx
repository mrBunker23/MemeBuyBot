// Página dedicada para lista de workflows
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit3, Trash2, Play, Pause, Copy, Download, ExternalLink } from 'lucide-react';
import { workflowApiService } from '../services/workflow-api.service';

// Temporário - manter mock como fallback
const mockWorkflows = [
  {
    id: 'workflow-1',
    name: 'Take Profit Básico',
    description: 'Vende 25% quando atinge 2x o preço de entrada',
    tags: ['trading', 'take-profit', 'beginner'],
    isActive: true,
    nodeCount: 4,
    triggerCount: 1,
    conditionCount: 1,
    actionCount: 1,
    utilityCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'workflow-2',
    name: 'Price Alert',
    description: 'Notifica quando preço muda mais de 10%',
    tags: ['alert', 'monitoring'],
    isActive: false,
    nodeCount: 3,
    triggerCount: 1,
    conditionCount: 1,
    actionCount: 0,
    utilityCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'workflow-3',
    name: 'Stop Loss Automático',
    description: 'Para perdas quando preço cai 20%',
    tags: ['trading', 'stop-loss', 'risk-management'],
    isActive: true,
    nodeCount: 5,
    triggerCount: 1,
    conditionCount: 2,
    actionCount: 1,
    utilityCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export function WorkflowsPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);

  // Carregar workflows do storage service
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const storedWorkflows = await workflowApiService.getAllWorkflows();
        setWorkflows(storedWorkflows);
        console.log('📂 Workflows carregados:', storedWorkflows.length);
      } catch (error) {
        console.error('❌ Erro carregando workflows:', error);
        // Fallback para mock data em caso de erro
        setWorkflows(mockWorkflows);
      } finally {
        setLoading(false);
      }
    };

    loadWorkflows();
  }, []);

  // Filtrar workflows
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterActive === 'all' ||
                         (filterActive === 'active' && workflow.isActive) ||
                         (filterActive === 'inactive' && !workflow.isActive);

    return matchesSearch && matchesFilter;
  });

  const handleCreateWorkflow = async () => {
    try {
      const newWorkflow = await workflowApiService.createWorkflow(
        'Novo Workflow',
        'Workflow criado via interface'
      );
      navigate(`/workflows/editor/${newWorkflow.id}`);
    } catch (error) {
      console.error('❌ Erro criando workflow:', error);
      alert('Erro criando workflow. Tente novamente.');
    }
  };

  const handleEditWorkflow = (id: string) => {
    navigate(`/workflows/editor/${id}`);
  };

  const handleToggleActive = async (id: string) => {
    try {
      const newStatus = await workflowApiService.toggleWorkflowActive(id);
      setWorkflows(prev => prev.map(w =>
        w.id === id ? { ...w, isActive: newStatus } : w
      ));
    } catch (error) {
      console.error('❌ Erro alterando status do workflow:', error);
      alert('Erro alterando status. Tente novamente.');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const duplicated = await workflowApiService.duplicateWorkflow(id);
      if (duplicated) {
        setWorkflows(prev => [...prev, duplicated]);
      }
    } catch (error) {
      console.error('❌ Erro duplicando workflow:', error);
      alert('Erro duplicando workflow. Tente novamente.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja deletar o workflow "${name}"?`)) {
      try {
        const success = await workflowApiService.deleteWorkflow(id);
        if (success) {
          setWorkflows(prev => prev.filter(w => w.id !== id));
        }
      } catch (error) {
        console.error('❌ Erro deletando workflow:', error);
        alert('Erro deletando workflow. Tente novamente.');
      }
    }
  };

  const handleExport = async (id: string, name: string) => {
    try {
      const exportData = await workflowApiService.exportWorkflow(id);
      if (exportData) {
        // Criar blob e download
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `workflow-${name.replace(/\s+/g, '-').toLowerCase()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('❌ Erro exportando workflow:', error);
      alert('Erro exportando workflow. Tente novamente.');
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Workflows</h1>
              <p className="text-gray-600">Gerencie suas estratégias de trading automatizado</p>
            </div>
            <button
              onClick={handleCreateWorkflow}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={20} />
              <span>Novo Workflow</span>
            </button>
          </div>

          {/* Filtros e Busca */}
          <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-4">
              {/* Busca */}
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar workflows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>

              {/* Filtro por Status */}
              <div className="flex items-center space-x-2">
                <Filter size={20} className="text-gray-400" />
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Total: {workflows.length}</span>
              <span>Ativos: {workflows.filter(w => w.isActive).length}</span>
              <span>Inativos: {workflows.filter(w => !w.isActive).length}</span>
            </div>
          </div>
        </div>

        {/* Lista de Workflows */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Carregando workflows...</h3>
                <p>Aguarde um momento</p>
              </div>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="text-center py-12">
              {workflows.length === 0 ? (
                <div className="text-gray-500">
                  <div className="text-6xl mb-4">🔗</div>
                  <h3 className="text-xl font-semibold mb-2">Nenhum workflow criado</h3>
                  <p className="mb-4">Crie seu primeiro workflow para começar a automatizar suas estratégias</p>
                  <button
                    onClick={handleCreateWorkflow}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Criar Primeiro Workflow
                  </button>
                </div>
              ) : (
                <div className="text-gray-500">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold mb-2">Nenhum workflow encontrado</h3>
                  <p>Tente ajustar os filtros ou termos de busca</p>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {/* Header da Lista */}
              <div className="bg-gray-50 px-6 py-3">
                <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="col-span-4">Nome</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Nodes</div>
                  <div className="col-span-2">Atualizado</div>
                  <div className="col-span-2">Ações</div>
                </div>
              </div>

              {/* Items da Lista */}
              {filteredWorkflows.map((workflow) => (
                <div key={workflow.id} className="px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Nome e Descrição - LINK para editor */}
                    <div className="col-span-4">
                      <button
                        onClick={() => handleEditWorkflow(workflow.id)}
                        className="text-left w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-2 -m-2"
                      >
                        <div className="flex items-center space-x-2 group-hover:text-blue-600 transition-colors">
                          <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                            {workflow.name}
                          </h3>
                          <ExternalLink size={12} className="text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        {workflow.description && (
                          <p className="text-xs text-gray-500 mt-1">{workflow.description}</p>
                        )}
                        {workflow.tags && workflow.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {workflow.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {workflow.tags.length > 3 && (
                              <span className="text-xs text-gray-400">+{workflow.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <button
                        onClick={() => handleToggleActive(workflow.id)}
                        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          workflow.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {workflow.isActive ? <Play size={12} /> : <Pause size={12} />}
                        <span>{workflow.isActive ? 'Ativo' : 'Inativo'}</span>
                      </button>
                    </div>

                    {/* Estatísticas de Nodes */}
                    <div className="col-span-2">
                      <div className="flex items-center space-x-3 text-xs text-gray-600">
                        <span className="flex items-center space-x-1">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span>{workflow.nodeCount}</span>
                        </span>
                        <span className="text-gray-400">|</span>
                        <span>{workflow.triggerCount}T</span>
                        <span>{workflow.conditionCount}C</span>
                        <span>{workflow.actionCount}A</span>
                      </div>
                    </div>

                    {/* Data de Atualização */}
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">{formatDate(workflow.updatedAt)}</p>
                    </div>

                    {/* Ações */}
                    <div className="col-span-2">
                      <div className="flex items-center space-x-1 opacity-75 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditWorkflow(workflow.id)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          onClick={() => handleDuplicate(workflow.id)}
                          className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                          title="Duplicar"
                        >
                          <Copy size={14} />
                        </button>

                        <button
                          onClick={() => handleExport(workflow.id, workflow.name)}
                          className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors"
                          title="Exportar"
                        >
                          <Download size={14} />
                        </button>

                        <button
                          onClick={() => handleDelete(workflow.id, workflow.name)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                          title="Deletar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}