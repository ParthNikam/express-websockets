import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = createServer(app);

app.use(express.static('public'));

const PORT = process.env.PORT || 8080;


const wss = new WebSocketServer({server, clientTracking: true});

wss.on('connection', function connection(ws, request) {
  const clientIP = request.socket.remoteAddress;
  console.log(`New client connection from ${clientIP}`);

  ws.send("Welcome to websocket server!");

  ws.on('message', function message(data) {
    try { 
      const messageText = data.toString();
      console.log("Received: ", messageText);
      if (ws.readyState == ws.OPEN) {
        ws.send(`Echo ${messageText}`);
      }
    } catch (error) {
      console.error("Error processing message: ", error)
    }
  });

  ws.on('close', function close(code, reason) {
    console.log(`Client disconnected - Code: ${code}\nReason: ${reason}`);
  });

  ws.on('error', function error(err) {
    console.error('websocket error: ', err);
  })

  // Use a symbol to safely attach metadata to ws
  const isAliveSymbol = Symbol('isAlive');
  (ws as any)[isAliveSymbol] = true;

  ws.on('pong', function heartbeat() {
    (ws as any)[isAliveSymbol] = true;
  });
});


// Pint clients periodically to detect broken connections
const interval = setInterval(function ping() {
  const isAliveSymbol = Symbol('isAlive');

  wss.clients.forEach(function each(ws) {
    if ((ws as any)[isAliveSymbol] === false) {
      return ws.terminate();
    }

    (ws as any)[isAliveSymbol] = false;
    ws.ping();
  })
}, 30000);

wss.on('close', function close() {
  clearInterval(interval);
});

// base route for testing client side 
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Express WebSocket Demo</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    #messages { border: 1px solid #ccc; height: 300px; 
                               overflow-y: scroll; padding: 10px; margin-bottom: 10px; }
                    #messageInput { width: 300px; padding: 5px; }
                    button { padding: 5px 10px; }
                </style>
            </head>
            <body>
                <h1>Express WebSocket Demo</h1>
                <div id="messages"></div>
                <input type="text" id="messageInput" placeholder="Enter your message">
                <button onclick="sendMessage()">Send Message</button>
                <script>
                    const ws = new WebSocket('ws://localhost:8080');
                    const messages = document.getElementById('messages');

                    ws.onmessage = function(event) {
                        const messageDiv = document.createElement('div');
                        messageDiv.textContent = event.data;
                        messages.appendChild(messageDiv);
                        messages.scrollTop = messages.scrollHeight;
                    };

                    function sendMessage() {
                        const input = document.getElementById('messageInput');
                        if (input.value) {
                            ws.send(input.value);
                            input.value = '';
                        }
                    }

                    document.getElementById('messageInput').addEventListener('keypress', function(e) {
                        if (e.key === 'Enter') {
                            sendMessage();
                        }
                    });
                </script>
            </body>
        </html>
    `);
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
