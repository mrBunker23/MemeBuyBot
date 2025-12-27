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

      return result.data;
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
      // Converter edges do React Flow para format do backend
      const connections = workflow.edges?.map(edge => ({
        id: edge.id,
        sourceNodeId: edge.source,
        sourceOutputId: 'default', // React Flow não tem outputs específicos
        targetNodeId: edge.target,
        targetInputId: 'default' // React Flow não tem inputs específicos
      })) || [];

      const payload = {
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        connections,
        active: workflow.isActive
      };

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

      return JSON.stringify(workflow, null, 2);
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