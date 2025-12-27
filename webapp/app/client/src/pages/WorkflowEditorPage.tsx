// Página dedicada para edição de workflows
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Play, Settings } from 'lucide-react';
import { WorkflowCanvas } from '../components/WorkflowCanvas';
import { workflowApiService } from '../services/workflow-api.service';

export function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workflowName, setWorkflowName] = useState('Novo Workflow');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(!!id); // Loading se estamos editando um workflow existente
  const [currentWorkflow, setCurrentWorkflow] = useState<any>(null);
  const [currentNodes, setCurrentNodes] = useState<any[]>([]);
  const [currentEdges, setCurrentEdges] = useState<any[]>([]);

  // Carregar workflow existente se ID fornecido
  useEffect(() => {
    const loadWorkflow = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const workflow = await workflowApiService.getWorkflow(id);
        if (workflow) {
          setCurrentWorkflow(workflow);
          setWorkflowName(workflow.name);
          setWorkflowDescription(workflow.description || '');
          setCurrentNodes(workflow.nodes || []);
          setCurrentEdges(workflow.edges || []);
          console.log('📂 Workflow carregado:', workflow.name);
        } else {
          console.warn('⚠️ Workflow não encontrado:', id);
          alert('Workflow não encontrado');
          navigate('/workflows');
        }
      } catch (error) {
        console.error('❌ Erro carregando workflow:', error);
        alert('Erro carregando workflow');
        navigate('/workflows');
      } finally {
        setLoading(false);
      }
    };

    loadWorkflow();
  }, [id, navigate]);

  // Nodes de exemplo para testar o drag
  const initialNodes = [
    {
      id: 'trigger-1',
      type: 'triggerNode',
      position: { x: 100, y: 100 },
      data: {
        label: '📊 Price Change',
        nodeType: 'trigger',
        config: { changePercentage: 5 }
      },
      style: {
        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
        border: '2px solid #15803d',
        borderRadius: '12px',
        color: 'white',
        fontSize: '12px',
        fontWeight: '600',
        width: 200,
        height: 80,
      },
    },
    {
      id: 'condition-1',
      type: 'conditionNode',
      position: { x: 400, y: 100 },
      data: {
        label: 'Multiple Above',
        nodeType: 'condition',
        config: { threshold: 2.0 }
      },
      style: {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        border: '2px solid #d97706',
        borderRadius: '12px',
        color: 'white',
        fontSize: '12px',
        fontWeight: '600',
        width: 180,
        height: 70,
      },
    },
    {
      id: 'action-1',
      type: 'actionNode',
      position: { x: 700, y: 100 },
      data: {
        label: 'Sell 25%',
        nodeType: 'action',
        config: { sellPercentage: 25 }
      },
      style: {
        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        border: '2px solid #b91c1c',
        borderRadius: '12px',
        color: 'white',
        fontSize: '12px',
        fontWeight: '600',
        width: 180,
        height: 70,
      },
    }
  ];

  const initialEdges = [
    {
      id: 'edge-1',
      source: 'trigger-1',
      target: 'condition-1',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
    },
    {
      id: 'edge-2',
      source: 'condition-1',
      target: 'action-1',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
    }
  ];

  const handleSave = async (nodes?: any[], edges?: any[]) => {
    try {
      // Usar nodes/edges do canvas se fornecidos, senão usar estados locais
      const nodesToSave = nodes || currentNodes;
      const edgesToSave = edges || currentEdges;

      if (currentWorkflow) {
        // Atualizar workflow existente
        const updatedWorkflow = {
          ...currentWorkflow,
          name: workflowName,
          description: workflowDescription,
          nodes: nodesToSave,
          edges: edgesToSave,
        };

        await workflowApiService.saveWorkflow(updatedWorkflow);
        setHasUnsavedChanges(false);
        console.log('💾 Workflow salvo:', workflowName);
        alert('Workflow salvo com sucesso!');
      } else {
        // Criar novo workflow se não existe
        const newWorkflow = await workflowApiService.createWorkflow(workflowName, workflowDescription);

        // Atualizar com nodes e edges
        const updatedWorkflow = {
          ...newWorkflow,
          nodes: nodesToSave,
          edges: edgesToSave,
        };

        await workflowApiService.saveWorkflow(updatedWorkflow);
        setCurrentWorkflow(updatedWorkflow);
        setHasUnsavedChanges(false);

        console.log('✅ Novo workflow criado e salvo:', workflowName);
        alert('Novo workflow criado e salvo com sucesso!');
      }
    } catch (error) {
      console.error('❌ Erro salvando workflow:', error);
      alert('Erro salvando workflow. Tente novamente.');
    }
  };

  const handleTest = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      alert('Teste executado com sucesso!\n\nObs: Implementação completa de testes virá em próxima versão.');
    }, 2000);
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      const shouldLeave = confirm('Você tem alterações não salvas. Deseja sair?');
      if (!shouldLeave) return;
    }
    navigate('/workflows');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-700">Carregando workflow...</h2>
          <p className="text-gray-500">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Side */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Workflows</span>
              </button>

              <div className="border-l border-gray-300 pl-4">
                <div className="flex items-center space-x-3">
                  <div>
                    <input
                      type="text"
                      value={workflowName}
                      onChange={(e) => {
                        setWorkflowName(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      className="text-lg font-semibold bg-transparent border-none focus:ring-0 p-0 text-gray-900 placeholder-gray-400"
                      placeholder="Nome do Workflow"
                    />
                    <input
                      type="text"
                      value={workflowDescription}
                      onChange={(e) => {
                        setWorkflowDescription(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      className="block w-full text-sm bg-transparent border-none focus:ring-0 p-0 text-gray-600 placeholder-gray-400 mt-1"
                      placeholder="Descrição (opcional)"
                    />
                  </div>

                  {hasUnsavedChanges && (
                    <div className="flex items-center space-x-1 text-orange-600">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-xs font-medium">Não salvo</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings size={16} />
                <span>Configurações</span>
              </button>

              <button
                onClick={handleTest}
                disabled={isRunning}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isRunning
                    ? 'bg-orange-100 text-orange-700 cursor-not-allowed'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full"></div>
                    <span>Testando...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Testar</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSave}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Save size={16} />
                <span>Salvar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-sm font-medium text-yellow-800 mb-3">Configurações do Workflow</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-yellow-700 mb-1">
                  Status de Execução
                </label>
                <select className="w-full px-3 py-1 border border-yellow-300 rounded text-sm">
                  <option value="inactive">Inativo</option>
                  <option value="active">Ativo</option>
                  <option value="paused">Pausado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-yellow-700 mb-1">
                  Prioridade de Execução
                </label>
                <select className="w-full px-3 py-1 border border-yellow-300 rounded text-sm">
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Area - WorkflowCanvas completo */}
      <div className="flex-1 relative" style={{ minHeight: '400px' }}>
        <div className="absolute inset-0">
          <WorkflowCanvas
            workflowId={id}
            initialNodes={loading ? [] : (currentNodes.length > 0 ? currentNodes : initialNodes)}
            initialEdges={loading ? [] : currentEdges}
            onSave={undefined} // Botão removido do toolbar - usar apenas botão do header
            onWorkflowChange={(nodes, edges) => {
              setCurrentNodes(nodes);
              setCurrentEdges(edges);
              setHasUnsavedChanges(true);
            }}
            onTest={() => {
              handleTest();
            }}
            readOnly={loading}
          />
        </div>
      </div>

      {/* Footer Stats */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Nodes: {currentNodes.length}</span>
            <span>Conexões: {currentEdges.length}</span>
            <span>Triggers: {currentNodes.filter(n => n.data?.nodeType === 'trigger').length}</span>
            <span>Actions: {currentNodes.filter(n => n.data?.nodeType === 'action').length}</span>
          </div>

          <div className="flex items-center space-x-4">
            <span>Criado: {currentWorkflow?.createdAt ? new Date(currentWorkflow.createdAt).toLocaleDateString('pt-BR') : '--'}</span>
            <span>Modificado: {currentWorkflow?.updatedAt ? new Date(currentWorkflow.updatedAt).toLocaleDateString('pt-BR') : '--'}</span>
            <span className={`px-2 py-1 rounded text-xs ${currentWorkflow?.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {currentWorkflow?.isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}