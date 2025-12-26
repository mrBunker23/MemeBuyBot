import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { WalletConfigService } from "@/app/server/services/wallet-config.service"
import bs58 from 'bs58';
import { config } from '../config';
import type { TokenBalance } from '../types';

class SolanaService {
  public connection: Connection;
  public wallet: Keypair;
  private currentPrivateKey: string = '';

  constructor() {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.wallet = this.loadWallet(config.privateKey);
    this.currentPrivateKey = config.privateKey;

    console.log('🔥 Wallet:', this.wallet.publicKey.toString());
  }

  private loadWallet(privateKey: string): Keypair {
    // Se começar com "[", é um array JSON
    if (privateKey.trim().startsWith('[')) {
      const secretKey = new Uint8Array(JSON.parse(privateKey));
      return Keypair.fromSecretKey(secretKey);
    }

    // Caso contrário, assumir que é base58
    return Keypair.fromSecretKey(bs58.decode(privateKey));
  }

  /**
   * Busca TODOS os token accounts da carteira (Token Program + Token-2022)
   * Similar ao list-tokens-advanced.ts
   */
  async getAllTokenAccounts(): Promise<Map<string, TokenBalance>> {
    const tokenMap = new Map<string, TokenBalance>();

    try {
      // Método 1: Token Program (SPL Token padrão)
      const tokenAccounts1 = await this.connection.getParsedTokenAccountsByOwner(
        this.wallet.publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      for (const { account, pubkey } of tokenAccounts1.value) {
        const parsedInfo = account.data.parsed.info;
        const mint = parsedInfo.mint;
        const amount = parsedInfo.tokenAmount.amount;
        const decimals = parsedInfo.tokenAmount.decimals;

        tokenMap.set(mint, {
          ata: pubkey.toString(),
          amount: BigInt(amount),
          decimals: decimals,
        });
      }

      // Método 2: Token-2022 Program
      try {
        const tokenAccounts2 = await this.connection.getParsedTokenAccountsByOwner(
          this.wallet.publicKey,
          { programId: TOKEN_2022_PROGRAM_ID }
        );

        for (const { account, pubkey } of tokenAccounts2.value) {
          const parsedInfo = account.data.parsed.info;
          const mint = parsedInfo.mint;
          const amount = parsedInfo.tokenAmount.amount;
          const decimals = parsedInfo.tokenAmount.decimals;

          // Se já existe, manter o maior saldo
          const existing = tokenMap.get(mint);
          if (!existing || BigInt(amount) > existing.amount) {
            tokenMap.set(mint, {
              ata: pubkey.toString(),
              amount: BigInt(amount),
              decimals: decimals,
            });
          }
        }
      } catch (e) {
        // Token-2022 pode não estar disponível em alguns RPCs
      }
    } catch (error) {
      console.error('Erro ao buscar token accounts:', error);
    }

    return tokenMap;
  }

  async getTokenBalance(mint: string): Promise<TokenBalance> {
    try {
      // Primeiro tenta buscar de TODOS os token accounts
      const allTokens = await this.getAllTokenAccounts();
      const found = allTokens.get(mint);

      if (found && found.amount > 0n) {
        return found;
      }

      // Fallback: tenta buscar pelo ATA esperado (caso seja um token novo)
      const mintPk = new PublicKey(mint);
      const ata = await getAssociatedTokenAddress(mintPk, this.wallet.publicKey);

      const info = await this.connection
        .getTokenAccountBalance(ata)
        .catch(() => null);

      if (!info?.value) {
        return { ata: ata.toString(), amount: 0n, decimals: 0 };
      }

      return {
        ata: ata.toString(),
        amount: BigInt(info.value.amount),
        decimals: info.value.decimals,
      };
    } catch (error) {
      // Em caso de erro, retorna saldo zero
      const mintPk = new PublicKey(mint);
      const ata = await getAssociatedTokenAddress(mintPk, this.wallet.publicKey);
      return { ata: ata.toString(), amount: 0n, decimals: 0 };
    }
  }

  async signAndSendTransaction(txB64: string): Promise<string> {
    const tx = VersionedTransaction.deserialize(Buffer.from(txB64, 'base64'));
    tx.sign([this.wallet]);

    const sig = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    });

    return sig;
  }

  /**
   * Obtém o endereço público da carteira
   */
  async getWalletAddress(): Promise<string> {
    return this.wallet.publicKey.toString();
  }

  /**
   * Obtém o saldo SOL da carteira (em lamports)
   */
  async getSolBalance(): Promise<number> {
    return await this.connection.getBalance(this.wallet.publicKey);
  }

  /**
   * Recarrega a carteira com uma nova chave privada
   */
  async reloadWallet(privateKey: string): Promise<void> {
    if (this.currentPrivateKey !== privateKey) {
      console.log('🔄 Recarregando carteira com nova chave...');
      this.wallet = this.loadWallet(privateKey);
      this.currentPrivateKey = privateKey;
      console.log('🔥 Nova Wallet:', this.wallet.publicKey.toString());
    }
  }

  /**
   * Atualiza a carteira usando a configuração web atual
   */
  async updateFromWebConfig(): Promise<void> {
    try {
      // Tentar carregar do WalletConfigService
      const config = await WalletConfigService.loadConfig();

      if (config.privateKey && config.privateKey !== this.currentPrivateKey) {
        await this.reloadWallet(config.privateKey);
      }
    } catch (error) {
      console.warn('Não foi possível atualizar carteira do WalletConfigService:', error);
    }
  }

  /**
   * Obtém todos os saldos de tokens na carteira
   */
  async getAllTokenBalances(): Promise<Array<{
    mint: string;
    amount: number;
    decimals: number;
    symbol?: string;
    address: string;
  }>> {
    const tokenMap = await this.getAllTokenAccounts();
    const balances: Array<{
      mint: string;
      amount: number;
      decimals: number;
      symbol?: string;
      address: string;
    }> = [];

    for (const [mint, tokenBalance] of tokenMap) {
      if (Number(tokenBalance.amount) > 0) {
        balances.push({
          mint,
          amount: Number(tokenBalance.amount),
          decimals: tokenBalance.decimals,
          symbol: undefined, // Será preenchido pelo Jupiter se disponível
          address: tokenBalance.ata
        });
      }
    }

    return balances;
  }
}

export const solanaService = new SolanaService();