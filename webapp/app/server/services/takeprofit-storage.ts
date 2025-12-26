// Serviço simples para armazenar Take Profits em memória
interface Stage {
  id: string;
  name: string;
  multiple: number;
  sellPercent: number;
  enabled: boolean;
  order: number;
}

class TakeProfitStorage {
  private static instance: TakeProfitStorage;
  private stages: Stage[] = [];

  constructor() {
    this.loadPersistedStages();
  }

  /**
   * Carrega stages salvos ou usa padrão
   */
  private async loadPersistedStages(): Promise<void> {
    try {
      const { ConfigPersistenceService } = require('./config-persistence.service');
      const persistedStages = await ConfigPersistenceService.loadTakeProfitConfig();

      if (persistedStages && persistedStages.length > 0) {
        console.log('🎯 Usando Take Profits da interface web (persistidos)');
        this.stages = persistedStages;
        return;
      }
    } catch (error) {
      console.warn('Erro ao carregar Take Profits persistidos:', error);
    }

    // Usar stages padrão se não houver persistidos
    console.log('📄 Usando Take Profits padrão');
    this.stages = [
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
      }
    ];
  }

  /**
   * Salva stages persistentemente
   */
  private async persistStages(): Promise<void> {
    try {
      const { ConfigPersistenceService } = require('./config-persistence.service');
      await ConfigPersistenceService.saveTakeProfitConfig(this.stages);
      console.log('💾 Take Profits salvos persistentemente');
    } catch (error) {
      console.error('❌ Erro ao salvar Take Profits persistentemente:', error);
    }
  }

  static getInstance(): TakeProfitStorage {
    if (!TakeProfitStorage.instance) {
      TakeProfitStorage.instance = new TakeProfitStorage();
    }
    return TakeProfitStorage.instance;
  }

  // Listar todos os TPs
  getAllStages(): Stage[] {
    return [...this.stages].sort((a, b) => a.order - b.order);
  }

  // Adicionar novo TP
  addStage(stage: Omit<Stage, 'id' | 'order'>): Stage {
    const id = `tp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const maxOrder = Math.max(...this.stages.map(s => s.order), 0);

    const newStage: Stage = {
      ...stage,
      id,
      order: maxOrder + 1
    };

    this.stages.push(newStage);
    return newStage;
  }

  // Atualizar TP existente
  updateStage(id: string, updates: Partial<Omit<Stage, 'id'>>): boolean {
    const index = this.stages.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.stages[index] = {
      ...this.stages[index],
      ...updates
    };
    return true;
  }

  // Deletar TP
  deleteStage(id: string): boolean {
    const index = this.stages.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.stages.splice(index, 1);
    return true;
  }

  // Habilitar/Desabilitar TP
  toggleStage(id: string, enabled: boolean): boolean {
    const stage = this.stages.find(s => s.id === id);
    if (!stage) return false;

    stage.enabled = enabled;
    return true;
  }

  // Buscar TP por ID
  getStageById(id: string): Stage | null {
    return this.stages.find(s => s.id === id) || null;
  }

  // Validar configuração
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const enabledStages = this.stages.filter(s => s.enabled);

    if (enabledStages.length === 0) {
      errors.push('Pelo menos um Take Profit deve estar habilitado');
    }

    // Verificar se os múltiplos estão em ordem crescente
    for (let i = 1; i < enabledStages.length; i++) {
      if (enabledStages[i].multiple <= enabledStages[i - 1].multiple) {
        errors.push(`Take Profit "${enabledStages[i].name}" deve ter múltiplo maior que o anterior`);
      }
    }

    // Verificar valores válidos
    enabledStages.forEach(stage => {
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

export const takeProfitStorage = TakeProfitStorage.getInstance();