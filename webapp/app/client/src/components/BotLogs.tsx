import { useState, useEffect, useRef } from 'react'
import { api, getErrorMessage } from '../lib/eden-api'

interface LogEntry {
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  message: string;
  timestamp: string;
  error?: any;
}

export function BotLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<'all' | 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR'>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      if (loading) {
        setError(null);
      }

      const response = await api.bot.logs.get();

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      setLogs(response.data.logs || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (loading) {
        setLoading(false);
      }
    }
  };

  const scrollToBottom = () => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!logsContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Atualizar logs a cada 2 segundos
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [logs, autoScroll]);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'SUCCESS':
        return 'text-green-600';
      case 'WARN':
        return 'text-yellow-600';
      case 'ERROR':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'SUCCESS':
        return '✅';
      case 'WARN':
        return '⚠️';
      case 'ERROR':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR');
  };

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(log => log.level === filter);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Logs do Bot</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Carregando logs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header com controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
        <h3 className="text-lg font-semibold text-gray-900">Logs do Bot</h3>

        <div className="flex items-center space-x-4">
          {/* Filtro de nível */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            <option value="INFO">Info</option>
            <option value="SUCCESS">Sucesso</option>
            <option value="WARN">Aviso</option>
            <option value="ERROR">Erro</option>
          </select>

          {/* Toggle auto-scroll */}
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            <span>Auto-scroll</span>
          </label>

          {/* Botão de atualização manual */}
          <button
            onClick={fetchLogs}
            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Container de logs */}
      <div
        ref={logsContainerRef}
        onScroll={handleScroll}
        className="bg-gray-900 text-gray-100 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            {filter === 'all' ? 'Nenhum log encontrado' : `Nenhum log do tipo ${filter} encontrado`}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span className="text-gray-400 text-xs w-20 flex-shrink-0">
                  {formatTime(log.timestamp)}
                </span>
                <span className="flex-shrink-0">
                  {getLevelIcon(log.level)}
                </span>
                <span className={`text-xs w-12 flex-shrink-0 ${getLevelColor(log.level)}`}>
                  {log.level}
                </span>
                <span className="flex-1 break-words">
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer com informações */}
      <div className="mt-4 text-xs text-gray-500 flex justify-between">
        <span>
          Mostrando {filteredLogs.length} {filter === 'all' ? 'logs' : `logs de ${filter}`}
        </span>
        <span>
          Atualizado automaticamente a cada 2 segundos
        </span>
      </div>
    </div>
  );
}