import { WebSocketServer, WebSocket } from "ws";
import { storage } from "../storage";

interface WebSocketMessage {
  type: string;
  data?: any;
}

class WebSocketManager {
  private clients: Set<WebSocket> = new Set();

  setup(wss: WebSocketServer) {
    wss.on('connection', (ws: WebSocket) => {
      console.log('WebSocket client connected');
      this.clients.add(ws);

      ws.on('message', async (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString()) as WebSocketMessage;
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send initial data
      this.sendToClient(ws, {
        type: 'connected',
        data: { message: 'Connected to AgentOps monitoring system' }
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'subscribe':
        // Handle subscription requests
        console.log('Client subscribed to updates');
        break;
      
      case 'ping':
        this.sendToClient(ws, { type: 'pong' });
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public broadcast(message: WebSocketMessage) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  public broadcastMetricsUpdate(metrics: any) {
    this.broadcast({
      type: 'metrics_update',
      data: metrics
    });
  }

  public broadcastAlert(alert: any) {
    this.broadcast({
      type: 'new_alert',
      data: alert
    });
  }

  public broadcastAgentStatus(agentId: string, status: any) {
    this.broadcast({
      type: 'agent_status_update',
      data: { agentId, status }
    });
  }

  public broadcastRemediationUpdate(action: any) {
    this.broadcast({
      type: 'remediation_update',
      data: action
    });
  }

  public broadcastAuditLog(log: any) {
    this.broadcast({
      type: 'audit_log',
      data: log
    });
  }
}

export const wsManager = new WebSocketManager();

export function setupWebSocket(wss: WebSocketServer) {
  wsManager.setup(wss);
}
