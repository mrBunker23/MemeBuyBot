import { useState, useEffect } from 'react'
import { api, getErrorMessage } from '../lib/eden-api'

interface StatsData {
  totalPositions: number;
  profitablePositions: number;
  winRate: number;
  totalProfit: number;
  totalInvested: number;
  roi: number;
  avgProfitPerPosition: number;
}

export function BotStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.bot.stats.get();

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      setStats(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas de Performance</h3>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas de Performance</h3>
        <div className="text-red-600 text-center">
          <p>Erro ao carregar estatísticas</p>
          <button
            onClick={fetchStats}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Estatísticas de Performance</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Posições */}
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalPositions}
          </div>
          <div className="text-sm text-gray-500">Total de Posições</div>
        </div>

        {/* Win Rate */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentage(stats.winRate)}
          </div>
          <div className="text-sm text-gray-500">
            Taxa de Sucesso ({stats.profitablePositions}/{stats.totalPositions})
          </div>
        </div>

        {/* ROI */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${stats.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.roi >= 0 ? '+' : ''}{formatPercentage(stats.roi)}
          </div>
          <div className="text-sm text-gray-500">ROI Total</div>
        </div>

        {/* Lucro Médio */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${stats.avgProfitPerPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(stats.avgProfitPerPosition)}
          </div>
          <div className="text-sm text-gray-500">Lucro Médio/Posição</div>
        </div>
      </div>

      {/* Detalhes adicionais */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Investimento Total</h4>
            <p className="text-lg text-blue-600">{formatCurrency(stats.totalInvested)}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Lucro/Prejuízo Total</h4>
            <p className={`text-lg ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.totalProfit >= 0 ? '+' : ''}{formatCurrency(stats.totalProfit)}
            </p>
          </div>
        </div>
      </div>

      {stats.totalPositions === 0 && (
        <div className="text-center text-gray-500 py-4">
          Nenhuma posição criada ainda. Inicie o bot para começar a monitorar tokens.
        </div>
      )}
    </div>
  );
}