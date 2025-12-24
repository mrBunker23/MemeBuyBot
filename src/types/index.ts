export interface Config {
  siteUrl: string;
  baseUrl: string;
  solMint: string;
  privateKey: string;
  jupApiKey: string;
  rpcUrl: string;
  amountSol: number;
  slippageBps: number;
  checkIntervalMs: number;
  priceCheckSeconds: number;
  headless: boolean;
  stateFile: string;
  minScore: number;
}

export interface Stage {
  name: string;
  multiple: number;
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
  highestMultiple: number | null;
  createdAt: string;
  lastUpdated: string;
  sold: {
    tp1?: boolean;
    tp2?: boolean;
    tp3?: boolean;
    tp4?: boolean;
  };
  priceHistory: PriceHistory[];
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
