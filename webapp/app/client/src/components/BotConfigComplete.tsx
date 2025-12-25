import { useState, useEffect } from 'react'

interface WebConfig {
  privateKey: string;
  jupApiKeys: string[];
  rpcUrl: string;
  amountSol: number;
  slippageBps: number;
  checkIntervalMs: number;
  priceCheckSeconds: number;
  minScore: number;
  siteUrl: string;
  headless: boolean;
  stages: Stage[];
  autoRestart: boolean;
  notifications: boolean;
  maxPositions: number;
  stopLossEnabled: boolean;
  stopLossPercent: number;
}

interface Stage {
  name: string;
  multiple: number;
  sellPercent: number;
}

export function BotConfigComplete() {
  const [config, setConfig] = useState<WebConfig | null>(null)
  const [formData, setFormData] = useState<WebConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSensitive, setShowSensitive] = useState(false)
  const [newApiKey, setNewApiKey] = useState('')

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
      setFormData(data.config)
    } catch (error) {
      console.error('Erro ao carregar config:', error)
      setMessage({ type: 'error', text: 'Falha ao carregar configurações' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData) return

    try {
      setLoading(true)
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
      await loadConfig()
    } catch (error) {
      console.error('Erro ao salvar config:', error)
      setMessage({ type: 'error', text: 'Falha ao salvar configurações' })
    } finally {
      setLoading(false)
    }
  }

  const handleResetDefaults = async () => {
    if (!confirm('Tem certeza que deseja restaurar as configurações padrão? Isso irá apagar todas as suas configurações personalizadas.')) {
      return
    }

    try {
      setLoading(true)
      setMessage({ type: 'error', text: 'Função de reset não disponível no momento' })
      // TODO: Implementar reset de configurações
      /*
      const response = await fetch('/api/bot/config/reset', { method: 'POST' })
      const result = await response.json()

      if (result.success) {
        setMessage({ type: 'success', text: 'Configurações resetadas para valores padrão!' })
        await loadConfig()
      } else {
        setMessage({ type: 'error', text: 'Falha ao resetar configurações' })
      }
      */
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao resetar configurações' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof WebConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData) return

    let value: any = e.target.value
    if (e.target.type === 'number') {
      value = parseFloat(value) || 0
    } else if (e.target.type === 'checkbox') {
      value = e.target.checked
    }

    setFormData({ ...formData, [field]: value })
  }

  const addApiKey = () => {
    if (!newApiKey.trim() || !formData) return
    setFormData({
      ...formData,
      jupApiKeys: [...formData.jupApiKeys, newApiKey.trim()]
    })
    setNewApiKey('')
  }

  const removeApiKey = (index: number) => {
    if (!formData) return
    setFormData({
      ...formData,
      jupApiKeys: formData.jupApiKeys.filter((_, i) => i !== index)
    })
  }

  const updateStage = (index: number, field: keyof Stage, value: number) => {
    if (!formData) return
    const newStages = [...formData.stages]
    newStages[index] = { ...newStages[index], [field]: value }
    setFormData({ ...formData, stages: newStages })
  }

  if (loading && !formData) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-white/10 rounded w-1/4"></div>
          <div className="h-4 bg-white/10 rounded w-3/4"></div>
          <div className="h-4 bg-white/10 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <p className="text-gray-400">Erro ao carregar configurações</p>
        <button
          onClick={loadConfig}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Configurações Completas</h3>
        <button
          onClick={handleResetDefaults}
          className="px-3 py-1 text-sm bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
        >
          Resetar Padrões
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg mb-6 ${
          message.type === 'success'
            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/20 border border-red-500/30 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Configurações Essenciais */}
        <div>
          <h4 className="text-lg font-medium text-white mb-4">🔑 Configurações Essenciais</h4>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Private Key Solana
                <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type={showSensitive ? 'text' : 'password'}
                  value={formData.privateKey}
                  onChange={handleInputChange('privateKey')}
                  placeholder="[1,2,3,...] ou base58 string"
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSensitive(!showSensitive)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                >
                  {showSensitive ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Jupiter API Keys
                <span className="text-red-400">*</span>
                <span className="text-xs text-gray-400 ml-2">(Múltiplas para rotação)</span>
              </label>
              <div className="space-y-2">
                {formData.jupApiKeys.map((key, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type={showSensitive ? 'text' : 'password'}
                      value={key}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => removeApiKey(index)}
                      className="px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      ❌
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder="Nova Jupiter API Key"
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addApiKey}
                    className="px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-colors"
                  >
                    ➕
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configurações de Trading */}
        <div>
          <h4 className="text-lg font-medium text-white mb-4">💰 Trading</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valor por Token (SOL)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                max="1"
                value={formData.amountSol}
                onChange={handleInputChange('amountSol')}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Slippage (BPS)
              </label>
              <input
                type="number"
                min="0"
                max="10000"
                value={formData.slippageBps}
                onChange={handleInputChange('slippageBps')}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Score Mínimo
              </label>
              <input
                type="number"
                min="0"
                value={formData.minScore}
                onChange={handleInputChange('minScore')}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Máximo de Posições
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.maxPositions}
                onChange={handleInputChange('maxPositions')}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Take Profit Stages */}
        <div>
          <h4 className="text-lg font-medium text-white mb-4">📊 Take Profit</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {formData.stages.map((stage, index) => (
              <div key={stage.name} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h5 className="text-sm font-medium text-white mb-3">{stage.name.toUpperCase()}</h5>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Múltiplo</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={stage.multiple}
                      onChange={(e) => updateStage(index, 'multiple', parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Venda %</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={stage.sellPercent}
                      onChange={(e) => updateStage(index, 'sellPercent', parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configurações Avançadas */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-lg font-medium text-white mb-4 hover:text-purple-300 transition-colors"
          >
            {showAdvanced ? '🔽' : '▶️'} Configurações Avançadas
          </button>

          {showAdvanced && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Intervalo de Verificação (ms)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    value={formData.checkIntervalMs}
                    onChange={handleInputChange('checkIntervalMs')}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Intervalo de Preços (s)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.priceCheckSeconds}
                    onChange={handleInputChange('priceCheckSeconds')}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    RPC URL
                  </label>
                  <input
                    type="url"
                    value={formData.rpcUrl}
                    onChange={handleInputChange('rpcUrl')}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.headless}
                    onChange={handleInputChange('headless')}
                    className="rounded"
                  />
                  Headless Browser
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoRestart}
                    onChange={handleInputChange('autoRestart')}
                    className="rounded"
                  />
                  Auto Restart
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifications}
                    onChange={handleInputChange('notifications')}
                    className="rounded"
                  />
                  Notificações
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.stopLossEnabled}
                    onChange={handleInputChange('stopLossEnabled')}
                    className="rounded"
                  />
                  Stop Loss
                </label>
              </div>

              {formData.stopLossEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Stop Loss %
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formData.stopLossPercent}
                    onChange={handleInputChange('stopLossPercent')}
                    className="w-full max-w-xs px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </button>

          <button
            type="button"
            onClick={loadConfig}
            disabled={loading}
            className="px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg font-medium hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Recarregar
          </button>
        </div>
      </form>
    </div>
  )
}