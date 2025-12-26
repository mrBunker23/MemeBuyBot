// Sistema de Execução e Contexto de Nodes - Estilo n8n

export interface NodeExecutionData {
  json: Record<string, any>;          // Dados principais em JSON
  binary?: Record<string, any>;       // Dados binários (arquivos, etc)
  pairedItem?: {                      // Link com item do node anterior
    item: number;
    input: number;
  };
  error?: {                           // Informações de erro
    message: string;
    timestamp: string;
    stack?: string;
  };
}

export interface NodeExecutionContext {
  nodeId: string;
  nodeName: string;
  executionId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'success' | 'error' | 'skipped';
  data: NodeExecutionData[];          // Array de items (n8n pode processar múltiplos items)
  inputData?: NodeExecutionData[];    // Dados recebidos de entrada
  outputData?: NodeExecutionData[];   // Dados produzidos na saída
  executionTime?: number;             // Tempo de execução em ms
  itemsProcessed: number;             // Quantidade de items processados
}

export interface WorkflowExecutionState {
  workflowId: string;
  executionId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'success' | 'error' | 'cancelled';
  trigger?: {
    nodeId: string;
    data: NodeExecutionData[];
  };
  nodes: Record<string, NodeExecutionContext>;  // Contextos de todos os nodes executados
  currentNodeId?: string;                       // Node sendo executado agora
}

// Tipos para acesso a dados de outros nodes
export interface NodeDataReference {
  nodeId?: string;                    // ID do node específico
  nodeName?: string;                  // Nome do node específico
  outputIndex?: number;               // Índice do output (para nodes com múltiplas saídas)
  itemIndex?: number;                 // Índice do item (para múltiplos items)
  jsonPath?: string;                  // Caminho no JSON (ex: "user.name")
}

// Funções utilitárias para acesso aos dados
export class WorkflowDataAccessor {
  constructor(private executionState: WorkflowExecutionState) {}

  // Acessar dados do node anterior (mais comum)
  getPreviousNodeData(currentNodeId: string): NodeExecutionData[] | null {
    const currentNode = this.executionState.nodes[currentNodeId];
    return currentNode?.inputData || null;
  }

  // Acessar dados de um node específico por ID
  getNodeDataById(nodeId: string): NodeExecutionContext | null {
    return this.executionState.nodes[nodeId] || null;
  }

  // Acessar dados de um node específico por nome
  getNodeDataByName(nodeName: string): NodeExecutionContext | null {
    const nodeEntry = Object.entries(this.executionState.nodes)
      .find(([_, context]) => context.nodeName === nodeName);
    return nodeEntry ? nodeEntry[1] : null;
  }

  // Obter todos os nodes ancestrais (que podem ser acessados)
  getAvailableAncestors(currentNodeId: string, nodes: Array<{id: string, data: any}>, edges: Array<{source: string, target: string}>): NodeExecutionContext[] {
    const ancestors: Set<string> = new Set();
    const visited: Set<string> = new Set();

    // Função recursiva para encontrar todos os ancestrais
    const findAncestors = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Encontrar nodes que conectam para este node
      const parentEdges = edges.filter(edge => edge.target === nodeId);
      for (const edge of parentEdges) {
        ancestors.add(edge.source);
        findAncestors(edge.source); // Recursão para encontrar ancestrais dos pais
      }
    };

    findAncestors(currentNodeId);

    // Retornar apenas os contextos que existem (foram executados)
    return Array.from(ancestors)
      .map(nodeId => this.executionState.nodes[nodeId])
      .filter(context => context && context.status !== 'skipped');
  }

  // Resolver referência de dados (formato n8n: $node["NodeName"].json.property)
  resolveDataReference(reference: NodeDataReference): any {
    let context: NodeExecutionContext | null = null;

    if (reference.nodeId) {
      context = this.getNodeDataById(reference.nodeId);
    } else if (reference.nodeName) {
      context = this.getNodeDataByName(reference.nodeName);
    }

    if (!context || !context.data || context.data.length === 0) {
      return null;
    }

    // Pegar o item correto (padrão: primeiro item)
    const itemIndex = reference.itemIndex || 0;
    const item = context.data[itemIndex];

    if (!item) return null;

    // Se não há jsonPath, retorna o item completo
    if (!reference.jsonPath) {
      return item.json;
    }

    // Navegar pelo jsonPath (ex: "user.name" -> item.json.user.name)
    return this.getNestedValue(item.json, reference.jsonPath);
  }

  // Utilitário para navegar em objetos aninhados
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  // Simular execução de um node (para desenvolvimento/teste)
  simulateNodeExecution(nodeId: string, inputData?: NodeExecutionData[]): NodeExecutionData[] {
    const node = this.executionState.nodes[nodeId];
    if (!node) return [];

    // Dados simulados baseados no tipo do node
    const nodeType = node.nodeName.toLowerCase();

    // === TRIGGERS - Eventos do mercado ===
    if (nodeType.includes('price') && nodeType.includes('trigger')) {
      const tokens = ['SOL', 'BTC', 'ETH', 'USDC', 'RAY', 'MNGO'];
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      const previousPrice = 80 + Math.random() * 40; // 80-120
      const changePercent = (Math.random() - 0.5) * 20; // -10% a +10%
      const currentPrice = previousPrice * (1 + changePercent / 100);
      const now = new Date();
      const lastUpdate = new Date(now.getTime() - Math.random() * 60000); // até 1 min atrás

      return [{
        json: {
          // Informações do token
          token: token,
          tokenName: `${token} Token`,
          mint: `${token.toLowerCase()}mint${Math.random().toString(36).substr(2, 9)}`,

          // Dados de preço
          currentPrice: Number(currentPrice.toFixed(6)),
          previousPrice: Number(previousPrice.toFixed(6)),
          changeAmount: Number((currentPrice - previousPrice).toFixed(6)),
          changePercent: Number(changePercent.toFixed(2)),

          // Dados de mercado
          volume24h: Math.floor(Math.random() * 10000000) + 1000000,
          marketCap: Math.floor(Math.random() * 50000000000) + 10000000000,
          high24h: Number((currentPrice * (1 + Math.random() * 0.15)).toFixed(6)),
          low24h: Number((currentPrice * (1 - Math.random() * 0.15)).toFixed(6)),

          // Dados de tempo
          triggerTime: now.toISOString(),
          lastUpdate: lastUpdate.toISOString(),
          timestamp: now.getTime(),

          // Dados de liquidez
          liquidity: Math.floor(Math.random() * 5000000) + 500000,
          holders: Math.floor(Math.random() * 10000) + 1000,

          // Metadados
          source: 'Jupiter API',
          exchange: 'Raydium',
          pair: `${token}/USDC`,
          confidence: 0.95 + Math.random() * 0.05
        }
      }];
    }

    if (nodeType.includes('volume') && nodeType.includes('trigger')) {
      const currentVolume = Math.floor(Math.random() * 10000000) + 1000000;
      const previousVolume = Math.floor(Math.random() * 8000000) + 500000;

      return [{
        json: {
          token: 'SOL',
          currentVolume: currentVolume,
          previousVolume: previousVolume,
          volumeChange: currentVolume - previousVolume,
          volumeChangePercent: Number(((currentVolume - previousVolume) / previousVolume * 100).toFixed(2)),
          volumeMA7: Math.floor(Math.random() * 6000000) + 2000000,
          volumeMA30: Math.floor(Math.random() * 5000000) + 1500000,
          triggerTime: new Date().toISOString(),
          timeframe: '1h',
          threshold: 5000000,
          triggered: currentVolume > 5000000
        }
      }];
    }

    if (nodeType.includes('time') && nodeType.includes('trigger')) {
      const now = new Date();
      return [{
        json: {
          triggerTime: now.toISOString(),
          scheduledTime: new Date(now.getTime() - 1000).toISOString(),
          interval: '5m',
          executionCount: Math.floor(Math.random() * 100) + 1,
          nextExecution: new Date(now.getTime() + 300000).toISOString(), // +5min
          timezone: 'UTC',
          cron: '*/5 * * * *',
          delay: Math.floor(Math.random() * 100), // ms de delay
          accurate: true
        }
      }];
    }

    // === CONDITIONS - Lógica de decisão ===
    if (nodeType.includes('condition')) {
      const inputPrice = inputData?.[0]?.json?.currentPrice || 89.45;
      const threshold = 80 + Math.random() * 40;
      const multiple = inputPrice / threshold;
      const conditionMet = multiple > 2.0;

      return [{
        json: {
          // Resultado da condição
          conditionMet: conditionMet,

          // Valores de entrada
          inputPrice: inputPrice,
          inputToken: inputData?.[0]?.json?.token || 'SOL',

          // Parâmetros da condição
          threshold: Number(threshold.toFixed(6)),
          multiple: Number(multiple.toFixed(3)),
          operator: 'greater_than',
          targetMultiple: 2.0,

          // Análise
          difference: Number((inputPrice - threshold).toFixed(6)),
          percentageDiff: Number(((inputPrice - threshold) / threshold * 100).toFixed(2)),

          // Metadados
          evaluatedAt: new Date().toISOString(),
          evaluationTime: Math.random() * 10 + 1, // ms
          confidence: 0.98,

          // Dados de entrada preservados
          originalInput: inputData?.[0]?.json || {},
          inputSource: inputData?.[0]?.json ? 'previous_node' : 'default'
        }
      }];
    }

    // === ACTIONS - Execução de operações ===
    if (nodeType.includes('sell') || nodeType.includes('buy') || nodeType.includes('action')) {
      const iseSell = nodeType.includes('sell');
      const inputToken = inputData?.[0]?.json?.token || 'SOL';
      const inputPrice = inputData?.[0]?.json?.currentPrice || 89.45;
      const amount = 0.1 + Math.random() * 2; // 0.1 - 2.1
      const slippagePercent = Math.random() * 1; // 0-1%
      const actualPrice = inputPrice * (1 + (iseSell ? -1 : 1) * slippagePercent / 100);

      return [{
        json: {
          // Informações da transação
          actionType: iseSell ? 'sell' : 'buy',
          actionExecuted: true,
          transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          blockNumber: 150000000 + Math.floor(Math.random() * 1000000),

          // Detalhes da operação
          token: inputToken,
          amount: Number(amount.toFixed(6)),
          requestedPrice: Number(inputPrice.toFixed(6)),
          executedPrice: Number(actualPrice.toFixed(6)),

          // Custos e slippage
          slippageRequested: 1.0, // 1%
          slippageActual: Number(slippagePercent.toFixed(3)),
          fees: {
            network: Number((0.000005 * Math.random()).toFixed(9)), // SOL
            exchange: Number((actualPrice * amount * 0.0025).toFixed(6)), // 0.25%
            total: Number((actualPrice * amount * 0.003).toFixed(6))
          },

          // Valores calculados
          totalValue: Number((actualPrice * amount).toFixed(6)),
          netReceived: Number((actualPrice * amount * 0.997).toFixed(6)), // após fees

          // Timing
          requestTime: new Date().toISOString(),
          executionTime: new Date(Date.now() + Math.random() * 3000).toISOString(),
          processingTimeMs: Math.floor(Math.random() * 3000 + 500),

          // Status e confirmação
          status: 'confirmed',
          confirmations: Math.floor(Math.random() * 10) + 1,
          exchange: 'Jupiter',
          route: ['Raydium', 'Orca'],

          // Context preservation
          triggerData: inputData?.[0]?.json || {},
          executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      }];
    }

    if (nodeType.includes('notification') || nodeType.includes('alert')) {
      return [{
        json: {
          messageType: 'trading_alert',
          message: 'Trade executed successfully',
          channels: ['telegram', 'discord'],
          status: 'delivered',

          // Detalhes da notificação
          recipients: ['@user123'],
          deliveryTime: new Date().toISOString(),
          deliveryTimeMs: Math.floor(Math.random() * 1000 + 100),

          // Conteúdo
          title: 'Trading Bot Alert',
          content: inputData?.[0]?.json ?
            `${inputData[0].json.actionType?.toUpperCase()} executed: ${inputData[0].json.amount} ${inputData[0].json.token} at $${inputData[0].json.executedPrice}` :
            'Notification sent successfully',

          // Status de entrega
          telegramStatus: 'sent',
          discordStatus: 'sent',
          webhookStatus: 'delivered',

          // Metadados
          priority: 'high',
          retries: 0,
          inputContext: inputData?.[0]?.json || {}
        }
      }];
    }

    // === UTILITIES - Ferramentas auxiliares ===
    if (nodeType.includes('log')) {
      return [{
        json: {
          logLevel: 'info',
          message: inputData?.[0]?.json ?
            `Processed data from ${inputData[0].json.token || 'unknown'} token` :
            'Log entry created',

          // Detalhes do log
          timestamp: new Date().toISOString(),
          nodeId: nodeId,
          executionId: this.executionState.executionId,

          // Contexto
          inputData: inputData?.[0]?.json || {},
          dataSize: JSON.stringify(inputData?.[0]?.json || {}).length,

          // Performance
          processingTime: Math.random() * 10 + 1,
          memoryUsage: Math.floor(Math.random() * 100) + 50, // MB

          // Classificação
          category: 'workflow_execution',
          tags: ['trading', 'automation', 'workflow'],
          indexed: true,
          searchable: true
        }
      }];
    }

    if (nodeType.includes('delay') || nodeType.includes('wait')) {
      const delayMs = 1000 + Math.random() * 5000; // 1-6s
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + delayMs);

      return [{
        json: {
          delayType: 'fixed_time',
          requestedDelay: delayMs,
          actualDelay: delayMs + Math.random() * 100 - 50, // ±50ms variação

          // Timing
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),

          // Estado
          completed: true,
          accuracy: 99.5 + Math.random() * 0.5, // %

          // Context passthrough
          inputData: inputData?.[0]?.json || {},
          passthrough: true,
          preservedFields: inputData?.[0]?.json ? Object.keys(inputData[0].json).length : 0
        }
      }];
    }

    if (nodeType.includes('calculate') || nodeType.includes('math')) {
      const inputValue = inputData?.[0]?.json?.currentPrice || 100;
      const operation = 'percentage_increase';
      const result = inputValue * 1.05; // 5% increase

      return [{
        json: {
          operation: operation,
          formula: 'value * 1.05',

          // Inputs
          inputValue: inputValue,
          inputType: typeof inputValue,
          parameters: { multiplier: 1.05 },

          // Output
          result: Number(result.toFixed(6)),
          resultType: 'number',

          // Metadata
          calculationTime: Math.random() * 5 + 0.1, // ms
          precision: 6,
          mathLibrary: 'JavaScript Math',

          // Context
          originalInput: inputData?.[0]?.json || {},
          calculatedAt: new Date().toISOString()
        }
      }];
    }

    // === DEFAULT - Fallback genérico ===
    return [{
      json: {
        processed: true,
        nodeType: nodeType,
        result: 'Operation completed successfully',

        // Timing
        executionTime: Math.random() * 100 + 50,
        timestamp: new Date().toISOString(),

        // Input preservation
        inputReceived: inputData?.[0]?.json || {},
        inputKeys: inputData?.[0]?.json ? Object.keys(inputData[0].json) : [],

        // Metadata
        success: true,
        errors: [],
        warnings: [],
        nodeId: nodeId
      }
    }];
  }
}

// Simulador de execução de workflow para desenvolvimento
export function createMockExecutionState(workflowId: string): WorkflowExecutionState {
  const executionId = `exec_${Date.now()}`;

  return {
    workflowId,
    executionId,
    startTime: new Date().toISOString(),
    status: 'running',
    nodes: {},
    itemsProcessed: 0
  } as WorkflowExecutionState;
}

// Utilitários para formatação de referências
export function formatNodeReference(nodeName: string, jsonPath?: string, itemIndex?: number): string {
  const itemRef = itemIndex !== undefined && itemIndex > 0 ? `[${itemIndex}]` : '';
  const pathRef = jsonPath ? `.${jsonPath}` : '';
  return `{{ $node["${nodeName}"]${itemRef}.json${pathRef} }}`;
}

export function parseNodeReference(reference: string): NodeDataReference | null {
  // Parse formato: {{ $node["NodeName"][0].json.property }}
  const match = reference.match(/\{\{\s*\$node\["([^"]+)"\](?:\[(\d+)\])?\.json(?:\.([^\s}]+))?\s*\}\}/);

  if (!match) {
    // Tentar formato simples: {{ $json.property }}
    const simpleMatch = reference.match(/\{\{\s*\$json(?:\.([^\s}]+))?\s*\}\}/);
    if (simpleMatch) {
      return {
        jsonPath: simpleMatch[1]
      };
    }
    return null;
  }

  return {
    nodeName: match[1],
    itemIndex: match[2] ? parseInt(match[2]) : 0,
    jsonPath: match[3]
  };
}