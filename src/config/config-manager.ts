import type { Config, Stage, StopLoss } from '../types';

/**
 * Callback executado quando uma configuração é alterada
 */
export type ConfigChangeCallback = (key: keyof Config | 'stages' | 'stopLosses', oldValue: any, newValue: any) => void;

/**
 * Gerenciador de Configurações Singleton
 * Centraliza toda configuração da aplicação em uma única instância compartilhada
 * Permite leitura e escrita de configurações em runtime
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private _config: Config;
  private _stages: Stage[];
  private _stopLosses: StopLoss[];
  private _defaultConfig: Config;
  private _defaultStages: Stage[];
  private _defaultStopLosses: StopLoss[];
  private _initialized = false;
  private _changeCallbacks: ConfigChangeCallback[] = [];

  private constructor() {
    this._config = {} as Config;
    this._stages = [];
    this._stopLosses = [];
    this._defaultConfig = {} as Config;
    this._defaultStages = [];
    this._defaultStopLosses = [];
  }

  /**
   * Retorna a instância singleton do gerenciador de configurações
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Inicializa as configurações a partir das variáveis de ambiente
   * Deve ser chamado uma vez no início da aplicação
   */
  public initialize(): void {
    if (this._initialized) {
      return; // Já foi inicializado
    }

    this._config = this.loadConfig();
    this._stages = this.loadStages();
    this._stopLosses = this.loadStopLosses();

    // Salvar como valores padrão para reset futuro
    this._defaultConfig = { ...this._config };
    this._defaultStages = this._stages.map(stage => ({ ...stage }));
    this._defaultStopLosses = this._stopLosses.map(sl => ({ ...sl }));

    this._initialized = true;
  }

  /**
   * Retorna a configuração atual
   */
  public get config(): Config {
    this.ensureInitialized();
    return this._config;
  }

  /**
   * Retorna os estágios de take-profit
   */
  public get stages(): Stage[] {
    this.ensureInitialized();
    return this._stages;
  }

  /**
   * Retorna os níveis de stop-loss
   */
  public get stopLosses(): StopLoss[] {
    this.ensureInitialized();
    return this._stopLosses;
  }

  /**
   * Verifica se uma configuração está inicializada
   */
  public get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Define uma configuração específica
   * @param key Chave da configuração
   * @param value Novo valor
   */
  public setConfig<K extends keyof Config>(key: K, value: Config[K]): void {
    this.ensureInitialized();

    // Validar o valor antes de aplicar
    this.validateConfigValue(key, value);

    const oldValue = this._config[key];
    this._config[key] = value;

    // Notificar callbacks
    this.notifyChange(key, oldValue, value);
  }

  /**
   * Define múltiplas configurações de uma vez
   * @param updates Objeto com as atualizações
   */
  public updateConfig(updates: Partial<Config>): void {
    this.ensureInitialized();

    // Validar todas as mudanças antes de aplicar
    for (const [key, value] of Object.entries(updates)) {
      this.validateConfigValue(key as keyof Config, value);
    }

    // Aplicar mudanças e notificar
    for (const [key, value] of Object.entries(updates)) {
      const typedKey = key as keyof Config;
      const oldValue = this._config[typedKey];
      this._config[typedKey] = value as any;
      this.notifyChange(typedKey, oldValue, value);
    }
  }

  /**
   * Atualiza os estágios de take-profit
   * @param stages Novos estágios
   */
  public setStages(stages: Stage[]): void {
    this.ensureInitialized();
    this.validateStages(stages);

    const oldStages = [...this._stages];
    this._stages = stages.map(stage => ({ ...stage }));

    this.notifyChange('stages', oldStages, this._stages);
  }

  /**
   * Atualiza os níveis de stop-loss
   * @param stopLosses Novos stop-losses
   */
  public setStopLosses(stopLosses: StopLoss[]): void {
    this.ensureInitialized();
    this.validateStopLosses(stopLosses);

    const oldStopLosses = [...this._stopLosses];
    this._stopLosses = stopLosses.map(sl => ({ ...sl }));

    this.notifyChange('stopLosses', oldStopLosses, this._stopLosses);
  }

  /**
   * Adiciona um callback para ser notificado sobre mudanças
   * @param callback Função a ser chamada quando configuração mudar
   */
  public onConfigChange(callback: ConfigChangeCallback): void {
    this._changeCallbacks.push(callback);
  }

  /**
   * Remove um callback de notificação
   * @param callback Função a ser removida
   */
  public offConfigChange(callback: ConfigChangeCallback): void {
    const index = this._changeCallbacks.indexOf(callback);
    if (index !== -1) {
      this._changeCallbacks.splice(index, 1);
    }
  }

  /**
   * Reseta uma configuração para o valor padrão
   * @param key Chave da configuração
   */
  public resetConfig<K extends keyof Config>(key: K): void {
    this.ensureInitialized();
    this.setConfig(key, this._defaultConfig[key]);
  }

  /**
   * Reseta todas as configurações para valores padrão
   */
  public resetAllConfig(): void {
    this.ensureInitialized();

    const updates = { ...this._defaultConfig };
    this.updateConfig(updates);
    this.setStages([...this._defaultStages]);
    this.setStopLosses([...this._defaultStopLosses]);
  }

  /**
   * Retorna os valores padrão das configurações
   */
  public get defaultConfig(): Readonly<Config> {
    this.ensureInitialized();
    return this._defaultConfig;
  }

  /**
   * Retorna os estágios padrão
   */
  public get defaultStages(): Readonly<Stage[]> {
    this.ensureInitialized();
    return this._defaultStages;
  }

  /**
   * Retorna os stop-losses padrão
   */
  public get defaultStopLosses(): Readonly<StopLoss[]> {
    this.ensureInitialized();
    return this._defaultStopLosses;
  }

  /**
   * Recarrega as configurações (útil para testes ou mudanças em runtime)
   */
  public reload(): void {
    this._config = this.loadConfig();
    this._stages = this.loadStages();
    this._stopLosses = this.loadStopLosses();
    this._initialized = true;
  }

  /**
   * Obtém valor de variável de ambiente com valor padrão
   */
  private getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (!value && !defaultValue) {
      throw new Error(`❌ Variável ${key} não encontrada no .env e sem valor padrão`);
    }
    return value || defaultValue!;
  }

  /**
   * Obtém número de variável de ambiente com valor padrão
   */
  private getEnvNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (!value) {
      if (defaultValue === undefined) {
        throw new Error(`❌ Variável ${key} não encontrada no .env e sem valor padrão`);
      }
      return defaultValue;
    }
    const parsed = Number(value);
    if (isNaN(parsed)) {
      throw new Error(`❌ Variável ${key} deve ser um número válido, recebido: "${value}"`);
    }
    return parsed;
  }

  /**
   * Obtém booleano de variável de ambiente
   */
  private getEnvBoolean(key: string, defaultValue = false): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  /**
   * Carrega múltiplas API keys do Jupiter (separadas por vírgula)
   */
  private getJupiterApiKeys(): string[] {
    const keys = this.getEnv('JUP_API_KEY');
    return keys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  }

  /**
   * Carrega configuração principal
   */
  private loadConfig(): Config {
    return {
      // URLs e identificadores
      siteUrl: 'https://gangue.macaco.club/ferramentas/tokenfinder/',
      baseUrl: 'https://gangue.macaco.club/',
      solMint: 'So11111111111111111111111111111111111111112',

      // Credenciais e conexões
      privateKey: this.getEnv('PRIVATE_KEY'),
      jupApiKey: this.getEnv('JUP_API_KEY'), // Mantém compatibilidade
      jupApiKeys: this.getJupiterApiKeys(),
      rpcUrl: this.getEnv('RPC_URL', 'https://api.mainnet-beta.solana.com'),

      // Parâmetros de trading
      amountSol: this.getEnvNumber('AMOUNT_SOL', 0.10),
      slippageBps: this.getEnvNumber('SLIPPAGE_BPS', 300),

      // Intervalos e timing
      checkIntervalMs: this.getEnvNumber('CHECK_INTERVAL_MS', 2000),
      priceCheckSeconds: this.getEnvNumber('PRICE_CHECK_SECONDS', 10),
      buyDelayMs: this.getEnvNumber('BUY_DELAY_MS', 0), // Novo: delay antes da compra

      // Filtros e parâmetros
      minScore: this.getEnvNumber('MIN_SCORE', 0),

      // Configurações técnicas
      headless: this.getEnvBoolean('HEADLESS', true),
      stateFile: './state.json',
    };
  }

  /**
   * Carrega estágios de take-profit
   */
  private loadStages(): Stage[] {
    return [
      {
        name: 'tp1',
        multiple: this.getEnvNumber('TP1_MULTIPLE', 2),
        sellPercent: this.getEnvNumber('TP1_SELL_PERCENT', 50)
      },
      {
        name: 'tp2',
        multiple: this.getEnvNumber('TP2_MULTIPLE', 5),
        sellPercent: this.getEnvNumber('TP2_SELL_PERCENT', 50)
      },
      {
        name: 'tp3',
        multiple: this.getEnvNumber('TP3_MULTIPLE', 10),
        sellPercent: this.getEnvNumber('TP3_SELL_PERCENT', 50)
      },
      {
        name: 'tp4',
        multiple: this.getEnvNumber('TP4_MULTIPLE', 20),
        sellPercent: this.getEnvNumber('TP4_SELL_PERCENT', 100)
      }
    ];
  }

  /**
   * Carrega níveis de stop-loss
   */
  private loadStopLosses(): StopLoss[] {
    // Carregar apenas stop-losses que estão configurados (não obrigatórios)
    const stopLosses: StopLoss[] = [];

    // SL1 - Stop-Loss 1 (padrão: não configurado)
    const sl1Multiple = process.env.SL1_MULTIPLE;
    if (sl1Multiple) {
      stopLosses.push({
        name: 'sl1',
        multiple: this.getEnvNumber('SL1_MULTIPLE'),
        sellPercent: this.getEnvNumber('SL1_SELL_PERCENT', 50)
      });
    }

    // SL2 - Stop-Loss 2
    const sl2Multiple = process.env.SL2_MULTIPLE;
    if (sl2Multiple) {
      stopLosses.push({
        name: 'sl2',
        multiple: this.getEnvNumber('SL2_MULTIPLE'),
        sellPercent: this.getEnvNumber('SL2_SELL_PERCENT', 50)
      });
    }

    // SL3 - Stop-Loss 3
    const sl3Multiple = process.env.SL3_MULTIPLE;
    if (sl3Multiple) {
      stopLosses.push({
        name: 'sl3',
        multiple: this.getEnvNumber('SL3_MULTIPLE'),
        sellPercent: this.getEnvNumber('SL3_SELL_PERCENT', 50)
      });
    }

    // SL4 - Stop-Loss 4
    const sl4Multiple = process.env.SL4_MULTIPLE;
    if (sl4Multiple) {
      stopLosses.push({
        name: 'sl4',
        multiple: this.getEnvNumber('SL4_MULTIPLE'),
        sellPercent: this.getEnvNumber('SL4_SELL_PERCENT', 50)
      });
    }

    // SL5 - Stop-Loss 5
    const sl5Multiple = process.env.SL5_MULTIPLE;
    if (sl5Multiple) {
      stopLosses.push({
        name: 'sl5',
        multiple: this.getEnvNumber('SL5_MULTIPLE'),
        sellPercent: this.getEnvNumber('SL5_SELL_PERCENT', 100)
      });
    }

    return stopLosses;
  }

  /**
   * Valida se o gerenciador foi inicializado
   */
  private ensureInitialized(): void {
    if (!this._initialized) {
      throw new Error('ConfigManager não foi inicializado. Chame initialize() primeiro.');
    }
  }

  /**
   * Valida um valor de configuração antes de aplicar
   */
  private validateConfigValue<K extends keyof Config>(key: K, value: Config[K]): void {
    switch (key) {
      case 'amountSol':
      case 'slippageBps':
      case 'checkIntervalMs':
      case 'priceCheckSeconds':
      case 'buyDelayMs':
      case 'minScore':
        if (typeof value !== 'number' || value < 0) {
          throw new Error(`❌ ${key} deve ser um número maior ou igual a 0, recebido: ${value}`);
        }
        break;

      case 'privateKey':
      case 'jupApiKey':
      case 'rpcUrl':
      case 'siteUrl':
      case 'baseUrl':
      case 'solMint':
      case 'stateFile':
        if (typeof value !== 'string' || value.length === 0) {
          throw new Error(`❌ ${key} deve ser uma string não vazia, recebido: ${value}`);
        }
        break;

      case 'jupApiKeys':
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error(`❌ ${key} deve ser um array não vazio, recebido: ${value}`);
        }
        break;

      case 'headless':
        if (typeof value !== 'boolean') {
          throw new Error(`❌ ${key} deve ser um boolean, recebido: ${value}`);
        }
        break;
    }
  }

  /**
   * Valida estágios de take-profit
   */
  private validateStages(stages: Stage[]): void {
    if (!Array.isArray(stages) || stages.length === 0) {
      throw new Error('❌ Estágios devem ser um array não vazio');
    }

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];

      if (!stage.name || typeof stage.name !== 'string') {
        throw new Error(`❌ Stage ${i}: nome deve ser uma string não vazia`);
      }

      if (typeof stage.multiple !== 'number' || stage.multiple <= 1) {
        throw new Error(`❌ Stage ${i}: múltiplo deve ser > 1, recebido: ${stage.multiple}`);
      }

      if (typeof stage.sellPercent !== 'number' || stage.sellPercent <= 0 || stage.sellPercent > 100) {
        throw new Error(`❌ Stage ${i}: sellPercent deve estar entre 1-100, recebido: ${stage.sellPercent}`);
      }

      // Verificar se múltiplos estão em ordem crescente
      if (i > 0 && stage.multiple <= stages[i - 1].multiple) {
        throw new Error(`❌ Stage ${i}: múltiplo ${stage.multiple} deve ser maior que o anterior (${stages[i - 1].multiple})`);
      }
    }
  }

  /**
   * Valida níveis de stop-loss
   */
  private validateStopLosses(stopLosses: StopLoss[]): void {
    if (!Array.isArray(stopLosses)) {
      throw new Error('❌ Stop-losses devem ser um array');
    }

    // Stop-losses são opcionais, então array vazio é permitido
    if (stopLosses.length === 0) {
      return;
    }

    for (let i = 0; i < stopLosses.length; i++) {
      const sl = stopLosses[i];

      if (!sl.name || typeof sl.name !== 'string') {
        throw new Error(`❌ Stop-Loss ${i}: nome deve ser uma string não vazia`);
      }

      if (typeof sl.multiple !== 'number' || sl.multiple >= 1 || sl.multiple <= 0) {
        throw new Error(`❌ Stop-Loss ${i}: múltiplo deve estar entre 0 e 1, recebido: ${sl.multiple}`);
      }

      if (typeof sl.sellPercent !== 'number' || sl.sellPercent <= 0 || sl.sellPercent > 100) {
        throw new Error(`❌ Stop-Loss ${i}: sellPercent deve estar entre 1-100, recebido: ${sl.sellPercent}`);
      }

      // Verificar se múltiplos estão em ordem decrescente (0.8, 0.6, 0.4...)
      if (i > 0 && sl.multiple >= stopLosses[i - 1].multiple) {
        throw new Error(`❌ Stop-Loss ${i}: múltiplo ${sl.multiple} deve ser menor que o anterior (${stopLosses[i - 1].multiple})`);
      }
    }
  }

  /**
   * Notifica todos os callbacks sobre uma mudança
   */
  private notifyChange(key: keyof Config | 'stages' | 'stopLosses', oldValue: any, newValue: any): void {
    for (const callback of this._changeCallbacks) {
      try {
        callback(key, oldValue, newValue);
      } catch (error) {
        console.error('❌ Erro em callback de configuração:', error);
      }
    }
  }

  /**
   * Exibe a configuração atual no console
   */
  public logConfig(): void {
    this.ensureInitialized();

    const hasChanges = this.hasRuntimeChanges();

    console.log('🔥 Configuração carregada' + (hasChanges ? ' (com mudanças em runtime)' : ''));
    console.log('🎯 Compra por token:', this._config.amountSol, 'SOL');
    console.log('⚙️ Slippage:', this._config.slippageBps, 'bps');
    console.log('⏱️ Leitura do site:', this._config.checkIntervalMs, 'ms');
    console.log('📉 Check de preço:', this._config.priceCheckSeconds, 's');
    console.log('⏳ Delay na compra:', this._config.buyDelayMs === 0 ? 'Imediato' : `${this._config.buyDelayMs}ms`);
    console.log('🎯 Score mínimo:', this._config.minScore > 0 ? this._config.minScore : 'Sem filtro');
    console.log('🧠 Headless:', this._config.headless);
    console.log(`🔑 API Keys Jupiter: ${this._config.jupApiKeys.length} key${this._config.jupApiKeys.length > 1 ? 's' : ''} (rotação ${this._config.jupApiKeys.length > 1 ? 'ativada' : 'desativada'})`);

    if (this._changeCallbacks.length > 0) {
      console.log(`🔔 Callbacks ativos: ${this._changeCallbacks.length}`);
    }

    console.log('\n📊 Estratégia de Take Profit:');
    this._stages.forEach(stage => {
      console.log(`   ${stage.name.toUpperCase()}: ${stage.multiple}x → vende ${stage.sellPercent}%`);
    });

    if (this._stopLosses.length > 0) {
      console.log('\n🛡️ Estratégia de Stop-Loss:');
      this._stopLosses.forEach(sl => {
        console.log(`   ${sl.name.toUpperCase()}: ${sl.multiple}x → vende ${sl.sellPercent}%`);
      });
    } else {
      console.log('\n🛡️ Stop-Loss: Desativado');
    }
    console.log('');
  }

  /**
   * Verifica se há mudanças em relação aos valores padrão
   */
  private hasRuntimeChanges(): boolean {
    for (const key of Object.keys(this._config) as (keyof Config)[]) {
      if (JSON.stringify(this._config[key]) !== JSON.stringify(this._defaultConfig[key])) {
        return true;
      }
    }
    return (
      JSON.stringify(this._stages) !== JSON.stringify(this._defaultStages) ||
      JSON.stringify(this._stopLosses) !== JSON.stringify(this._defaultStopLosses)
    );
  }
}

// Exporta a instância singleton para uso direto
export const configManager = ConfigManager.getInstance();

// Exporta funções de compatibilidade com a API antiga
export const getConfig = () => configManager.config;
export const getStages = () => configManager.stages;
export const getStopLosses = () => configManager.stopLosses;
export const logConfig = () => configManager.logConfig();