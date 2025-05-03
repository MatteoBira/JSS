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

const closeHandler = (socket) => {
  console.log("Un player ha deciso di chiudere la connessione!"); // graceful closing
  players = players.filter((p) => p !== socket); // Remove the socket from the players array
};

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

  socket.on("close", () => closeHandler(socket));

  //NOT enough players to start
  if (players.length < 2) {
    players.push(socket);
    socket.send(
      JSON.stringify({ type: "welcome", playerNumber: players.length })
    );
  }

  //Checks socket's status every second(prevent bad closing). If state is 2 or 3 then remove from array. => https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
  let intervalId = setInterval(() => {
    players.forEach((p) => {
      if (p.readyState == 2 || p.readyState == 3) {
        players = players.filter((socket) => socket !== p);
        console.log("Socket morto trovato");
      }
    })
  }, 1000);

  //Enough players to start
  if (players.length === 2) {
    let mazzo = new Mazzo(); //ogni 2 persone creare mazzo nuovo, altrimenti stesso riferimento.
    mazzo.shuffle(); //mescola il mazzo per la partita che si viene a formare
    console.log(mazzo.getArray()); //debug line
    players.forEach((p) => p.removeListener("close", closeHandler));
    let partita = new Partita(players[0], players[1], mazzo);
    matchArray.push(partita); //array con le partite aggiornato
    players.length = 0; //reset lunghezza
    console.log("Partita cooked");
    clearInterval(intervalId);
  }
});