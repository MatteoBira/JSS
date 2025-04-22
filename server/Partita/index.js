class Partita {
  #player1;
  #player2;
  #mazzo;
  #players = [];
  #cards = [];

  constructor(player1, player2, mazzo) {
    this.#player1 = player1;
    this.#player2 = player2;
    this.#mazzo = mazzo;
    this.#players.push(player1, player2); //worka meglio con il codice di prima lol
    this.startGame();
  }

  startGame() {
    // Invia lo stato iniziale ai player
    this.#players.forEach((p, index) => {
      p.send(JSON.stringify({ type: "start", turn: index === 0 }));
    });

    // Distribuzione delle carte
    this.dealCards();

    // Associa evento "message" a ogni socket
    this.#players.forEach((socket, index) => {
      socket.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.type === "move") {
          let playerIndex = this.#players.indexOf(socket);
          let opponentIndex = playerIndex === 0 ? 1 : 0;

          // Broadcast the move to both players
          this.#players.forEach((p) =>
            p.send(JSON.stringify({ type: "move", card: data.card }))
          );

          // Avvisa il client che deve rimuovere la carta
          if (this.#players[opponentIndex]) {
            this.#players[opponentIndex].send(
              JSON.stringify({ type: "remove_opponent_card" })
            );
          }

          // Switch turns
          this.#players.forEach((p, index) => {
            p.send(
              JSON.stringify({
                type: "turn",
                turn: index !== this.#players.indexOf(socket),
              })
            );
          });
        } else if (data.type === "getCount") {
          socket.send(
            JSON.stringify({ type: "count", value: this.getCount() })
          );
        }
      });
      socket.on("close", () => {
        this.#players = this.#players.filter((p) => p !== socket);
        console.log("A player disconnected from some match");
      });
    });
  }

  //Dealing delle carte
  dealCards() {
    // Distribuisci 3 carte a ogni player
    this.#players.forEach((p) => {
      for (let i = 0; i < 3; i++) {
        this.#cards.push(this.#mazzo.getArray().pop());
      }
      p.send(JSON.stringify({ type: "startingCards", arr: this.#cards }));
      this.#cards.length = 0; // Azzera l'array
    });

    // Distribuisci 4 carte sul tavolo
    for (let i = 0; i < 4; i++) {
      this.#cards.push(this.#mazzo.getArray().pop());
    }

    this.#players.forEach((p) => {
      p.send(JSON.stringify({ type: "tableCards", arr: this.#cards }));
    });
  }

  //Helper method
  getCount() {
    return this.#cards.length;
  }
}

module.exports = Partita;
