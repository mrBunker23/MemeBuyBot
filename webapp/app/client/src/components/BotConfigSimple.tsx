import { useState, useEffect } from 'react'

interface ConfigData {
  amountSol: number;
  slippageBps: number;
  checkIntervalMs: number;
  priceCheckSeconds: number;
  minScore: number;
  siteUrl: string;
  rpcUrl: string;
}

export function BotConfigSimple() {
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [formData, setFormData] = useState<Partial<ConfigData>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/bot/config')
      if (!response.ok) throw new Error('Falha ao carregar')

      const data = await response.json()
      setConfig(data.config)
      setFormData({
        amountSol: data.config.amountSol,
        slippageBps: data.config.slippageBps,
        checkIntervalMs: data.config.checkIntervalMs,
        priceCheckSeconds: data.config.priceCheckSeconds,
        minScore: data.config.minScore
      })
    } catch (error) {
      console.error('Erro ao carregar config:', error)
      setMessage({ type: 'error', text: 'Falha ao carregar configurações' })
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    try {
      setSaving(true)
      setMessage(null)

      const response = await fetch('/api/bot/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      if (!result.success) {
        setMessage({ type: 'error', text: result.message || 'Falha ao salvar configurações' })
        return
      }

      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' })
      setConfig(result.config)

    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof ConfigData, value: string) => {
    const numValue = parseFloat(value)
    setFormData(prev => ({
      ...prev,
      [field]: isNaN(numValue) ? 0 : numValue
    }))
  }

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mensagens */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-100 border border-green-400 text-green-700'
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Configurações Principais */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Configurações do Bot</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Amount SOL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💰 Quantidade por Compra (SOL)
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              max="1"
              value={formData.amountSol || ''}
              onChange={(e) => handleInputChange('amountSol', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.05"
            />
            <p className="text-xs text-gray-500 mt-1">Quantidade em SOL para cada compra de token</p>
          </div>

          {/* Min Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎯 Score Mínimo
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.minScore || ''}
              onChange={(e) => handleInputChange('minScore', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="15"
            />
            <p className="text-xs text-gray-500 mt-1">Score mínimo para comprar um token (0 = sem filtro)</p>
          </div>

          {/* Slippage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📉 Slippage (BPS)
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              value={formData.slippageBps || ''}
              onChange={(e) => handleInputChange('slippageBps', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="3000"
            />
            <p className="text-xs text-gray-500 mt-1">Tolerância de slippage (3000 = 30%)</p>
          </div>

          {/* Check Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ⏱️ Intervalo de Verificação (ms)
            </label>
            <input
              type="number"
              min="1000"
              max="30000"
              value={formData.checkIntervalMs || ''}
              onChange={(e) => handleInputChange('checkIntervalMs', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="2000"
            />
            <p className="text-xs text-gray-500 mt-1">Intervalo entre verificações do site (mínimo 1000ms)</p>
          </div>

          {/* Price Check */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📊 Intervalo de Preços (segundos)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={formData.priceCheckSeconds || ''}
              onChange={(e) => handleInputChange('priceCheckSeconds', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1"
            />
            <p className="text-xs text-gray-500 mt-1">Intervalo entre verificações de preço dos tokens</p>
          </div>
        </div>
      </div>

      {/* Informações Read-Only */}
      {config && (
        <div className="bg-gray-50 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ℹ️ Informações do Sistema</h3>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🌐 Site URL</label>
              <input
                type="text"
                value={config.siteUrl}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🔗 RPC URL</label>
              <input
                type="text"
                value={config.rpcUrl}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={loadConfig}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading ? 'Carregando...' : '🔄 Recarregar'}
        </button>

        <button
          onClick={saveConfig}
          disabled={saving || loading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : '💾 Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}