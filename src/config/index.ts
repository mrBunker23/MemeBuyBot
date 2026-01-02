import { configManager, getConfig, getStages, getStopLosses, logConfig as logConfigNew } from './config-manager';

// Inicializar o gerenciador de configurações
configManager.initialize();

// Manter compatibilidade com a API antiga
export const config = getConfig();
export const STAGES = getStages();
export const STOP_LOSSES = getStopLosses();
export const logConfig = logConfigNew;

// Exportar o gerenciador para uso avançado
export { configManager };
