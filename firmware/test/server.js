const { WebSocketServer } = require('ws');

// Cria o servidor WebSocket na porta 8080
const wss = new WebSocketServer({ port: 8080 });

console.log("Servidor WebSocket rodando na porta 8080...");

wss.on('connection', function connection(ws) {
  console.log("Novo dispositivo conectado!");

  ws.on('message', function message(data, isBinary) {
    // Quando o servidor recebe um dado (seja texto ou imagem do ESP32)
    // ele repassa (faz o broadcast) para todos os outros conectados (como o HTML)
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === 1) {
        client.send(data, { binary: isBinary });
      }
    });
  });

  ws.on('close', () => console.log("Dispositivo desconectado."));
});