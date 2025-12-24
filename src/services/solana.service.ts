import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
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

  async getTokenBalance(mint: string): Promise<TokenBalance> {
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
