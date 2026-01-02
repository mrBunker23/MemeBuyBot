# 🤖 Token Finder Bot - Solana Trading Bot

Bot automatizado para trading de tokens Solana com monitoramento inteligente, take profit em múltiplos níveis e filtro por score.

## 📋 Índice

- [Funcionalidades](#-funcionalidades)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
  - [1. Obter Cookies do Navegador](#1-obter-cookies-do-navegador)
  - [2. Configurar Arquivo .env](#2-configurar-arquivo-env)
- [Como Usar](#-como-usar)
- [Configurações Avançadas](#-configurações-avançadas)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Funcionalidades

- 🔍 **Scraping Automático**: Monitora site da Gangue Macaco Club em tempo real
- 🎯 **Filtro por Score**: Configura score mínimo para comprar tokens
- ⏳ **Delay Configurável**: Aguarda tempo definido antes de executar compra
- 💰 **Take Profit Inteligente**: 4 níveis configuráveis (TP1, TP2, TP3, TP4)
- 🛡️ **Stop-Loss Avançado**: Até 5 níveis de stop-loss configuráveis
- 📊 **Interface Visual**: Tabela colorida com status em tempo real
- 🔄 **Monitoramento Contínuo**: Acompanha preço e performance dos tokens
- ⚙️ **Configuração Dinâmica**: Altera estratégias em tempo real
- 💾 **Estado Persistente**: Salva posições e histórico em `state.json`
- 🚀 **Alta Performance**: Usa requisições HTTP diretas ao invés de navegador headless

---

## 📦 Pré-requisitos

Antes de começar, você precisa ter instalado:

- **[Bun](https://bun.sh)** (runtime JavaScript ultrarrápido)
- **[Node.js](https://nodejs.org)** v18+ (opcional, se preferir usar npm)
- Uma **wallet Solana** com SOL para trading
- Conta no site **[Gangue Macaco Club](https://gangue.macaco.club)**

---

## 🚀 Instalação

### 1. Clone ou baixe o projeto

```bash
cd C:\Users\SeuUsuario\Desktop
# (ou extraia o arquivo .rar aqui)
cd projeto
```

### 2. Instale as dependências

```bash
bun install
```

Ou se preferir usar npm:
```bash
npm install
```

---

## ⚙️ Configuração

### 1. Obter Cookies do Navegador

O bot precisa dos cookies do site para autenticação. Siga os passos:

#### 📝 Passo a Passo (Google Chrome / Edge / Brave)

1. **Abra o site** [https://gangue.macaco.club](https://gangue.macaco.club)

2. **Faça login** com sua conta

3. **Abra o Console do Navegador**:
   - Pressione `F12` ou `Ctrl + Shift + I`
   - Ou clique com botão direito → `Inspecionar`

4. **Vá para a aba "Console"**

5. **Cole e execute este código**:

```javascript
// Copie TUDO (incluindo as aspas)
copy(JSON.stringify(document.cookie.split('; ').map(c => {
  const [name, ...rest] = c.split('=');
  return {
    name,
    value: rest.join('='),
    domain: '.gangue.macaco.club',
    path: '/'
  };
}), null, 2));
```

6. **Os cookies foram copiados!** Você verá uma mensagem: `undefined` (é normal)

7. **Cole no arquivo `cookies.json`**:
   - Abra o arquivo `cookies.json` na raiz do projeto
   - Delete tudo que está lá
   - Cole o conteúdo copiado (`Ctrl + V`)
   - Salve o arquivo

#### Exemplo de `cookies.json`:
```json
[
  {
    "name": "session",
    "value": "s%3A1234567890abcdef...",
    "domain": ".gangue.macaco.club",
    "path": "/"
  },
  {
    "name": "_ga",
    "value": "GA1.2.1234567890.1234567890",
    "domain": ".gangue.macaco.club",
    "path": "/"
  }
]
```

---

### 2. Configurar Arquivo `.env`

#### a) Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Ou crie manualmente um arquivo chamado `.env` na raiz do projeto.

#### b) Preencha as configurações:

```bash
# =====================================
# CONFIGURAÇÕES PRINCIPAIS
# =====================================

# Chave privada da wallet Solana (formato array ou base58)
PRIVATE_KEY=[116,9,8,244,196,231,66,93,7,48,226,192,...]

# API Key do Jupiter (obtenha em: https://station.jup.ag/api-keys)
JUP_API_KEY=sua-api-key-aqui

# RPC URL (padrão: https://api.mainnet-beta.solana.com)
RPC_URL=https://api.mainnet-beta.solana.com

# =====================================
# CONFIGURAÇÕES DE TRADING
# =====================================

# Quantidade de SOL por compra (padrão: 0.10)
AMOUNT_SOL=0.001

# Slippage em basis points (padrão: 300 = 3%)
SLIPPAGE_BPS=300

# Score mínimo para comprar token (padrão: 0 = sem filtro)
# Valores sugeridos: 15-50 para tokens mais seguros
MIN_SCORE=15

# Delay antes de executar compra em ms (padrão: 0 = imediato)
# Útil para aguardar estabilização do preço ou análise adicional
# Exemplo: 5000 = aguarda 5 segundos antes de comprar
BUY_DELAY_MS=0

# =====================================
# TAKE PROFIT (TP) - ESTRATÉGIA DE VENDA
# =====================================

# TP1: Primeiro Take Profit (quando o token faz 2x, vende 50%)
TP1_MULTIPLE=2
TP1_SELL_PERCENT=50

# TP2: Segundo Take Profit (quando o token faz 3x, vende 50% do restante)
TP2_MULTIPLE=3
TP2_SELL_PERCENT=50

# TP3: Terceiro Take Profit (quando o token faz 4x, vende 50% do restante)
TP3_MULTIPLE=4
TP3_SELL_PERCENT=50

# TP4: Quarto Take Profit (quando o token faz 5x, vende tudo)
TP4_MULTIPLE=5
TP4_SELL_PERCENT=100

# =====================================
# STOP-LOSS (SL) - PROTEÇÃO CONTRA PERDAS
# =====================================
# CONFIGURAÇÕES OPCIONAIS - Só defina se quiser usar stop-loss
# Formato: Multiple (múltiplo de perda) e Sell Percent (% para vender)
# Multiple deve ser < 1 (0.8 = -20%, 0.6 = -40%, 0.4 = -60%)

# Exemplo de configuração conservadora (descomente para usar):

# SL1: Primeiro Stop-Loss (-10%, vende 25% da posição)
# SL1_MULTIPLE=0.9
# SL1_SELL_PERCENT=25

# SL2: Segundo Stop-Loss (-20%, vende 50% do restante)
# SL2_MULTIPLE=0.8
# SL2_SELL_PERCENT=50

# SL3: Terceiro Stop-Loss (-30%, vende 100% - saída total)
# SL3_MULTIPLE=0.7
# SL3_SELL_PERCENT=100

# Exemplo de configuração agressiva:
# SL1_MULTIPLE=0.5    # -50%, vende 50%
# SL1_SELL_PERCENT=50
# SL2_MULTIPLE=0.2    # -80%, vende 100%
# SL2_SELL_PERCENT=100

# =====================================
# CONFIGURAÇÕES AVANÇADAS
# =====================================

# Intervalo de checagem do site em ms (padrão: 2000 = 2 segundos)
CHECK_INTERVAL_MS=2000

# Intervalo de checagem de preço em segundos (padrão: 10)
PRICE_CHECK_SECONDS=10

# Modo headless (não usado mais, mas mantido por compatibilidade)
HEADLESS=false
```

---

## 🎮 Como Usar

### Iniciar o Bot

```bash
bun src/index.ts
```

Ou use o script configurado:

```bash
bun run dev
```

### O que você verá:

```
═══════════════════════════════════════════════════════════════════
                    🤖 TOKEN FINDER BOT - STATUS
═══════════════════════════════════════════════════════════════════

🔥 Configuração carregada
🎯 Compra por token: 0.001 SOL
⚙️ Slippage: 300 bps
⏱️ Leitura do site: 2000 ms
📉 Check de preço: 10 s
🎯 Score mínimo: 15
🧠 Headless: false

📊 Estratégia de Take Profit:
   TP1: 2x → vende 50%
   TP2: 3x → vende 50%
   TP3: 4x → vende 50%
   TP4: 5x → vende 100%

🛡️ Stop-Loss: Desativado

📡 API Jupiter:
   Chamadas: 0
   Última: Nenhuma ainda

📊 Tokens Monitorados (0):

┌────────────┬─────────────────────────┬────────────┬──────────────┬──────────┐
│ Ticker     │ Performance             │ Status     │ Saldo        │ Update   │
├────────────┼─────────────────────────┼────────────┼──────────────┼──────────┤
│ METALS     │ 1.63x (+62.98%)         │ ✅ TP1     │ 1234.56      │ 0s       │
│ LEGEND     │ 0.91x (-8.97%)          │ ⏳ Aguard. │ 5678.90      │ 1s       │
└────────────┴─────────────────────────┴────────────┴──────────────┴──────────┘

⏰ 17:30:45 - Pressione Ctrl+C para sair
```

### Legenda da Tabela:

- 🟢 **Verde**: Token em lucro (≥ 1x)
- 🔴 **Vermelho**: Token em prejuízo (< 1x)
- ✅ **TP1, TP2...**: Take profits já executados
- ⏳ **Aguard.**: Aguardando primeiro TP

---

## 🛡️ Sistema de Stop-Loss

O bot agora suporta stop-loss automático para proteger contra perdas. Esta funcionalidade é **opcional** e pode ser configurada com até 5 níveis independentes.

### Como Funciona

- **Múltiplos de Perda**: Valores abaixo de 1.0 (0.8 = -20%, 0.6 = -40%)
- **Venda Parcial**: Vende apenas uma porcentagem a cada nível
- **Venda Total**: Configure 100% no último nível para saída completa
- **Ordem Decrescente**: SL1 deve ter múltiplo maior que SL2, etc.

### Exemplos de Configuração

#### 🔰 Iniciante (Conservador)
Proteção rigorosa com perdas pequenas:

```env
# Primeira queda significativa: vende um pouco
SL1_MULTIPLE=0.9     # -10%
SL1_SELL_PERCENT=25  # Vende 25%

# Segunda queda: vende mais
SL2_MULTIPLE=0.8     # -20%
SL2_SELL_PERCENT=50  # Vende 50% do restante

# Terceira queda: sai totalmente
SL3_MULTIPLE=0.7     # -30%
SL3_SELL_PERCENT=100 # Vende tudo
```

**Resultado**: Perdas máximas limitadas a -30%.

#### 🎯 Intermediário (Equilibrado)
Balance entre proteção e potencial:

```env
SL1_MULTIPLE=0.7     # -30%
SL1_SELL_PERCENT=50  # Vende metade

SL2_MULTIPLE=0.5     # -50%
SL2_SELL_PERCENT=100 # Vende tudo
```

**Resultado**: Permite alguma volatilidade, mas protege contra crashes.

#### ⚡ Avançado (Agressivo)
Para quem aceita alto risco:

```env
SL1_MULTIPLE=0.3     # -70%
SL1_SELL_PERCENT=100 # Vende tudo apenas em crash severo
```

**Resultado**: Máxima exposição ao upside, proteção apenas contra ruína total.

### Combinando Take-Profit + Stop-Loss

O sistema funciona independentemente. Exemplos de cenários:

```
Token comprado a $1.00:

📈 Cenário Positivo:
$2.00 (2x) → TP1: vende 25%
$5.00 (5x) → TP2: vende 50% do restante
$10.00 (10x) → TP3: vende tudo

📉 Cenário Negativo:
$0.80 (-20%) → SL1: vende 50%
$0.60 (-40%) → SL2: vende tudo

🔄 Cenário Misto:
$2.00 (2x) → TP1: vende 25%
$1.50 (1.5x) → Token cai...
$0.80 (-20% do preço original) → SL1: vende restante
```

### Alteração Dinâmica

Você pode alterar stop-losses durante a execução usando o sistema de configuração dinâmica:

```typescript
import { configManager } from './src/config/config-manager';

// Ativar stop-loss conservador
configManager.setStopLosses([
  { name: 'sl1', multiple: 0.9, sellPercent: 100 }
]);

// Desativar stop-loss
configManager.setStopLosses([]);
```

---

## 🎯 Configurações Avançadas

### Score Mínimo

O score é uma métrica do site que indica a qualidade do token. Configure `MIN_SCORE` para filtrar:

```bash
MIN_SCORE=0    # Sem filtro - compra todos os tokens
MIN_SCORE=15   # Recomendado para iniciantes
MIN_SCORE=30   # Mais conservador
MIN_SCORE=50   # Muito seletivo
```

**Como funciona**: O bot monitora todos os tokens, mas só compra quando o score atinge o mínimo. Se um token começa com score 10 e sobe para 20, o bot compra automaticamente.

### Delay na Compra

Configure um tempo de espera antes de executar a compra:

```env
BUY_DELAY_MS=0       # Imediato (padrão)
BUY_DELAY_MS=5000    # Aguarda 5 segundos
BUY_DELAY_MS=30000   # Aguarda 30 segundos
```

**Benefícios**:
- ⏱️ **Análise de estabilidade**: Aguarda para ver se o preço se estabiliza
- 🚫 **Evita front-running**: Não compra instantaneamente como outros bots
- 🧠 **Decisão melhor**: Tempo para o mercado "digerir" a nova listagem
- 🔄 **Flexível**: Pode testar diferentes estratégias de timing

**Como funciona**: Quando uma nova moeda é detectada, o bot agenda a compra para ser executada após o delay configurado. Você verá logs como:

```
🕒 BITCOIN agendado para compra em 5000ms (14:35:20)
🎯 BITCOIN - executando compra agendada!
💰 BITCOIN entrada: $0.000123
```

### Estratégia de Take Profit

Você pode personalizar completamente sua estratégia:

#### Exemplo 1: Conservador (Lucros menores, mais seguros)
```bash
TP1_MULTIPLE=1.5    # Vende 25% quando faz 50% de lucro
TP1_SELL_PERCENT=25

TP2_MULTIPLE=2      # Vende 25% quando dobra
TP2_SELL_PERCENT=25

TP3_MULTIPLE=3      # Vende 25% quando triplica
TP3_SELL_PERCENT=25

TP4_MULTIPLE=5      # Vende tudo quando faz 5x
TP4_SELL_PERCENT=100
```

#### Exemplo 2: Agressivo (Busca lucros maiores)
```bash
TP1_MULTIPLE=3
TP1_SELL_PERCENT=30

TP2_MULTIPLE=10
TP2_SELL_PERCENT=30

TP3_MULTIPLE=50
TP3_SELL_PERCENT=40

TP4_MULTIPLE=100
TP4_SELL_PERCENT=100
```

### Quantidade de SOL por Trade

```bash
AMOUNT_SOL=0.001   # Arriscado, mas rápido para testar
AMOUNT_SOL=0.01    # Recomendado para começar
AMOUNT_SOL=0.1     # Para quem tem mais capital
AMOUNT_SOL=1.0     # Alto risco
```

---

## 📁 Estrutura do Projeto

```
projeto/
├── src/
│   ├── config/
│   │   └── index.ts              # Configurações e leitura do .env
│   ├── services/
│   │   ├── jupiter.service.ts    # API Jupiter (swap e quote)
│   │   ├── scraper.service.ts    # Scraping do site com cheerio
│   │   ├── solana.service.ts     # Conexão Solana e wallet
│   │   ├── state.service.ts      # Gerenciamento de estado (state.json)
│   │   └── trading.service.ts    # Lógica de compra/venda e monitoramento
│   ├── types/
│   │   └── index.ts              # Tipos TypeScript
│   ├── utils/
│   │   ├── logger.ts             # Sistema de logs com arquivo
│   │   └── status-monitor.ts     # Tabela de status visual
│   └── index.ts                  # Entry point
├── logs/                          # Logs do bot (gerados automaticamente)
├── .env                           # Configurações (você cria)
├── .env.example                   # Exemplo de configuração
├── cookies.json                   # Cookies do site (você cria)
├── state.json                     # Estado das posições (gerado automaticamente)
├── package.json                   # Dependências
└── README.md                      # Este arquivo
```

---

## 🔧 Troubleshooting

### ❌ "Não achei a tabela"

**Problema**: Bot não consegue acessar o site.

**Solução**:
1. Verifique se está logado no site
2. Refaça o processo de copiar os cookies
3. Certifique-se que o arquivo `cookies.json` está na raiz do projeto
4. Verifique se o cookie de sessão está presente

### ❌ "Erro ao conectar RPC"

**Problema**: Não consegue conectar na blockchain Solana.

**Solução**:
1. Use um RPC público confiável: `https://api.mainnet-beta.solana.com`
2. Ou use um RPC privado (mais rápido): [QuickNode](https://www.quicknode.com/), [Helius](https://www.helius.dev/)
3. Verifique sua conexão com a internet

### ❌ "Invalid private key"

**Problema**: Chave privada inválida.

**Solução**:
1. Verifique o formato da chave (array de números ou base58)
2. Certifique-se de copiar a chave completa
3. Exemplo válido: `[116,9,8,244,196,231,...]` (64 números)

### ❌ Token não vende no TP

**Problema**: Token atingiu o múltiplo mas não vendeu.

**Verificar**:
1. Veja na tabela se o status mostra `✅ TP1` (já vendeu)
2. Verifique os logs em `logs/bot-YYYY-MM-DD-HH-MM-SS.log`
3. Pode haver falta de liquidez no token
4. Verifique se tem saldo suficiente para fees

### 🔍 Ver logs detalhados

Os logs são salvos automaticamente em:
```
logs/bot-2025-12-23-17-30-00.log
```

Para ver em tempo real:
```bash
tail -f logs/bot-*.log
```

---

## 📊 Arquivos Importantes

### `state.json`
Armazena o estado de todas as posições:
- Tokens já vistos
- Posições abertas
- TPs executados
- Histórico de preços

**⚠️ Não delete este arquivo** enquanto tiver posições abertas!

### `cookies.json`
Armazena os cookies de autenticação do site. Precisa ser atualizado se:
- Fazer logout no site
- Cookies expirarem (geralmente 30 dias)
- Mudar de conta

---

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique a seção [Troubleshooting](#-troubleshooting)
2. Verifique os logs em `logs/`
3. Entre em contato com o suporte da Gangue Macaco Club

---

## ⚠️ Aviso Legal

- Este bot é para uso educacional
- Trading de criptomoedas envolve riscos
- Nunca invista mais do que pode perder
- Faça testes com valores pequenos primeiro (`AMOUNT_SOL=0.001`)
- O desenvolvedor não se responsabiliza por perdas financeiras

---

## 🚀 Tecnologias

- **[Bun](https://bun.sh)** - Runtime JavaScript ultrarrápido
- **TypeScript** - Tipagem estática
- **Solana Web3.js** - Interação com blockchain
- **Jupiter API** - Agregador de DEXs
- **Cheerio** - Web scraping
- **cli-table3** - Tabelas bonitas no terminal
- **chalk** - Cores no terminal

---

**Bons trades! 🚀💰**
