import { useState, useEffect } from 'react'
import { api, getErrorMessage } from '../lib/eden-api'
import { BotStatus } from './BotStatus'
import { PositionsTable } from './PositionsTable'
import { BotControls } from './BotControls'
import { BotConfigComplete } from './BotConfigComplete'
import { BotStats } from './BotStats'
import { BotLogs } from './BotLogs'
import { TakeProfitManagerComplete } from './TakeProfitManagerComplete'
import { BotWallet } from './BotWallet'
import { WorkflowManager } from './WorkflowManager'
import { EventsTester } from './EventsTester'

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
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'wallet' | 'config' | 'takeprofit' | 'workflows' | 'events' | 'logs'>('overview');

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

  const menuItems = [
    { id: 'overview', icon: '📊', label: 'Visão Geral', color: 'from-blue-500 to-cyan-500' },
    { id: 'positions', icon: '💼', label: 'Posições', color: 'from-green-500 to-emerald-500' },
    { id: 'wallet', icon: '💰', label: 'Carteira', color: 'from-yellow-500 to-amber-500' },
    { id: 'workflows', icon: '🔗', label: 'Workflows', color: 'from-pink-500 to-rose-500' },
    { id: 'events', icon: '⚡', label: 'Event Tester', color: 'from-orange-500 to-red-500' },
    { id: 'config', icon: '⚙️', label: 'Configurações', color: 'from-gray-500 to-slate-500' },
    { id: 'takeprofit', icon: '🎯', label: 'Take Profits', color: 'from-purple-500 to-violet-500' },
    { id: 'logs', icon: '📋', label: 'Logs', color: 'from-indigo-500 to-blue-500' },
  ];

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white/90 backdrop-blur-sm shadow-2xl border-r border-white/20 flex flex-col relative overflow-hidden">
        {/* Gradient Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 via-purple-600/5 to-indigo-600/10"></div>

        {/* Header da Sidebar */}
        <div className="relative p-6 border-b border-gray-200/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">🤖</span>
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Token Finder</h2>
              <p className="text-sm font-medium text-gray-500">Trading Bot v2.0</p>
            </div>
          </div>
        </div>

        {/* Status do Bot */}
        <div className="relative p-4 border-b border-gray-200/50">
          {botStatus && <BotStatus status={botStatus} />}
        </div>

        {/* Menu Items */}
        <nav className="relative flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item, index) => (
              <li key={item.id} style={{ animationDelay: `${index * 100}ms` }} className="animate-fade-in">
                <button
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`group w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 transform hover:scale-105 relative overflow-hidden ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg shadow-blue-500/25'
                      : 'text-gray-700 hover:bg-white/70 hover:shadow-md'
                  }`}
                >
                  {/* Background gradient for active item */}
                  {activeTab === item.id && (
                    <div className="absolute inset-0 bg-gradient-to-r opacity-10 blur-sm"></div>
                  )}

                  {/* Icon with background */}
                  <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    activeTab === item.id
                      ? 'bg-white/20'
                      : 'bg-gray-100 group-hover:bg-white'
                  }`}>
                    <span className="text-lg">{item.icon}</span>
                  </div>

                  {/* Label */}
                  <span className={`relative font-semibold transition-all duration-300 ${
                    activeTab === item.id
                      ? 'text-white'
                      : 'text-gray-700 group-hover:text-gray-900'
                  }`}>
                    {item.label}
                  </span>

                  {/* Active indicator */}
                  {activeTab === item.id && (
                    <div className="absolute right-3 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer da Sidebar */}
        <div className="relative p-4 border-t border-gray-200/50">
          <button
            onClick={() => window.history.back()}
            className="group w-full flex items-center space-x-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 rounded-lg transition-all duration-300"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <span className="transform group-hover:-translate-x-1 transition-transform duration-300">←</span>
            </div>
            <span className="font-medium">Voltar</span>
          </button>

          {/* Version info */}
          <div className="mt-3 pt-3 border-t border-gray-200/50 text-center">
            <p className="text-xs text-gray-400 font-medium">
              Powered by Claude Code
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header Principal */}
        <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20 px-6 py-4 relative">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/30 to-purple-50/30"></div>

          <div className="relative flex justify-between items-center">
            {/* Title with gradient and icon */}
            <div className="flex items-center space-x-3 animate-slide-in-right">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${
                menuItems.find(item => item.id === activeTab)?.color || 'from-gray-500 to-slate-500'
              } flex items-center justify-center shadow-lg hover-lift animate-bounce-in`}>
                <span className="text-white text-lg">
                  {menuItems.find(item => item.id === activeTab)?.icon || '📊'}
                </span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient-x">
                {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
              </h1>
            </div>

            {/* Date with better styling */}
            <div className="flex flex-col items-end">
              <div className="text-sm font-semibold text-gray-700">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
              <div className="text-xs text-gray-500">
                {new Date().toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Área de Conteúdo */}
        <div className="flex-1 overflow-auto p-6 relative">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-transparent to-purple-100"></div>
          </div>

          <div className="relative z-10">
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-300 text-red-800 px-6 py-4 rounded-xl mb-6 shadow-md">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-lg">Erro</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
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

        {activeTab === 'wallet' && (
          <BotWallet />
        )}

        {activeTab === 'config' && (
          <BotConfigComplete />
        )}

        {activeTab === 'takeprofit' && (
          <TakeProfitManagerComplete />
        )}

        {activeTab === 'workflows' && (
          <WorkflowManager />
        )}

        {activeTab === 'events' && (
          <EventsTester />
        )}

        {activeTab === 'logs' && (
          <BotLogs />
        )}
          </div>
        </div>
      </div>
    </div>
  );
}