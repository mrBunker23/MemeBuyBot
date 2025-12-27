// Service para comunicação com APIs de Workflows do backend

interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  isActive: boolean;
  nodeCount: number;
  triggerCount: number;
  conditionCount: number;
  actionCount: number;
  createdAt: string;
  updatedAt: string;
}

class WorkflowApiService {
  private baseUrl = '/api/workflows';

  // === Helper Methods ===

  /**
   * Limpa dados dos nodes React Flow removendo referências circulares
   */
  private sanitizeNodesForBackend(nodes: any): any[] {
    // Garantir que sempre temos um array
    if (!nodes || !Array.isArray(nodes)) {
      console.warn('⚠️ Nodes não é um array:', typeof nodes, nodes);
      return [];
    }

    return nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
      // Remover propriedades do React Flow que causam ciclos
      // measured, internals, etc. são filtradas
    }));
  }

  /**
   * Limpa dados das edges React Flow removendo referências circulares
   */
  private sanitizeEdgesForBackend(edges: any): any[] {
    // Garantir que sempre temos um array
    if (!edges || !Array.isArray(edges)) {
      console.warn('⚠️ Edges não é um array:', typeof edges, edges);
      return [];
    }

    return edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      // Não incluir sourceHandle/targetHandle para evitar problemas no React Flow
      type: edge.type || 'smoothstep',
      animated: edge.animated || false,
      style: edge.style || { stroke: '#6366f1', strokeWidth: 2 },
      // Remover propriedades internas do React Flow
    }));
  }

  // === CRUD Operations ===

  async getAllWorkflows(): Promise<WorkflowData[]> {
    try {
      const response = await fetch(this.baseUrl);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar workflows');
      }

      return result.data || [];
    } catch (error) {
      console.error('❌ Erro buscando workflows:', error);
      throw error;
    }
  }

  async getWorkflow(workflowId: string): Promise<WorkflowData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${workflowId}`);
      const result = await response.json();

      if (!result.success) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(result.error || 'Erro ao buscar workflow');
      }

      // Garantir que nodes e edges são sempre arrays
      const workflow = result.data;
      if (workflow) {
        workflow.nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];

        // Backend pode retornar 'connections' em vez de 'edges'
        if (workflow.connections && !workflow.edges) {
          // Converter connections para edges (formato React Flow)
          workflow.edges = Array.isArray(workflow.connections)
            ? workflow.connections.map((conn: any) => ({
                id: conn.id,
                source: conn.sourceNodeId,
                target: conn.targetNodeId,
                // Não usar sourceHandle/targetHandle - deixar React Flow usar pontos padrão
                type: 'smoothstep',
                animated: false,
                style: { stroke: '#6366f1', strokeWidth: 2 }
              }))
            : [];
        } else {
          workflow.edges = Array.isArray(workflow.edges) ? workflow.edges : [];
        }

        // Remover edges duplicadas por ID
        if (workflow.edges.length > 0) {
          const uniqueEdges = workflow.edges.filter((edge: any, index: number, arr: any[]) =>
            arr.findIndex(e => e.id === edge.id) === index
          );

          if (uniqueEdges.length !== workflow.edges.length) {
            console.log(`🔧 Edges duplicadas removidas: ${workflow.edges.length} → ${uniqueEdges.length}`);
            workflow.edges = uniqueEdges;
          }
        }

        console.log('📥 Workflow carregado do backend:', {
          id: workflow.id,
          name: workflow.name,
          nodes: workflow.nodes.length,
          edges: workflow.edges.length,
          connections: workflow.connections?.length || 0,
          rawData: workflow
        });
      }

      return workflow;
    } catch (error) {
      console.error('❌ Erro buscando workflow:', error);
      throw error;
    }
  }

  async createWorkflow(name: string, description?: string): Promise<WorkflowData> {
    try {
      const payload = {
        name,
        description: description || '',
        nodes: [],
        connections: [],
        active: false
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar workflow');
      }

      console.log('✅ Workflow criado:', result.data.name);
      return result.data;
    } catch (error) {
      console.error('❌ Erro criando workflow:', error);
      throw error;
    }
  }

  async saveWorkflow(workflow: WorkflowData): Promise<void> {
    try {
      // Debug: verificar o que está vindo
      console.log('🔍 Workflow recebido para salvar:', {
        id: workflow.id,
        name: workflow.name,
        nodesType: typeof workflow.nodes,
        nodesValue: workflow.nodes,
        edgesType: typeof workflow.edges,
        edgesValue: workflow.edges
      });

      // Limpar dados para evitar referências circulares
      const cleanNodes = this.sanitizeNodesForBackend(workflow.nodes);
      const cleanEdges = this.sanitizeEdgesForBackend(workflow.edges);

      // Converter edges do React Flow para format do backend
      const connections = cleanEdges.map(edge => ({
        id: edge.id,
        sourceNodeId: edge.source,
        sourceOutputId: 'default', // React Flow não tem outputs específicos
        targetNodeId: edge.target,
        targetInputId: 'default' // React Flow não tem inputs específicos
      }));

      // Remover connections duplicadas por ID (proteção extra)
      const uniqueConnections = connections.filter((conn, index, arr) =>
        arr.findIndex(c => c.id === conn.id) === index
      );

      if (uniqueConnections.length !== connections.length) {
        console.log(`🔧 Connections duplicadas removidas: ${connections.length} → ${uniqueConnections.length}`);
      }

      const payload = {
        name: workflow.name,
        description: workflow.description,
        nodes: cleanNodes,
        connections: uniqueConnections,
        active: workflow.isActive
      };

      console.log('🧹 Dados limpos para backend:', {
        nodes: cleanNodes.length,
        edges: cleanEdges.length,
        connections: uniqueConnections.length
      });

      const response = await fetch(`${this.baseUrl}/${workflow.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar workflow');
      }

      console.log('💾 Workflow salvo:', workflow.name);
    } catch (error) {
      console.error('❌ Erro salvando workflow:', error);
      throw error;
    }
  }

  async deleteWorkflow(workflowId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${workflowId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!result.success) {
        if (response.status === 404) {
          return false;
        }
        throw new Error(result.error || 'Erro ao deletar workflow');
      }

      console.log('🗑️ Workflow deletado:', workflowId);
      return true;
    } catch (error) {
      console.error('❌ Erro deletando workflow:', error);
      throw error;
    }
  }

  async toggleWorkflowActive(workflowId: string): Promise<boolean> {
    try {
      // Primeiro, pegar o workflow atual
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow não encontrado');
      }

      // Toggle do status
      const newStatus = !workflow.isActive;

      // Usar API específica de start/stop
      const endpoint = newStatus ? 'start' : 'stop';
      const response = await fetch(`${this.baseUrl}/${workflowId}/${endpoint}`, {
        method: 'POST'
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || `Erro ao ${newStatus ? 'ativar' : 'desativar'} workflow`);
      }

      console.log(`${newStatus ? '▶️' : '⏸️'} Workflow ${newStatus ? 'ativado' : 'desativado'}:`, workflowId);
      return newStatus;
    } catch (error) {
      console.error('❌ Erro alterando status do workflow:', error);
      throw error;
    }
  }

  async duplicateWorkflow(workflowId: string): Promise<WorkflowData | null> {
    try {
      // Primeiro, pegar o workflow original
      const originalWorkflow = await this.getWorkflow(workflowId);
      if (!originalWorkflow) {
        console.warn('⚠️ Workflow não encontrado:', workflowId);
        return null;
      }

      // Criar novo workflow como cópia
      const newWorkflow = await this.createWorkflow(
        `${originalWorkflow.name} (Cópia)`,
        originalWorkflow.description
      );

      // Atualizar com os nodes e edges do original
      const updatedWorkflow = {
        ...newWorkflow,
        nodes: originalWorkflow.nodes,
        edges: originalWorkflow.edges
      };

      await this.saveWorkflow(updatedWorkflow);

      console.log('📋 Workflow duplicado:', originalWorkflow.name);
      return updatedWorkflow;
    } catch (error) {
      console.error('❌ Erro duplicando workflow:', error);
      return null;
    }
  }

  async exportWorkflow(workflowId: string): Promise<string | null> {
    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        return null;
      }

      // Limpar dados antes de exportar para evitar referências circulares
      const cleanWorkflow = {
        ...workflow,
        nodes: this.sanitizeNodesForBackend(workflow.nodes || []),
        edges: this.sanitizeEdgesForBackend(workflow.edges || [])
      };

      return JSON.stringify(cleanWorkflow, null, 2);
    } catch (error) {
      console.error('❌ Erro exportando workflow:', error);
      return null;
    }
  }

  // === Execução ===

  async executeWorkflow(workflowId: string, triggerNodeId?: string, initialData?: any): Promise<any> {
    try {
      const payload: any = {};
      if (triggerNodeId) payload.triggerNodeId = triggerNodeId;
      if (initialData) payload.initialData = initialData;

      const response = await fetch(`${this.baseUrl}/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao executar workflow');
      }

      console.log('⚡ Workflow executado:', workflowId);
      return result.data;
    } catch (error) {
      console.error('❌ Erro executando workflow:', error);
      throw error;
    }
  }

  // === Templates ===

  async getTemplates(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/templates`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar templates');
      }

      return result.data || [];
    } catch (error) {
      console.error('❌ Erro buscando templates:', error);
      return [];
    }
  }

  async createFromTemplate(templateId: string, name?: string): Promise<WorkflowData | null> {
    try {
      const payload = {
        templateId,
        name: name || `Workflow do Template`
      };

      const response = await fetch(`${this.baseUrl}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar workflow do template');
      }

      console.log('📄 Workflow criado do template:', result.data.name);
      return result.data;
    } catch (error) {
      console.error('❌ Erro criando workflow do template:', error);
      return null;
    }
  }
}

// Instância singleton
export const workflowApiService = new WorkflowApiService();