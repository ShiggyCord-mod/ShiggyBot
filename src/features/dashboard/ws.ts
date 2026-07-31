import type { ServerWebSocket } from 'bun';
import type { DashboardSubscribeMessage } from '@dtypes/dashboard';

type Socket = ServerWebSocket<{ channelIds: Set<string> }>;

export class SubscriptionHub {
  private readonly sockets = new Map<Socket, Set<string>>();

  add(ws: Socket): void {
    this.sockets.set(ws, ws.data.channelIds);
  }

  remove(ws: Socket): void {
    this.sockets.delete(ws);
  }

  subscribe(ws: Socket, channelId: string): void {
    ws.data.channelIds.add(channelId);
  }

  unsubscribe(ws: Socket, channelId: string): void {
    ws.data.channelIds.delete(channelId);
  }

  onMessage(ws: Socket, raw: string | Buffer): void {
    let message: DashboardSubscribeMessage;
    try {
      message = JSON.parse(String(raw)) as DashboardSubscribeMessage;
    } catch {
      return;
    }

    if (message.type === 'subscribe' && message.channelId) {
      this.subscribe(ws, message.channelId);
    } else if (message.type === 'unsubscribe' && message.channelId) {
      this.unsubscribe(ws, message.channelId);
    }
  }

  broadcast<T>(channelId: string, payload: T): void {
    const data = JSON.stringify(payload);
    for (const ws of this.sockets.keys()) {
      if (ws.data.channelIds.has(channelId) && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(data);
        } catch {
          // socket closed between check and send
        }
      }
    }
  }
}
