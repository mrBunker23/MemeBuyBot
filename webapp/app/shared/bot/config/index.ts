import type { Config, Stage } from '../types';

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Faltou ${key} no .env`);
  }
  return value || defaultValue!;
}

// Função para carregar múltiplas API keys do Jupiter (separadas por vírgula)
function getJupiterApiKeys(): string[] {
  const keys = getEnv('JUP_API_KEY');
  return keys.split(',').map(k => k.trim()).filter(k => k.length > 0);
}

export const config: Config = {
  siteUrl: 'https://gangue.macaco.club/ferramentas/tokenfinder/',
  baseUrl: 'https://gangue.macaco.club/',
  solMint: 'So11111111111111111111111111111111111111112',

  privateKey: getEnv('PRIVATE_KEY'),
  jupApiKey: getEnv('JUP_API_KEY'), // Mantém compatibilidade
  jupApiKeys: getJupiterApiKeys(), // Nova: array de keys
  rpcUrl: getEnv('RPC_URL', 'https://api.mainnet-beta.solana.com'),

  amountSol: Number(getEnv('AMOUNT_SOL', '0.10')),
  slippageBps: Number(getEnv('SLIPPAGE_BPS', '300')),

  checkIntervalMs: Number(getEnv('CHECK_INTERVAL_MS', '2000')),
  priceCheckSeconds: Number(getEnv('PRICE_CHECK_SECONDS', '10')),
  minScore: Number(getEnv('MIN_SCORE', '0')),

  headless: getEnv('HEADLESS', 'true').toLowerCase() === 'true',
  stateFile: './state.json',  // State file na pasta webapp
};

// Take Profit Stages (configuráveis via .env)
export const STAGES: Stage[] = [
  {
    name: 'tp1',
    multiple: Number(getEnv('TP1_MULTIPLE', '2')),
    sellPercent: Number(getEnv('TP1_SELL_PERCENT', '50'))
  },
  {
    name: 'tp2',
    multiple: Number(getEnv('TP2_MULTIPLE', '5')),
    sellPercent: Number(getEnv('TP2_SELL_PERCENT', '50'))
  },
  {
    name: 'tp3',
    multiple: Number(getEnv('TP3_MULTIPLE', '10')),
    sellPercent: Number(getEnv('TP3_SELL_PERCENT', '50'))
  },
  {
    name: 'tp4',
    multiple: Number(getEnv('TP4_MULTIPLE', '20')),
    sellPercent: Number(getEnv('TP4_SELL_PERCENT', '100'))
  },
];

export function logConfig(): void {
  console.log('🔥 Configuração carregada');
  console.log('🎯 Compra por token:', config.amountSol, 'SOL');
  console.log('⚙️ Slippage:', config.slippageBps, 'bps');
  console.log('⏱️ Leitura do site:', config.checkIntervalMs, 'ms');
  console.log('📉 Check de preço:', config.priceCheckSeconds, 's');
  console.log('🎯 Score mínimo:', config.minScore > 0 ? config.minScore : 'Sem filtro');
  console.log('🧠 Headless:', config.headless);
  console.log(`🔑 API Keys Jupiter: ${config.jupApiKeys.length} key${config.jupApiKeys.length > 1 ? 's' : ''} (rotação ativada)`);
  console.log('\n📊 Estratégia de Take Profit:');
  STAGES.forEach(stage => {
    console.log(`   ${stage.name.toUpperCase()}: ${stage.multiple}x → vende ${stage.sellPercent}%`);
  });
  console.log('');
}

// Função para atualizar configuração via web
export function updateConfig(newConfig: Partial<Config>): void {
  Object.assign(config, newConfig);
}