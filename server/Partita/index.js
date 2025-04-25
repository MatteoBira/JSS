class Partita {
  #player1;
  #player2;
  #mazzo;
  #points = [0,0];
  //tutti gli attributi che determinano i punteggi
  #cardNum = [0,0];
  #denari = [0,0]
  #primiera = [0,0];
  #hands = [[], []];
  #tableCards = [];
  #players = [];
  #cards = [];

  constructor(player1, player2, mazzo) {
    this.#player1 = player1;
    this.#player2 = player2;
    this.#mazzo = mazzo;
    this.#players.push(player1, player2); //worka meglio con il codice di prima lol
//    this.startGame();
    this.startRound();
  }
/*
  startGame(){
    while(point[0] < 11 && points[1] < 11){
      startRound();
    }
    if(points[0] > points[1]){
      console.log("player 1 vince");
    }else if(points[0] == points[1]){
      console.log("patta");
    }else{
      console.log("player 2 vince");
    }
  }
  */

  startRound() {
    // Invia lo stato iniziale ai player
    this.#players.forEach((p, index) => {
      p.send(JSON.stringify({ type: "start", turn: index === 0 }));
    });

    for (let i = 0; i < 4; i++) {
      this.#tableCards.push(this.#mazzo.getArray().pop());
    }

    this.#players.forEach((p) => {
      p.send(JSON.stringify({ type: "tableCards", arr: this.#tableCards }));
    });

    // Distribuzione delle carte
    this.dealCards();

    // Associa evento "message" a ogni socket
    this.#players.forEach((socket, index) => {
        socket.on("message", (message) => {
          const data = JSON.parse(message);
          console.log("ripetuto");

          if (data.type === "move") {
            let playerIndex = this.#players.indexOf(socket);
            let opponentIndex = playerIndex === 0 ? 1 : 0;

            const playedCard = data.card;

            this.managePresa(playedCard, playerIndex);
            // Add the played card to the table
            this.#tableCards.push(playedCard);

            // Remove card from player's hand
            this.#hands[playerIndex] = this.#hands[playerIndex].filter(
              (c) => !(c.valore === playedCard.valore && c.seme === playedCard.seme)
            );

            // Avvisa il client opposto che deve rimuovere la carta
            if (this.#players[opponentIndex]) {
              this.#players[opponentIndex].send(
                JSON.stringify({ type: "move", card: data.card })
              );           
              this.#players[opponentIndex].send(
                JSON.stringify({ type: "remove_opponent_card" })
              ); 
            }

            if (this.#hands[0].length === 0 && this.#hands[1].length === 0 && this.#mazzo.getArray().length > 0) {
              this.dealCards();
            }else if(this.#hands[0].length === 0 && this.#hands[1].length === 0 && this.#mazzo.getArray().length == 0){
              if(points[0] > 11 || points[1] > 11){
                if(points[0] > points[1]){
                  console.log("player 1 won");
                }else if(points[0] == points[1]){
                  console.log("Tie");
                }else{
                  console.log("player 2 won");
                }
              }else{
                this.assignScore();
                this.#mazzo.shuffle();
                this.dealCards();
              }
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


  assignScore() {
    if(this.#cardNum[0] > this.#cardNum[1]){
      points[0]++;
    }else if(this.#cardNum[0] < this.#cardNum[1]){
      points[1]++;
    }

    if(this.#denari[0] > this.#denari[1]){
      points[0]++;
    }else if(this.#denari[0] < this.#denari[1]){
      points[1]++;
    }

    if(this.#primiera[0] > this.#primiera[1]){
      points[0]++;
    }else if(this.#primiera[0] < this.#primiera[1]){
      points[1]++;
    }
  }

  managePresa(playedCard, playerIndex) {
  // Cerca prima una carta dello stesso valore
    const sameValueCard = this.#tableCards.find(c => c.valore === playedCard.valore);

    if (sameValueCard) {
      // Rimuove la carta dal tavolo
      this.#tableCards = this.#tableCards.filter(c => c !== sameValueCard);
      if(this.#tableCards.length == 0){
        points[playerIndex]++;
      }

      cardNum[playerIndex] += 2;

      if(playedCard.getSeme() == 'D') denari[playerIndex]++;
      if(sameValueCard.getSeme() == 'D') denari[playerIndex]++;

      if(playedCard.getSeme() == 'D' && playedCard.getValore() == '7') points[playerIndex]++;
      if(sameValueCard.getSeme() == 'D' && playedCard.getValore() == '7') points[playerIndex]++;

      if(playedCard.getSeme() == 'D' && playedCard.getValore() == '10') points[playerIndex]++;
      if(sameValueCard.getSeme() == 'D' && playedCard.getValore() == '10') points[playerIndex]++;

      if(playedCard.getValore() == '7') premiera[playerIndex]++;
      if(sameValueCard.getValore() == '7') premiera[playerIndex]++;

      return {
        taken: true,
        cardsTaken: [sameValueCard]
      };
    }

    // Se non esiste una carta con lo stesso valore, cerca combinazioni che sommano al valore giocato
    const allCombos = (arr) => {
      const results = [];
      const recurse = (start, combo) => {
        const sum = combo.reduce((acc, card) => acc + card.valore, 0);
        if (sum === playedCard.valore) results.push([...combo]);
        if (sum >= playedCard.valore) return;
        for (let i = start; i < arr.length; i++) {
          recurse(i + 1, combo.concat(arr[i]));
        }
      };
      recurse(0, []);
      return results;
    };

    const combos = allCombos(this.#tableCards);

    if (combos.length > 0) {
      // Prendi la prima combinazione valida
      const comboToTake = combos[0];
      this.#tableCards = this.#tableCards.filter(c => !comboToTake.includes(c));

      // Aggiungi al mazzo del giocatore
      this.#cards.push({ player: playerIndex, cards: [playedCard, ...comboToTake] });

      return {
        taken: true,
        cardsTaken: comboToTake
      };
    }

    // Se non può prendere niente, la carta rimane sul tavolo
    this.#tableCards.push(playedCard);
    return {
      taken: false,
      cardsTaken: []
    };
  }

  //Dealing delle carte
  dealCards() {
    // Distribuisci 3 carte a ogni player
    // TODO: DONE -- manage two different decks for each player manage the message for the startingCards
    // TODO: maybe done -- Manage turns so that u start with dealCards everyTime both players finish their deck
    // TODO: Then manage the game to finish when the last turn finish (the turn that starts with 0 cards remaining in the 'Mazzo')
    // NOTE: Can we instantly calculate the points for each take???

    for (let i = 0; i < 3; i++) {
      this.#hands[0].push(this.#mazzo.getArray().pop());
      this.#hands[1].push(this.#mazzo.getArray().pop());
    }

    this.#players.forEach((p, idx) => {
      p.send(JSON.stringify({ type: "startingCards", arr: this.#hands[idx] }));
    });
  }

  //Helper method
  getCount() {
    return this.#cards.length;
  }
}

module.exports = Partita;
