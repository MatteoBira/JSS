const WebSocket = require("ws"); //web socket library
const Mazzo = require("./Mazzo/index.js"); //get deck card
require("dotenv").config(); // load env variables from .env file
const Partita = require("./Partita/index.js");

class miniPlayer {
    #socket;
    #username;
    #uuid;

    // Costruttore
    constructor(socket, username, uuid) {
        this.#socket = socket;
        this.#username = username;
        this.#uuid = uuid;
    }

    // Getter e Setter per #socket
    getSocket() {
        return this.#socket;
    }

    setSocket(value) {
        this.#socket = value;
    }

    // Getter e Setter per #username
    getUsername() {
        return this.#username;
    }

    setUsername(value) {
        this.#username = value;
    }

    // Getter e Setter per #uuid
    getUuid() {
        return this.#uuid;
    }

    setUuid(value) {
        this.#uuid = value;
    }
}

let players = []; //buffer temporaneo per reggere 2 giocatori, poi si svuota.
let matchArray = []; //contiene tutte le partite in corso.
let intervalId;

const serverPort = process.env.PORT;
const serverHost = process.env.HOST;
const API_TOKEN = process.env.WS_SERVER_API_TOKEN;

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
    console.log("A player connected.");
    socket.send(JSON.stringify({ type: "welcome" }));

    socket.on("message", async (raw) => {
        try {
            const data = JSON.parse(raw);

            if (data.type === "options") {
                let { username, uuid } = data;
                if (!username || !uuid) {
                    username = "Guest";
                    uuid = null;
                    socket.send(JSON.stringify({ type: "queue", playerNumber: players.length }));
                } else {
                    const res = await fetch("https://api.playscopa.online/checkUid?token=" + API_TOKEN, {
                        method: "POST",
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, uuid })
                    });
                    if (!res.ok) {
                        console.error("Errore verificato durante l'accesso:", res.statusText);
                        socket.send(JSON.stringify({ type: "error", message: "Login failed" }));
                        return;
                    }
                    const body = await res.json();
                    if (body.success) {
                        socket.send(JSON.stringify({ type: "queue", playerNumber: players.length }));
                    } else {
                        socket.send(JSON.stringify({ type: "error", message: "Invalid credentials" }));
                    }
                }
                console.log("Un check crazyyy: " + username + ":  " + uuid);
                if (players.length === 1)
                    if (players[0].getUsername() != "Guest" && players[0].getUsername() == username && players[0].getUuid() == uuid) {
                        socket.send(JSON.stringify({ type: "sameUser" }));
                        return;
                    }
                players.push(new miniPlayer(socket, username, uuid));
                console.log("IDK: " + players.length);
                // Avvio partita quando siamo in due
                if (players.length === 2) {
                    startMatch();
                }
            }
        } catch (err) {
            console.error("messageHandler error:", err);
            socket.send(JSON.stringify({ type: "error", message: "Server error" }));
        }
    });

    socket.on("close", () => {
        console.log("Player disconnected.");
        players = players.filter(p => p.getSocket() !== socket);
        if (players.length === 0 && intervalId) {
            clearInterval(intervalId);
        }
    });

    // Inizializza cleanup interval
    let intervalId = setInterval(() => {
        players.forEach((p) => {
            if (p.readyState == 2 || p.readyState == 3) {
                players = players.filter((socket) => socket !== p);
                console.log("Socket morto trovato");
            }
        })
    }, 1000);
});

function startMatch() {
    clearInterval(intervalId);
    const mazzo = new Mazzo();
    mazzo.shuffle();
    console.log("Nuovo mazzo:", mazzo.getArray());

    const [p1, p2] = players;
    // Rimozione di tutti i listener per questa socket
    [p1, p2].forEach(p => {
        const s = p.getSocket();
        s.removeAllListeners("message");
        s.removeAllListeners("close");
    });

    const partita = new Partita(p1, p2, mazzo);
    partita.on("end", () => {
        matchArray = matchArray.filter(m => m !== partita);
        console.log("Partita rimossa");
    });
    matchArray.push(partita);

    players = []; // reset lobby
    console.log("Partita iniziata");
}