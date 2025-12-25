import { useState } from 'react'
import { api, getErrorMessage } from '../lib/eden-api'

interface BotControlsProps {
  status: {
    isRunning: boolean;
    startedAt?: string;
    tokensMonitored: number;
    totalTransactions: number;
    lastCheck?: string;
  };
  onStatusChange: (newStatus: any) => void;
}

export function BotControls({ status, onStatusChange }: BotControlsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.bot.start.post();

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      onStatusChange(response.data.status);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.bot.stop.post();

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      onStatusChange(response.data.status);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Controles do Bot</h3>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="flex space-x-4">
        {!status.isRunning ? (
          <button
            onClick={handleStart}
            disabled={loading}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Iniciando...</span>
              </>
            ) : (
              <>
                <span>▶️</span>
                <span>Iniciar Bot</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={loading}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Parando...</span>
              </>
            ) : (
              <>
                <span>⏹️</span>
                <span>Parar Bot</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          🔄 Atualizar
        </button>
      </div>

      {status.isRunning && (
        <div className="mt-4 text-sm text-gray-600">
          <p>✅ Bot está rodando e monitorando tokens automaticamente</p>
          <p>📊 Para parar o bot, clique em "Parar Bot" acima</p>
        </div>
      )}

      {!status.isRunning && (
        <div className="mt-4 text-sm text-gray-600">
          <p>⏹️ Bot está parado</p>
          <p>▶️ Para iniciar o monitoramento, clique em "Iniciar Bot" acima</p>
        </div>
      )}
    </div>
  );
}