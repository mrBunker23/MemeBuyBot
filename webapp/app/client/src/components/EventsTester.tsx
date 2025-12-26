// Componente para testar sistema de eventos
import React, { useState, useEffect } from 'react';
import { Play, Activity, Zap, BarChart3, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export function EventsTester() {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState('price_change');

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    try {
      const response = await fetch('/api/events/test/status');
      const data = await response.json();
      setSystemStatus(data);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    }
  };

  const emitTestEvent = async () => {
    setIsLoading(true);
    try {
      const testData = getTestDataForEvent(selectedEventType);

      const response = await fetch('/api/events/test/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: selectedEventType,
          testData
        })
      });

      const result = await response.json();

      setTestResults(prev => [
        {
          id: Date.now(),
          type: selectedEventType,
          result,
          timestamp: new Date().toISOString(),
          success: result.success
        },
        ...prev.slice(0, 9) // Manter apenas os últimos 10
      ]);

      // Atualizar status após o teste
      setTimeout(loadSystemStatus, 500);

    } catch (error) {
      console.error('Erro ao emitir evento:', error);
      setTestResults(prev => [{
        id: Date.now(),
        type: selectedEventType,
        result: { success: false, error: (error as Error).message },
        timestamp: new Date().toISOString(),
        success: false
      }, ...prev.slice(0, 9)]);
    }
    setIsLoading(false);
  };

  const runStressTest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/events/test/stress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventCount: 20,
          delayMs: 50
        })
      });

      const result = await response.json();

      setTestResults(prev => [{
        id: Date.now(),
        type: 'stress_test',
        result,
        timestamp: new Date().toISOString(),
        success: result.success
      }, ...prev.slice(0, 9)]);

      // Atualizar status após o teste
      setTimeout(loadSystemStatus, 1000);

    } catch (error) {
      console.error('Erro no teste de stress:', error);
    }
    setIsLoading(false);
  };

  const testWorkflow = async (triggerType: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/events/test/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType,
          workflowData: getTestDataForEvent(triggerType)
        })
      });

      const result = await response.json();

      setTestResults(prev => [{
        id: Date.now(),
        type: `workflow_${triggerType}`,
        result,
        timestamp: new Date().toISOString(),
        success: result.success
      }, ...prev.slice(0, 9)]);

    } catch (error) {
      console.error('Erro ao testar workflow:', error);
    }
    setIsLoading(false);
  };

  const getTestDataForEvent = (eventType: string) => {
    switch (eventType) {
      case 'price_change':
        return { mint: 'TEST_MINT', price: 100 + Math.random() * 50, multiple: 2 + Math.random() };
      case 'take_profit':
        return { ticker: 'SOL', stage: 'tp1', multiple: 2.5, percentage: 25 };
      case 'buy_confirmed':
        return { ticker: 'BTC', price: 50000 + Math.random() * 10000 };
      case 'token_detected':
        return { ticker: 'NEWCOIN', score: 8 };
      case 'position_created':
        return { ticker: 'ETH', entryPrice: 3000, amount: 1000 };
      default:
        return {};
    }
  };

  const eventTypes = [
    { value: 'price_change', label: 'Price Change', description: 'Simulação de mudança de preço' },
    { value: 'take_profit', label: 'Take Profit', description: 'Simulação de take profit atingido' },
    { value: 'buy_confirmed', label: 'Buy Confirmed', description: 'Simulação de compra confirmada' },
    { value: 'token_detected', label: 'Token Detected', description: 'Simulação de token detectado' },
    { value: 'position_created', label: 'Position Created', description: 'Simulação de posição criada' },
    { value: 'bot_started', label: 'Bot Started', description: 'Simulação de bot iniciado' },
    { value: 'system_error', label: 'System Error', description: 'Simulação de erro do sistema' }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <Zap className="mr-3 text-blue-600" size={24} />
            Event System Tester
          </h1>
          <p className="text-gray-600">
            Ferramenta para testar o sistema de eventos tipados e workflows do bot
          </p>
        </div>

        {/* Status do Sistema */}
        {systemStatus && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Status do Sistema</h2>
              <button
                onClick={loadSystemStatus}
                className="text-blue-600 hover:text-blue-800"
                title="Atualizar"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded p-3">
                <div className="text-blue-700 font-medium">Eventos Ativos</div>
                <div className="text-2xl font-bold text-blue-900">
                  {systemStatus.eventSystem?.totalEvents || 0}
                </div>
              </div>

              <div className="bg-green-50 rounded p-3">
                <div className="text-green-700 font-medium">Listeners</div>
                <div className="text-2xl font-bold text-green-900">
                  {Object.values(systemStatus.eventSystem?.activeListeners || {})
                    .reduce((sum: number, count) => sum + count, 0)}
                </div>
              </div>

              <div className="bg-purple-50 rounded p-3">
                <div className="text-purple-700 font-medium">Workflows</div>
                <div className="text-2xl font-bold text-purple-900">
                  {systemStatus.workflowExecutor?.totalExecutions || 0}
                </div>
              </div>

              <div className="bg-orange-50 rounded p-3">
                <div className="text-orange-700 font-medium">Adapter</div>
                <div className="text-2xl font-bold text-orange-900">
                  {systemStatus.workflowAdapter?.isEnabled ? '✅' : '❌'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Controles de Teste */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Testes de Eventos</h2>

            {/* Seletor de Evento */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Evento
              </label>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {eventTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Botões de Teste */}
            <div className="space-y-3">
              <button
                onClick={emitTestEvent}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Play className="mr-2" size={16} />
                {isLoading ? 'Emitindo...' : 'Emitir Evento'}
              </button>

              <button
                onClick={() => testWorkflow(selectedEventType)}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Activity className="mr-2" size={16} />
                Testar Workflow
              </button>

              <button
                onClick={runStressTest}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                <BarChart3 className="mr-2" size={16} />
                Teste de Stress (20 eventos)
              </button>
            </div>
          </div>

          {/* Resultados dos Testes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resultados dos Testes</h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Nenhum teste executado ainda
                </div>
              ) : (
                testResults.map(test => (
                  <div key={test.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {test.success ? (
                          <CheckCircle className="text-green-500 mr-2" size={16} />
                        ) : (
                          <XCircle className="text-red-500 mr-2" size={16} />
                        )}
                        <span className="font-medium text-gray-900">
                          {test.type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(test.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {test.result.message && (
                      <div className="text-sm text-gray-600 mb-1">
                        {test.result.message}
                      </div>
                    )}

                    {test.result.error && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {test.result.error}
                      </div>
                    )}

                    {test.result.results && (
                      <div className="text-xs text-gray-500 mt-2">
                        {test.result.results.eventsEmitted} eventos em {test.result.results.executionTime}ms
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Informações do Sistema */}
        {systemStatus && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalhes do Sistema</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Event Counts */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Contadores de Eventos</h3>
                <div className="space-y-1">
                  {Object.entries(systemStatus.eventSystem?.eventCounts || {}).map(([event, count]) => (
                    <div key={event} className="flex justify-between text-sm">
                      <span className="text-gray-600">{event}</span>
                      <span className="font-medium">{String(count)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Listeners */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Listeners Ativos</h3>
                <div className="space-y-1">
                  {Object.entries(systemStatus.eventSystem?.activeListeners || {}).map(([event, count]) => (
                    <div key={event} className="flex justify-between text-sm">
                      <span className="text-gray-600">{event}</span>
                      <span className="font-medium">{String(count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}