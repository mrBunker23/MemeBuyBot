/**
 * Exemplos práticos de uso do Sistema de Stop-Loss
 * Demonstra como configurar e usar stop-losses em tempo de execução
 */

import { configManager } from '../config/config-manager';
import { logger } from '../utils/logger';

// ================================
// EXEMPLO 1: CONFIGURAÇÃO CONSERVADORA
// ================================
export function exemploConfiguracaoConservadora() {
  console.log('\n=== EXEMPLO 1: Configuração Conservadora ===');
  console.log('Configuração para iniciantes - stop-losses pequenos e frequentes');

  const stopLossesConservadores = [
    { name: 'sl1', multiple: 0.9, sellPercent: 25 },   // -10%, vende 25%
    { name: 'sl2', multiple: 0.8, sellPercent: 50 },   // -20%, vende 50%
    { name: 'sl3', multiple: 0.7, sellPercent: 100 }   // -30%, vende 100% (saída total)
  ];

  configManager.setStopLosses(stopLossesConservadores);

  console.log('📊 Estratégia configurada:');
  configManager.stopLosses.forEach(sl => {
    const perda = ((1 - sl.multiple) * 100).toFixed(0);
    console.log(`  ${sl.name.toUpperCase()}: -${perda}% → vende ${sl.sellPercent}%`);
  });

  console.log('\n💡 Exemplo de execução:');
  console.log('  Token comprado a $1.00');
  console.log('  Preço cai para $0.90 (-10%) → vende 25% da posição');
  console.log('  Preço cai para $0.80 (-20%) → vende 50% do restante');
  console.log('  Preço cai para $0.70 (-30%) → vende 100% (saída total)');
}

// ================================
// EXEMPLO 2: CONFIGURAÇÃO AGRESSIVA
// ================================
export function exemploConfiguracaoAgressiva() {
  console.log('\n=== EXEMPLO 2: Configuração Agressiva ===');
  console.log('Para traders experientes - stop-losses maiores, menos frequentes');

  const stopLossesAgressivos = [
    { name: 'sl1', multiple: 0.5, sellPercent: 50 },   // -50%, vende 50%
    { name: 'sl2', multiple: 0.2, sellPercent: 100 }   // -80%, vende 100%
  ];

  configManager.setStopLosses(stopLossesAgressivos);

  console.log('📊 Estratégia configurada:');
  configManager.stopLosses.forEach(sl => {
    const perda = ((1 - sl.multiple) * 100).toFixed(0);
    console.log(`  ${sl.name.toUpperCase()}: -${perda}% → vende ${sl.sellPercent}%`);
  });

  console.log('\n💡 Exemplo de execução:');
  console.log('  Token comprado a $1.00');
  console.log('  Preço cai para $0.50 (-50%) → vende 50% da posição');
  console.log('  Preço cai para $0.20 (-80%) → vende 100% (saída total)');
}

// ================================
// EXEMPLO 3: STOP-LOSS ESCALONADO
// ================================
export function exemploStopLossEscalonado() {
  console.log('\n=== EXEMPLO 3: Stop-Loss Escalonado ===');
  console.log('Saídas graduais conforme perdas aumentam');

  const stopLossesEscalonados = [
    { name: 'sl1', multiple: 0.85, sellPercent: 20 },  // -15%, vende 20%
    { name: 'sl2', multiple: 0.7, sellPercent: 30 },   // -30%, vende 30%
    { name: 'sl3', multiple: 0.5, sellPercent: 50 },   // -50%, vende 50%
    { name: 'sl4', multiple: 0.3, sellPercent: 100 }   // -70%, vende 100%
  ];

  configManager.setStopLosses(stopLossesEscalonados);

  console.log('📊 Estratégia configurada:');
  configManager.stopLosses.forEach(sl => {
    const perda = ((1 - sl.multiple) * 100).toFixed(0);
    console.log(`  ${sl.name.toUpperCase()}: -${perda}% → vende ${sl.sellPercent}%`);
  });

  console.log('\n💡 Simulação com $1000 inicial:');
  console.log('  Entrada: $1000 (100%)');
  console.log('  SL1 (-15%): vende $200 → restam $800');
  console.log('  SL2 (-30%): vende $240 → restam $560');
  console.log('  SL3 (-50%): vende $280 → restam $280');
  console.log('  SL4 (-70%): vende $280 → restam $0');
}

// ================================
// EXEMPLO 4: COMBINANDO TP + SL
// ================================
export function exemploCombinadoTpSl() {
  console.log('\n=== EXEMPLO 4: Combinando Take-Profit + Stop-Loss ===');
  console.log('Estratégia completa com lucros e perdas gerenciados');

  // Configurar Take-Profits
  const tps = [
    { name: 'tp1', multiple: 2, sellPercent: 25 },     // 2x, vende 25%
    { name: 'tp2', multiple: 5, sellPercent: 50 },     // 5x, vende 50%
    { name: 'tp3', multiple: 10, sellPercent: 100 }    // 10x, vende 100%
  ];

  // Configurar Stop-Losses
  const sls = [
    { name: 'sl1', multiple: 0.8, sellPercent: 50 },   // -20%, vende 50%
    { name: 'sl2', multiple: 0.6, sellPercent: 100 }   // -40%, vende 100%
  ];

  configManager.setStages(tps);
  configManager.setStopLosses(sls);

  console.log('📈 Take-Profits:');
  configManager.stages.forEach(tp => {
    console.log(`  ${tp.name.toUpperCase()}: ${tp.multiple}x → vende ${tp.sellPercent}%`);
  });

  console.log('\n📉 Stop-Losses:');
  configManager.stopLosses.forEach(sl => {
    const perda = ((1 - sl.multiple) * 100).toFixed(0);
    console.log(`  ${sl.name.toUpperCase()}: -${perda}% → vende ${sl.sellPercent}%`);
  });

  console.log('\n💡 Cenários possíveis:');
  console.log('  🟢 Cenário otimista: TP1→TP2→TP3 (lucro máximo)');
  console.log('  🔴 Cenário pessimista: SL1→SL2 (perdas limitadas)');
  console.log('  🟡 Cenário misto: TP1→SL1 (lucro parcial + stop-loss)');
}

// ================================
// EXEMPLO 5: ALTERAÇÃO DINÂMICA
// ================================
export function exemploAlteracaoDinamica() {
  console.log('\n=== EXEMPLO 5: Alteração Dinâmica Durante Execução ===');
  console.log('Mudando estratégias em tempo real baseado em condições do mercado');

  // Configuração inicial - conservadora
  console.log('🔧 Configuração inicial (mercado volátil):');
  const slConservador = [
    { name: 'sl1', multiple: 0.9, sellPercent: 100 }   // -10%, vende tudo
  ];
  configManager.setStopLosses(slConservador);
  configManager.logConfig();

  // Simular mudança de mercado
  setTimeout(() => {
    console.log('\n🔧 Mercado se estabilizou - ajustando para agressivo:');
    const slAgressivo = [
      { name: 'sl1', multiple: 0.7, sellPercent: 50 },   // -30%, vende 50%
      { name: 'sl2', multiple: 0.5, sellPercent: 100 }   // -50%, vende 100%
    ];
    configManager.setStopLosses(slAgressivo);
    console.log('✅ Stop-losses atualizados em tempo real!');
    configManager.logConfig();
  }, 2000);

  // Callback para monitorar mudanças
  configManager.onConfigChange((key, oldValue, newValue) => {
    if (key === 'stopLosses') {
      logger.info(`🔄 Stop-losses alterados: ${oldValue.length} → ${newValue.length} níveis`);
    }
  });
}

// ================================
// EXEMPLO 6: DESATIVANDO STOP-LOSS
// ================================
export function exemploDesativarStopLoss() {
  console.log('\n=== EXEMPLO 6: Desativando Stop-Loss ===');
  console.log('Como remover stop-losses completamente');

  // Configurar stop-losses primeiro
  const sls = [
    { name: 'sl1', multiple: 0.8, sellPercent: 100 }
  ];
  configManager.setStopLosses(sls);

  console.log('📊 Stop-losses ativos:');
  console.log(`  Total: ${configManager.stopLosses.length} nível(s)`);

  // Desativar stop-losses
  configManager.setStopLosses([]);

  console.log('\n🔧 Stop-losses desativados:');
  console.log(`  Total: ${configManager.stopLosses.length} nível(s)`);
  console.log('  O bot agora só usará take-profits');
}

// ================================
// EXEMPLO 7: VALIDAÇÃO DE ERROS
// ================================
export function exemploValidacaoErros() {
  console.log('\n=== EXEMPLO 7: Validação de Erros ===');
  console.log('Exemplos de configurações inválidas');

  // Tentar configurar múltiplos inválidos
  try {
    configManager.setStopLosses([
      { name: 'sl1', multiple: 1.2, sellPercent: 50 }  // Múltiplo > 1 (ganho, não perda)
    ]);
  } catch (error) {
    console.log('❌ Erro capturado:', (error as Error).message);
  }

  // Tentar configurar ordem incorreta
  try {
    configManager.setStopLosses([
      { name: 'sl1', multiple: 0.6, sellPercent: 50 },
      { name: 'sl2', multiple: 0.8, sellPercent: 100 }  // 0.8 > 0.6 (ordem errada)
    ]);
  } catch (error) {
    console.log('❌ Erro capturado:', (error as Error).message);
  }

  // Tentar configurar percentual inválido
  try {
    configManager.setStopLosses([
      { name: 'sl1', multiple: 0.8, sellPercent: 150 }  // >100%
    ]);
  } catch (error) {
    console.log('❌ Erro capturado:', (error as Error).message);
  }

  console.log('\n✅ Sistema de validação funcionando corretamente!');
}

// ================================
// FUNÇÃO PRINCIPAL
// ================================
export function rodarExemplosStopLoss() {
  console.log('🛡️ Iniciando exemplos do Sistema de Stop-Loss...\n');

  exemploConfiguracaoConservadora();
  exemploConfiguracaoAgressiva();
  exemploStopLossEscalonado();
  exemploCombinadoTpSl();
  exemploAlteracaoDinamica();
  exemploDesativarStopLoss();
  exemploValidacaoErros();

  console.log('\n✅ Todos os exemplos de Stop-Loss executados!');
  console.log('\n💡 Dica: Use o .env para configurar stop-losses que persistem entre reinicializações');
  console.log('💡 Use configManager.setStopLosses() para mudanças dinâmicas durante execução');
}