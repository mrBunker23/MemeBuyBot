import { Elysia } from "elysia"
import { botWebSocketService } from "@/app/shared/bot/services/websocket.service"

export const botWebSocketRoutes = new Elysia({ prefix: "/bot" })

  // WebSocket endpoint para o bot
  .ws("/ws", {
    message(ws: any, message: any) {
      // Mensagens do cliente são processadas pelo WebSocketService
      console.log('Bot WebSocket message received:', message);
    },
    open(ws: any) {
      // Cliente conectou
      const clientId = botWebSocketService.addClient(ws);
      console.log(`Bot WebSocket client connected: ${clientId}`);
    },
    close(ws: any) {
      // Cliente desconectou - será tratado pelo WebSocketService
      console.log('Bot WebSocket client disconnected');
    },
    error(ws: any, error: any) {
      // Erro na conexão
      console.error('Bot WebSocket error:', error);
    }
  })

  // Endpoint para obter estatísticas das conexões WebSocket
  .get("/ws/stats", () => {
    return {
      success: true,
      data: botWebSocketService.getClientStats(),
      timestamp: new Date().toISOString()
    };
  }, {
    detail: {
      tags: ['Bot WebSocket'],
      summary: 'Obter estatísticas WebSocket',
      description: 'Retorna estatísticas das conexões WebSocket do bot'
    }
  })