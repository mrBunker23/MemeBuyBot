// Input com Auto Complete para Variáveis - Estilo n8n

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import {
  WorkflowDataAccessor,
  createMockExecutionState,
  formatNodeReference,
  type NodeExecutionContext,
  type WorkflowExecutionState
} from '../types/workflow-execution';
import { Variable, ChevronDown, CheckCircle } from 'lucide-react';

interface AutoCompleteInputProps {
  nodeId: string;
  value: string;
  onChange: (value: string) => void;
  nodes: Node[];
  edges: Edge[];
  placeholder?: string;
  fieldType?: 'text' | 'number';
  className?: string;
  executionState?: WorkflowExecutionState;
}

interface VariableSuggestion {
  label: string;           // O que mostrar (ex: "currentPrice")
  value: string;          // O que inserir (ex: "{{ $json.currentPrice }}")
  description?: string;   // Descrição adicional
  type: string;          // Tipo da variável
  category: 'json' | 'node'; // Se é do node anterior ou específico
  nodeName?: string;     // Nome do node (se category === 'node')
}

export function AutoCompleteInput({
  nodeId,
  value,
  onChange,
  nodes,
  edges,
  placeholder = "Digite um valor ou {{ para variáveis",
  fieldType = 'text',
  className = "",
  executionState
}: AutoCompleteInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<VariableSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Criar mock de execução se não foi fornecido
  const mockExecutionState = executionState || createMockExecutionState('mock-workflow');
  const dataAccessor = new WorkflowDataAccessor(mockExecutionState);

  // Gerar sugestões baseadas nos nodes disponíveis
  const generateSuggestions = useCallback((query: string): VariableSuggestion[] => {
    const availableAncestors = dataAccessor.getAvailableAncestors(nodeId, nodes, edges);
    const suggestions: VariableSuggestion[] = [];

    // Simular dados para nodes ancestrais se não existirem
    const populatedAncestors = availableAncestors.map(ancestor => {
      if (ancestor && ancestor.data && ancestor.data.length > 0) {
        return ancestor;
      }

      // Simular dados para demonstração
      const node = nodes.find(n => n.id === ancestor?.nodeId);
      if (!node) return ancestor;

      const simulatedData = dataAccessor.simulateNodeExecution(node.id);
      return {
        ...ancestor,
        data: simulatedData,
        status: 'success' as const,
        itemsProcessed: simulatedData.length,
        executionTime: Math.random() * 100 + 50
      } as NodeExecutionContext;
    });

    const lowerQuery = query.toLowerCase();

    // Adicionar sugestões do node anterior ($json.campo)
    if (populatedAncestors.length > 0) {
      // Pegar o primeiro node ancestral (mais próximo)
      const previousNode = populatedAncestors[populatedAncestors.length - 1];
      if (previousNode?.data?.[0]?.json) {
        const jsonData = previousNode.data[0].json;
        Object.entries(jsonData).forEach(([key, val]) => {
          if (key.toLowerCase().includes(lowerQuery)) {
            suggestions.push({
              label: key,
              value: `{{ $json.${key} }}`,
              description: `Do node anterior: ${typeof val === 'object' ? 'object' : String(val).slice(0, 50)}`,
              type: typeof val === 'object' ? 'object' : typeof val,
              category: 'json'
            });
          }
        });
      }
    }

    // Adicionar sugestões de nodes específicos
    populatedAncestors.forEach(nodeContext => {
      if (!nodeContext?.data?.[0]?.json) return;

      const jsonData = nodeContext.data[0].json;
      Object.entries(jsonData).forEach(([key, val]) => {
        if (key.toLowerCase().includes(lowerQuery) || nodeContext.nodeName.toLowerCase().includes(lowerQuery)) {
          suggestions.push({
            label: `${nodeContext.nodeName}.${key}`,
            value: formatNodeReference(nodeContext.nodeName, key),
            description: `${typeof val === 'object' ? 'object' : String(val).slice(0, 40)}`,
            type: typeof val === 'object' ? 'object' : typeof val,
            category: 'node',
            nodeName: nodeContext.nodeName
          });
        }
      });
    });

    // Ordenar por relevância
    return suggestions.sort((a, b) => {
      // Priorizar matches exatos
      if (a.label.toLowerCase() === lowerQuery) return -1;
      if (b.label.toLowerCase() === lowerQuery) return 1;

      // Priorizar matches que começam com a query
      if (a.label.toLowerCase().startsWith(lowerQuery)) return -1;
      if (b.label.toLowerCase().startsWith(lowerQuery)) return 1;

      // Priorizar $json sobre $node
      if (a.category === 'json' && b.category === 'node') return -1;
      if (a.category === 'node' && b.category === 'json') return 1;

      return a.label.localeCompare(b.label);
    });
  }, [nodeId, nodes, edges, dataAccessor]);

  // Detectar quando o usuário está digitando variável
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    onChange(newValue);
    setCursorPosition(cursorPos);

    // Detectar padrão {{ para iniciar auto complete
    const stringValue = typeof newValue === 'string' ? newValue : '';
    const beforeCursor = stringValue.slice(0, cursorPos);

    // Detectar diferentes padrões de variável incompleta
    const patterns = [
      /\{\{\s*\$json\.(\w*)$/,                    // {{ $json.current
      /\{\{\s*\$node\["([^"]*)"?\]\.json\.(\w*)$/, // {{ $node["NodeName"].json.current
      /\{\{\s*\$([a-zA-Z]*)$/,                   // {{ $curr
      /\{\{\s*([a-zA-Z]*)$/,                     // {{ current
    ];

    let matchFound = false;
    for (const pattern of patterns) {
      const match = beforeCursor.match(pattern);
      if (match) {
        let query = '';
        if (pattern.source.includes('\\$json\\.')) {
          // $json.campo
          query = match[1] || '';
        } else if (pattern.source.includes('\\$node\\[')) {
          // $node["NodeName"].json.campo
          query = match[2] || '';
        } else {
          // $algo ou algo
          query = match[1] || '';
        }

        const newSuggestions = generateSuggestions(query);
        setSuggestions(newSuggestions);
        setShowSuggestions(newSuggestions.length > 0);
        setSelectedSuggestionIndex(0);
        matchFound = true;
        break;
      }
    }

    if (!matchFound) {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Detectar posição do cursor
  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    setCursorPosition(target.selectionStart || 0);
  };

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;

      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
          selectSuggestion(suggestions[selectedSuggestionIndex]);
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;

      default:
        // Para outras teclas, resetar seleção
        setSelectedSuggestionIndex(0);
        break;
    }
  };

  // Selecionar sugestão
  const selectSuggestion = (suggestion: VariableSuggestion) => {
    const currentValue = typeof value === 'string' ? value : '';
    const beforeCursor = currentValue.slice(0, cursorPosition);
    const afterCursor = currentValue.slice(cursorPosition);

    // Encontrar onde começou a variável incompleta com os mesmos padrões
    const patterns = [
      /\{\{\s*\$json\.(\w*)$/,
      /\{\{\s*\$node\["([^"]*)"?\]\.json\.(\w*)$/,
      /\{\{\s*\$([a-zA-Z]*)$/,
      /\{\{\s*([a-zA-Z]*)$/,
    ];

    let matchFound = false;
    for (const pattern of patterns) {
      const match = beforeCursor.match(pattern);
      if (match) {
        const startPos = beforeCursor.lastIndexOf('{{');
        const newValue = currentValue.slice(0, startPos) + suggestion.value + afterCursor;
        onChange(newValue);

        // Posicionar cursor após a variável inserida
        setTimeout(() => {
          if (inputRef.current) {
            const newCursorPos = startPos + suggestion.value.length;
            inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            inputRef.current.focus();
          }
        }, 0);

        matchFound = true;
        break;
      }
    }

    // Se não encontrou padrão, apenas adicionar a variável no final
    if (!matchFound) {
      const currentValue = typeof value === 'string' ? value : '';
      const newValue = currentValue + (currentValue ? ' ' : '') + suggestion.value;
      onChange(newValue);

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newValue.length, newValue.length);
          inputRef.current.focus();
        }
      }, 0);
    }

    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // Fechar sugestões quando clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };

    if (showSuggestions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSuggestions]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'string': return '📝';
      case 'number': return '🔢';
      case 'boolean': return '✅';
      case 'object': return '🗂️';
      default: return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'text-green-600';
      case 'number': return 'text-blue-600';
      case 'boolean': return 'text-purple-600';
      case 'object': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={fieldType === 'number' ? 'number' : 'text'}
        value={typeof value === 'string' ? value : ''}
        onChange={handleInputChange}
        onClick={handleInputClick}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${className}`}
        autoComplete="off"
        spellCheck="false"
      />

      {/* Dropdown de sugestões */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto variable-scroll">
          <div className="p-2 bg-gray-50 border-b border-gray-200">
            <div className="text-xs text-gray-600 flex items-center">
              <Variable size={12} className="mr-1" />
              Auto Complete ({suggestions.length} sugestões)
            </div>
          </div>

          <div className="py-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.category}-${suggestion.label}`}
                onClick={() => selectSuggestion(suggestion)}
                className={`w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between transition-colors ${
                  index === selectedSuggestionIndex ? 'bg-blue-100 border-l-2 border-blue-500' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{getTypeIcon(suggestion.type)}</span>
                    <span className="font-mono text-sm font-medium text-gray-900 truncate">
                      {suggestion.category === 'json' ? '$json.' : ''}{suggestion.label}
                    </span>
                    {suggestion.category === 'json' && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        anterior
                      </span>
                    )}
                  </div>
                  {suggestion.description && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {suggestion.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-2">
                  <span className={`text-xs font-medium ${getTypeColor(suggestion.type)}`}>
                    {suggestion.type}
                  </span>
                  {index === selectedSuggestionIndex && (
                    <CheckCircle size={14} className="text-blue-500" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="p-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
            ↑↓ Navegar • Enter/Tab Selecionar • Esc Fechar
          </div>
        </div>
      )}

      {/* Hint quando não há sugestões */}
      {typeof value === 'string' && value.includes('{{') && !showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
          💡 Digite &#123;&#123; $json. ou &#123;&#123; para ver variáveis disponíveis
        </div>
      )}
    </div>
  );
}