import * as cheerio from 'cheerio';
import fs from 'fs';
import { config } from '../config';
import type { TokenInfo } from '../types';

interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
}

class ScraperService {
  private cookies: string = '';

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
    console.log('🔐 Preparando cookies para requisição...');
    this.cookies = this.buildCookieHeader();

    console.log('🔍 Testando conexão com a página...');
    try {
      const response = await fetch(config.siteUrl, {
        headers: {
          'Cookie': this.cookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Verificar se a tabela existe
      const hasTable = $('#tokenFinderTable').length > 0;

      if (!hasTable) {
        // Debug
        const bodyText = $('body').text().substring(0, 200);
        console.log('📝 Preview do conteúdo:', bodyText);

        throw new Error(
          '❌ Não achei a tabela. Verifique:\n' +
          '1. Se você está logado no site\n' +
          '2. Se copiou TODOS os cookies (especialmente o "session")'
        );
      }

      console.log('✅ Conectado e autenticado! Pronto para ler tokens.');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Erro ao conectar: ${error.message}`);
      }
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

      const html = await response.text();
      const $ = cheerio.load(html);

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
          tokens.push({ ticker, mint, score });
        }
      });

      return tokens;
    } catch (error) {
      console.error('Erro ao extrair tokens:', error);
      return [];
    }
  }

  async close(): Promise<void> {
    // Não precisa mais fechar navegador
    console.log('✅ Scraper finalizado');
  }
}

export const scraperService = new ScraperService();
