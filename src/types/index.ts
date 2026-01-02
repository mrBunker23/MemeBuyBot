export interface Config {
  siteUrl: string;
  baseUrl: string;
  solMint: string;
  privateKey: string;
  jupApiKey: string;
  jupApiKeys: string[]; // Array de múltiplas API keys para rotação
  rpcUrl: string;
  amountSol: number;
  slippageBps: number;
  checkIntervalMs: number;
  priceCheckSeconds: number;
  headless: boolean;
  stateFile: string;
  minScore: number;
  buyDelayMs: number; // Delay em milissegundos antes de executar a compra
}

export interface Stage {
  name: string;
  multiple: number;
  sellPercent: number; // 50 = 50%, 100 = 100%
}

export interface StopLoss {
  name: string;
  multiple: number; // Valores abaixo de 1 (0.8 = -20%, 0.6 = -40%)
  sellPercent: number; // 50 = 50%, 100 = 100%
}

export interface TokenInfo {
  ticker: string;
  mint: string;
  score: string;
}

export interface PriceHistory {
  timestamp: string;
  price: number;
  multiple: number;
}

export interface Position {
  ticker: string;
  mint: string;
  entryUsd: number | null;
  entryAmountSol: number;
  currentPrice: number | null;
  highestPrice: number | null;
  lowestPrice: number | null; // Novo: menor preço atingido
  highestMultiple: number | null;
  lowestMultiple: number | null; // Novo: menor múltiplo atingido
  createdAt: string;
  lastUpdated: string;
  sold: {
    tp1?: boolean;
    tp2?: boolean;
    tp3?: boolean;
    tp4?: boolean;
    sl1?: boolean; // Stop-loss executados
    sl2?: boolean;
    sl3?: boolean;
    sl4?: boolean;
    sl5?: boolean;
  };
  priceHistory: PriceHistory[];
  paused?: boolean; // Indica se o monitoramento está pausado (saldo = 0)
  pausedAt?: string; // Timestamp quando foi pausado
}

export interface State {
  seen: Record<string, boolean>;
  positions: Record<string, Position>;
}

export interface TokenBalance {
  ata: string;
  amount: bigint;
  decimals: number;
}

export interface UltraOrderParams {
  inputMint: string;
  outputMint: string;
  amountInt: string;
}

export interface UltraOrderResponse {
  ok: boolean;
  signature?: string;
  mode?: 'direct_tx' | 'execute_tx';
  requestId?: string;
  step?: string;
  raw?: any;
}

export interface JupiterPriceResponse {
  [mint: string]: {
    usdPrice?: number;
    blockId?: number;
    decimals?: number;
    priceChange24h?: number;
  };
}

export interface ScheduledBuy {
  mint: string;
  ticker: string;
  scheduledAt: Date;
  timeoutId: NodeJS.Timeout;
}
