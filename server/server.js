const WebSocket = require("ws"); //web socket library
require("./Card/index.js"); //get class card
const Mazzo = require("./Mazzo/index.js"); //get deck card
require("dotenv").config(); // load env variables from .env file

let players = [];

const serverPort = process.env.PORT;
const serverHost = process.env.HOST;

if (!serverPort || !serverHost) {
  console.log("You must set the .env file first!");
  process.exit(1);
}

let mazzo = new Mazzo();
let server = new WebSocket.Server({ host: serverHost, port: serverPort });

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log("Errore binding su porta " + serverPort);
  } else {
    console.log("Errore sconosciuto");
  }
  server.close();
});

server.on("listening", () => {
  console.log(
    `WebSocket server is running on ws://${serverHost}:${serverPort}`
  );
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
      let playerIndex = players.indexOf(socket);
      let opponentIndex = playerIndex === 0 ? 1 : 0;
      // Broadcast the move to both players
      players.forEach((p) =>
        p.send(JSON.stringify({ type: "move", card: data.card }))
      );

      //avvisa client che deve rimuovere card
      if (players[opponentIndex]) {
        players[opponentIndex].send(JSON.stringify({ type: "remove_opponent_card" }));
      }

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
