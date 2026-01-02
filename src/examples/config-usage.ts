/**
 * Exemplos práticos de uso do ConfigManager
 * Demonstra como alterar configurações em tempo de execução
 */

import { configManager } from '../config/config-manager';
import { logger } from '../utils/logger';

// ================================
// EXEMPLO 1: ALTERAÇÃO SIMPLES
// ================================
export function exemploAlteracaoSimples() {
  console.log('\n=== EXEMPLO 1: Alteração Simples ===');

  // Obter valor atual
  const delayAtual = configManager.config.buyDelayMs;
  console.log('⏳ Delay atual:', delayAtual + 'ms');

  // Alterar delay para 10 segundos
  configManager.setConfig('buyDelayMs', 10000);
  console.log('⏳ Novo delay:', configManager.config.buyDelayMs + 'ms');

  // Alterar quantidade de compra
  configManager.setConfig('amountSol', 0.05);
  console.log('🎯 Nova quantidade:', configManager.config.amountSol + ' SOL');
}

// ================================
// EXEMPLO 2: ALTERAÇÕES MÚLTIPLAS
// ================================
export function exemploAlteracoesMultiplas() {
  console.log('\n=== EXEMPLO 2: Alterações Múltiplas ===');

  // Alterar várias configurações de uma vez
  configManager.updateConfig({
    buyDelayMs: 5000,
    amountSol: 0.20,
    slippageBps: 500,
    minScore: 5
  });

  console.log('✅ Configurações atualizadas:');
  console.log('  - Delay:', configManager.config.buyDelayMs + 'ms');
  console.log('  - Quantidade:', configManager.config.amountSol + ' SOL');
  console.log('  - Slippage:', configManager.config.slippageBps + ' bps');
  console.log('  - Score mínimo:', configManager.config.minScore);
}

// ================================
// EXEMPLO 3: SISTEMA DE CALLBACKS
// ================================
export function exemploCallbacks() {
  console.log('\n=== EXEMPLO 3: Sistema de Callbacks ===');

  // Callback para monitorar mudanças
  const callback = (key: string, oldValue: any, newValue: any) => {
    logger.info(`🔄 Config alterada: ${key} = ${oldValue} → ${newValue}`);
  };

  // Registrar callback
  configManager.onConfigChange(callback);
  console.log('📞 Callback registrado');

  // Fazer algumas mudanças (irá disparar o callback)
  configManager.setConfig('buyDelayMs', 2000);
  configManager.setConfig('minScore', 8);

  // Remover callback
  configManager.offConfigChange(callback);
  console.log('📞 Callback removido');

  // Esta mudança não irá disparar o callback
  configManager.setConfig('buyDelayMs', 3000);
  console.log('⭕ Última mudança não disparou callback');
}

// ================================
// EXEMPLO 4: ALTERAÇÃO DE ESTÁGIOS
// ================================
export function exemploEstagios() {
  console.log('\n=== EXEMPLO 4: Alteração de Estágios ===');

  console.log('📊 Estágios atuais:');
  configManager.stages.forEach(stage => {
    console.log(`  ${stage.name}: ${stage.multiple}x → ${stage.sellPercent}%`);
  });

  // Criar nova estratégia mais conservadora
  const novosEstagios = [
    { name: 'tp1', multiple: 1.5, sellPercent: 25 },  // Mais conservador
    { name: 'tp2', multiple: 3, sellPercent: 25 },
    { name: 'tp3', multiple: 6, sellPercent: 25 },
    { name: 'tp4', multiple: 12, sellPercent: 100 }   // Saída total
  ];

  configManager.setStages(novosEstagios);

  console.log('📊 Novos estágios (mais conservadores):');
  configManager.stages.forEach(stage => {
    console.log(`  ${stage.name}: ${stage.multiple}x → ${stage.sellPercent}%`);
  });
}

// ================================
// EXEMPLO 5: RESET E VALORES PADRÃO
// ================================
export function exemploReset() {
  console.log('\n=== EXEMPLO 5: Reset e Valores Padrão ===');

  // Fazer algumas mudanças
  configManager.updateConfig({
    buyDelayMs: 15000,
    amountSol: 1.0,
    minScore: 10
  });

  console.log('🔄 Após mudanças:');
  console.log('  - Delay:', configManager.config.buyDelayMs);
  console.log('  - Quantidade:', configManager.config.amountSol);
  console.log('  - Score:', configManager.config.minScore);

  // Reset de configuração específica
  configManager.resetConfig('buyDelayMs');
  console.log('🔄 Após reset do delay:', configManager.config.buyDelayMs);

  // Reset completo
  configManager.resetAllConfig();
  console.log('🔄 Após reset completo:');
  console.log('  - Delay:', configManager.config.buyDelayMs);
  console.log('  - Quantidade:', configManager.config.amountSol);
  console.log('  - Score:', configManager.config.minScore);
}

// ================================
// EXEMPLO 6: VALIDAÇÃO DE ERROS
// ================================
export function exemploValidacao() {
  console.log('\n=== EXEMPLO 6: Validação de Erros ===');

  try {
    // Tentar definir valor inválido
    configManager.setConfig('amountSol', -1);
  } catch (error) {
    console.log('❌ Erro capturado:', (error as Error).message);
  }

  try {
    // Tentar definir string vazia
    configManager.setConfig('privateKey', '');
  } catch (error) {
    console.log('❌ Erro capturado:', (error as Error).message);
  }

  try {
    // Tentar definir estágios inválidos
    configManager.setStages([
      { name: 'tp1', multiple: 5, sellPercent: 50 },
      { name: 'tp2', multiple: 3, sellPercent: 50 }  // multiple menor que anterior
    ]);
  } catch (error) {
    console.log('❌ Erro capturado:', (error as Error).message);
  }
}

// ================================
// EXEMPLO 7: USO EM SERVIÇOS
// ================================
export function exemploUsoEmServicos() {
  console.log('\n=== EXEMPLO 7: Uso em Serviços ===');

  // Simular um serviço que reage a mudanças de configuração
  const servicoCompra = {
    delayAtual: 0,

    inicializar() {
      // Ler configuração inicial
      this.delayAtual = configManager.config.buyDelayMs;

      // Registrar callback para mudanças
      configManager.onConfigChange((key, oldValue, newValue) => {
        if (key === 'buyDelayMs') {
          this.delayAtual = newValue;
          console.log(`🔄 Serviço atualizou delay: ${oldValue}ms → ${newValue}ms`);
        }
      });
    },

    comprar(token: string) {
      if (this.delayAtual > 0) {
        console.log(`⏳ Aguardando ${this.delayAtual}ms antes de comprar ${token}`);
      } else {
        console.log(`⚡ Comprando ${token} imediatamente`);
      }
    }
  };

  // Inicializar e testar
  servicoCompra.inicializar();
  servicoCompra.comprar('BTC');

  // Alterar configuração (irá notificar o serviço)
  configManager.setConfig('buyDelayMs', 7000);
  servicoCompra.comprar('ETH');
}

// ================================
// EXEMPLO 8: DEBUGGING E MONITORAMENTO
// ================================
export function exemploDebugging() {
  console.log('\n=== EXEMPLO 8: Debugging e Monitoramento ===');

  // Mostrar valores padrão
  console.log('📋 Valores padrão:');
  console.log('  - Delay:', configManager.defaultConfig.buyDelayMs);
  console.log('  - Quantidade:', configManager.defaultConfig.amountSol);

  // Fazer mudanças e mostrar status
  configManager.setConfig('buyDelayMs', 8000);

  console.log('📋 Status atual:');
  console.log('  - Inicializado:', configManager.isInitialized);
  console.log('  - Delay atual:', configManager.config.buyDelayMs);

  // Usar logConfig para mostrar tudo
  configManager.logConfig();
}

// ================================
// FUNÇÃO PRINCIPAL PARA RODAR EXEMPLOS
// ================================
export function rodarTodosExemplos() {
  console.log('🚀 Iniciando exemplos do ConfigManager...\n');

  exemploAlteracaoSimples();
  exemploAlteracoesMultiplas();
  exemploCallbacks();
  exemploEstagios();
  exemploReset();
  exemploValidacao();
  exemploUsoEmServicos();
  exemploDebugging();

  console.log('\n✅ Todos os exemplos executados!');
}