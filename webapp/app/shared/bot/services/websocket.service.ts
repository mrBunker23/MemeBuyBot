import type { WebSocketMessage, BotStatus, Position } from '../types';

interface BotWebSocketClient {
  id: string;
  ws: any; // WebSocket connection
  subscriptions: Set<string>; // Set of event types this client is subscribed to
}

class BotWebSocketService {
  private clients: Map<string, BotWebSocketClient> = new Map();
  private nextClientId = 1;

  // Adicionar cliente WebSocket
  addClient(ws: any): string {
    const clientId = `bot-client-${this.nextClientId++}`;

    const client: BotWebSocketClient = {
      id: clientId,
      ws: ws,
      subscriptions: new Set()
    };

    this.clients.set(clientId, client);

    // Configurar event handlers
    ws.on('message', (message: string) => {
      this.handleClientMessage(clientId, message);
    });

    ws.on('close', () => {
      this.removeClient(clientId);
    });

    ws.on('error', (error: any) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.removeClient(clientId);
    });

    console.log(`Bot WebSocket client connected: ${clientId}`);
    return clientId;
  }

  // Remover cliente
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      console.log(`Bot WebSocket client disconnected: ${clientId}`);
    }
  }

  // Processar mensagem do cliente
  private handleClientMessage(clientId: string, message: string): void {
    try {
      const data = JSON.parse(message);
      const client = this.clients.get(clientId);

      if (!client) return;

      switch (data.type) {
        case 'subscribe':
          // Cliente quer se inscrever para receber atualizações
          if (data.events && Array.isArray(data.events)) {
            data.events.forEach((event: string) => {
              client.subscriptions.add(event);
            });
          }
          break;

        case 'unsubscribe':
          // Cliente quer cancelar inscrição
          if (data.events && Array.isArray(data.events)) {
            data.events.forEach((event: string) => {
              client.subscriptions.delete(event);
            });
          }
          break;

        default:
          console.warn(`Unknown message type from client ${clientId}:`, data.type);
      }
    } catch (error) {
      console.error(`Error processing message from client ${clientId}:`, error);
    }
  }

  // Enviar mensagem para clientes inscritos
  private broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);

    this.clients.forEach((client) => {
      // Verificar se o cliente está inscrito neste tipo de evento
      if (client.subscriptions.has(message.type)) {
        try {
          client.ws.send(messageStr);
        } catch (error) {
          console.error(`Error sending message to client ${client.id}:`, error);
          // Remove cliente se envio falhar
          this.removeClient(client.id);
        }
      }
    });
  }

  // Enviar atualização de status do bot
  emitBotStatus(status: BotStatus): void {
    this.broadcast({
      type: 'status',
      data: status
    });
  }

  // Enviar atualização de posição
  emitPositionUpdate(mint: string, position: any): void {
    this.broadcast({
      type: 'position_update',
      data: {
        mint,
        position
      }
    });
  }

  // Enviar nova posição
  emitNewPosition(mint: string, position: Position): void {
    this.broadcast({
      type: 'new_position',
      data: {
        mint,
        position
      }
    });
  }

  // Enviar transação
  emitTransaction(transaction: any): void {
    this.broadcast({
      type: 'transaction',
      data: transaction
    });
  }

  // Enviar log
  emitLog(log: any): void {
    this.broadcast({
      type: 'log',
      data: log
    });
  }

  // Obter estatísticas dos clientes conectados
  getClientStats() {
    const stats = {
      totalClients: this.clients.size,
      clients: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        subscriptions: Array.from(client.subscriptions)
      }))
    };

    return stats;
  }

  // Enviar mensagem para cliente específico
  sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
        this.removeClient(clientId);
      }
    }
  }

  // Obter todos os clientes
  getAllClients(): BotWebSocketClient[] {
    return Array.from(this.clients.values());
  }
}

export const botWebSocketService = new BotWebSocketService();