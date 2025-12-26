// Node Action - Vender Porcentagem

import { BaseActionNode, NodePort } from '../base/BaseWorkflowNode';
import { RegisterNode } from '../registry/NodeRegistry';
import { WorkflowExecutionContext } from '../../types/workflow.types';

@RegisterNode
export class SellPercentageActionNode extends BaseActionNode {
  readonly nodeType = 'action-sell-percentage';
  readonly name = 'Vender %';
  readonly description = 'Vende uma porcentagem específica da posição';
  readonly icon = '💰';
  readonly color = '#10B981';

  getInputPorts(): NodePort[] {
    return [
      {
        id: 'execution',
        name: 'Executar Venda',
        type: 'execution',
        required: true,
        description: 'Dispara a execução da venda'
      },
      {
        id: 'position-data',
        name: 'Dados da Posição',
        type: 'data',
        dataType: 'object',
        required: false,
        description: 'Dados da posição para vender (opcional se vem do contexto)'
      },
      {
        id: 'custom-percentage',
        name: 'Porcentagem Personalizada',
        type: 'data',
        dataType: 'number',
        required: false,
        description: 'Porcentagem personalizada para vender (sobrescreve configuração)'
      },
      {
        id: 'custom-price',
        name: 'Preço Personalizado',
        type: 'data',
        dataType: 'number',
        required: false,
        description: 'Preço específico para venda limit (sobrescreve configuração)'
      }
    ];
  }

  getOutputPorts(): NodePort[] {
    return [
      {
        id: 'success',
        name: 'Venda Bem-sucedida',
        type: 'execution',
        description: 'Executa se a venda foi realizada com sucesso'
      },
      {
        id: 'error',
        name: 'Erro na Venda',
        type: 'execution',
        description: 'Executa se a venda falhou'
      },
      {
        id: 'partial',
        name: 'Venda Parcial',
        type: 'execution',
        description: 'Executa se apenas parte foi vendida'
      },
      {
        id: 'transaction-data',
        name: 'Dados da Transação',
        type: 'data',
        dataType: 'object',
        description: 'Informações detalhadas da transação'
      },
      {
        id: 'remaining-balance',
        name: 'Saldo Restante',
        type: 'data',
        dataType: 'number',
        description: 'Quantidade restante após a venda'
      }
    ];
  }

  getDefaultData() {
    return {
      percentage: 25, // Porcentagem a vender (1-100)
      priceType: 'market', // 'market' ou 'limit'
      limitPrice: 0, // Preço limit (se priceType = 'limit')
      slippage: 1, // Slippage tolerado (%)
      timeout: 30, // Timeout em segundos
      retryAttempts: 3, // Tentativas em caso de falha
      requireConfirmation: false, // Se deve aguardar confirmação blockchain
      minSellAmount: 0.001 // Valor mínimo para executar venda
    };
  }

  async performAction(
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<any> {
    // Obter dados da posição
    const positionData = inputs['position-data'] || context.position;

    if (!positionData) {
      throw new Error('Dados da posição não fornecidos para venda');
    }

    // Obter parâmetros (inputs personalizados têm prioridade)
    const sellPercentage = inputs['custom-percentage'] || this.data.percentage;
    const customPrice = inputs['custom-price'];

    // Validar parâmetros
    this.validateSellParameters(sellPercentage, positionData);

    // Calcular quantidade a vender
    const totalBalance = positionData.balance || positionData.amount || 0;
    const sellAmount = (totalBalance * sellPercentage) / 100;

    if (sellAmount < this.data.minSellAmount) {
      throw new Error(`Quantidade muito pequena para vender: ${sellAmount}`);
    }

    console.log(`💰 Iniciando venda: ${sellPercentage}% (${sellAmount.toFixed(6)}) de ${positionData.ticker}`);

    // Executar venda
    const transactionData = await this.executeSale({
      mint: positionData.mint,
      amount: sellAmount,
      percentage: sellPercentage,
      priceType: this.data.priceType,
      limitPrice: customPrice || this.data.limitPrice,
      slippage: this.data.slippage,
      timeout: this.data.timeout
    });

    return {
      transactionData,
      soldAmount: sellAmount,
      soldPercentage: sellPercentage,
      remainingBalance: totalBalance - sellAmount,
      executedAt: new Date().toISOString()
    };
  }

  private validateSellParameters(percentage: number, positionData: any): void {
    if (percentage <= 0 || percentage > 100) {
      throw new Error('Porcentagem deve estar entre 1 e 100');
    }

    if (!positionData.mint) {
      throw new Error('Mint da posição não encontrado');
    }

    const balance = positionData.balance || positionData.amount || 0;
    if (balance <= 0) {
      throw new Error('Saldo insuficiente para venda');
    }
  }

  private async executeSale(params: {
    mint: string;
    amount: number;
    percentage: number;
    priceType: string;
    limitPrice?: number;
    slippage: number;
    timeout: number;
  }): Promise<any> {
    // Simulação de venda - aqui integraria com Jupiter/trading service
    console.log(`🔄 Executando venda via ${params.priceType}:`, {
      mint: params.mint,
      amount: params.amount,
      slippage: `${params.slippage}%`
    });

    // Simular delay de transação
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simular sucesso/falha baseado em probabilidade
    const success = Math.random() > 0.1; // 90% sucesso

    if (!success) {
      throw new Error('Falha na transação blockchain');
    }

    // Dados simulados da transação
    return {
      signature: `${Math.random().toString(36).substr(2, 16)}`,
      status: 'confirmed',
      amountSold: params.amount,
      priceExecuted: params.priceType === 'market' ? 100.5 : params.limitPrice,
      fee: params.amount * 0.0025, // 0.25% fee
      slippageUsed: Math.random() * params.slippage,
      blockHash: `${Math.random().toString(36).substr(2, 20)}`,
      timestamp: new Date().toISOString()
    };
  }

  // Override do execute para lidar com diferentes saídas
  async execute(
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ) {
    try {
      const result = await this.performAction(inputs, context);

      // Determinar tipo de sucesso
      const soldPercentage = result.soldPercentage;
      const isPartial = soldPercentage < (inputs['custom-percentage'] || this.data.percentage);

      const outputType = isPartial ? 'partial' : 'success';

      const outputs: Record<string, any> = {
        [outputType]: true,
        'transaction-data': result.transactionData,
        'remaining-balance': result.remainingBalance
      };

      return this.createSuccessResult(outputs, [
        this.log('success', `Venda executada: ${soldPercentage}% - Sig: ${result.transactionData?.signature}`)
      ]);

    } catch (error) {
      return this.createSuccessResult({
        error: true,
        errorMessage: String(error)
      }, [
        this.log('error', `Falha na venda: ${error}`)
      ]);
    }
  }

  // Validação específica
  validate() {
    const result = super.validate();

    if (this.data.percentage <= 0 || this.data.percentage > 100) {
      result.errors.push('Porcentagem deve estar entre 1 e 100');
    }

    if (!['market', 'limit'].includes(this.data.priceType)) {
      result.errors.push('Tipo de preço deve ser market ou limit');
    }

    if (this.data.priceType === 'limit' && this.data.limitPrice <= 0) {
      result.errors.push('Preço limit deve ser maior que 0');
    }

    if (this.data.slippage < 0 || this.data.slippage > 50) {
      result.errors.push('Slippage deve estar entre 0% e 50%');
    }

    if (this.data.timeout < 5 || this.data.timeout > 300) {
      result.warnings.push('Timeout recomendado entre 5 e 300 segundos');
    }

    if (this.data.percentage < 5) {
      result.warnings.push('Porcentagem muito baixa pode não ser eficiente');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }
}