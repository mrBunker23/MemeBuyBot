import bs58 from 'bs58'

export interface PrivateKeyValidation {
  isValid: boolean
  format?: 'bytes' | 'base64' | 'base58'
  error?: string
  normalizedKey?: string // Sempre em formato base58 para uso interno
}

export class PrivateKeyService {
  /**
   * Detecta automaticamente o formato da chave privada
   */
  static detectFormat(input: string): 'bytes' | 'base64' | 'base58' | 'unknown' {
    const trimmed = input.trim()

    // Formato bytes array: [1,2,3,...]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return 'bytes'
    }

    // Formato base58: caracteres específicos, tamanho ~87-88
    if (/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(trimmed)) {
      return 'base58'
    }

    // Formato base64: caracteres base64, múltiplo de 4, com/sem padding
    if (/^[A-Za-z0-9+/]*(={0,2})$/.test(trimmed) && trimmed.length % 4 === 0) {
      return 'base64'
    }

    return 'unknown'
  }

  /**
   * Valida e normaliza uma chave privada em qualquer formato
   */
  static validateAndNormalize(input: string): PrivateKeyValidation {
    if (!input || input.trim().length === 0) {
      return {
        isValid: false,
        error: 'Chave privada é obrigatória'
      }
    }

    const trimmed = input.trim()
    const format = this.detectFormat(trimmed)

    try {
      let keyBytes: Uint8Array

      switch (format) {
        case 'bytes':
          keyBytes = this.parseBytesArray(trimmed)
          break

        case 'base64':
          keyBytes = this.parseBase64(trimmed)
          break

        case 'base58':
          keyBytes = this.parseBase58(trimmed)
          break

        default:
          return {
            isValid: false,
            format: undefined,
            error: 'Formato de chave não reconhecido. Use bytes array [1,2,3,...], base64 ou base58'
          }
      }

      // Validar tamanho da chave (deve ter 64 bytes para Solana)
      if (keyBytes.length !== 64) {
        return {
          isValid: false,
          format,
          error: `Chave deve ter 64 bytes, mas tem ${keyBytes.length} bytes`
        }
      }

      // Converter para base58 (formato padrão interno)
      const normalizedKey = bs58.encode(keyBytes)

      return {
        isValid: true,
        format,
        normalizedKey
      }

    } catch (error) {
      return {
        isValid: false,
        format,
        error: `Erro ao processar chave no formato ${format}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Converte array de bytes string para Uint8Array
   */
  private static parseBytesArray(input: string): Uint8Array {
    // Remove espacos e quebras de linha
    const cleaned = input.replace(/\s/g, '')

    // Valida formato básico
    if (!cleaned.startsWith('[') || !cleaned.endsWith(']')) {
      throw new Error('Array deve começar com [ e terminar com ]')
    }

    // Extrai conteúdo entre colchetes
    const content = cleaned.slice(1, -1)

    if (content.length === 0) {
      throw new Error('Array não pode estar vazio')
    }

    // Separa por vírgulas e converte para números
    const numbers = content.split(',').map(str => {
      const num = parseInt(str.trim(), 10)
      if (isNaN(num) || num < 0 || num > 255) {
        throw new Error(`Valor inválido no array: ${str}. Deve ser um número entre 0 e 255`)
      }
      return num
    })

    return new Uint8Array(numbers)
  }

  /**
   * Converte string base64 para Uint8Array
   */
  private static parseBase64(input: string): Uint8Array {
    try {
      // Usar Buffer para decodificar base64
      const buffer = Buffer.from(input, 'base64')
      return new Uint8Array(buffer)
    } catch (error) {
      throw new Error('Base64 inválido')
    }
  }

  /**
   * Converte string base58 para Uint8Array
   */
  private static parseBase58(input: string): Uint8Array {
    try {
      return bs58.decode(input)
    } catch (error) {
      throw new Error('Base58 inválido')
    }
  }

  /**
   * Converte chave base58 de volta para outros formatos (para exibição)
   */
  static convertFromBase58(base58Key: string, targetFormat: 'bytes' | 'base64' | 'base58'): string {
    try {
      const keyBytes = bs58.decode(base58Key)

      switch (targetFormat) {
        case 'bytes':
          return '[' + Array.from(keyBytes).join(',') + ']'

        case 'base64':
          return Buffer.from(keyBytes).toString('base64')

        case 'base58':
          return base58Key

        default:
          throw new Error('Formato de destino inválido')
      }
    } catch (error) {
      throw new Error(`Erro na conversão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  /**
   * Obfusca uma chave para exibição segura
   */
  static obfuscateKey(key: string, format: 'bytes' | 'base64' | 'base58'): string {
    if (!key) return ''

    switch (format) {
      case 'bytes':
        return '[••••,••••,••••,...]'
      case 'base64':
        return '••••••••••••••••••••'
      case 'base58':
        return '••••••••••••••••••••••••••••••••'
      default:
        return '••••••••••••••••••••••••••••••••'
    }
  }
}