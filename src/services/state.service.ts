import fs from 'fs';
import type { State, Position } from '../types';
import { config } from '../config';

class StateService {
  private state: State;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): State {
    try {
      const data = fs.readFileSync(config.stateFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return { seen: {}, positions: {} };
    }
  }

  private saveState(): void {
    fs.writeFileSync(config.stateFile, JSON.stringify(this.state, null, 2));
  }

  getState(): State {
    return this.state;
  }

  markAsSeen(mint: string): void {
    this.state.seen[mint] = true;
    this.saveState();
  }

  isSeen(mint: string): boolean {
    return !!this.state.seen[mint];
  }

  createPosition(mint: string, ticker: string, entryUsd: number | null, entryAmountSol: number): void {
    const now = new Date().toISOString();
    this.state.positions[mint] = {
      ticker,
      mint,
      entryUsd,
      entryAmountSol,
      currentPrice: entryUsd,
      highestPrice: entryUsd,
      highestMultiple: 1,
      createdAt: now,
      lastUpdated: now,
      sold: { tp1: false, tp2: false, tp3: false, tp4: false },
      priceHistory: entryUsd ? [{
        timestamp: now,
        price: entryUsd,
        multiple: 1
      }] : [],
    };
    this.saveState();
  }

  getPosition(mint: string): Position | undefined {
    return this.state.positions[mint];
  }

  updatePositionEntry(mint: string, entryUsd: number): void {
    const pos = this.state.positions[mint];
    if (pos) {
      pos.entryUsd = entryUsd;
      pos.currentPrice = entryUsd;
      pos.highestPrice = entryUsd;
      pos.highestMultiple = 1;
      pos.priceHistory = [{
        timestamp: new Date().toISOString(),
        price: entryUsd,
        multiple: 1
      }];
      this.saveState();
    }
  }

  updatePrice(mint: string, currentPrice: number): void {
    const pos = this.state.positions[mint];
    if (pos && pos.entryUsd) {
      const multiple = currentPrice / pos.entryUsd;
      const now = new Date().toISOString();

      pos.currentPrice = currentPrice;
      pos.lastUpdated = now;

      // Atualizar maior preço
      if (currentPrice > (pos.highestPrice || 0)) {
        pos.highestPrice = currentPrice;
        pos.highestMultiple = multiple;
      }

      // Adicionar ao histórico (máximo 100 entradas)
      pos.priceHistory.push({
        timestamp: now,
        price: currentPrice,
        multiple
      });

      // Manter apenas últimas 100 entradas
      if (pos.priceHistory.length > 100) {
        pos.priceHistory = pos.priceHistory.slice(-100);
      }

      this.saveState();
    }
  }

  markStageSold(mint: string, stageName: string): void {
    const pos = this.state.positions[mint];
    if (pos) {
      pos.sold[stageName as keyof Position['sold']] = true;
      pos.lastUpdated = new Date().toISOString();
      this.saveState();
    }
  }

  getAllPositions(): Record<string, Position> {
    return this.state.positions;
  }

  getActivePositions(): Record<string, Position> {
    const activePositions: Record<string, Position> = {};
    for (const [mint, position] of Object.entries(this.state.positions)) {
      if (!position.paused) {
        activePositions[mint] = position;
      }
    }
    return activePositions;
  }

  pausePosition(mint: string): void {
    const pos = this.state.positions[mint];
    if (pos && !pos.paused) {
      pos.paused = true;
      pos.pausedAt = new Date().toISOString();
      pos.lastUpdated = new Date().toISOString();
      this.saveState();
    }
  }

  reactivatePosition(mint: string, newEntryPrice: number): void {
    const pos = this.state.positions[mint];
    if (pos && pos.paused) {
      const now = new Date().toISOString();

      // Limpar dados de performance anterior
      pos.paused = false;
      pos.pausedAt = undefined;
      pos.entryUsd = newEntryPrice;
      pos.currentPrice = newEntryPrice;
      pos.highestPrice = newEntryPrice;
      pos.highestMultiple = 1;
      pos.lastUpdated = now;
      pos.sold = { tp1: false, tp2: false, tp3: false, tp4: false };
      pos.priceHistory = [{
        timestamp: now,
        price: newEntryPrice,
        multiple: 1
      }];

      this.saveState();
    }
  }
}

export const stateService = new StateService();
