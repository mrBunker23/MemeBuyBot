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

interface PositionsTableProps {
  positions: Record<string, Position>;
  showAll?: boolean;
}

export function PositionsTable({ positions, showAll = false }: PositionsTableProps) {
  const positionsList = Object.entries(positions);

  // Se não for showAll, mostrar apenas primeiras 5
  const displayPositions = showAll ? positionsList : positionsList.slice(0, 5);

  const formatPrice = (price: number | null) => {
    if (price === null) return 'N/A';
    if (price < 0.000001) return price.toExponential(3);
    return `$${price.toFixed(6)}`;
  };

  const formatMultiple = (current: number | null, entry: number | null) => {
    if (!current || !entry) return 'N/A';
    const multiple = current / entry;
    const percentage = ((multiple - 1) * 100).toFixed(2);
    return (
      <span className={multiple >= 1 ? 'text-green-600' : 'text-red-600'}>
        {multiple.toFixed(2)}x ({percentage >= '0' ? '+' : ''}{percentage}%)
      </span>
    );
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const getTpStatus = (sold: Position['sold']) => {
    const tps = [];
    if (sold.tp1) tps.push('TP1');
    if (sold.tp2) tps.push('TP2');
    if (sold.tp3) tps.push('TP3');
    if (sold.tp4) tps.push('TP4');

    if (tps.length === 0) {
      return <span className="text-gray-500">Aguardando</span>;
    }

    return (
      <div className="flex space-x-1">
        {tps.map(tp => (
          <span key={tp} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
            {tp}
          </span>
        ))}
      </div>
    );
  };

  if (displayPositions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma posição encontrada
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Token
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Entrada
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Preço Atual
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Performance
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Maior Alta
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              TPs Executados
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Criado
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {displayPositions.map(([mint, position]) => (
            <tr key={mint} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {position.ticker}
                  </div>
                  <div className="text-xs text-gray-500">
                    {mint.substring(0, 8)}...
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>
                  {formatPrice(position.entryUsd)}
                  <div className="text-xs text-gray-500">
                    {position.entryAmountSol} SOL
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatPrice(position.currentPrice)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {formatMultiple(position.currentPrice, position.entryUsd)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div>
                  {formatPrice(position.highestPrice)}
                  {position.highestMultiple && (
                    <div className="text-xs text-green-600">
                      Pico: {position.highestMultiple.toFixed(2)}x
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {getTpStatus(position.sold)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {position.paused ? (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                    Pausado
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    Ativo
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                {formatTime(position.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!showAll && positionsList.length > 5 && (
        <div className="px-6 py-4 bg-gray-50 text-center">
          <p className="text-sm text-gray-500">
            Mostrando 5 de {positionsList.length} posições.
            Vá para a aba "Posições" para ver todas.
          </p>
        </div>
      )}
    </div>
  );
}