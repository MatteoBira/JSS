const WebSocket = require("ws");

require("./Card/index.js"); //get class card
const Mazzo = require("./Mazzo/index.js"); //get deck card

let players = [];

const serverPort = 8180;

let mazzo = new Mazzo();
let server = new WebSocket.Server({ port: serverPort }); //handle problem

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log("Errore assegnazione porta: " + serverPort);
  } else {
    console.log("Errore sconosciuto");
  }
  server.close();
});

server.on("listening", () => {
  console.log("WebSocket server is running on ws://localhost:8080");
  mazzo.shuffle();
  console.log(mazzo.getArray());
});

server.on("connection", (socket) => {
  console.log("A player connected");

  if (players.length < 2) {
    players.push(socket);
    socket.send(
      JSON.stringify({ type: "welcome", playerNumber: players.length })
    );
  }
  if (players.length === 2) {
    players.forEach((p, index) => {
      p.send(JSON.stringify({ type: "start", turn: index === 0 }));
    });
  }

  socket.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "move") {
      // Broadcast the move to both players
      players.forEach((p) =>
        p.send(JSON.stringify({ type: "move", card: data.card }))
      );

      // Switch turns
      players.forEach((p, index) => {
        p.send(
          JSON.stringify({
            type: "turn",
            turn: index !== players.indexOf(socket),
          })
        );
      });
    }
  });

  socket.on("close", () => {
    players = players.filter((p) => p !== socket);
    console.log("A player disconnected");
  });
});
