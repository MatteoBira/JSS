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
    this.#players.push(player1, player2);
    this.startGame();
  }

  startGame() {
    this.#players.forEach((p, index) => {
      p.send(JSON.stringify({ type: "start", turn: index === 0 }));
    });

    this.dealCards();

    this.#players.forEach((socket) => {
      socket.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.type === "move") {
          const { card, selected } = data;
          const playerIndex = this.#players.indexOf(socket);
          const opponentIndex = playerIndex === 0 ? 1 : 0;
          
          if (!selected || selected.length === 0) {
            // Solo una carta giocata, niente combo
            this.#cards.push(card); // Aggiungila sul tavolo
            socket.send(JSON.stringify({ type: "comboResult", success: false })); // niente combo
          } else {
            const result = this.checkCombination(card, selected);

            if (result.success) {
              // invia punti al player
              socket.send(JSON.stringify({ type: "comboResult", success: true, points: result.points }));
              // rimuovi carte selezionate dal tavolo
              this.removeTableCards(selected.concat(card));

              this.#players.forEach(p => {
                p.send(JSON.stringify({ type: "tableCards", arr: this.#cards }));
              });
            } else {
              this.#cards.push(card); // aggiungi carta al tavolo anche se non ha selezionato niente dal tavolo
              socket.send(JSON.stringify({ type: "comboResult", success: false }));
            }
          }

          // notifica mossa all'avversario
          if (this.#players[opponentIndex]) {
            this.#players[opponentIndex].send(JSON.stringify({ type: "move", card }));
            this.#players[opponentIndex].send(JSON.stringify({ type: "remove_opponent_card" }));
          }

          // Switch turns
          this.#players.forEach((p, idx) => {
            p.send(JSON.stringify({ type: "turn", turn: idx !== playerIndex }));
          });
        } else if (data.type === "getCount") {
          socket.send(JSON.stringify({ type: "count", value: this.getCount() }));
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
    this.#players.forEach((p) => {
      for (let i = 0; i < 3; i++) {
        this.#cards.push(this.#mazzo.getArray().pop());
      }
      p.send(JSON.stringify({ type: "startingCards", arr: this.#cards }));
      this.#cards.length = 0;
    });

    for (let i = 0; i < 4; i++) {
      this.#cards.push(this.#mazzo.getArray().pop());
    }

    this.#players.forEach((p) => {
      p.send(JSON.stringify({ type: "tableCards", arr: this.#cards }));
    });
  }

  // Rimuove carte dal tavolo dopo combinazione
  removeTableCards(cards) {
    this.#cards = this.#cards.filter(tc => !cards.some(c => c.valore === tc.valore && c.seme === tc.seme));
  }

  // Verifica se la combinazione è valida e calcola i punti (Scopa)
  checkCombination(card, selected) {
    // somma valori delle selected
    const sum = selected.reduce((acc, c) => acc + c.valore, 0);
    if (sum === card.valore) {
      // se prende tutte le carte sul tavolo fa scopa: 1 punto extra
      const points = selected.length === this.#cards.length ? 1 : 0;
      return { success: true, points };
    }
    return { success: false, points: 0 };
  }

  //Helper method
  getCount() {
    return this.#cards.length;
  }
}

module.exports = Partita;
