import { useState, useEffect } from 'react'
import { api, getErrorMessage } from '../lib/eden-api'
import { BotStatus } from './BotStatus'
import { PositionsTable } from './PositionsTable'
import { BotControls } from './BotControls'
import { BotConfig } from './BotConfig'
import { BotStats } from './BotStats'
import { BotLogs } from './BotLogs'

interface BotStatusData {
  isRunning: boolean;
  startedAt?: string;
  tokensMonitored: number;
  totalTransactions: number;
  lastCheck?: string;
}

interface Position {
  ticker: string;
  mint: string;
  entryUsd: number | null;
  entryAmountSol: number;
  currentPrice: number | null;
  highestPrice: number | null;
  highestMultiple: number | null;
  createdAt: string;
  lastUpdated: string;
  sold: {
    tp1?: boolean;
    tp2?: boolean;
    tp3?: boolean;
    tp4?: boolean;
  };
  paused?: boolean;
  pausedAt?: string;
}

interface PositionsData {
  all: Record<string, Position>;
  active: Record<string, Position>;
  count: {
    total: number;
    active: number;
    paused: number;
  };
}

export function BotDashboard() {
  const [botStatus, setBotStatus] = useState<BotStatusData | null>(null);
  const [positions, setPositions] = useState<PositionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'config' | 'logs'>('overview');

  // Função para buscar dados iniciais
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusRes, positionsRes] = await Promise.all([
        api.bot.status.get(),
        api.bot.positions.get()
      ]);

      if (statusRes.error) {
        throw new Error(getErrorMessage(statusRes.error));
      }

      if (positionsRes.error) {
        throw new Error(getErrorMessage(positionsRes.error));
      }

      setBotStatus(statusRes.data);
      setPositions(positionsRes.data);

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Efeito para buscar dados iniciais
  useEffect(() => {
    fetchData();
  }, []);

  // Atualizar dados automaticamente a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const tabClasses = (tab: string) =>
    `px-4 py-2 rounded-lg font-medium transition-colors ${
      activeTab === tab
        ? 'bg-blue-500 text-white'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`;

  if (loading && !botStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !botStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <h2 className="text-xl font-bold mb-2">Erro ao carregar</h2>
          <p>{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                ← Voltar
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                🤖 Token Finder Bot
              </h1>
            </div>
            {botStatus && <BotStatus status={botStatus} />}
          </div>

          {/* Navegação das abas */}
          <div className="flex space-x-2 pb-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={tabClasses('overview')}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('positions')}
              className={tabClasses('positions')}
            >
              Posições
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={tabClasses('config')}
            >
              Configurações
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={tabClasses('logs')}
            >
              Logs
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Erro</p>
            <p>{error}</p>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Controles do bot */}
            {botStatus && (
              <BotControls
                status={botStatus}
                onStatusChange={(newStatus) => setBotStatus(newStatus)}
              />
            )}

            {/* Estatísticas */}
            <BotStats />

            {/* Posições resumo */}
            {positions && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Total de Posições</h3>
                  <p className="text-3xl font-bold text-blue-600">{positions.count.total}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Posições Ativas</h3>
                  <p className="text-3xl font-bold text-green-600">{positions.count.active}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Posições Pausadas</h3>
                  <p className="text-3xl font-bold text-yellow-600">{positions.count.paused}</p>
                </div>
              </div>
            )}

            {/* Tabela de posições (resumo) */}
            {positions && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Posições Ativas</h3>
                </div>
                <PositionsTable positions={positions.active} showAll={false} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'positions' && positions && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Todas as Posições</h3>
            </div>
            <PositionsTable positions={positions.all} showAll={true} />
          </div>
        )}

        {activeTab === 'config' && (
          <BotConfig />
        )}

        {activeTab === 'logs' && (
          <BotLogs />
        )}
      </div>
    </div>
  );
}