const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });
let players = [];

server.on('connection', (socket) => {
    console.log('A player connected');
    
    if (players.length < 2) {
        players.push(socket);
        socket.send(JSON.stringify({ type: "welcome", playerNumber: players.length }));
    }
    
    if (players.length === 2) {
        players.forEach((p, index) => p.send(JSON.stringify({ type: "start", turn: index === 0 })));
    }

    socket.on('message', (message) => {
        players.forEach((p) => {
            if (p !== socket) p.send(message);
        });
    });

    socket.on('close', () => {
        players = players.filter(p => p !== socket);
        console.log("A player disconnected");
    });
});

console.log('WebSocket server is running on ws://localhost:8080');

