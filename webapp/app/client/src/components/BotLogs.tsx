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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<'all' | 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR'>('all');
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [offset, setOffset] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const LOGS_PER_PAGE = 50; // Quantidade de logs por carregamento

  const fetchLogs = async (isLoadMore = false, customOffset?: number) => {
    try {
      if (!isLoadMore) {
        setError(null);
      }
      if (isLoadMore) {
        setLoadingMore(true);
      }

      // Sempre buscar os logs mais recentes por padrão
      const response = await api.bot.logs.get();

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      const allLogs = response.data.logs || [];
      const currentOffset = customOffset ?? offset;

      if (!isLoadMore) {
        // Primeira carga: pegar apenas os últimos logs
        const recentLogs = allLogs.slice(-LOGS_PER_PAGE);
        setLogs(recentLogs);
        setTotalLogs(allLogs.length);
        setHasMoreLogs(allLogs.length > LOGS_PER_PAGE);
        setOffset(Math.max(0, allLogs.length - LOGS_PER_PAGE));
      } else {
        // Carregamento adicional: pegar logs anteriores
        const newOffset = Math.max(0, currentOffset - LOGS_PER_PAGE);
        const olderLogs = allLogs.slice(newOffset, currentOffset);

        setLogs(prevLogs => [...olderLogs, ...prevLogs]);
        setOffset(newOffset);
        setHasMoreLogs(newOffset > 0);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (loading) {
        setLoading(false);
      }
      if (isLoadMore) {
        setLoadingMore(false);
      }
    }
  };

  const loadMoreLogs = async () => {
    if (!hasMoreLogs || loadingMore) return;
    await fetchLogs(true);
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
    const isAtTop = scrollTop <= 10;

    // Controle do auto-scroll
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }

    // Lazy loading: carregar mais logs quando chegar no topo
    if (isAtTop && hasMoreLogs && !loadingMore) {
      const currentScrollHeight = scrollHeight;
      loadMoreLogs().then(() => {
        // Manter posição do scroll após carregar mais logs
        setTimeout(() => {
          if (logsContainerRef.current) {
            const newScrollHeight = logsContainerRef.current.scrollHeight;
            const scrollDiff = newScrollHeight - currentScrollHeight;
            logsContainerRef.current.scrollTop = scrollTop + scrollDiff;
          }
        }, 100);
      });
    }
  };

  useEffect(() => {
    fetchLogs();

    // Atualizar apenas os logs mais recentes a cada 5 segundos (para não interferir no lazy loading)
    const interval = setInterval(() => {
      // Só faz refresh se estiver no auto-scroll (vendo logs recentes)
      if (autoScroll) {
        fetchLogs();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [autoScroll]);

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
        className="bg-gray-900 text-gray-100 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm relative"
      >
        {/* Loading indicator no topo */}
        {loadingMore && (
          <div className="sticky top-0 bg-gray-800 border border-gray-700 rounded-md p-2 mb-2 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
            <span className="text-xs text-gray-300">Carregando logs anteriores...</span>
          </div>
        )}

        {/* Indicador se há mais logs para carregar */}
        {hasMoreLogs && !loadingMore && filteredLogs.length > 0 && (
          <div className="sticky top-0 bg-gray-800 border border-gray-600 rounded-md p-1 mb-2 text-center z-10">
            <span className="text-xs text-gray-400">↑ Role para cima para carregar mais logs ({totalLogs - logs.length} restantes)</span>
          </div>
        )}

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
      <div className="mt-4 text-xs text-gray-500 flex flex-col sm:flex-row justify-between space-y-1 sm:space-y-0">
        <span>
          Mostrando {filteredLogs.length} de {totalLogs} {filter === 'all' ? 'logs' : `logs de ${filter}`}
          {hasMoreLogs && ` • ${totalLogs - logs.length} logs anteriores disponíveis`}
        </span>
        <span>
          {autoScroll ? 'Atualização automática ativa (5s)' : 'Atualização pausada • Role para baixo para reativar'}
        </span>
      </div>
    </div>
  );
}