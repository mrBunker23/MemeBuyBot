import { useState, useEffect } from 'react'
import { api, getErrorMessage } from '../lib/eden-api'

interface ConfigData {
  amountSol: number;
  slippageBps: number;
  checkIntervalMs: number;
  priceCheckSeconds: number;
  minScore: number;
  siteUrl: string;
  rpcUrl: string;
}

export function BotConfig() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [formData, setFormData] = useState<Partial<ConfigData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.bot.config.get();

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      setConfig(response.data.config);
      setFormData(response.data.config);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await api.bot.config.put(formData);

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      setConfig(response.data.config);
      setSuccess('Configuração atualizada com sucesso!');

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: keyof ConfigData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Bot</h3>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Configurações do Bot</h3>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Configurações de Trading */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Configurações de Trading</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade SOL por Trade
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={formData.amountSol ?? ''}
                onChange={(e) => handleInputChange('amountSol', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Quantidade de SOL investida em cada token
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slippage (bps)
              </label>
              <input
                type="number"
                min="1"
                max="5000"
                value={formData.slippageBps ?? ''}
                onChange={(e) => handleInputChange('slippageBps', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Slippage em basis points (100 bps = 1%)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score Mínimo
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.minScore ?? ''}
                onChange={(e) => handleInputChange('minScore', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Score mínimo para comprar tokens (0 = sem filtro)
              </p>
            </div>
          </div>
        </div>

        {/* Configurações de Monitoramento */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Configurações de Monitoramento</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalo de Scraping (ms)
              </label>
              <input
                type="number"
                min="1000"
                max="60000"
                step="1000"
                value={formData.checkIntervalMs ?? ''}
                onChange={(e) => handleInputChange('checkIntervalMs', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Intervalo entre verificações do site (mínimo: 1000ms)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalo de Preço (segundos)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={formData.priceCheckSeconds ?? ''}
                onChange={(e) => handleInputChange('priceCheckSeconds', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Intervalo entre verificações de preço
              </p>
            </div>
          </div>
        </div>

        {/* Configurações Read-Only */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Informações do Sistema</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site URL
              </label>
              <input
                type="text"
                value={config.siteUrl}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RPC URL
              </label>
              <input
                type="text"
                value={config.rpcUrl}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={fetchConfig}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Resetar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Salvando...</span>
              </>
            ) : (
              <span>Salvar Configurações</span>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h5 className="font-medium text-yellow-800 mb-2">⚠️ Importante</h5>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Mudanças nas configurações de monitoramento requerem reinicialização do bot</li>
          <li>• Valores muito baixos de intervalo podem sobrecarregar o sistema</li>
          <li>• Score mínimo alto pode fazer o bot perder oportunidades</li>
          <li>• Slippage muito baixo pode fazer transações falharem</li>
        </ul>
      </div>
    </div>
  );
}