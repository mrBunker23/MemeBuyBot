import { Elysia, t } from "elysia"
import { BotController } from "../controllers/bot.controller"

// Schemas para validação
const BotStatusSchema = t.Object({
  isRunning: t.Boolean(),
  startedAt: t.Optional(t.String()),
  tokensMonitored: t.Number(),
  totalTransactions: t.Number(),
  lastCheck: t.Optional(t.String())
});

const BotResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  status: BotStatusSchema
});

const PositionSchema = t.Object({
  ticker: t.String(),
  mint: t.String(),
  entryUsd: t.Union([t.Number(), t.Null()]),
  entryAmountSol: t.Number(),
  currentPrice: t.Union([t.Number(), t.Null()]),
  highestPrice: t.Union([t.Number(), t.Null()]),
  highestMultiple: t.Union([t.Number(), t.Null()]),
  createdAt: t.String(),
  lastUpdated: t.String(),
  sold: t.Object({
    tp1: t.Optional(t.Boolean()),
    tp2: t.Optional(t.Boolean()),
    tp3: t.Optional(t.Boolean()),
    tp4: t.Optional(t.Boolean())
  }),
  paused: t.Optional(t.Boolean()),
  pausedAt: t.Optional(t.String())
});

const ConfigUpdateSchema = t.Object({
  amountSol: t.Optional(t.Number()),
  slippageBps: t.Optional(t.Number()),
  checkIntervalMs: t.Optional(t.Number()),
  priceCheckSeconds: t.Optional(t.Number()),
  minScore: t.Optional(t.Number())
});

export const botRoutes = new Elysia({ prefix: "/bot" })

  // GET /api/bot/status
  .get("/status", () => BotController.getStatus(), {
    response: BotStatusSchema,
    detail: {
      tags: ['Bot'],
      summary: 'Obter status do bot',
      description: 'Retorna o status atual do bot de trading'
    }
  })

  // POST /api/bot/start
  .post("/start", async () => BotController.start(), {
    response: BotResponseSchema,
    detail: {
      tags: ['Bot'],
      summary: 'Iniciar bot',
      description: 'Inicia o bot de trading'
    }
  })

  // POST /api/bot/stop
  .post("/stop", async () => BotController.stop(), {
    response: BotResponseSchema,
    detail: {
      tags: ['Bot'],
      summary: 'Parar bot',
      description: 'Para o bot de trading'
    }
  })

  // GET /api/bot/positions
  .get("/positions", () => BotController.getPositions(), {
    response: t.Object({
      all: t.Record(t.String(), PositionSchema),
      active: t.Record(t.String(), PositionSchema),
      count: t.Object({
        total: t.Number(),
        active: t.Number(),
        paused: t.Number()
      })
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Obter posições',
      description: 'Retorna todas as posições do bot (ativas e pausadas)'
    }
  })

  // GET /api/bot/logs
  .get("/logs", () => BotController.getLogs(), {
    response: t.Object({
      logs: t.Array(t.Any()),
      timestamp: t.String()
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Obter logs',
      description: 'Retorna os logs recentes do bot'
    }
  })

  // GET /api/bot/config
  .get("/config", () => BotController.getConfig(), {
    response: t.Object({
      config: t.Object({
        amountSol: t.Number(),
        slippageBps: t.Number(),
        checkIntervalMs: t.Number(),
        priceCheckSeconds: t.Number(),
        minScore: t.Number(),
        siteUrl: t.String(),
        rpcUrl: t.String()
      })
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Obter configuração',
      description: 'Retorna a configuração atual do bot'
    }
  })

  // PUT /api/bot/config
  .put("/config", ({ body }: { body: any }) => BotController.updateConfig(body), {
    body: ConfigUpdateSchema,
    response: t.Object({
      success: t.Boolean(),
      message: t.String(),
      config: t.Object({
        amountSol: t.Number(),
        slippageBps: t.Number(),
        checkIntervalMs: t.Number(),
        priceCheckSeconds: t.Number(),
        minScore: t.Number(),
        siteUrl: t.String(),
        rpcUrl: t.String()
      })
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Atualizar configuração',
      description: 'Atualiza a configuração do bot'
    }
  })

  // GET /api/bot/stats
  .get("/stats", () => BotController.getStats(), {
    response: t.Object({
      totalPositions: t.Number(),
      profitablePositions: t.Number(),
      winRate: t.Number(),
      totalProfit: t.Number(),
      totalInvested: t.Number(),
      roi: t.Number(),
      avgProfitPerPosition: t.Number()
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Obter estatísticas',
      description: 'Retorna estatísticas de performance do bot'
    }
  })

  // GET /api/bot/takeprofit - Listar TPs dinâmicos
  .get("/takeprofit", () => {
    try {
      const { takeProfitStorage } = require('../services/takeprofit-storage');
      const stages = takeProfitStorage.getAllStages();
      const validation = takeProfitStorage.validate();

      return {
        success: true,
        stages,
        validation
      };
    } catch (error) {
      console.error('Erro ao buscar Take Profits:', error);
      throw new Error('Falha ao carregar Take Profits');
    }
  }, {
    response: t.Object({
      success: t.Boolean(),
      stages: t.Array(t.Object({
        id: t.String(),
        name: t.String(),
        multiple: t.Number(),
        sellPercent: t.Number(),
        enabled: t.Boolean(),
        order: t.Number()
      })),
      validation: t.Object({
        valid: t.Boolean(),
        errors: t.Array(t.String())
      })
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Obter Take Profits',
      description: 'Retorna a configuração de Take Profits'
    }
  })

  // POST /api/bot/takeprofit - Criar novo TP
  .post("/takeprofit", ({ body }: { body: any }) => {
    try {
      const { name, multiple, sellPercent, enabled } = body;

      // Validação básica
      if (!name || typeof name !== 'string') {
        throw new Error('Nome é obrigatório');
      }
      if (!multiple || multiple <= 1) {
        throw new Error('Múltiplo deve ser maior que 1');
      }
      if (!sellPercent || sellPercent <= 0 || sellPercent > 100) {
        throw new Error('Percentual de venda deve estar entre 1% e 100%');
      }

      // Criar TP real
      const { takeProfitStorage } = require('../services/takeprofit-storage');
      const newStage = takeProfitStorage.addStage({
        name: name.toString(),
        multiple: Number(multiple),
        sellPercent: Number(sellPercent),
        enabled: enabled !== undefined ? Boolean(enabled) : true
      });

      return {
        success: true,
        message: 'Take Profit criado com sucesso',
        stage: newStage
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao criar Take Profit: ${errorMessage}`);
    }
  }, {
    body: t.Object({
      name: t.String(),
      multiple: t.Number(),
      sellPercent: t.Number(),
      enabled: t.Optional(t.Boolean())
    }),
    response: t.Object({
      success: t.Boolean(),
      message: t.String(),
      stage: t.Object({
        id: t.String(),
        name: t.String(),
        multiple: t.Number(),
        sellPercent: t.Number(),
        enabled: t.Boolean(),
        order: t.Number()
      })
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Criar Take Profit',
      description: 'Cria um novo Take Profit'
    }
  })

  // PUT /api/bot/takeprofit/:id - Atualizar TP
  .put("/takeprofit/:id", ({ params, body }: { params: { id: string }, body: any }) => {
    try {
      const { id } = params;
      const { takeProfitStorage } = require('../services/takeprofit-storage');

      const success = takeProfitStorage.updateStage(id, body);
      if (!success) {
        throw new Error('Take Profit não encontrado');
      }

      return {
        success: true,
        message: 'Take Profit atualizado com sucesso',
        id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao atualizar Take Profit: ${errorMessage}`);
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      multiple: t.Optional(t.Number()),
      sellPercent: t.Optional(t.Number()),
      enabled: t.Optional(t.Boolean())
    }),
    response: t.Object({
      success: t.Boolean(),
      message: t.String(),
      id: t.String()
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Atualizar Take Profit',
      description: 'Atualiza um Take Profit existente'
    }
  })

  // DELETE /api/bot/takeprofit/:id - Deletar TP
  .delete("/takeprofit/:id", ({ params }: { params: { id: string } }) => {
    try {
      const { id } = params;
      const { takeProfitStorage } = require('../services/takeprofit-storage');

      const success = takeProfitStorage.deleteStage(id);
      if (!success) {
        throw new Error('Take Profit não encontrado');
      }

      return {
        success: true,
        message: 'Take Profit removido com sucesso',
        id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao remover Take Profit: ${errorMessage}`);
    }
  }, {
    response: t.Object({
      success: t.Boolean(),
      message: t.String(),
      id: t.String()
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Remover Take Profit',
      description: 'Remove um Take Profit'
    }
  })

  // GET /api/bot/wallet-config - Obter configuração de carteira
  .get("/wallet-config", async () => {
    try {
      const { WalletConfigService } = require('../services/wallet-config.service');
      const config = await WalletConfigService.loadConfig();

      // Retornar configuração com chave privada ofuscada para segurança
      return {
        success: true,
        config: {
          ...config,
          privateKey: config.privateKey ? '••••••••••••••••••••••••••••••••' : '' // Ofuscar para segurança
        }
      };
    } catch (error) {
      console.error('Erro ao carregar wallet config:', error);
      throw new Error('Falha ao carregar configuração da carteira');
    }
  }, {
    response: t.Object({
      success: t.Boolean(),
      config: t.Object({
        privateKey: t.String(),
        jupApiKeys: t.Array(t.String()),
        rpcUrl: t.String(),
        amountSol: t.Number(),
        slippageBps: t.Number(),
        checkIntervalMs: t.Number(),
        priceCheckSeconds: t.Number(),
        minScore: t.Number()
      })
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Obter configuração da carteira',
      description: 'Retorna a configuração atual da carteira e APIs'
    }
  })

  // PUT /api/bot/wallet-config - Atualizar configuração de carteira
  .put("/wallet-config", async ({ body }: { body: any }) => {
    try {
      const { WalletConfigService } = require('../services/wallet-config.service');

      // Usar o serviço real para validar e atualizar
      const result = await WalletConfigService.updateConfig(body);

      if (!result.success) {
        throw new Error(result.message);
      }

      // Retornar com chave privada ofuscada
      return {
        success: true,
        message: result.message,
        config: {
          ...result.config,
          privateKey: result.config.privateKey ? '••••••••••••••••••••••••••••••••' : ''
        }
      };
    } catch (error) {
      console.error('Erro ao atualizar wallet config:', error);
      throw new Error(`Falha ao atualizar configuração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }, {
    body: t.Object({
      privateKey: t.Optional(t.String()),
      jupApiKeys: t.Optional(t.Array(t.String())),
      rpcUrl: t.Optional(t.String()),
      amountSol: t.Optional(t.Number()),
      slippageBps: t.Optional(t.Number()),
      checkIntervalMs: t.Optional(t.Number()),
      priceCheckSeconds: t.Optional(t.Number()),
      minScore: t.Optional(t.Number()),
      siteUrl: t.Optional(t.String()),
      headless: t.Optional(t.Boolean()),
      autoRestart: t.Optional(t.Boolean()),
      notifications: t.Optional(t.Boolean()),
      maxPositions: t.Optional(t.Number()),
      stopLossEnabled: t.Optional(t.Boolean()),
      stopLossPercent: t.Optional(t.Number())
    }),
    response: t.Object({
      success: t.Boolean(),
      message: t.String(),
      config: t.Object({
        privateKey: t.String(),
        jupApiKeys: t.Array(t.String()),
        rpcUrl: t.String(),
        amountSol: t.Number(),
        slippageBps: t.Number(),
        checkIntervalMs: t.Number(),
        priceCheckSeconds: t.Number(),
        minScore: t.Number(),
        siteUrl: t.Optional(t.String()),
        headless: t.Optional(t.Boolean()),
        autoRestart: t.Optional(t.Boolean()),
        notifications: t.Optional(t.Boolean()),
        maxPositions: t.Optional(t.Number()),
        stopLossEnabled: t.Optional(t.Boolean()),
        stopLossPercent: t.Optional(t.Number())
      })
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Atualizar configuração da carteira',
      description: 'Atualiza a configuração da carteira e APIs'
    }
  })

  // GET /api/bot/wallet - Obter dados da carteira
  .get("/wallet", async () => {
    try {
      const { WalletConfigService } = require('../services/wallet-config.service');
      const config = await WalletConfigService.loadConfig();

      if (!config.privateKey) {
        return {
          success: false,
          message: 'Carteira não configurada',
          wallet: null
        };
      }

      // Obter endereço público da carteira
      let publicAddress = '';
      let solBalance = 0;
      let tokens: any[] = [];
      let totalValueUsd = 0;

      try {
        const { solanaService } = require('../../shared/bot/services/solana.service');
        const { jupiterService } = require('../../shared/bot/services/jupiter.service');

        // IMPORTANTE: Atualizar a carteira com a configuração web atual
        await solanaService.updateFromWebConfig();

        // Obter endereço público
        publicAddress = await solanaService.getWalletAddress();

        // Obter saldo SOL
        const balance = await solanaService.getSolBalance();
        solBalance = balance / 1e9; // Converter de lamports para SOL

        // Obter todos os tokens na carteira
        const tokenAccounts = await solanaService.getAllTokenBalances();

        // Para cada token, obter informações detalhadas
        for (const tokenAccount of tokenAccounts) {
          try {
            const price = await jupiterService.getUsdPrice(tokenAccount.mint);
            const amount = tokenAccount.amount / Math.pow(10, tokenAccount.decimals || 9);
            const valueUsd = price ? price * amount : 0;

            tokens.push({
              mint: tokenAccount.mint,
              symbol: tokenAccount.symbol || 'Unknown',
              amount: amount,
              decimals: tokenAccount.decimals || 9,
              priceUsd: price || 0,
              valueUsd: valueUsd,
              address: tokenAccount.address
            });

            totalValueUsd += valueUsd;
          } catch (tokenError) {
            console.error(`Erro ao processar token ${tokenAccount.mint}:`, tokenError);
          }
        }

        // Adicionar valor SOL ao total
        const solPrice = await jupiterService.getUsdPrice(config.solMint || 'So11111111111111111111111111111111111111112');
        const solValueUsd = solPrice ? solPrice * solBalance : 0;
        totalValueUsd += solValueUsd;

        // Adicionar SOL como primeiro item
        tokens.unshift({
          mint: config.solMint || 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          amount: solBalance,
          decimals: 9,
          priceUsd: solPrice || 0,
          valueUsd: solValueUsd,
          address: publicAddress
        });

      } catch (serviceError) {
        console.error('Erro ao obter dados da carteira:', serviceError);
        // Retornar dados básicos mesmo se houver erro
      }

      return {
        success: true,
        wallet: {
          publicAddress,
          solBalance,
          totalValueUsd,
          tokensCount: tokens.length,
          tokens: tokens.sort((a, b) => b.valueUsd - a.valueUsd), // Ordenar por valor
          lastUpdated: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Erro ao buscar dados da carteira:', error);
      throw new Error('Falha ao carregar dados da carteira');
    }
  }, {
    response: t.Object({
      success: t.Boolean(),
      message: t.Optional(t.String()),
      wallet: t.Union([
        t.Null(),
        t.Object({
          publicAddress: t.String(),
          solBalance: t.Number(),
          totalValueUsd: t.Number(),
          tokensCount: t.Number(),
          tokens: t.Array(t.Object({
            mint: t.String(),
            symbol: t.String(),
            amount: t.Number(),
            decimals: t.Number(),
            priceUsd: t.Number(),
            valueUsd: t.Number(),
            address: t.String()
          })),
          lastUpdated: t.String()
        })
      ])
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Obter dados da carteira',
      description: 'Retorna informações da carteira: endereço, saldos e tokens'
    }
  })

  // POST /api/bot/wallet/refresh - Forçar atualização da carteira
  .post("/wallet/refresh", async () => {
    try {
      const { solanaService } = require('../../shared/bot/services/solana.service');

      // Forçar atualização da carteira com a configuração web atual
      await solanaService.updateFromWebConfig();

      return {
        success: true,
        message: 'Carteira atualizada com sucesso',
        newAddress: await solanaService.getWalletAddress()
      };
    } catch (error) {
      console.error('Erro ao atualizar carteira:', error);
      throw new Error('Falha ao atualizar carteira');
    }
  }, {
    response: t.Object({
      success: t.Boolean(),
      message: t.String(),
      newAddress: t.String()
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Forçar atualização da carteira',
      description: 'Força a atualização da carteira com as configurações mais recentes'
    }
  })

  // POST /api/bot/takeprofit/:id/toggle - Habilitar/Desabilitar TP
  .post("/takeprofit/:id/toggle", ({ params, body }: { params: { id: string }, body: any }) => {
    try {
      const { id } = params;
      const { enabled } = body;

      if (typeof enabled !== 'boolean') {
        throw new Error('Campo enabled deve ser boolean');
      }

      const { takeProfitStorage } = require('../services/takeprofit-storage');
      const success = takeProfitStorage.toggleStage(id, enabled);

      if (!success) {
        throw new Error('Take Profit não encontrado');
      }

      return {
        success: true,
        message: `Take Profit ${enabled ? 'habilitado' : 'desabilitado'} com sucesso`,
        id,
        enabled
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao alterar status do Take Profit: ${errorMessage}`);
    }
  }, {
    body: t.Object({
      enabled: t.Boolean()
    }),
    response: t.Object({
      success: t.Boolean(),
      message: t.String(),
      id: t.String(),
      enabled: t.Boolean()
    }),
    detail: {
      tags: ['Bot'],
      summary: 'Toggle Take Profit',
      description: 'Habilita ou desabilita um Take Profit'
    }
  })