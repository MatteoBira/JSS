class Partita {
  #player1;
  #player2;
  #mazzo;
  #points = [0,0];
  //tutti gli attributi che determinano i punteggi
  #cardNum = [0,0];
  #denari = [0,0]
  #primiera = [0,0];
  #hands = [[], []]; //aggiornato con le carte dentro la mano di ciascun giocatore
  #tableCards = []; //aggiornato con le carte a centro tavolo
  #players = [];
  #cards = [];

  constructor(player1, player2, mazzo) {
    this.#player1 = player1;
    this.#player2 = player2;
    this.#mazzo = mazzo;
    this.#players.push(player1, player2); //worka meglio con il codice di prima lol
    this.startRound();
  }

  startRound() {
    // Invia lo stato iniziale ai player
    this.#players.forEach((p, index) => {
      p.send(JSON.stringify({ type: "start", turn: index === 0 }));
    });

    this.dealTableCards(); //invia 4 carte ai player che sono messe al centro (tableDiv)

    // Distribuzione delle carte
    this.dealCards(); //invia 3 carte a ogni player che sono messe nella mano (player-hand)

    // Associa evento "message" a ogni socket
    this.#players.forEach((socket, index) => {
        socket.on("message", (message) => {
          const data = JSON.parse(message);
          console.log("ripetuto"); //?

          if (data.type === "move") {
            let playerIndex = this.#players.indexOf(socket); //chi ha giocato la mossa?
            let opponentIndex = playerIndex === 0 ? 1 : 0; //si prende l'altro indice

            const playedCard = data.card;

            let take = this.managePresa(playedCard, playerIndex);
            
            // Add the played card to the table
            //this.#tableCards.push(playedCard);

            // Remove card from player's hand
            this.#hands[playerIndex] = this.#hands[playerIndex].filter(
              (c) => !(c.valore === playedCard.valore && c.seme === playedCard.seme)
            );

            console.log("dimensione mazzo: " + this.#mazzo.getArray().length);

            // Avvisa il client opposto che deve rimuovere la carta.
            if (this.#players[opponentIndex]) {
              this.#players[opponentIndex].send(
                JSON.stringify({ type: "remove_opponent_card" }) //rimuove, dalla vista del giocatore opposto, 1 carta del giocatore che ha iniziato la mossa
              ); 
              if(take.taken == true){
                if(take.combosAvail) {
                  console.log("Si ci sono combo");
                  this.waitForResponse(playerIndex, take.combosAvail)
                    .then((response) => {
                      this.removeComboCards(response.combo, this.#players[opponentIndex], playedCard, this.#players[playerIndex]);
                    })
                    .catch((error) => {
                      console.log('Errore nella risposta:', error);
                    });              
                }
                else {
                  this.#players.forEach((p) => {
                    p.send(JSON.stringify({type: "remove_table_cards", card: data.card, cards: take.cardsTaken}));
                  });
                }
              }
              else {
                this.#players.forEach((p) => {
                  p.send(JSON.stringify({ type: "move", card: data.card })); //niente carte prese, fai aggiungere al giocatore opposto e anche all'iniziatore la carta al tavolo
                });    
              }           
            }

            if (this.#hands[0].length === 0 && this.#hands[1].length === 0 && this.#mazzo.getArray().length > 0) {
              this.dealCards();
            }else if(this.#hands[0].length === 0 && this.#hands[1].length === 0 && this.#mazzo.getArray().length == 0){
              this.assignScore();
              if(this.#points[0] > 11 || this.#points[1] > 11){
                if(this.#points[0] > this.#points[1]){
                  console.log("player 1 won");
                }else if(this.#points[0] == this.#points[1]){
                  console.log("Tie");
                }else{
                  console.log("player 2 won");
                }
              }else{
                this.#mazzo.rebuild();
                this.#mazzo.shuffle();
                this.dealTableCards();
                console.log("rimescolato: " + this.#mazzo.getArray().length);
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
          else if (data.type === "comboRequested") {
            let playerIndex = this.#players.indexOf(socket);
            let opponentIndex = playerIndex === 0 ? 1 : 0;
            removeComboCards(data.combo, this.#players[opponentIndex], playedCard, this.#players[playerIndex]);
          }
        });
        socket.on("close", () => {
          this.#players = this.#players.filter((p) => p !== socket);
          console.log("A player disconnected from some match");
        });
    });
  }


  removeComboCards(combos, oppositeSocket, playedCard, playerIndex) { //1 array di carte. 1 solo scelto dall'utente
    const comboToTake = combos;
    console.log("comboToTake: " + combos);
    console.log("tableCards before: " + this.#tableCards);

    this.#tableCards = this.#tableCards.filter( // Questa e' la parte di codice che dovrebbe fixare il problema delle carte che scompaiono a caso
      (tableCard) => !comboToTake.some(
        (comboCard) => comboCard.valore === tableCard.valore && comboCard.seme === tableCard.seme
      )
    );
//    this.#tableCards = this.#tableCards.filter(c => !comboToTake.includes(c)); questa linea non toglieva correttamente le carte combo dal tavolo
    console.log("tableCards after: " + this.#tableCards);

    this.#cardNum[playerIndex]++;
    if(playedCard.seme == 'D') this.#denari[playerIndex]++;
    if(playedCard.seme == 'D' && playedCard.valore == 7) this.#points[playerIndex]++;
    if(playedCard.seme == 'D' && playedCard.valore == 10) this.#points[playerIndex]++;
    if(playedCard.valore == 7) this.#primiera[playerIndex]++;

    comboToTake.forEach((card) => { 
      this.#cardNum[playerIndex]++;
      if(card.seme == 'D') this.#denari[playerIndex]++;
      if(card.seme == 'D' && card.valore == 7) this.#points[playerIndex]++;
      if(card.seme == 'D' && card.valore == 10) this.#points[playerIndex]++;
      if(card.valore == 7) this.#primiera[playerIndex]++;
    });

    oppositeSocket.send(JSON.stringify({type: "remove_table_cards", card: playedCard, cards: comboToTake}));
    playerIndex.send(JSON.stringify({type: "remove_table_cards", card: playedCard, cards: comboToTake}));
  }



  assignScore() {
    if(this.#cardNum[0] > this.#cardNum[1]){
      this.#points[0]++;
    }else if(this.#cardNum[0] < this.#cardNum[1]){
      this.#points[1]++;
    }

    if(this.#denari[0] > this.#denari[1]){
      this.#points[0]++;
    }else if(this.#denari[0] < this.#denari[1]){
      this.#points[1]++;
    }

    if(this.#primiera[0] > this.#primiera[1]){
      this.#points[0]++;
    }else if(this.#primiera[0] < this.#primiera[1]){
      this.#points[1]++;
    }
    console.log("player 1: " + this.#points[0] + " player 2: " + this.#points[1]);
  }

  managePresa(playedCard, playerIndex) {
  // Cerca prima una carta dello stesso valore
    const sameValueCard = this.#tableCards.find(c => c.valore === playedCard.valore);

    if (sameValueCard) {

      console.log("C'è una carta diretta: " + sameValueCard.valore + sameValueCard.seme);

      // Rimuove la carta dal tavolo memorizzato nel server
      this.#tableCards = this.#tableCards.filter(c => c !== sameValueCard);


      if(this.#tableCards.length == 0){ //tavolo vuoto = scopa
        this.#points[playerIndex]++;
        this.#players[playerIndex].send(JSON.stringify({type: "scopa"}));
      }

      this.#cardNum[playerIndex] += 2;

      if(playedCard.seme == 'D') this.#denari[playerIndex]++;
      if(sameValueCard.seme == 'D') this.#denari[playerIndex]++;

      if(playedCard.seme == 'D' && playedCard.valore == 7) this.#points[playerIndex]++;
      if(sameValueCard.seme == 'D' && playedCard.valore == 7) this.#points[playerIndex]++;

      if(playedCard.seme == 'D' && playedCard.valore == 10) this.#points[playerIndex]++;
      if(sameValueCard.seme == 'D' && playedCard.valore == 10) this.#points[playerIndex]++;

      if(playedCard.valore == 7) this.#primiera[playerIndex]++;
      if(sameValueCard.valore == 7) this.#primiera[playerIndex]++;

      return {
        taken: true,
        cardsTaken: [sameValueCard]
      };
    }

    // Se non esiste una carta con lo stesso valore, cerca combinazioni che sommano al valore giocato
    console.log("Alla ricerca di combo");
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
      console.log(combos);
      return {
        taken: true,
        combosAvail: combos
      };
    }

    // Se non può prendere niente, la carta rimane sul tavolo
    this.#tableCards.push(playedCard);
    return {
      taken: false,
      cardsTaken: []
    };
  }

  dealTableCards(){
    for (let i = 0; i < 4; i++) {
      this.#tableCards.push(this.#mazzo.getArray().pop());
    }

    this.#players.forEach((p) => {
      p.send(JSON.stringify({ type: "tableCards", arr: this.#tableCards }));
    });
  }

  //Dealing delle carte
  dealCards() {
    // Distribuisci 3 carte a ogni player

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

  waitForResponse(playerIndex, combos) {
    return new Promise((resolve, reject) => {
      // Imposta un listener per la risposta del client
      this.#players[playerIndex].once('message', (message) => {
        try {
          const response = JSON.parse(message);
          
          // Verifica che la risposta sia corretta
          if (response.type === 'combo_response') {
            resolve(response);  // Risposta ricevuta con successo
          } else {
            reject('Tipo di risposta errato');
          }
        } catch (error) {
          reject('Errore nella risposta');
        }
      });
  
      // Invia il messaggio al client
      this.#players[playerIndex].send(
        JSON.stringify({ type: "remove_table_cards_combosAvail", combos: combos })
      );
    });
  };
}

module.exports = Partita;
