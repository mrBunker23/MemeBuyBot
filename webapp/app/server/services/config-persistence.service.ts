import { writeFile, readFile, existsSync } from 'fs'
import { promisify } from 'util'
import path from 'path'

const writeFileAsync = promisify(writeFile)
const readFileAsync = promisify(readFile)

interface PersistedConfig {
  privateKey: string;
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
  lastUpdated: string;
}

export class ConfigPersistenceService {
  private static readonly CONFIG_FILE_PATH = path.join(process.cwd(), 'config.json')
  private static readonly TAKEPROFIT_FILE_PATH = path.join(process.cwd(), 'takeprofit-config.json')

  /**
   * Salva configurações da carteira permanentemente
   */
  static async saveWalletConfig(config: Omit<PersistedConfig, 'lastUpdated'>): Promise<void> {
    try {
      const configToSave: PersistedConfig = {
        ...config,
        lastUpdated: new Date().toISOString()
      }

      const configJson = JSON.stringify(configToSave, null, 2)
      await writeFileAsync(this.CONFIG_FILE_PATH, configJson, 'utf8')

      console.log('💾 Configurações salvas em:', this.CONFIG_FILE_PATH)
    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error)
      throw error
    }
  }

  /**
   * Carrega configurações salvas
   */
  static async loadWalletConfig(): Promise<PersistedConfig | null> {
    try {
      if (!existsSync(this.CONFIG_FILE_PATH)) {
        console.log('📄 Arquivo de configuração não encontrado:', this.CONFIG_FILE_PATH)
        return null
      }

      const configJson = await readFileAsync(this.CONFIG_FILE_PATH, 'utf8')
      const config = JSON.parse(configJson) as PersistedConfig

      console.log('📁 Configurações carregadas de:', this.CONFIG_FILE_PATH)
      console.log('📅 Última atualização:', config.lastUpdated)

      return config
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error)
      return null
    }
  }

  /**
   * Verifica se existe configuração salva
   */
  static hasPersistedConfig(): boolean {
    return existsSync(this.CONFIG_FILE_PATH)
  }

  /**
   * Salva configurações de Take Profit
   */
  static async saveTakeProfitConfig(stages: any[]): Promise<void> {
    try {
      const configToSave = {
        stages,
        lastUpdated: new Date().toISOString()
      }

      const configJson = JSON.stringify(configToSave, null, 2)
      await writeFileAsync(this.TAKEPROFIT_FILE_PATH, configJson, 'utf8')

      console.log('💾 Take Profits salvos em:', this.TAKEPROFIT_FILE_PATH)
    } catch (error) {
      console.error('❌ Erro ao salvar Take Profits:', error)
      throw error
    }
  }

  /**
   * Carrega configurações de Take Profit
   */
  static async loadTakeProfitConfig(): Promise<any[] | null> {
    try {
      if (!existsSync(this.TAKEPROFIT_FILE_PATH)) {
        console.log('📄 Arquivo de Take Profit não encontrado:', this.TAKEPROFIT_FILE_PATH)
        return null
      }

      const configJson = await readFileAsync(this.TAKEPROFIT_FILE_PATH, 'utf8')
      const config = JSON.parse(configJson)

      console.log('📁 Take Profits carregados de:', this.TAKEPROFIT_FILE_PATH)

      return config.stages || []
    } catch (error) {
      console.error('❌ Erro ao carregar Take Profits:', error)
      return null
    }
  }

  /**
   * Remove arquivo de configuração
   */
  static async clearPersistedConfig(): Promise<void> {
    try {
      if (existsSync(this.CONFIG_FILE_PATH)) {
        const { unlink } = await import('fs/promises')
        await unlink(this.CONFIG_FILE_PATH)
        console.log('🗑️ Configurações removidas')
      }
    } catch (error) {
      console.error('❌ Erro ao remover configurações:', error)
    }
  }

  /**
   * Faz backup das configurações
   */
  static async backupConfig(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(process.cwd(), `config-backup-${timestamp}.json`)

      if (existsSync(this.CONFIG_FILE_PATH)) {
        const configContent = await readFileAsync(this.CONFIG_FILE_PATH, 'utf8')
        await writeFileAsync(backupPath, configContent, 'utf8')

        console.log('💾 Backup criado em:', backupPath)
        return backupPath
      }

      throw new Error('Arquivo de configuração não encontrado')
    } catch (error) {
      console.error('❌ Erro ao criar backup:', error)
      throw error
    }
  }
}