// Node Trigger - Mudança de Preço

import { BaseTriggerNode, NodePort } from '../base/BaseWorkflowNode';
import { RegisterNode } from '../registry/NodeRegistry';
import { WorkflowExecutionContext } from '../../types/workflow.types';

@RegisterNode
export class PriceChangeTriggerNode extends BaseTriggerNode {
  readonly nodeType = 'trigger-price-change';
  readonly name = 'Mudança de Preço';
  readonly description = 'Dispara quando o preço de uma moeda muda em X%';
  readonly icon = '📈';
  readonly color = '#10B981';

  private intervalId?: NodeJS.Timeout;
  private lastPrices: Map<string, number> = new Map();
  private isListening = false;

  getOutputPorts(): NodePort[] {
    return [
      {
        id: 'execution',
        name: 'Quando Ativado',
        type: 'execution',
        description: 'Dispara quando mudança de preço é detectada'
      },
      {
        id: 'position-data',
        name: 'Dados da Posição',
        type: 'data',
        dataType: 'object',
        description: 'Informações da posição que sofreu mudança'
      },
      {
        id: 'price-change',
        name: 'Mudança %',
        type: 'data',
        dataType: 'number',
        description: 'Percentual de mudança detectado'
      }
    ];
  }

  getDefaultData() {
    return {
      mint: '', // Se vazio, monitora todas as posições
      changePercentage: 5, // % de mudança para disparar
      direction: 'both', // 'up', 'down', 'both'
      timeframe: 60, // Intervalo de verificação em segundos
      minValue: 0 // Valor mínimo da posição para monitorar
    };
  }

  async startListening(context: WorkflowExecutionContext): Promise<void> {
    if (this.isListening) {
      await this.stopListening();
    }

    this.isListening = true;
    const timeframe = this.data.timeframe * 1000; // Converter para ms

    console.log(`🎯 Trigger iniciado: ${this.name} [${this.id}] - Verificando a cada ${this.data.timeframe}s`);

    this.intervalId = setInterval(async () => {
      try {
        await this.checkPriceChanges(context);
      } catch (error) {
        console.error(`❌ Erro no trigger ${this.id}:`, error);
      }
    }, timeframe);

    // Primeira verificação imediata
    setTimeout(() => this.checkPriceChanges(context), 1000);
  }

  async stopListening(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isListening = false;
    this.lastPrices.clear();
    console.log(`🛑 Trigger parado: ${this.name} [${this.id}]`);
  }

  async execute(inputs: Record<string, any>, context: WorkflowExecutionContext) {
    // Triggers são executados automaticamente, não via inputs
    return this.createSuccessResult({
      execution: true
    }, [
      this.log('info', 'Trigger de mudança de preço executado')
    ]);
  }

  private async checkPriceChanges(context: WorkflowExecutionContext): Promise<void> {
    try {
      // Aqui faria a integração com o serviço de posições
      // Por agora, vamos simular dados de posição
      const positions = await this.getPositionsToMonitor();

      for (const position of positions) {
        const currentPrice = position.currentPrice || 0;
        const mint = position.mint;

        if (currentPrice <= 0) continue;

        const lastPrice = this.lastPrices.get(mint);

        if (lastPrice) {
          const changePercent = ((currentPrice - lastPrice) / lastPrice) * 100;
          const absChange = Math.abs(changePercent);

          // Verifica se a mudança atende aos critérios
          if (this.shouldTrigger(changePercent, absChange)) {
            console.log(`🔥 Trigger ativado! ${position.ticker}: ${changePercent.toFixed(2)}%`);

            // Aqui emitiria evento para o workflow engine
            await this.emitTrigger(context, {
              position,
              priceChange: changePercent,
              oldPrice: lastPrice,
              newPrice: currentPrice
            });
          }
        }

        this.lastPrices.set(mint, currentPrice);
      }
    } catch (error) {
      console.error(`❌ Erro ao verificar mudanças de preço:`, error);
    }
  }

  private shouldTrigger(changePercent: number, absChange: number): boolean {
    const { changePercentage, direction } = this.data;

    if (absChange < changePercentage) return false;

    switch (direction) {
      case 'up':
        return changePercent > 0;
      case 'down':
        return changePercent < 0;
      case 'both':
        return true;
      default:
        return true;
    }
  }

  private async getPositionsToMonitor(): Promise<any[]> {
    // TODO: Integrar com serviço real de posições
    // Por agora retorna dados mock
    return [
      {
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        ticker: 'USDC',
        currentPrice: 100.5,
        entryPrice: 100,
        entryUsd: 1000
      }
    ];
  }

  private async emitTrigger(context: WorkflowExecutionContext, data: any): Promise<void> {
    // TODO: Integrar com o workflow engine para executar nodes conectados
    console.log(`🚀 Emitindo trigger para workflow ${context.workflowId}:`, data);
  }

  // Override para validação específica
  validate() {
    const result = super.validate();

    if (this.data.changePercentage <= 0) {
      result.errors.push('Porcentagem de mudança deve ser maior que 0');
    }

    if (this.data.timeframe < 5) {
      result.warnings.push('Timeframe muito baixo pode causar muitos triggers');
    }

    if (!['up', 'down', 'both'].includes(this.data.direction)) {
      result.errors.push('Direção deve ser up, down ou both');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }
}