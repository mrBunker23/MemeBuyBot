import * as cheerio from 'cheerio';
import fs from 'fs';
import { config } from '../config';
import { botEventEmitter } from '../events/BotEventEmitter';
import { logger } from '../utils/logger';
import type { TokenInfo } from '../types';

interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
}

class ScraperService {
  private cookies: string = '';
  private scrapeInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  private readJson<T>(path: string, fallback: T): T {
    try {
      const data = fs.readFileSync(path, 'utf8');
      return JSON.parse(data);
    } catch {
      return fallback;
    }
  }

  private buildCookieHeader(): string {
    const cookiesArray = this.readJson<Cookie[]>('./cookies.json', []);
    return cookiesArray.map(c => `${c.name}=${c.value}`).join('; ');
  }

  async initialize(): Promise<void> {
    try {
      logger.info('🔐 Preparando cookies para requisição...');
      this.cookies = this.buildCookieHeader();

      logger.info('🔍 Testando conexão com a página...');
      const response = await fetch(config.siteUrl, {
        headers: {
          'Cookie': this.cookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        const errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        // Emitir evento de erro
        botEventEmitter.emit('scraper:error', {
          error: errorMessage,
          url: config.siteUrl,
          attempt: 1
        });

        throw new Error(errorMessage);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Verificar se a tabela existe
      const hasTable = $('#tokenFinderTable').length > 0;

      if (!hasTable) {
        // Debug
        const bodyText = $('body').text().substring(0, 200);
        logger.warn('📝 Preview do conteúdo:', bodyText);

        const errorMessage = 'Tabela de tokens não encontrada - cookies podem estar expirados';

        // Emitir evento de cookies expirados
        botEventEmitter.emit('scraper:cookies_expired', {
          timestamp: new Date().toISOString()
        });

        // Também emitir evento de erro
        botEventEmitter.emit('scraper:error', {
          error: errorMessage,
          url: config.siteUrl,
          attempt: 1
        });

        throw new Error(errorMessage);
      }

      // Emitir evento de inicialização bem-sucedida
      botEventEmitter.emit('scraper:initialized', {
        url: config.siteUrl,
        cookies: this.cookies.length > 0
      });

      logger.success('✅ Scraper inicializado com sucesso! Pronto para ler tokens.');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      // Emitir evento de erro se ainda não foi emitido
      if (!(error instanceof Error && error.message.includes('HTTP'))) {
        botEventEmitter.emit('scraper:error', {
          error: errorMessage,
          url: config.siteUrl,
          attempt: 1
        });
      }

      logger.error('❌ Erro ao inicializar scraper:', error);
      throw error;
    }
  }

  async extractTokens(): Promise<TokenInfo[]> {
    try {
      const response = await fetch(config.siteUrl, {
        headers: {
          'Cookie': this.cookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        const errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        // Emitir evento de erro
        botEventEmitter.emit('scraper:error', {
          error: errorMessage,
          url: config.siteUrl,
          attempt: 1
        });

        return [];
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Verificar se a tabela ainda existe (pode ter deslogado)
      const hasTable = $('#tokenFinderTable').length > 0;

      if (!hasTable) {
        // Emitir evento de cookies expirados
        botEventEmitter.emit('scraper:cookies_expired', {
          timestamp: new Date().toISOString()
        });

        botEventEmitter.emit('scraper:error', {
          error: 'Tabela de tokens não encontrada - sessão expirou',
          url: config.siteUrl,
          attempt: 1
        });

        return [];
      }

      const tokens: TokenInfo[] = [];

      $('#tokenFinderTable tbody tr').each((_, row) => {
        const $row = $(row);
        const tds = $row.find('td');

        // Pegar o ticker do <strong> dentro do primeiro td
        const ticker = $(tds[0]).find('strong').text().trim();

        // Pegar o mint do <small> dentro do segundo td
        const mint = $(tds[1]).find('small').text().trim();

        // Pegar o score do <strong> dentro do terceiro td
        const score = $(tds[2]).find('strong').text().trim();

        if (ticker && mint && score) {
          const tokenInfo = { ticker, mint, score };
          tokens.push(tokenInfo);

          // Emitir evento para cada token encontrado
          const tokenScore = parseInt(score) || 0;

          // Verificar se deve ser filtrado por score
          if (config.minScore > 0 && tokenScore < config.minScore) {
            botEventEmitter.emit('scraper:token_filtered', {
              token: tokenInfo,
              reason: `Score ${tokenScore} menor que mínimo ${config.minScore}`,
              score: tokenScore
            });
          } else {
            // Token passou no filtro
            botEventEmitter.emit('scraper:token_detected', {
              token: tokenInfo,
              score: tokenScore,
              url: config.siteUrl
            });
          }
        }
      });

      logger.info(`🔍 Scraping concluído: ${tokens.length} tokens encontrados`);
      return tokens;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      // Emitir evento de erro
      botEventEmitter.emit('scraper:error', {
        error: errorMessage,
        url: config.siteUrl,
        attempt: 1
      });

      logger.error('❌ Erro ao extrair tokens:', error);
      return [];
    }
  }

  // === NOVOS MÉTODOS EVENT-DRIVEN ===

  /**
   * Inicia o ciclo de scraping automático baseado em eventos
   */
  startScrapingLoop(): void {
    if (this.isRunning) {
      logger.warn('⚠️ Loop de scraping já está rodando');
      return;
    }

    this.isRunning = true;
    logger.info(`🔄 Loop de scraping iniciado (intervalo: ${config.checkIntervalMs}ms)`);

    // Primeira verificação imediata
    this.performScraping();

    // Loop contínuo
    this.scrapeInterval = setInterval(() => {
      this.performScraping();
    }, config.checkIntervalMs);
  }

  /**
   * Para o ciclo de scraping
   */
  stopScrapingLoop(): void {
    if (!this.isRunning) {
      logger.warn('⚠️ Loop de scraping já está parado');
      return;
    }

    this.isRunning = false;

    if (this.scrapeInterval) {
      clearInterval(this.scrapeInterval);
      this.scrapeInterval = null;
    }

    logger.info('⏹️ Loop de scraping parado');
  }

  /**
   * Executa uma verificação de scraping e emite eventos
   * Este método substitui o trabalho que o BotManager fazia
   */
  private async performScraping(): Promise<void> {
    if (!this.isRunning) return;

    try {
      logger.debug('🔍 Executando verificação de scraping...');

      // Extrai tokens - este método já emite eventos internamente
      await this.extractTokens();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      // Emitir evento de erro no ciclo de scraping
      botEventEmitter.emit('scraper:error', {
        error: errorMessage,
        url: config.siteUrl,
        attempt: 1
      });

      logger.error('❌ Erro no ciclo de scraping:', error);
    }
  }

  /**
   * Verifica se o scraping está rodando
   */
  isScrapingRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Força uma verificação única (sem afetar o loop)
   */
  async forceScrapeOnce(): Promise<void> {
    logger.info('🔍 Executando scraping forçado...');
    await this.performScraping();
  }

  async close(): Promise<void> {
    logger.info('🔄 Finalizando scraper...');

    // Parar loop se estiver rodando
    this.stopScrapingLoop();

    logger.success('✅ Scraper finalizado');
  }
}

export const scraperService = new ScraperService();