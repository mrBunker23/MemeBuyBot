import { PrivateKeyService } from './private-key.service'
import { ConfigPersistenceService } from './config-persistence.service'

export interface WalletConfig {
  privateKey: string; // Sempre armazenado em base58 internamente
  jupApiKeys: string[];
  rpcUrl: string;
  amountSol: number;
  slippageBps: number;
  checkIntervalMs: number;
  priceCheckSeconds: number;
  minScore: number;
  siteUrl?: string;
  headless?: boolean;
  autoRestart?: boolean;
  notifications?: boolean;
  maxPositions?: number;
  stopLossEnabled?: boolean;
  stopLossPercent?: number;
}

export class WalletConfigService {
  private static config: WalletConfig | null = null

  /**
   * Carrega configuração: prioriza configuração web salva, depois ambiente
   */
  static async loadConfig(): Promise<WalletConfig> {
    // PRIORIDADE 1: Tentar carregar configuração salva pela interface web
    try {
      const persistedConfig = await ConfigPersistenceService.loadWalletConfig()
      if (persistedConfig) {
        console.log('🌐 Usando configurações da interface web (persistidas)')
        this.config = persistedConfig
        return this.config
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações persistidas:', error)
    }

    // PRIORIDADE 2: Usar configuração em memória se existir
    if (this.config) {
      return this.config
    }

    // PRIORIDADE 3: Carregar do arquivo .env como fallback
    console.log('📄 Usando configurações do arquivo .env (fallback)')
    let privateKey = process.env.PRIVATE_KEY || ''

    // Se a chave está em formato de array no .env, normalizar para base58
    if (privateKey && privateKey !== '') {
      const validation = PrivateKeyService.validateAndNormalize(privateKey)
      if (validation.isValid && validation.normalizedKey) {
        privateKey = validation.normalizedKey
      } else {
        console.warn('Chave privada no .env é inválida:', validation.error)
        privateKey = '' // Limpar se inválida
      }
    }

    // Carregar Jupiter API Keys do ambiente
    let jupApiKeys: string[] = []
    const jupiterKeys = process.env.JUPITER_API_KEYS || process.env.JUP_API_KEY || process.env.JUP_API_KEYS
    if (jupiterKeys) {
      try {
        // Tentar parse como JSON primeiro
        jupApiKeys = JSON.parse(jupiterKeys)
      } catch {
        // Se falhar, tentar como lista separada por vírgulas
        jupApiKeys = jupiterKeys.split(',').map(key => key.trim()).filter(Boolean)
      }
    }

    this.config = {
      privateKey,
      jupApiKeys,
      rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
      amountSol: parseFloat(process.env.AMOUNT_SOL || '0.05'),
      slippageBps: parseInt(process.env.SLIPPAGE_BPS || '3000'),
      checkIntervalMs: parseInt(process.env.CHECK_INTERVAL_MS || '2000'),
      priceCheckSeconds: parseInt(process.env.PRICE_CHECK_SECONDS || '1'),
      minScore: parseInt(process.env.MIN_SCORE || '15'),
      siteUrl: process.env.SITE_URL || 'https://macaco.club',
      headless: process.env.HEADLESS === 'true',
      autoRestart: process.env.AUTO_RESTART === 'true',
      notifications: process.env.NOTIFICATIONS === 'true',
      maxPositions: parseInt(process.env.MAX_POSITIONS || '10'),
      stopLossEnabled: process.env.STOP_LOSS_ENABLED === 'true',
      stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT || '20')
    }

    return this.config
  }

  /**
   * Atualiza configuração
   */
  static async updateConfig(updates: Partial<WalletConfig>): Promise<{ success: boolean; message: string; config: WalletConfig }> {
    try {
      // Carregar config atual
      const currentConfig = await this.loadConfig()

      // Validar chave privada se fornecida
      if (updates.privateKey !== undefined) {
        if (updates.privateKey === '') {
          // Permitir limpar a chave
          updates.privateKey = ''
        } else {
          const validation = PrivateKeyService.validateAndNormalize(updates.privateKey)
          if (!validation.isValid) {
            return {
              success: false,
              message: `Chave privada inválida: ${validation.error}`,
              config: currentConfig
            }
          }
          // Usar a chave normalizada (base58)
          updates.privateKey = validation.normalizedKey!
        }
      }

      // Validar Jupiter API Keys
      if (updates.jupApiKeys !== undefined) {
        if (!Array.isArray(updates.jupApiKeys)) {
          return {
            success: false,
            message: 'Jupiter API Keys deve ser um array',
            config: currentConfig
          }
        }

        // Validar que não estão vazias
        const invalidKeys = updates.jupApiKeys.filter(key => !key || key.trim() === '')
        if (invalidKeys.length > 0) {
          return {
            success: false,
            message: 'Todas as Jupiter API Keys devem ser válidas (não vazias)',
            config: currentConfig
          }
        }
      }

      // Validar valores numéricos
      if (updates.amountSol !== undefined && (updates.amountSol <= 0 || updates.amountSol > 10)) {
        return {
          success: false,
          message: 'Valor por token deve estar entre 0 e 10 SOL',
          config: currentConfig
        }
      }

      if (updates.slippageBps !== undefined && (updates.slippageBps < 0 || updates.slippageBps > 10000)) {
        return {
          success: false,
          message: 'Slippage deve estar entre 0 e 10000 BPS',
          config: currentConfig
        }
      }

      if (updates.minScore !== undefined && updates.minScore < 0) {
        return {
          success: false,
          message: 'Score mínimo deve ser positivo',
          config: currentConfig
        }
      }

      // Aplicar atualizações
      const newConfig = { ...currentConfig, ...updates }

      // Salvar na memória
      this.config = newConfig

      // IMPORTANTE: Salvar persistentemente em arquivo
      try {
        await ConfigPersistenceService.saveWalletConfig(newConfig)
        console.log('💾 Configurações salvas persistentemente')
      } catch (persistError) {
        console.error('❌ Erro ao salvar persistentemente:', persistError)
        // Continua mesmo se falhar a persistência
      }

      return {
        success: true,
        message: 'Configurações atualizadas e salvas com sucesso',
        config: newConfig
      }

    } catch (error) {
      return {
        success: false,
        message: `Erro ao atualizar configurações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        config: await this.loadConfig()
      }
    }
  }

  /**
   * Obtém chave privada ofuscada para exibição
   */
  static getObfuscatedKey(format: 'bytes' | 'base64' | 'base58' = 'base58'): string {
    if (!this.config?.privateKey) {
      return ''
    }

    try {
      // Converter para o formato solicitado e ofuscar
      const convertedKey = PrivateKeyService.convertFromBase58(this.config.privateKey, format)
      return PrivateKeyService.obfuscateKey(convertedKey, format)
    } catch {
      return PrivateKeyService.obfuscateKey('', format)
    }
  }

  /**
   * Obtém chave privada real para uso interno (apenas para sistemas autorizados)
   */
  static async getPrivateKeyForTrading(): Promise<string | null> {
    const config = await this.loadConfig()
    return config.privateKey || null
  }

  /**
   * Reset para valores padrão
   */
  static resetToDefaults(): WalletConfig {
    this.config = {
      privateKey: '',
      jupApiKeys: [],
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      amountSol: 0.05,
      slippageBps: 3000,
      checkIntervalMs: 2000,
      priceCheckSeconds: 1,
      minScore: 15,
      siteUrl: 'https://macaco.club',
      headless: true,
      autoRestart: false,
      notifications: false,
      maxPositions: 10,
      stopLossEnabled: false,
      stopLossPercent: 20
    }

    return this.config
  }

  /**
   * Verifica se a configuração é válida para trading
   */
  static async validateForTrading(): Promise<{ valid: boolean; errors: string[] }> {
    const config = await this.loadConfig()
    const errors: string[] = []

    if (!config.privateKey) {
      errors.push('Chave privada não configurada')
    }

    if (config.jupApiKeys.length === 0) {
      errors.push('Pelo menos uma Jupiter API Key é necessária')
    }

    if (!config.rpcUrl) {
      errors.push('RPC URL não configurada')
    }

    if (config.amountSol <= 0) {
      errors.push('Valor por token deve ser maior que zero')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}