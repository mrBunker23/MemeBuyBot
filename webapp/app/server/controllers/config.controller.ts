import { WebConfigManager, type WebConfig } from '../../shared/bot/config/web-config';

export class ConfigController {
  private static configManager = WebConfigManager.getInstance();

  // GET /api/config - Obter configuração completa
  static getFullConfig() {
    try {
      const config = ConfigController.configManager.getConfig();

      // Mascarar dados sensíveis na resposta
      const safeConfig = {
        ...config,
        privateKey: config.privateKey ? `${config.privateKey.substring(0, 10)}...` : '',
        jupApiKeys: config.jupApiKeys.map(key => `${key.substring(0, 8)}...`)
      };

      return {
        success: true,
        config: safeConfig
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao obter configuração: ${errorMessage}`);
    }
  }

  // PUT /api/config - Atualizar configuração completa
  static async updateFullConfig(body: Partial<WebConfig>) {
    try {
      const result = ConfigController.configManager.updateConfig(body);

      if (!result.success) {
        return {
          success: false,
          message: 'Configuração inválida',
          errors: result.errors
        };
      }

      return {
        success: true,
        message: 'Configuração atualizada com sucesso',
        config: ConfigController.configManager.getConfig()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao atualizar configuração: ${errorMessage}`);
    }
  }

  // POST /api/config/reset - Resetar para padrões
  static resetToDefaults() {
    try {
      ConfigController.configManager.resetToDefaults();

      return {
        success: true,
        message: 'Configuração resetada para valores padrão',
        config: ConfigController.configManager.getConfig()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao resetar configuração: ${errorMessage}`);
    }
  }

  // POST /api/config/validate - Validar configuração
  static validateConfig(body: Partial<WebConfig>) {
    try {
      const { validateConfig } = require('@/app/shared/bot/config/web-config');
      const validation = validateConfig(body);

      return {
        success: true,
        valid: validation.valid,
        errors: validation.errors
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao validar configuração: ${errorMessage}`);
    }
  }

  // GET /api/config/current - Obter configuração atual (para uso interno dos serviços)
  static getCurrentConfig() {
    return ConfigController.configManager.toLegacyConfig();
  }

  // GET /api/config/stages - Obter stages de take profit
  static getStages() {
    return {
      success: true,
      stages: ConfigController.configManager.getStages()
    };
  }
}