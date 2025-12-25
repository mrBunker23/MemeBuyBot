import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import { config } from '../config';
import type { TokenBalance } from '../types';

class SolanaService {
  public connection: Connection;
  public wallet: Keypair;

  constructor() {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.wallet = this.loadWallet(config.privateKey);

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
}

export const solanaService = new SolanaService();