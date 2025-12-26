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
    <div className="space-y-2">
      {/* Status indicator */}
      <div className="flex items-center space-x-2">
        <div
          className={`w-2 h-2 rounded-full ${
            status.isRunning ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="font-medium text-gray-900 text-sm">
          {status.isRunning ? 'Rodando' : 'Parado'}
        </span>
      </div>

      {/* Informações compactas */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>Monitorando: {status.tokensMonitored} tokens</div>
        <div>Última verificação: {formatLastCheck(status.lastCheck)}</div>
        {status.isRunning && (
          <div>Uptime: {formatUptime(status.startedAt)}</div>
        )}
      </div>
    </div>
  );
}