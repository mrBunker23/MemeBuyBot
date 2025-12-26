// Inicialização do Sistema de Workflows - Auto-registro de Nodes

// Importar todos os nodes para auto-registro via decorators
import './nodes/triggers/PriceChangeTriggerNode';
import './nodes/conditions/MultipleAboveConditionNode';
import './nodes/actions/SellPercentageActionNode';
import './nodes/utilities/LogUtilityNode';

// Exportar classes e utilitários principais
export { NodeRegistry } from './nodes/registry/NodeRegistry';
export { BaseWorkflowNode, BaseTriggerNode, BaseConditionNode, BaseActionNode, BaseUtilityNode } from './nodes/base/BaseWorkflowNode';

// Exportar tipos
export * from './types/workflow.types';

// Exportar templates e library
export * from './library/node-library';
export * from './templates/workflow-templates';

// Exportar services
export { WorkflowEngine, workflowEngine } from './engine/WorkflowEngine';

console.log('🎯 Sistema de Workflows inicializado - Nodes registrados automaticamente');

// Verificar quantos nodes foram registrados
import { NodeRegistry } from './nodes/registry/NodeRegistry';
const stats = NodeRegistry.getStats();
console.log(`📊 Nodes registrados: ${stats.total} (${stats.triggers} triggers, ${stats.conditions} conditions, ${stats.actions} actions, ${stats.utilities} utilities)`);