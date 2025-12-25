import type { Config, Stage } from '../types';

// Configuração padrão que pode ser totalmente sobrescrita pela UI
export const defaultConfig: Config = {
  siteUrl: 'https://gangue.macaco.club/ferramentas/tokenfinder/',
  baseUrl: 'https://gangue.macaco.club/',
  solMint: 'So11111111111111111111111111111111111111112',

  // Valores padrão - usuário deve configurar via web
  privateKey: '',
  jupApiKey: '',
  jupApiKeys: [],
  rpcUrl: 'https://api.mainnet-beta.solana.com',

  amountSol: 0.05,
  slippageBps: 3000,
  checkIntervalMs: 2000,
  priceCheckSeconds: 1,
  minScore: 15,

  headless: false,
  stateFile: './state.json',
};

// Take Profit Stages padrão - configuráveis via web
export const defaultStages: Stage[] = [
  {
    id: 'tp1-default',
    name: 'Quick Profit',
    multiple: 2,
    sellPercent: 50,
    enabled: true,
    order: 1
  },
  {
    id: 'tp2-default',
    name: 'Medium Gain',
    multiple: 5,
    sellPercent: 50,
    enabled: true,
    order: 2
  },
  {
    id: 'tp3-default',
    name: 'Big Profit',
    multiple: 10,
    sellPercent: 50,
    enabled: true,
    order: 3
  },
  {
    id: 'tp4-default',
    name: 'Moon Shot',
    multiple: 20,
    sellPercent: 100,
    enabled: true,
    order: 4
  },
];

// Interface para configuração web completa
export interface WebConfig extends Config {
  stages: Stage[];
  // Configurações específicas da web
  autoRestart: boolean;
  notifications: boolean;
  maxPositions: number;
  stopLossEnabled: boolean;
  stopLossPercent: number;
}

// Configuração padrão completa para web
export const defaultWebConfig: WebConfig = {
  ...defaultConfig,
  stages: defaultStages,
  autoRestart: false,
  notifications: true,
  maxPositions: 10,
  stopLossEnabled: false,
  stopLossPercent: 50,
};

// Função para validar configuração
export function validateConfig(config: Partial<WebConfig>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.privateKey || config.privateKey.length === 0) {
    errors.push('Private Key é obrigatória');
  }

  if (!config.jupApiKeys || config.jupApiKeys.length === 0) {
    errors.push('Pelo menos uma Jupiter API Key é necessária');
  }

  if (!config.rpcUrl || !config.rpcUrl.startsWith('http')) {
    errors.push('RPC URL deve ser válida');
  }

  if (config.amountSol && (config.amountSol <= 0 || config.amountSol > 1)) {
    errors.push('Amount SOL deve estar entre 0 e 1');
  }

  if (config.slippageBps && (config.slippageBps < 0 || config.slippageBps > 10000)) {
    errors.push('Slippage deve estar entre 0 e 10000 bps');
  }

  return { valid: errors.length === 0, errors };
}

// Classe para gerenciar configuração web
export class WebConfigManager {
  private static instance: WebConfigManager;
  private currentConfig: WebConfig = defaultWebConfig;

  static getInstance(): WebConfigManager {
    if (!WebConfigManager.instance) {
      WebConfigManager.instance = new WebConfigManager();
    }
    return WebConfigManager.instance;
  }

  getConfig(): WebConfig {
    return { ...this.currentConfig };
  }

  updateConfig(newConfig: Partial<WebConfig>): { success: boolean; errors?: string[] } {
    const validation = validateConfig(newConfig);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    this.currentConfig = { ...this.currentConfig, ...newConfig };
    return { success: true };
  }

  resetToDefaults(): void {
    this.currentConfig = { ...defaultWebConfig };
  }

  // Converte para formato esperado pelos serviços existentes
  toLegacyConfig(): Config {
    const { stages, autoRestart, notifications, maxPositions, stopLossEnabled, stopLossPercent, ...legacyConfig } = this.currentConfig;
    return legacyConfig;
  }

  getStages(): Stage[] {
    return [...this.currentConfig.stages].sort((a, b) => a.order - b.order);
  }

  // Métodos para gerenciar TPs dinâmicos
  addStage(stage: Omit<Stage, 'id' | 'order'>): string {
    const id = `tp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const maxOrder = Math.max(...this.currentConfig.stages.map(s => s.order), 0);

    const newStage: Stage = {
      ...stage,
      id,
      order: maxOrder + 1
    };

    this.currentConfig.stages.push(newStage);
    return id;
  }

  updateStage(id: string, updates: Partial<Omit<Stage, 'id'>>): boolean {
    const index = this.currentConfig.stages.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.currentConfig.stages[index] = {
      ...this.currentConfig.stages[index],
      ...updates
    };
    return true;
  }

  deleteStage(id: string): boolean {
    const index = this.currentConfig.stages.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.currentConfig.stages.splice(index, 1);
    return true;
  }

  reorderStages(stageIds: string[]): boolean {
    // Validar se todos os IDs existem
    const currentIds = this.currentConfig.stages.map(s => s.id);
    if (!stageIds.every(id => currentIds.includes(id))) return false;

    // Reordenar
    stageIds.forEach((id, index) => {
      const stage = this.currentConfig.stages.find(s => s.id === id);
      if (stage) stage.order = index + 1;
    });

    return true;
  }

  enableStage(id: string, enabled: boolean): boolean {
    const stage = this.currentConfig.stages.find(s => s.id === id);
    if (!stage) return false;

    stage.enabled = enabled;
    return true;
  }

  // Validação específica para stages
  validateStages(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const stages = this.getStages().filter(s => s.enabled);

    if (stages.length === 0) {
      errors.push('Pelo menos um Take Profit deve estar habilitado');
    }

    // Verificar se os múltiplos estão em ordem crescente
    for (let i = 1; i < stages.length; i++) {
      if (stages[i].multiple <= stages[i - 1].multiple) {
        errors.push(`Take Profit "${stages[i].name}" deve ter múltiplo maior que o anterior`);
      }
    }

    // Verificar valores válidos
    stages.forEach(stage => {
      if (stage.multiple <= 1) {
        errors.push(`Take Profit "${stage.name}": múltiplo deve ser maior que 1`);
      }
      if (stage.sellPercent <= 0 || stage.sellPercent > 100) {
        errors.push(`Take Profit "${stage.name}": percentual de venda deve estar entre 1% e 100%`);
      }
    });

    return { valid: errors.length === 0, errors };
  }
}