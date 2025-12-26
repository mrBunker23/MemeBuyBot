// Componente de Gerenciamento de Workflows

import { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../lib/eden-api';
import type { Node, Edge } from '@xyflow/react';
import { WorkflowCanvas } from './WorkflowCanvas';

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  description?: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: any[];
  createdAt: string;
  updatedAt: string;
  executionCount?: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
}

export function WorkflowManager() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'templates' | 'editor'>('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [editorWorkflow, setEditorWorkflow] = useState<{nodes: Node[], edges: Edge[]} | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Buscar workflows
  const fetchWorkflows = async () => {
    try {
      setError(null);
      const response = await api.workflows.get();

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      setWorkflows(response.data?.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Buscar templates
  const fetchTemplates = async () => {
    try {
      const response = await api.workflows.templates.get();

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      setTemplates(response.data?.data || []);
    } catch (err) {
      console.error('Erro ao buscar templates:', err);
    }
  };

  // Buscar estatísticas
  const fetchStats = async () => {
    try {
      const response = await api.workflows.stats.get();

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      setStats(response.data?.data || null);
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  };

  // Iniciar workflow
  const startWorkflow = async (workflowId: string) => {
    try {
      const response = await api.workflows[workflowId].start.post();

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      await fetchWorkflows();
      alert('Workflow iniciado com sucesso!');
    } catch (err) {
      alert(`Erro ao iniciar workflow: ${getErrorMessage(err)}`);
    }
  };

  // Parar workflow
  const stopWorkflow = async (workflowId: string) => {
    try {
      const response = await api.workflows[workflowId].stop.post();

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      await fetchWorkflows();
      alert('Workflow parado com sucesso!');
    } catch (err) {
      alert(`Erro ao parar workflow: ${getErrorMessage(err)}`);
    }
  };

  // Criar workflow do template
  const createFromTemplate = async (templateId: string, customName?: string) => {
    try {
      const response = await api.workflows.templates.post({
        templateId,
        name: customName
      });

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      await fetchWorkflows();
      setActiveView('list');
      alert('Workflow criado a partir do template!');
    } catch (err) {
      alert(`Erro ao criar workflow: ${getErrorMessage(err)}`);
    }
  };

  // Abrir editor para novo workflow
  const createNewWorkflow = () => {
    setSelectedWorkflow(null);
    setEditorWorkflow({ nodes: [], edges: [] });
    setActiveView('editor');
  };

  // Abrir editor para workflow existente
  const editWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);

    // Converter nodes do workflow para nodes do React Flow
    const reactFlowNodes: Node[] = workflow.nodes.map(node => ({
      id: node.id,
      type: `${node.type}Node`,
      position: node.position,
      data: {
        label: node.name,
        nodeType: node.type,
        config: node.data
      }
    }));

    // Converter conexões para edges do React Flow
    const reactFlowEdges: Edge[] = workflow.connections?.map((conn: any, index: number) => ({
      id: `edge-${index}`,
      source: conn.sourceNodeId,
      target: conn.targetNodeId,
      sourceHandle: conn.sourceHandle || 'output',
      targetHandle: conn.targetHandle || 'input',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 }
    })) || [];

    setEditorWorkflow({ nodes: reactFlowNodes, edges: reactFlowEdges });
    setActiveView('editor');
  };

  // Salvar workflow do editor
  const saveWorkflowFromEditor = async (nodes: Node[], edges: Edge[]) => {
    try {
      // Converter nodes do React Flow para formato do backend
      const workflowNodes = nodes.map(node => ({
        id: node.id,
        type: node.data.nodeType,
        name: node.data.label,
        position: node.position,
        data: node.data.config || {}
      }));

      // Converter edges para conexões
      const connections = edges.map(edge => ({
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        sourceHandle: edge.sourceHandle || 'output',
        targetHandle: edge.targetHandle || 'input'
      }));

      const workflowData = {
        name: selectedWorkflow?.name || 'Novo Workflow',
        description: selectedWorkflow?.description || 'Workflow criado no editor visual',
        nodes: workflowNodes,
        connections,
        active: false
      };

      let response;
      if (selectedWorkflow) {
        // Atualizar workflow existente
        response = await api.workflows[selectedWorkflow.id].put(workflowData);
      } else {
        // Criar novo workflow
        response = await api.workflows.post(workflowData);
      }

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      await fetchWorkflows();
      setActiveView('list');
      setSelectedWorkflow(null);
      setEditorWorkflow(null);
      alert('Workflow salvo com sucesso!');
    } catch (err) {
      alert(`Erro ao salvar workflow: ${getErrorMessage(err)}`);
    }
  };

  // Testar workflow no editor
  const testWorkflowFromEditor = async (nodes: Node[], edges: Edge[]) => {
    try {
      // Simular execução (por enquanto)
      alert('Testando workflow... (funcionalidade em desenvolvimento)');
      console.log('Testing workflow:', { nodes, edges });
    } catch (err) {
      alert(`Erro ao testar workflow: ${getErrorMessage(err)}`);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchWorkflows(), fetchTemplates(), fetchStats()]);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflows</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Carregando workflows...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com navegação */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
          <h3 className="text-lg font-semibold text-gray-900">Sistema de Workflows</h3>

          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                activeView === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📋 Meus Workflows
            </button>
            <button
              onClick={() => setActiveView('templates')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                activeView === 'templates'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🎯 Templates
            </button>
            <button
              onClick={createNewWorkflow}
              className="px-3 py-1 rounded-md text-sm font-medium bg-green-500 text-white hover:bg-green-600"
            >
              ✨ Novo Editor Visual
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Total</p>
              <p className="text-xl font-bold text-blue-600">{stats.storage?.total || 0}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-green-900">Ativos</p>
              <p className="text-xl font-bold text-green-600">{stats.storage?.active || 0}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-purple-900">Execuções</p>
              <p className="text-xl font-bold text-purple-600">{stats.storage?.totalExecutions || 0}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-orange-900">Nodes</p>
              <p className="text-xl font-bold text-orange-600">{stats.nodes?.total || 0}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Lista de Workflows */}
      {activeView === 'list' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h4 className="text-lg font-medium text-gray-900">Meus Workflows</h4>
          </div>

          <div className="p-6">
            {workflows.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Nenhum workflow criado ainda</p>
                <button
                  onClick={() => setActiveView('templates')}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Criar do Template
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-900 truncate">{workflow.name}</h5>
                      <span className={`px-2 py-1 text-xs rounded ${
                        workflow.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workflow.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    {workflow.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{workflow.description}</p>
                    )}

                    <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                      <span>{workflow.nodes?.length || 0} nodes</span>
                      <span>{workflow.executionCount || 0} execuções</span>
                    </div>

                    <div className="flex space-x-2">
                      {workflow.active ? (
                        <button
                          onClick={() => stopWorkflow(workflow.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Parar
                        </button>
                      ) : (
                        <button
                          onClick={() => startWorkflow(workflow.id)}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        >
                          Iniciar
                        </button>
                      )}

                      <button
                        onClick={() => editWorkflow(workflow)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates */}
      {activeView === 'templates' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h4 className="text-lg font-medium text-gray-900">Templates de Workflows</h4>
          </div>

          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start mb-2">
                    <span className="text-2xl mr-3">{template.thumbnail}</span>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{template.name}</h5>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      template.category === 'basic'
                        ? 'bg-blue-100 text-blue-800'
                        : template.category === 'advanced'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {template.category === 'basic' ? 'Básico' :
                       template.category === 'advanced' ? 'Avançado' : 'Custom'}
                    </span>
                  </div>

                  <button
                    onClick={() => createFromTemplate(template.id)}
                    className="w-full mt-3 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Usar Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Editor Visual */}
      {activeView === 'editor' && editorWorkflow && (
        <div className="bg-white rounded-lg shadow" style={{ height: '600px' }}>
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900">
              {selectedWorkflow ? `Editando: ${selectedWorkflow.name}` : 'Novo Workflow Visual'}
            </h4>
            <button
              onClick={() => {
                setActiveView('list');
                setSelectedWorkflow(null);
                setEditorWorkflow(null);
              }}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Voltar para Lista
            </button>
          </div>

          <div style={{ height: 'calc(100% - 60px)' }}>
            <WorkflowCanvas
              workflowId={selectedWorkflow?.id}
              initialNodes={editorWorkflow.nodes}
              initialEdges={editorWorkflow.edges}
              onSave={saveWorkflowFromEditor}
              onTest={testWorkflowFromEditor}
            />
          </div>
        </div>
      )}
    </div>
  );
}