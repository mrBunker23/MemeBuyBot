import { useState, useEffect } from 'react'
import { api, getErrorMessage } from '../lib/eden-api'

interface Token {
  mint: string;
  symbol: string;
  amount: number;
  decimals: number;
  priceUsd: number;
  valueUsd: number;
  address: string;
}

interface WalletData {
  publicAddress: string;
  solBalance: number;
  totalValueUsd: number;
  tokensCount: number;
  tokens: Token[];
  lastUpdated: string;
}

export function BotWallet() {
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadWalletData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.bot.wallet.get()

      if (response.error) {
        throw new Error(getErrorMessage(response.error))
      }

      if (response.data.success && response.data.wallet) {
        setWalletData(response.data.wallet)
      } else {
        setError(response.data.message || 'Carteira não configurada')
      }

    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const refreshWallet = async () => {
    try {
      setLoading(true)
      setError(null)

      // Forçar atualização da carteira no backend
      const refreshResponse = await api.bot.wallet.refresh.post()

      if (refreshResponse.error) {
        throw new Error(getErrorMessage(refreshResponse.error))
      }

      // Recarregar dados da carteira
      await loadWalletData()

    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWalletData()
  }, [])

  const copyAddress = async () => {
    if (!walletData?.publicAddress) return

    try {
      await navigator.clipboard.writeText(walletData.publicAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar endereço:', err)
    }
  }

  const formatNumber = (num: number, decimals = 6) => {
    if (num < 0.000001 && num > 0) return '< 0.000001'
    return num.toLocaleString('en-US', { maximumFractionDigits: decimals })
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getExplorerLink = (address: string) => {
    return `https://solscan.io/address/${address}`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !walletData) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <div className="text-red-600 text-lg font-semibold mb-2">
            {error || 'Carteira não encontrada'}
          </div>
          <p className="text-gray-500 mb-4">
            Configure sua carteira na aba Configurações para ver os dados aqui.
          </p>
          <button
            onClick={loadWalletData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Carteira */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-bold text-gray-900">💰 Minha Carteira</h2>
          <div className="flex gap-2">
            <button
              onClick={refreshWallet}
              disabled={loading}
              className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm font-medium"
            >
              🔄 Recarregar Carteira
            </button>
            <button
              onClick={loadWalletData}
              disabled={loading}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
            >
              📊 Atualizar Dados
            </button>
          </div>
        </div>

        {/* Endereço Público */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Endereço Público</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-gray-900 bg-white px-2 py-1 rounded">
                  {formatAddress(walletData.publicAddress)}
                </code>
                <button
                  onClick={copyAddress}
                  className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs transition-colors"
                >
                  {copied ? '✅' : '📋'}
                </button>
                <a
                  href={getExplorerLink(walletData.publicAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-xs transition-colors"
                >
                  🔗
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 font-medium">Saldo SOL</p>
            <p className="text-2xl font-bold text-blue-900">
              {formatNumber(walletData.solBalance, 4)} SOL
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 font-medium">Valor Total</p>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(walletData.totalValueUsd)}
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-600 font-medium">Total de Tokens</p>
            <p className="text-2xl font-bold text-purple-900">
              {walletData.tokensCount}
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Última atualização: {new Date(walletData.lastUpdated).toLocaleString('pt-BR')}
        </p>
      </div>

      {/* Lista de Tokens */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">🪙 Tokens na Carteira</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Preço USD</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor USD</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {walletData.tokens.map((token, index) => (
                <tr key={token.mint} className={index === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        {token.symbol === 'SOL' ? '◎' : '🪙'}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{token.symbol}</div>
                        <div className="text-xs text-gray-500">{formatAddress(token.mint)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">{formatNumber(token.amount)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {token.priceUsd > 0 ? formatCurrency(token.priceUsd) : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {token.valueUsd > 0 ? formatCurrency(token.valueUsd) : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <a
                      href={getExplorerLink(token.mint)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-900 text-sm"
                    >
                      Ver no Explorer
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {walletData.tokens.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum token encontrado na carteira</p>
          </div>
        )}
      </div>
    </div>
  )
}