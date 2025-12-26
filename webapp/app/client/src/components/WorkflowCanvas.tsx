// Editor Visual de Workflows - Interface Drag & Drop estilo n8n

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  MiniMap,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CustomTriggerNode } from './workflow-nodes/CustomTriggerNode';
import { CustomConditionNode } from './workflow-nodes/CustomConditionNode';
import { CustomActionNode } from './workflow-nodes/CustomActionNode';
import { CustomUtilityNode } from './workflow-nodes/CustomUtilityNode';
import { NodePalette } from './NodePalette';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { WorkflowToolbar } from './WorkflowToolbar';

// Tipos de nodes customizados
const nodeTypes: NodeTypes = {
  triggerNode: CustomTriggerNode,
  conditionNode: CustomConditionNode,
  actionNode: CustomActionNode,
  utilityNode: CustomUtilityNode,
};

interface WorkflowCanvasProps {
  workflowId?: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onTest?: (nodes: Node[], edges: Edge[]) => void;
  readOnly?: boolean;
}

export function WorkflowCanvas({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  onSave,
  onTest,
  readOnly = false
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Função para conectar nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      const edge = {
        ...connection,
        id: `edge-${connection.source}-${connection.target}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      };
      setEdges((edges) => addEdge(edge, edges));
    },
    [setEdges]
  );

  // Função para adicionar novo node do palette
  const onNodeAdd = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const nodeId = `${nodeType}-${Date.now()}`;

    const nodeDefaults: Record<string, Partial<Node>> = {
      trigger: {
        type: 'triggerNode',
        data: {
          label: 'Price Change Trigger',
          nodeType: 'trigger',
          config: {
            token: '',
            changePercentage: 10,
            direction: 'increase'
          }
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
      condition: {
        type: 'conditionNode',
        data: {
          label: 'Multiple Above',
          nodeType: 'condition',
          config: {
            multipleThreshold: 2.0,
            compareValue: 'currentPrice'
          }
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
      action: {
        type: 'actionNode',
        data: {
          label: 'Sell Percentage',
          nodeType: 'action',
          config: {
            sellPercentage: 50,
            marketType: 'market'
          }
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
      },
      utility: {
        type: 'utilityNode',
        data: {
          label: 'Log Message',
          nodeType: 'utility',
          config: {
            message: 'Workflow executed',
            level: 'info'
          }
        },
        style: {
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          border: '2px solid #6d28d9',
          borderRadius: '12px',
          color: 'white',
          fontSize: '12px',
          fontWeight: '600',
          width: 160,
          height: 60,
        },
      },
    };

    const newNode: Node = {
      id: nodeId,
      position,
      ...nodeDefaults[nodeType],
    };

    setNodes((nodes) => [...nodes, newNode]);

    // Automaticamente selecionar o node e abrir painel de configuração
    setTimeout(() => {
      setSelectedNode(newNode);
      setIsPropertiesPanelOpen(true);
    }, 100);
  }, [setNodes]);

  // Função para selecionar node
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (readOnly) return;
    setSelectedNode(node);
    setIsPropertiesPanelOpen(true);
  }, [readOnly]);

  // Função para atualizar propriedades do node
  const onNodeUpdate = useCallback((nodeId: string, newData: any) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  }, [setNodes]);

  // Função para deletar node
  const onNodeDelete = useCallback((nodeId: string) => {
    setNodes((nodes) => nodes.filter((node) => node.id !== nodeId));
    setEdges((edges) => edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
    setIsPropertiesPanelOpen(false);
  }, [setNodes, setEdges]);

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const nodeType = event.dataTransfer.getData('application/reactflow');
    if (!nodeType) return;

    const reactFlowBounds = (event.target as Element).getBoundingClientRect();
    const position = {
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    };

    onNodeAdd(nodeType, position);
  }, [onNodeAdd]);

  // Função para limpar canvas
  const onClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setIsPropertiesPanelOpen(false);
  }, [setNodes, setEdges]);

  // Função para salvar workflow
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(nodes, edges);
    }
  }, [nodes, edges, onSave]);

  // Função para testar workflow
  const handleTest = useCallback(() => {
    if (onTest) {
      onTest(nodes, edges);
    }
  }, [nodes, edges, onTest]);

  // Estatísticas do workflow
  const workflowStats = useMemo(() => {
    const triggers = nodes.filter(n => n.data?.nodeType === 'trigger').length;
    const conditions = nodes.filter(n => n.data?.nodeType === 'condition').length;
    const actions = nodes.filter(n => n.data?.nodeType === 'action').length;
    const utilities = nodes.filter(n => n.data?.nodeType === 'utility').length;

    return { triggers, conditions, actions, utilities, total: nodes.length, connections: edges.length };
  }, [nodes, edges]);

  return (
    <div className="h-full w-full flex bg-gray-50">
      {/* Palette de Nodes */}
      {!readOnly && (
        <NodePalette
          onNodeAdd={(nodeType, position) => onNodeAdd(nodeType, position)}
          stats={workflowStats}
        />
      )}

      {/* Canvas Principal */}
      <div className="flex-1 relative">
        {/* Toolbar */}
        <WorkflowToolbar
          onSave={handleSave}
          onTest={handleTest}
          onClear={onClearCanvas}
          stats={workflowStats}
          readOnly={readOnly}
        />

        {/* React Flow Canvas */}
        <div className="h-full w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            fitView
            fitViewOptions={{
              padding: 0.1,
              includeHiddenNodes: false,
            }}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#6366f1', strokeWidth: 2 },
            }}
            deleteKeyCode={readOnly ? null : ['Delete', 'Backspace']}
            multiSelectionKeyCode={readOnly ? null : ['Shift']}
            selectionOnDrag={!readOnly}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            className="workflow-canvas"
          >
            {/* Background com padrão de grade */}
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#e5e7eb"
            />

            {/* Controles de zoom e navegação */}
            <Controls
              position="top-right"
              showZoom={true}
              showFitView={true}
              showInteractive={true}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />

            {/* Mini mapa */}
            <MiniMap
              position="top-left"
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              nodeStrokeWidth={3}
              nodeStrokeColor="#6366f1"
              nodeBorderRadius={8}
            />

            {/* Painel de informações */}
            <Panel position="bottom-left">
              <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg">
                <div className="flex items-center space-x-4 text-sm">
                  <span className="font-medium text-gray-700">Nodes: {workflowStats.total}</span>
                  <span className="font-medium text-gray-700">Conexões: {workflowStats.connections}</span>
                  <div className="flex space-x-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      T: {workflowStats.triggers}
                    </span>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                      C: {workflowStats.conditions}
                    </span>
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                      A: {workflowStats.actions}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                      U: {workflowStats.utilities}
                    </span>
                  </div>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Painel de Propriedades */}
      {!readOnly && (
        <NodePropertiesPanel
          node={selectedNode}
          isOpen={isPropertiesPanelOpen}
          onClose={() => {
            setIsPropertiesPanelOpen(false);
            setSelectedNode(null);
          }}
          onUpdate={onNodeUpdate}
          onDelete={onNodeDelete}
          nodes={nodes}
          edges={edges}
        />
      )}
    </div>
  );
}