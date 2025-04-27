const WebSocket = require("ws"); //web socket library

const Mazzo = require("./Mazzo/index.js"); //get deck card
require("dotenv").config(); // load env variables from .env file
const Partita = require("./Partita/index.js");

let players = []; //buffer temporaneo per reggere 2 giocatori, poi si svuota.

let matchArray = []; //contiene tutte le partite in corso.

const serverPort = process.env.PORT;
const serverHost = process.env.HOST;

if (!serverPort || !serverHost) {
  console.log("You must set the .env file first!");
  process.exit(1);
}

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
});

server.on("connection", (socket) => {
  console.log("A player connected");

  //NOT enough players to start
  if (players.length < 2) {
    players.push(socket);
    socket.send(
      JSON.stringify({ type: "welcome", playerNumber: players.length })
    );
  }

  //Enough players to start
  if (players.length === 2) {
    let mazzo = new Mazzo(); //ogni 2 persone creare mazzo nuovo, altrimenti stesso riferimento.
    mazzo.shuffle(); //mescola il mazzo per la partita che si viene a formare
    console.log(mazzo.getArray()); //debug line
    let partita = new Partita(players[0], players[1], mazzo);
    matchArray.push(partita); //array con le partite aggiornato
    players.length = 0; //reset lunghezza
    console.log("Partita cooked");
  }
});
