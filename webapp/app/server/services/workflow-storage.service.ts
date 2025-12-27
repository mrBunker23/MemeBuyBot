// Service de Storage para Workflows - Persistência em JSON

import { promises as fs } from 'fs';
import { join } from 'path';
import { Workflow } from '@/app/shared/workflows/types/workflow.types';

export interface WorkflowStorageData {
  workflows: Workflow[];
  lastUpdated: string;
}

class WorkflowStorageService {
  private static readonly STORAGE_FILE = join(process.cwd(), 'storage', 'workflows.json');
  private static cache: Map<string, Workflow> = new Map();
  private static lastLoad: number = 0;
  private static readonly CACHE_TTL = 5000; // 5 segundos

  /**
   * Garante que o diretório de storage existe
   */
  private static async ensureStorageDir(): Promise<void> {
    const storageDir = join(process.cwd(), 'storage');
    try {
      await fs.access(storageDir);
    } catch {
      await fs.mkdir(storageDir, { recursive: true });
    }
  }

  /**
   * Carrega workflows do arquivo JSON
   */
  private static async loadFromFile(): Promise<WorkflowStorageData> {
    await this.ensureStorageDir();

    try {
      const data = await fs.readFile(this.STORAGE_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Se arquivo não existe ou está corrompido, retorna estrutura vazia
      const emptyData: WorkflowStorageData = {
        workflows: [],
        lastUpdated: new Date().toISOString()
      };
      await this.saveToFile(emptyData);
      return emptyData;
    }
  }

  /**
   * Salva workflows no arquivo JSON
   */
  private static async saveToFile(data: WorkflowStorageData): Promise<void> {
    await this.ensureStorageDir();

    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(this.STORAGE_FILE, jsonData, 'utf8');
  }

  /**
   * Atualiza cache se necessário
   */
  private static async updateCache(): Promise<void> {
    const now = Date.now();
    if (now - this.lastLoad < this.CACHE_TTL && this.cache.size > 0) {
      return; // Cache ainda válido
    }

    const data = await this.loadFromFile();
    this.cache.clear();

    for (const workflow of data.workflows) {
      this.cache.set(workflow.id, workflow);
    }

    this.lastLoad = now;
  }

  /**
   * Salva cache atual no arquivo
   */
  private static async saveCache(): Promise<void> {
    const workflows = Array.from(this.cache.values());
    const data: WorkflowStorageData = {
      workflows,
      lastUpdated: new Date().toISOString()
    };

    await this.saveToFile(data);
    this.lastLoad = Date.now();
  }

  /**
   * Gera ID único para workflow
   */
  private static generateId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // === MÉTODOS PÚBLICOS ===

  /**
   * Obtém todos os workflows
   */
  static async getAllWorkflows(): Promise<Workflow[]> {
    await this.updateCache();
    return Array.from(this.cache.values());
  }

  /**
   * Obtém workflows ativos
   */
  static async getActiveWorkflows(): Promise<Workflow[]> {
    const workflows = await this.getAllWorkflows();
    return workflows.filter(w => w.active);
  }

  /**
   * Obtém workflow por ID
   */
  static async getWorkflowById(id: string): Promise<Workflow | null> {
    await this.updateCache();
    return this.cache.get(id) || null;
  }

  /**
   * Cria novo workflow
   */
  static async createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    await this.updateCache();

    const newWorkflow: Workflow = {
      ...workflow,
      // Garantir defaults para arrays vazios
      nodes: workflow.nodes || [],
      connections: workflow.connections || [],
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executionCount: 0
    };

    // Validação básica
    if (!newWorkflow.name.trim()) {
      throw new Error('Nome do workflow é obrigatório');
    }

    // Permitir workflows vazios para começar a editar
    // if (newWorkflow.nodes.length === 0) {
    //   throw new Error('Workflow deve ter pelo menos um node');
    // }

    this.cache.set(newWorkflow.id, newWorkflow);
    await this.saveCache();

    console.log(`📊 Workflow criado: ${newWorkflow.name} [${newWorkflow.id}]`);
    return newWorkflow;
  }

  /**
   * Atualiza workflow existente
   */
  static async updateWorkflow(id: string, updates: Partial<Omit<Workflow, 'id' | 'createdAt'>>): Promise<Workflow> {
    await this.updateCache();

    const existingWorkflow = this.cache.get(id);
    if (!existingWorkflow) {
      throw new Error(`Workflow ${id} não encontrado`);
    }

    const updatedWorkflow: Workflow = {
      ...existingWorkflow,
      ...updates,
      id: existingWorkflow.id, // Não permite alterar ID
      createdAt: existingWorkflow.createdAt, // Não permite alterar data de criação
      updatedAt: new Date().toISOString()
    };

    // Validação básica
    if (updatedWorkflow.name && !updatedWorkflow.name.trim()) {
      throw new Error('Nome do workflow não pode estar vazio');
    }

    this.cache.set(id, updatedWorkflow);
    await this.saveCache();

    console.log(`📊 Workflow atualizado: ${updatedWorkflow.name} [${id}]`);
    return updatedWorkflow;
  }

  /**
   * Remove workflow
   */
  static async deleteWorkflow(id: string): Promise<boolean> {
    await this.updateCache();

    const workflow = this.cache.get(id);
    if (!workflow) {
      return false;
    }

    this.cache.delete(id);
    await this.saveCache();

    console.log(`📊 Workflow removido: ${workflow.name} [${id}]`);
    return true;
  }

  /**
   * Ativa/desativa workflow
   */
  static async toggleWorkflowActive(id: string, active: boolean): Promise<Workflow | null> {
    const workflow = await this.getWorkflowById(id);
    if (!workflow) {
      return null;
    }

    return await this.updateWorkflow(id, { active });
  }

  /**
   * Incrementa contador de execução
   */
  static async incrementExecutionCount(id: string): Promise<void> {
    const workflow = await this.getWorkflowById(id);
    if (!workflow) {
      return;
    }

    await this.updateWorkflow(id, {
      executionCount: (workflow.executionCount || 0) + 1,
      lastExecution: new Date().toISOString()
    });
  }

  /**
   * Obtém estatísticas
   */
  static async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    totalExecutions: number;
  }> {
    const workflows = await this.getAllWorkflows();

    return {
      total: workflows.length,
      active: workflows.filter(w => w.active).length,
      inactive: workflows.filter(w => !w.active).length,
      totalExecutions: workflows.reduce((sum, w) => sum + (w.executionCount || 0), 0)
    };
  }

  /**
   * Limpa cache (útil para testes)
   */
  static clearCache(): void {
    this.cache.clear();
    this.lastLoad = 0;
  }
}

export { WorkflowStorageService };