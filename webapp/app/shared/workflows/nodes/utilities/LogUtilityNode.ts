// Node Utility - Log de Sistema

import { BaseUtilityNode, NodePort } from '../base/BaseWorkflowNode';
import { RegisterNode } from '../registry/NodeRegistry';
import { WorkflowExecutionContext } from '../../types/workflow.types';

@RegisterNode
export class LogUtilityNode extends BaseUtilityNode {
  readonly nodeType = 'util-log';
  readonly name = 'Log';
  readonly description = 'Registra mensagens no sistema de logs';
  readonly icon = '📝';
  readonly color = '#6B7280';

  getInputPorts(): NodePort[] {
    return [
      {
        id: 'execution',
        name: 'Registrar Log',
        type: 'execution',
        required: true,
        description: 'Dispara o registro da mensagem'
      },
      {
        id: 'custom-message',
        name: 'Mensagem Personalizada',
        type: 'data',
        dataType: 'string',
        required: false,
        description: 'Mensagem personalizada (sobrescreve configuração)'
      },
      {
        id: 'data-to-log',
        name: 'Dados para Incluir',
        type: 'data',
        dataType: 'object',
        required: false,
        description: 'Dados adicionais para incluir no log'
      },
      {
        id: 'log-level',
        name: 'Nível Personalizado',
        type: 'data',
        dataType: 'string',
        required: false,
        description: 'Nível de log personalizado (info, warn, error, success)'
      }
    ];
  }

  getOutputPorts(): NodePort[] {
    return [
      {
        id: 'execution',
        name: 'Continuar',
        type: 'execution',
        description: 'Continua execução após logging'
      },
      {
        id: 'log-entry',
        name: 'Entrada de Log',
        type: 'data',
        dataType: 'object',
        description: 'Dados da entrada de log criada'
      },
      {
        id: 'formatted-message',
        name: 'Mensagem Formatada',
        type: 'data',
        dataType: 'string',
        description: 'Mensagem final que foi registrada'
      }
    ];
  }

  getDefaultData() {
    return {
      message: 'Checkpoint do workflow', // Mensagem padrão
      level: 'info', // 'info', 'warn', 'error', 'success'
      includePositionData: true, // Incluir dados da posição no log
      includeTimestamp: true, // Incluir timestamp
      includeWorkflowInfo: true, // Incluir info do workflow
      includeNodePath: false, // Incluir caminho dos nodes executados
      formatAsJson: false, // Se true, formata dados como JSON
      logToConsole: true, // Se deve logar no console também
      logToFile: false, // Se deve salvar em arquivo
      maxDataLength: 1000 // Tamanho máximo dos dados incluídos
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ) {
    try {
      // Obter parâmetros (inputs personalizados têm prioridade)
      const message = inputs['custom-message'] || this.data.message;
      const level = inputs['log-level'] || this.data.level;
      const additionalData = inputs['data-to-log'];

      // Construir entrada de log
      const logEntry = await this.buildLogEntry(message, level, additionalData, context);

      // Registrar no sistema
      await this.writeLog(logEntry);

      const outputs = {
        execution: true,
        'log-entry': logEntry,
        'formatted-message': logEntry.formattedMessage
      };

      return this.createSuccessResult(outputs, [
        this.log('info', `Log registrado: [${level.toUpperCase()}] ${message}`)
      ]);

    } catch (error) {
      return this.createErrorResult(
        `Erro ao registrar log: ${error}`,
        [this.log('error', `Falha no logging: ${error}`)]
      );
    }
  }

  private async buildLogEntry(
    message: string,
    level: string,
    additionalData: any,
    context: WorkflowExecutionContext
  ): Promise<any> {
    const timestamp = new Date().toISOString();
    const logEntry: any = {
      timestamp,
      level: level.toUpperCase(),
      message,
      nodeId: this.id,
      nodeName: this.name,
      nodeType: this.nodeType,
      workflowId: context.workflowId,
      executionId: context.executionId
    };

    // Incluir informações do workflow se configurado
    if (this.data.includeWorkflowInfo) {
      logEntry.workflowInfo = {
        triggeredBy: context.triggeredBy,
        startedAt: context.startedAt
      };
    }

    // Incluir dados da posição se configurado e disponível
    if (this.data.includePositionData && context.position) {
      logEntry.positionData = this.sanitizeData(context.position);
    }

    // Incluir dados adicionais fornecidos
    if (additionalData) {
      logEntry.additionalData = this.sanitizeData(additionalData);
    }

    // Incluir variáveis do contexto se existirem
    if (context.variables && Object.keys(context.variables).length > 0) {
      logEntry.contextVariables = this.sanitizeData(context.variables);
    }

    // Formatar mensagem final
    logEntry.formattedMessage = this.formatMessage(logEntry);

    return logEntry;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    // Converter para string e truncar se necessário
    let dataStr = this.data.formatAsJson
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    if (dataStr.length > this.data.maxDataLength) {
      dataStr = dataStr.substring(0, this.data.maxDataLength) + '... [truncated]';
    }

    return this.data.formatAsJson ? dataStr : JSON.parse(dataStr);
  }

  private formatMessage(logEntry: any): string {
    let formatted = `[${logEntry.level}] ${logEntry.message}`;

    if (this.data.includeTimestamp) {
      formatted = `${logEntry.timestamp} ${formatted}`;
    }

    if (this.data.includeWorkflowInfo) {
      formatted += ` | Workflow: ${logEntry.workflowId}`;
    }

    // Adicionar dados da posição de forma resumida
    if (logEntry.positionData) {
      const pos = logEntry.positionData;
      if (pos.ticker && pos.currentPrice) {
        formatted += ` | ${pos.ticker}: $${pos.currentPrice}`;
      }
    }

    return formatted;
  }

  private async writeLog(logEntry: any): Promise<void> {
    // Log no console se configurado
    if (this.data.logToConsole) {
      this.consoleLog(logEntry.level, logEntry.formattedMessage);
    }

    // TODO: Integrar com sistema de logging do bot
    // Aqui seria integrado com o logger real do sistema
    console.log(`📝 [${logEntry.level}] ${logEntry.formattedMessage}`);

    // Log em arquivo se configurado (implementação futura)
    if (this.data.logToFile) {
      await this.writeToFile(logEntry);
    }

    // TODO: Emitir via WebSocket para interface web
    // Aqui emitiria o log via WebSocket para aparecer na interface
  }

  private consoleLog(level: string, message: string): void {
    const timestamp = new Date().toLocaleTimeString('pt-BR');

    switch (level.toLowerCase()) {
      case 'error':
        console.error(`🔴 ${timestamp} ${message}`);
        break;
      case 'warn':
        console.warn(`🟡 ${timestamp} ${message}`);
        break;
      case 'success':
        console.log(`🟢 ${timestamp} ${message}`);
        break;
      default:
        console.info(`🔵 ${timestamp} ${message}`);
    }
  }

  private async writeToFile(logEntry: any): Promise<void> {
    // TODO: Implementar escrita em arquivo
    // Seria útil para auditoria e debugging avançado
  }

  // Validação específica
  validate() {
    const result = super.validate();

    if (!this.data.message || this.data.message.trim() === '') {
      result.errors.push('Mensagem de log é obrigatória');
    }

    if (!['info', 'warn', 'error', 'success'].includes(this.data.level)) {
      result.errors.push('Nível de log deve ser info, warn, error ou success');
    }

    if (this.data.maxDataLength < 100) {
      result.warnings.push('Tamanho máximo de dados muito baixo pode truncar informações importantes');
    }

    if (!this.data.logToConsole && !this.data.logToFile) {
      result.warnings.push('Nenhuma saída de log configurada (console ou arquivo)');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }
}