interface BotStatusProps {
  status: {
    isRunning: boolean;
    startedAt?: string;
    tokensMonitored: number;
    totalTransactions: number;
    lastCheck?: string;
  };
}

export function BotStatus({ status }: BotStatusProps) {
  const formatUptime = (startedAt?: string) => {
    if (!startedAt) return 'N/A';

    const start = new Date(startedAt);
    const now = new Date();
    const diff = now.getTime() - start.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  const formatLastCheck = (lastCheck?: string) => {
    if (!lastCheck) return 'N/A';

    const check = new Date(lastCheck);
    const now = new Date();
    const diff = now.getTime() - check.getTime();

    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m atrás`;
    return `${Math.floor(diff / 3600000)}h atrás`;
  };

  return (
    <div className="flex items-center space-x-4">
      {/* Status indicator */}
      <div className="flex items-center space-x-2">
        <div
          className={`w-3 h-3 rounded-full ${
            status.isRunning ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="font-medium text-gray-900">
          {status.isRunning ? 'Rodando' : 'Parado'}
        </span>
      </div>

      {/* Uptime */}
      {status.isRunning && (
        <div className="text-sm text-gray-500">
          Uptime: {formatUptime(status.startedAt)}
        </div>
      )}

      {/* Tokens monitorados */}
      <div className="text-sm text-gray-500">
        Monitorando: {status.tokensMonitored} tokens
      </div>

      {/* Última verificação */}
      <div className="text-sm text-gray-500">
        Última verificação: {formatLastCheck(status.lastCheck)}
      </div>
    </div>
  );
}