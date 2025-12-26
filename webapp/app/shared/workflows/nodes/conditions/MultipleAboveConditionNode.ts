// Node Condition - Múltiplo Acima

import { BaseConditionNode, NodePort } from '../base/BaseWorkflowNode';
import { RegisterNode } from '../registry/NodeRegistry';
import { WorkflowExecutionContext } from '../../types/workflow.types';

@RegisterNode
export class MultipleAboveConditionNode extends BaseConditionNode {
  readonly nodeType = 'condition-multiple-above';
  readonly name = 'Múltiplo Acima';
  readonly description = 'Verifica se o múltiplo da posição está acima de um valor';
  readonly icon = '✖️';
  readonly color = '#8B5CF6';

  getInputPorts(): NodePort[] {
    return [
      {
        id: 'execution',
        name: 'Verificar',
        type: 'execution',
        required: true,
        description: 'Entrada para verificar a condição'
      },
      {
        id: 'position-data',
        name: 'Dados da Posição',
        type: 'data',
        dataType: 'object',
        required: false,
        description: 'Dados da posição para verificar (opcional se vem do contexto)'
      },
      {
        id: 'custom-multiple',
        name: 'Múltiplo Personalizado',
        type: 'data',
        dataType: 'number',
        required: false,
        description: 'Múltiplo personalizado para comparar (sobrescreve configuração)'
      }
    ];
  }

  getOutputPorts(): NodePort[] {
    return [
      {
        id: 'true',
        name: 'Múltiplo Atingido',
        type: 'execution',
        description: 'Executa se múltiplo for maior que o configurado'
      },
      {
        id: 'false',
        name: 'Múltiplo Não Atingido',
        type: 'execution',
        description: 'Executa se múltiplo for menor que o configurado'
      },
      {
        id: 'current-multiple',
        name: 'Múltiplo Atual',
        type: 'data',
        dataType: 'number',
        description: 'Valor do múltiplo atual da posição'
      },
      {
        id: 'target-multiple',
        name: 'Múltiplo Alvo',
        type: 'data',
        dataType: 'number',
        description: 'Valor do múltiplo que está sendo comparado'
      }
    ];
  }

  getDefaultData() {
    return {
      minMultiple: 2.0, // Múltiplo mínimo para considerar verdadeiro
      basePrice: 'entry', // 'entry', 'lowest', 'highest'
      includeUnrealized: true, // Incluir ganhos não realizados
      precision: 2 // Casas decimais para comparação
    };
  }

  async evaluateCondition(
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<boolean> {
    // Obter dados da posição
    const positionData = inputs['position-data'] || context.position;

    if (!positionData) {
      throw new Error('Dados da posição não fornecidos');
    }

    // Obter múltiplo alvo (input personalizado tem prioridade)
    const targetMultiple = inputs['custom-multiple'] || this.data.minMultiple;

    // Calcular múltiplo atual
    const currentMultiple = this.calculateMultiple(positionData);

    // Arredondar para comparação precisa
    const roundedCurrent = Number(currentMultiple.toFixed(this.data.precision));
    const roundedTarget = Number(targetMultiple.toFixed(this.data.precision));

    console.log(`🔍 Verificando múltiplo: ${roundedCurrent}x >= ${roundedTarget}x`);

    return roundedCurrent >= roundedTarget;
  }

  private calculateMultiple(positionData: any): number {
    const { basePrice } = this.data;
    const currentPrice = positionData.currentPrice || 0;

    let comparePrice: number;

    switch (basePrice) {
      case 'entry':
        comparePrice = positionData.entryPrice || positionData.entryUsd || 0;
        break;
      case 'lowest':
        comparePrice = positionData.lowestPrice || positionData.entryPrice || 0;
        break;
      case 'highest':
        comparePrice = positionData.highestPrice || positionData.entryPrice || 0;
        break;
      default:
        comparePrice = positionData.entryPrice || 0;
    }

    if (comparePrice <= 0) {
      throw new Error('Preço de comparação inválido');
    }

    return currentPrice / comparePrice;
  }

  // Override do execute para fornecer dados adicionais nas saídas
  async execute(
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ) {
    try {
      const positionData = inputs['position-data'] || context.position;
      const targetMultiple = inputs['custom-multiple'] || this.data.minMultiple;

      const currentMultiple = this.calculateMultiple(positionData);
      const result = await this.evaluateCondition(inputs, context);

      const outputs: Record<string, any> = {
        [result ? 'true' : 'false']: true,
        'current-multiple': currentMultiple,
        'target-multiple': targetMultiple
      };

      return this.createSuccessResult(outputs, [
        this.log('info', `Múltiplo: ${currentMultiple.toFixed(3)}x ${result ? '>=' : '<'} ${targetMultiple}x`)
      ]);
    } catch (error) {
      return this.createErrorResult(
        `Erro ao verificar múltiplo: ${error}`,
        [this.log('error', `Falha na verificação: ${error}`)]
      );
    }
  }

  // Validação específica
  validate() {
    const result = super.validate();

    if (this.data.minMultiple <= 0) {
      result.errors.push('Múltiplo mínimo deve ser maior que 0');
    }

    if (this.data.minMultiple < 1 && this.data.basePrice === 'entry') {
      result.warnings.push('Múltiplo menor que 1x indica perda');
    }

    if (!['entry', 'lowest', 'highest'].includes(this.data.basePrice)) {
      result.errors.push('Preço base deve ser entry, lowest ou highest');
    }

    if (this.data.precision < 0 || this.data.precision > 8) {
      result.errors.push('Precisão deve estar entre 0 e 8 casas decimais');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }
}