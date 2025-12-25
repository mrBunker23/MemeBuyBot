import { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../lib/eden-api';

interface Stage {
  id: string;
  name: string;
  multiple: number;
  sellPercent: number;
  enabled: boolean;
  order: number;
}

interface TakeProfitData {
  success: boolean;
  stages: Stage[];
  validation: {
    valid: boolean;
    errors: string[];
  };
}

export function TakeProfitManager() {
  const [data, setData] = useState<TakeProfitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado para novo TP
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTP, setNewTP] = useState({
    name: '',
    multiple: 2,
    sellPercent: 50,
    enabled: true
  });

  // Estados para edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Stage>>({});

  // Carregar dados
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Por enquanto usar a rota simples que criamos
      const response = await fetch('/api/bot/takeprofit');
      if (!response.ok) throw new Error('Falha ao carregar');

      const result = await response.json();
      setData(result);

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Adicionar novo TP
  const handleAddTP = async () => {
    if (!newTP.name.trim()) {
      setMessage({ type: 'error', text: 'Nome é obrigatório' });
      return;
    }

    if (newTP.multiple <= 1) {
      setMessage({ type: 'error', text: 'Múltiplo deve ser maior que 1' });
      return;
    }

    if (newTP.sellPercent <= 0 || newTP.sellPercent > 100) {
      setMessage({ type: 'error', text: 'Percentual deve estar entre 1% e 100%' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      // Usar API real de criação
      const response = await fetch('/api/bot/takeprofit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTP)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Falha ao criar Take Profit');
      }

      setMessage({ type: 'success', text: result.message });
      setShowAddForm(false);
      setNewTP({ name: '', multiple: 2, sellPercent: 50, enabled: true });

      // Recarregar dados
      await loadData();

    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  // Iniciar edição
  const startEdit = (stage: Stage) => {
    setEditingId(stage.id);
    setEditForm(stage);
  };

  // Cancelar edição
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Salvar edição
  const saveEdit = async () => {
    if (!editForm.name?.trim()) {
      setMessage({ type: 'error', text: 'Nome é obrigatório' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      // Usar API real de atualização
      const response = await fetch(`/api/bot/takeprofit/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Falha ao atualizar Take Profit');
      }

      setMessage({ type: 'success', text: result.message });
      setEditingId(null);
      setEditForm({});

      // Recarregar dados
      await loadData();

    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  // Toggle habilitado/desabilitado
  const toggleEnabled = async (stage: Stage) => {
    try {
      setSaving(true);
      setMessage(null);

      // Usar API real de toggle
      const response = await fetch(`/api/bot/takeprofit/${stage.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !stage.enabled })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Falha ao alterar status do Take Profit');
      }

      setMessage({ type: 'success', text: result.message });

      // Recarregar dados
      await loadData();

    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  // Deletar TP
  const deleteTP = async (stage: Stage) => {
    if (!confirm(`Tem certeza que deseja remover "${stage.name}"?`)) return;

    try {
      setSaving(true);
      setMessage(null);

      // Usar API real de remoção
      const response = await fetch(`/api/bot/takeprofit/${stage.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Falha ao remover Take Profit');
      }

      setMessage({ type: 'success', text: result.message });

      // Recarregar dados
      await loadData();

    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className=\"flex items-center justify-center min-h-96\">
        <div className=\"text-center\">
          <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto\"></div>
          <p className=\"mt-4 text-gray-600\">Carregando Take Profits...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className=\"flex items-center justify-center min-h-96\">
        <div className=\"text-center text-red-600\">
          <h2 className=\"text-xl font-bold mb-2\">Erro ao carregar</h2>
          <p>{error}</p>
          <button
            onClick={loadData}
            className=\"mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600\"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className=\"space-y-6\">
      {/* Mensagens */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-100 border border-green-400 text-green-700'
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Validação */}
      {!data.validation.valid && (
        <div className=\"bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded\">
          <p className=\"font-bold\">Configuração inválida:</p>
          <ul className=\"list-disc list-inside\">
            {data.validation.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Header */}
      <div className=\"bg-white rounded-lg shadow p-6\">
        <div className=\"flex justify-between items-center mb-4\">
          <h3 className=\"text-lg font-semibold text-gray-900\">🎯 Take Profit Dinâmico</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={saving}
            className=\"px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50\"
          >
            {showAddForm ? '❌ Cancelar' : '➕ Adicionar TP'}
          </button>
        </div>

        <p className=\"text-sm text-gray-600\">
          Configure quantos Take Profits quiser com múltiplos e percentuais personalizados.
        </p>

        {/* Formulário para adicionar */}
        {showAddForm && (
          <div className=\"mt-6 p-4 bg-gray-50 rounded-lg border\">
            <h4 className=\"font-medium text-gray-900 mb-3\">Novo Take Profit</h4>

            <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">Nome</label>
                <input
                  type=\"text\"
                  value={newTP.name}
                  onChange={(e) => setNewTP(prev => ({ ...prev, name: e.target.value }))}
                  className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500\"
                  placeholder=\"Ex: Quick Sale\"
                />
              </div>

              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">Múltiplo</label>
                <input
                  type=\"number\"
                  step=\"0.1\"
                  min=\"1.1\"
                  max=\"1000\"
                  value={newTP.multiple}
                  onChange={(e) => setNewTP(prev => ({ ...prev, multiple: Number(e.target.value) }))}
                  className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500\"
                />
              </div>

              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">Percentual (%)</label>
                <input
                  type=\"number\"
                  min=\"1\"
                  max=\"100\"
                  value={newTP.sellPercent}
                  onChange={(e) => setNewTP(prev => ({ ...prev, sellPercent: Number(e.target.value) }))}
                  className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500\"
                />
              </div>

              <div className=\"flex items-end\">
                <button
                  onClick={handleAddTP}
                  disabled={saving}
                  className=\"w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50\"
                >
                  {saving ? 'Salvando...' : '💾 Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de TPs */}
      <div className=\"bg-white rounded-lg shadow\">
        <div className=\"px-6 py-4 border-b\">
          <h3 className=\"text-lg font-semibold text-gray-900\">Take Profits Configurados</h3>
          <p className=\"text-sm text-gray-600\">
            {data.stages.filter(s => s.enabled).length} de {data.stages.length} habilitados
          </p>
        </div>

        <div className=\"divide-y divide-gray-200\">
          {data.stages.map((stage) => (
            <div key={stage.id} className={`p-6 ${!stage.enabled ? 'bg-gray-50 opacity-75' : ''}`}>
              {editingId === stage.id ? (
                // Modo de edição
                <div className=\"grid grid-cols-1 md:grid-cols-5 gap-4 items-end\">
                  <div>
                    <label className=\"block text-sm font-medium text-gray-700 mb-1\">Nome</label>
                    <input
                      type=\"text\"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500\"
                    />
                  </div>

                  <div>
                    <label className=\"block text-sm font-medium text-gray-700 mb-1\">Múltiplo</label>
                    <input
                      type=\"number\"
                      step=\"0.1\"
                      min=\"1.1\"
                      value={editForm.multiple || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, multiple: Number(e.target.value) }))}
                      className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500\"
                    />
                  </div>

                  <div>
                    <label className=\"block text-sm font-medium text-gray-700 mb-1\">Percentual (%)</label>
                    <input
                      type=\"number\"
                      min=\"1\"
                      max=\"100\"
                      value={editForm.sellPercent || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, sellPercent: Number(e.target.value) }))}
                      className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500\"
                    />
                  </div>

                  <div className=\"flex space-x-2\">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className=\"flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50\"
                    >
                      ✅ Salvar
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className=\"flex-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50\"
                    >
                      ❌ Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo de visualização
                <div className=\"flex items-center justify-between\">
                  <div className=\"flex items-center space-x-6\">
                    <div className=\"flex items-center space-x-2\">
                      <span className=\"text-lg font-medium text-gray-900\">{stage.order}.</span>
                      <div>
                        <h4 className=\"font-medium text-gray-900\">{stage.name}</h4>
                        <p className=\"text-sm text-gray-500\">
                          {stage.multiple}x → vende {stage.sellPercent}%
                        </p>
                      </div>
                    </div>

                    <div className=\"flex items-center space-x-4\">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        stage.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {stage.enabled ? '🟢 Ativo' : '⚫ Inativo'}
                      </span>
                    </div>
                  </div>

                  <div className=\"flex items-center space-x-2\">
                    <button
                      onClick={() => toggleEnabled(stage)}
                      disabled={saving}
                      className={`px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                        stage.enabled
                          ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {stage.enabled ? '⏸️ Desativar' : '▶️ Ativar'}
                    </button>

                    <button
                      onClick={() => startEdit(stage)}
                      disabled={saving}
                      className=\"px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50\"
                    >
                      ✏️ Editar
                    </button>

                    <button
                      onClick={() => deleteTP(stage)}
                      disabled={saving}
                      className=\"px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50\"
                    >
                      🗑️ Remover
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {data.stages.length === 0 && (
          <div className=\"p-8 text-center text-gray-500\">
            <p className=\"text-lg\">📈 Nenhum Take Profit configurado</p>
            <p className=\"text-sm\">Clique em \"Adicionar TP\" para criar sua primeira configuração</p>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className=\"flex justify-end space-x-4\">
        <button
          onClick={loadData}
          disabled={loading || saving}
          className=\"px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50\"
        >
          {loading ? 'Carregando...' : '🔄 Recarregar'}
        </button>
      </div>
    </div>
  );
}