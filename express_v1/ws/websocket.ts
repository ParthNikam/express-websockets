
import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

const IS_ALIVE = Symbol('isAlive');

// Types
interface JoinMessage {
  type: 'join';
  roomId: string;
  userId: string;
  username: string;
}

interface ChatMessage {
  type: 'message';
  roomId: string;
  content: string;
  senderId: string;
  senderName: string;
}

type WSMessage = JoinMessage | ChatMessage;

export class ConnectionManager {
  // Map roomId -> Set of WebSockets
  private rooms = new Map<string, Set<WebSocket>>();
  // Map WebSocket -> Set of roomIds (for cleanup)
  private clientRooms = new Map<WebSocket, Set<string>>();

  addClientToRoom(ws: WebSocket, roomId: string) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(ws);

    if (!this.clientRooms.has(ws)) {
      this.clientRooms.set(ws, new Set());
    }
    this.clientRooms.get(ws)!.add(roomId);

    console.log(`Client added to room ${roomId}. Total in room: ${this.rooms.get(roomId)!.size}`);
  }

  removeClient(ws: WebSocket) {
    const joinedRooms = this.clientRooms.get(ws);
    if (joinedRooms) {
      joinedRooms.forEach(roomId => {
        const room = this.rooms.get(roomId);
        if (room) {
          room.delete(ws);
          if (room.size === 0) {
            this.rooms.delete(roomId);
          }
        }
      });
      this.clientRooms.delete(ws);
    }
    console.log(`Client removed.`);
  }

  broadcastToRoom(roomId: string, message: any, sender: WebSocket | null = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.forEach((client) => {
      // Broadcast to everyone including sender to confirm receipt and order
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Error broadcasting to client in room ${roomId}:`, error);
          this.removeClient(client);
        }
      }
    });
  }
}

export function setupWebSocket(server: HttpServer): WebSocketServer {
  const connectionManager = new ConnectionManager();
  const wss = new WebSocketServer({ server, clientTracking: true });

  wss.on('connection', function connection(ws: WebSocket & { [key: symbol]: boolean }, request) {
    const clientIP = request.socket.remoteAddress;
    console.log(`New client connection from ${clientIP}`);

    ws.on('message', function message(data) {
      try {
        const parsedData = JSON.parse(data.toString()) as WSMessage;

        if (parsedData.type === 'join') {
          connectionManager.addClientToRoom(ws, parsedData.roomId);

          // Notify room (system message)
          // connectionManager.broadcastToRoom(parsedData.roomId, {
          //   type: 'system',
          //   content: `${parsedData.username} joined the chat.`,
          //   timestamp: new Date()
          // });
        }
        else if (parsedData.type === 'message') {
          console.log(`Message in room ${parsedData.roomId}: ${parsedData.content}`);

          // Broadcast to room (Persistence is handled by client-side before sending to WS)
          connectionManager.broadcastToRoom(parsedData.roomId, {
            type: 'message',
            senderId: parsedData.senderId, // Add senderId
            sender: parsedData.senderName,
            content: parsedData.content,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error processing message: ', error);
      }
    });


    ws.on('close', function close(code, reason) {
      connectionManager.removeClient(ws);
      console.log(`Client disconnected - Code: ${code}\nReason: ${reason}`);
    });


    ws.on('error', function error(err) {
      console.error('websocket error: ', err);
    });


    ws[IS_ALIVE] = true;
    ws.on('pong', function heartbeat() {
      ws[IS_ALIVE] = true;
    });
  });


  type WebSocketWithAlive = WebSocket & { [key: symbol]: boolean };
  const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws: WebSocket) {
      const ext = ws as WebSocketWithAlive;
      if (ext[IS_ALIVE] === false) {
        return ws.terminate();
      }
      ext[IS_ALIVE] = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', function close() {
    clearInterval(interval);
  });

  return wss;
}
