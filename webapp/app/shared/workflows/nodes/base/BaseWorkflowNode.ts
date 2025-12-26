// Classe Base para todos os Nodes do Workflow

import { WorkflowExecutionContext } from '../../types/workflow.types';

export interface NodePort {
  id: string;
  name: string;
  type: 'execution' | 'data' | 'condition';
  required?: boolean;
  dataType?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  description?: string;
}

export interface NodeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface NodeExecutionResult {
  success: boolean;
  outputs: Record<string, any>;
  error?: string;
  logs?: Array<{
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
    timestamp: string;
  }>;
}

export abstract class BaseWorkflowNode {
  abstract readonly nodeType: string;
  abstract readonly category: 'trigger' | 'condition' | 'action' | 'utility';
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly icon: string;
  abstract readonly color: string;

  protected data: Record<string, any> = {};
  protected position: { x: number; y: number } = { x: 0, y: 0 };
  protected id: string;

  constructor(id: string, data: Record<string, any> = {}, position?: { x: number; y: number }) {
    this.id = id;
    this.data = { ...this.getDefaultData(), ...data };
    if (position) this.position = position;
  }

  // === MÉTODOS ABSTRATOS (devem ser implementados por cada node) ===

  /**
   * Define as entradas que este node aceita
   */
  abstract getInputPorts(): NodePort[];

  /**
   * Define as saídas que este node produz
   */
  abstract getOutputPorts(): NodePort[];

  /**
   * Dados padrão para este tipo de node
   */
  abstract getDefaultData(): Record<string, any>;

  /**
   * Executa a lógica principal do node
   */
  abstract execute(
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult>;

  // === MÉTODOS COMUNS (podem ser sobrescritos se necessário) ===

  /**
   * Valida a configuração do node
   */
  validate(): NodeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validação básica - pode ser sobrescrita
    const inputs = this.getInputPorts();
    for (const input of inputs) {
      if (input.required && input.type === 'data') {
        const value = this.data[input.id];
        if (value === undefined || value === null || value === '') {
          errors.push(`Campo obrigatório '${input.name}' não preenchido`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Prepara dados para serialização
   */
  serialize() {
    return {
      id: this.id,
      type: this.nodeType,
      name: this.name,
      description: this.description,
      position: this.position,
      data: this.data,
      inputs: this.getInputPorts(),
      outputs: this.getOutputPorts()
    };
  }

  /**
   * Carrega dados de serialização
   */
  deserialize(serializedData: any) {
    this.position = serializedData.position || { x: 0, y: 0 };
    this.data = { ...this.getDefaultData(), ...(serializedData.data || {}) };
  }

  /**
   * Clona o node
   */
  clone(newId: string): BaseWorkflowNode {
    const NodeClass = this.constructor as new (id: string, data: any, position: any) => BaseWorkflowNode;
    return new NodeClass(newId, this.data, this.position);
  }

  // === GETTERS/SETTERS ===

  getId(): string {
    return this.id;
  }

  getData(): Record<string, any> {
    return { ...this.data };
  }

  setData(data: Record<string, any>): void {
    this.data = { ...this.getDefaultData(), ...data };
  }

  updateData(updates: Record<string, any>): void {
    this.data = { ...this.data, ...updates };
  }

  getPosition(): { x: number; y: number } {
    return { ...this.position };
  }

  setPosition(position: { x: number; y: number }): void {
    this.position = position;
  }

  // === HELPERS PROTEGIDOS ===

  protected log(level: 'info' | 'warn' | 'error' | 'success', message: string) {
    return {
      level,
      message,
      timestamp: new Date().toISOString()
    };
  }

  protected createSuccessResult(outputs: Record<string, any> = {}, logs: any[] = []): NodeExecutionResult {
    return {
      success: true,
      outputs,
      logs
    };
  }

  protected createErrorResult(error: string, logs: any[] = []): NodeExecutionResult {
    return {
      success: false,
      outputs: {},
      error,
      logs
    };
  }

  /**
   * Valida tipos de entrada
   */
  protected validateInputTypes(inputs: Record<string, any>): string[] {
    const errors: string[] = [];
    const inputPorts = this.getInputPorts();

    for (const port of inputPorts) {
      if (!port.dataType || port.dataType === 'any') continue;

      const value = inputs[port.id];
      if (value === undefined || value === null) continue;

      const actualType = typeof value;

      if (port.dataType === 'array' && !Array.isArray(value)) {
        errors.push(`${port.name} deve ser um array`);
      } else if (port.dataType === 'object' && (actualType !== 'object' || Array.isArray(value))) {
        errors.push(`${port.name} deve ser um objeto`);
      } else if (port.dataType !== 'object' && port.dataType !== 'array' && actualType !== port.dataType) {
        errors.push(`${port.name} deve ser do tipo ${port.dataType}`);
      }
    }

    return errors;
  }
}

// === CLASSE BASE PARA TRIGGERS ===

export abstract class BaseTriggerNode extends BaseWorkflowNode {
  readonly category = 'trigger' as const;

  /**
   * Triggers só têm saídas, nunca entradas
   */
  getInputPorts(): NodePort[] {
    return []; // Triggers não têm entradas
  }

  /**
   * Saídas padrão de triggers (pode ser sobrescrito)
   */
  getOutputPorts(): NodePort[] {
    return [
      {
        id: 'execution',
        name: 'Quando Ativado',
        type: 'execution',
        description: 'Executa quando o trigger é ativado'
      }
    ];
  }

  /**
   * Método específico para inicializar o trigger
   */
  abstract startListening(context: WorkflowExecutionContext): Promise<void>;

  /**
   * Método específico para parar o trigger
   */
  abstract stopListening(): Promise<void>;
}

// === CLASSE BASE PARA CONDITIONS ===

export abstract class BaseConditionNode extends BaseWorkflowNode {
  readonly category = 'condition' as const;

  /**
   * Entradas padrão de condições (pode ser sobrescrito)
   */
  getInputPorts(): NodePort[] {
    return [
      {
        id: 'execution',
        name: 'Verificar',
        type: 'execution',
        required: true,
        description: 'Entrada para verificar a condição'
      }
    ];
  }

  /**
   * Saídas padrão de condições (pode ser sobrescrito)
   */
  getOutputPorts(): NodePort[] {
    return [
      {
        id: 'true',
        name: 'Verdadeiro',
        type: 'execution',
        description: 'Executa se condição for verdadeira'
      },
      {
        id: 'false',
        name: 'Falso',
        type: 'execution',
        description: 'Executa se condição for falsa'
      }
    ];
  }

  /**
   * Método específico para avaliar condição
   */
  abstract evaluateCondition(
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<boolean>;

  /**
   * Implementação padrão de execute para condições
   */
  async execute(
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const result = await this.evaluateCondition(inputs, context);

      return this.createSuccessResult({
        [result ? 'true' : 'false']: true
      }, [
        this.log('info', `Condição avaliada: ${result ? 'VERDADEIRA' : 'FALSA'}`)
      ]);
    } catch (error) {
      return this.createErrorResult(
        `Erro ao avaliar condição: ${error}`,
        [this.log('error', `Falha na avaliação: ${error}`)]
      );
    }
  }
}

// === CLASSE BASE PARA ACTIONS ===

export abstract class BaseActionNode extends BaseWorkflowNode {
  readonly category = 'action' as const;

  /**
   * Entradas padrão de ações (pode ser sobrescrito)
   */
  getInputPorts(): NodePort[] {
    return [
      {
        id: 'execution',
        name: 'Executar',
        type: 'execution',
        required: true,
        description: 'Entrada para executar a ação'
      }
    ];
  }

  /**
   * Saídas padrão de ações (pode ser sobrescrito)
   */
  getOutputPorts(): NodePort[] {
    return [
      {
        id: 'success',
        name: 'Sucesso',
        type: 'execution',
        description: 'Executa se ação foi bem-sucedida'
      },
      {
        id: 'error',
        name: 'Erro',
        type: 'execution',
        description: 'Executa se ação falhou'
      }
    ];
  }

  /**
   * Método específico para executar ação
   */
  abstract performAction(
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<any>;

  /**
   * Implementação padrão de execute para ações
   */
  async execute(
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const result = await this.performAction(inputs, context);

      return this.createSuccessResult({
        success: true,
        result
      }, [
        this.log('success', `Ação executada com sucesso`)
      ]);
    } catch (error) {
      return this.createSuccessResult({ // Note: não é erro para continuar o fluxo
        error: true,
        errorMessage: String(error)
      }, [
        this.log('error', `Falha na ação: ${error}`)
      ]);
    }
  }
}

// === CLASSE BASE PARA UTILITIES ===

export abstract class BaseUtilityNode extends BaseWorkflowNode {
  readonly category = 'utility' as const;

  /**
   * Entradas padrão de utilitários (pode ser sobrescrito)
   */
  getInputPorts(): NodePort[] {
    return [
      {
        id: 'execution',
        name: 'Executar',
        type: 'execution',
        required: true,
        description: 'Entrada para executar o utilitário'
      }
    ];
  }

  /**
   * Saídas padrão de utilitários (pode ser sobrescrito)
   */
  getOutputPorts(): NodePort[] {
    return [
      {
        id: 'execution',
        name: 'Continuar',
        type: 'execution',
        description: 'Continua a execução após utilitário'
      }
    ];
  }
}