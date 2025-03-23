const WebSocket = require("ws"); //web socket library
const Card = require("./Card/index.js"); //get class card
const Mazzo = require("./Mazzo/index.js");
const Tavolo = require("./Tavolo/index.js"); //ricevi le carte sul tavolo
require("dotenv").config(); // load env variables from .env file

let players = [];

const serverPort = process.env.PORT;
const serverHost = process.env.HOST;

if (!serverPort || !serverHost) {
  console.log("You must set the .env file first!");
  process.exit(1);
}

let mazzo = new Mazzo();
let tavolo = new Tavolo();
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

function giveCard(nGiocatore, carta) {
  if (!(carta instanceof Card)) {
    throw new Error("L'elemento aggiunto deve essere una Carta");
  }

  const player = players[nGiocatore];
  player ? player.send(JSON.stringify({ type: "card", card: carta })) : console.log("Giocatore non trovato");
}



server.on("connection", (socket) => {
  console.log("A player connected");

  if (players.length < 2) {
    players.push(socket);
    socket.send(
      JSON.stringify({ type: "welcome", playerNumber: players.length })
    );
  }
  if (players.length === 2) {
    let primoGiocatore = Math.random() < 0.5 ? 0 : 1;
  
    players.forEach((p, index) => {
      p.send(JSON.stringify({ type: "start", turn: index === primoGiocatore }));
    });
  }

  for(let i = 0; i< 3; i++)
  {
    giveCard(0,mazzo.removeCard());
    giveCard(1,mazzo.removeCard());
  }

  socket.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "move") {
      // Broadcast the move to both players
      players.forEach((p) =>
        p.send(JSON.stringify({ type: "move", card: data.card }))
      );

      tavolo.addCard(data.card)

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

    if (data.type === "showTavolo") {
      socket.send(
        JSON.stringify({
          type: "tavolo",
          cards: tavolo.toJSON(),
        })
      );
    }

    if (data.type === "azione") { //parola migliore non mi veniva, non rompete

      const combinazione = tavolo.Combinations(data.card, data.cardsList);
      socket.send(JSON.stringify({ type: "azione", success: combinazione }));
    }
  });

  socket.on("close", () => {
    players = players.filter((p) => p !== socket);
    console.log("A player disconnected");
  });
});


