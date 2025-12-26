// Registry de Nodes - Sistema de registro automático

import { BaseWorkflowNode } from '../base/BaseWorkflowNode';
import { WorkflowExecutionContext } from '../../types/workflow.types';

export interface RegisteredNode {
  nodeType: string;
  category: 'trigger' | 'condition' | 'action' | 'utility';
  name: string;
  description: string;
  icon: string;
  color: string;
  nodeClass: new (id: string, data?: any, position?: any) => BaseWorkflowNode;
}

class NodeRegistry {
  private static nodes = new Map<string, RegisteredNode>();

  /**
   * Registra um novo tipo de node
   */
  static register(nodeClass: new (id: string, data?: any, position?: any) => BaseWorkflowNode): void {
    // Cria instância temporária para obter metadata
    const tempInstance = new nodeClass('temp');

    const registration: RegisteredNode = {
      nodeType: tempInstance.nodeType,
      category: tempInstance.category,
      name: tempInstance.name,
      description: tempInstance.description,
      icon: tempInstance.icon,
      color: tempInstance.color,
      nodeClass
    };

    this.nodes.set(tempInstance.nodeType, registration);
    console.log(`📦 Node registrado: ${tempInstance.nodeType} (${tempInstance.category})`);
  }

  /**
   * Cria uma instância de node pelo tipo
   */
  static createNode(nodeType: string, id: string, data?: any, position?: any): BaseWorkflowNode | null {
    const registration = this.nodes.get(nodeType);
    if (!registration) {
      console.error(`❌ Node type '${nodeType}' não encontrado no registry`);
      return null;
    }

    try {
      return new registration.nodeClass(id, data, position);
    } catch (error) {
      console.error(`❌ Erro ao criar node '${nodeType}':`, error);
      return null;
    }
  }

  /**
   * Obtém informações de um tipo de node
   */
  static getNodeInfo(nodeType: string): RegisteredNode | null {
    return this.nodes.get(nodeType) || null;
  }

  /**
   * Lista todos os tipos de nodes registrados
   */
  static getAllNodes(): RegisteredNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Obtém nodes por categoria
   */
  static getNodesByCategory(category: 'trigger' | 'condition' | 'action' | 'utility'): RegisteredNode[] {
    return this.getAllNodes().filter(node => node.category === category);
  }

  /**
   * Verifica se um tipo de node existe
   */
  static exists(nodeType: string): boolean {
    return this.nodes.has(nodeType);
  }

  /**
   * Remove um tipo de node (útil para testes)
   */
  static unregister(nodeType: string): boolean {
    return this.nodes.delete(nodeType);
  }

  /**
   * Limpa todos os registros (útil para testes)
   */
  static clear(): void {
    this.nodes.clear();
  }

  /**
   * Obtém estatísticas do registry
   */
  static getStats() {
    const nodes = this.getAllNodes();
    return {
      total: nodes.length,
      triggers: nodes.filter(n => n.category === 'trigger').length,
      conditions: nodes.filter(n => n.category === 'condition').length,
      actions: nodes.filter(n => n.category === 'action').length,
      utilities: nodes.filter(n => n.category === 'utility').length
    };
  }
}

/**
 * Decorator para auto-registro de nodes
 */
export function RegisterNode(target: new (id: string, data?: any, position?: any) => BaseWorkflowNode) {
  NodeRegistry.register(target);
  return target;
}

export { NodeRegistry };