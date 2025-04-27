class Partita {
  #player1;
  #player2;
  #mazzo;
  #points = [0, 0];
  #cardNum = [0, 0];
  #denari = [0, 0];
  #primiera = [0, 0];
  #hands = [[], []];
  #tableCards = [];
  #players = [];
  #cards = [];

  constructor(player1, player2, mazzo) {
      this.#player1 = player1;
      this.#player2 = player2;
      this.#mazzo = mazzo;
      this.#players.push(player1, player2);
      this.startRound();
  }

  startRound() {
      this.#players.forEach((p, index) => {
          p.send(JSON.stringify({ type: "start", turn: index === 0 }));
      });

      this.dealTableCards();
      this.dealCards();

      this.#players.forEach((socket, index) => {
          socket.on("message", (message) => {
              const data = JSON.parse(message);

              if (data.type === "move") {
                  let playerIndex = this.#players.indexOf(socket);
                  let opponentIndex = playerIndex === 0 ? 1 : 0;

                  const playedCard = data.card;

                  let take = this.managePresa(playedCard, playerIndex);

                  this.#hands[playerIndex] = this.#hands[playerIndex].filter(
                      (c) =>
                          !(c.valore === playedCard.valore && c.seme === playedCard.seme)
                  );

                  if (take.taken == true) {
                      if (take.combosAvail) {
                          this.waitForResponse(playerIndex, take.combosAvail)
                              .then((response) => {
                                  this.removeComboCards(
                                      response.combo,
                                      this.#players[opponentIndex],
                                      playedCard,
                                      playerIndex
                                  );
                              })
                              .catch((error) => {
                                  console.log("Errore nella risposta:", error);
                              });
                      } else {
                          this.#tableCards = this.#tableCards.filter(c => !take.cardsTaken.some(ct => ct.valore === c.valore && ct.seme === c.seme));
                          this.#players.forEach((p) => {
                              p.send(
                                  JSON.stringify({
                                      type: "remove_table_cards",
                                      card: playedCard,
                                      cards: take.cardsTaken,
                                  })
                              );
                          });
                      }
                  } else {
                      this.#tableCards.push(playedCard);
                      this.#players[opponentIndex].send(
                          JSON.stringify({ type: "move", card: data.card })
                      );
                  }

                  if (this.#hands[0].length === 0 && this.#hands[1].length === 0 && this.#mazzo.getArray().length > 0) {
                      this.dealCards();
                  } else if (this.#hands[0].length === 0 && this.#hands[1].length === 0 && this.#mazzo.getArray().length == 0) {
                      this.assignScore();
                      if (this.#points[0] > 11 || this.#points[1] > 11) {
                          this.endGame();
                      } else {
                          this.#mazzo.rebuild();
                          this.#mazzo.shuffle();
                          this.dealTableCards();
                          this.dealCards();
                      }
                  }

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
          });
      });
  }

  removeComboCards(combos, oppositeSocket, playedCard, playerIndex) {
      const comboToTake = combos;

      if (!comboToTake || comboToTake.length === 0) {
          console.log("Nessuna combo da prendere.");
          return;
      }

      this.#tableCards = this.#tableCards.filter(card => !comboToTake.some(c => c.valore === card.valore && c.seme === card.seme));

      this.#cardNum[playerIndex]++;
      if (playedCard.seme == "D") this.#denari[playerIndex]++;
      if (playedCard.seme == "D" && playedCard.valore == 7) this.#points[playerIndex]++;
      if (playedCard.seme == "D" && playedCard.valore == 10) this.#points[playerIndex]++;
      if (playedCard.valore == 7) this.#primiera[playerIndex]++;

      comboToTake.forEach((card) => {
          this.#cardNum[playerIndex]++;
          if (card.seme == "D") this.#denari[playerIndex]++;
          if (card.seme == "D" && card.valore == 7) this.#points[playerIndex]++;
          if (card.seme == "D" && card.valore == 10) this.#points[playerIndex]++;
          if (card.valore == 7) this.#primiera[playerIndex]++;
      });

      this.#players.forEach((p) => {
          p.send(
              JSON.stringify({
                  type: "remove_table_cards",
                  card: playedCard,
                  cards: comboToTake,
              })
          );
      });

      this.updateTableCards();
  }

  assignScore() {
      if (this.#cardNum[0] > this.#cardNum[1]) {
          this.#points[0]++;
      } else if (this.#cardNum[0] < this.#cardNum[1]) {
          this.#points[1]++;
      }
      if (this.#denari[0] > this.#denari[1]) {
          this.#points[0]++;
      } else if (this.#denari[0] < this.#denari[1]) {
          this.#points[1]++;
      }
      if (this.#primiera[0] > this.#primiera[1]) {
          this.#points[0]++;
      } else if (this.#primiera[0] < this.#primiera[1]) {
          this.#points[1]++;
      }
  }

  managePresa(playedCard, playerIndex) {
      let cardsTaken = [];
      let combosAvail = [];
      let total = playedCard.valore;

      const sameValueCard = this.#tableCards.find(
          (c) => c.valore === playedCard.valore
      );

      if (sameValueCard) {
          this.#tableCards = this.#tableCards.filter((c) => c !== sameValueCard);
          cardsTaken.push(sameValueCard);

          this.#cardNum[playerIndex] += 2;

          if (this.#tableCards.length === 0) {
              this.#points[playerIndex]++;
          }

          if (playedCard.seme === "D" && playedCard.valore === 7) {
              this.#points[playerIndex]++;
          }
          if (sameValueCard.seme === "D" && sameValueCard.valore === 7) {
              this.#points[playerIndex]++;
          }
          if (playedCard.seme === "D" && playedCard.valore === 10) {
              this.#points[playerIndex]++;
          }
          return { taken: true, cardsTaken: cardsTaken, combosAvail: null };
      }
       function findCombinations(
          targetSum,
          cards,
          index = 0,
          currentCombination = [],
          results = []
      ) {
        if (targetSum === 0) {
          results.push([...currentCombination]);
          return;
        }

        if (targetSum < 0 || index >= cards.length) {
          return;
        }

        currentCombination.push(cards[index]);
        findCombinations(
          targetSum - cards[index].valore,
          cards,
          index + 1,
          currentCombination,
          results
        );

        currentCombination.pop();

        findCombinations(targetSum, cards, index + 1, currentCombination, results);

        return results;
      }
  
      let combinations = findCombinations(playedCard.valore, this.#tableCards);

      if (combinations.length > 0) {
        combosAvail = combinations;
        return { taken: true, cardsTaken: null, combosAvail: combosAvail };
      } else {
          this.#tableCards.push(playedCard);
          return { taken: false, cardsTaken: [], combosAvail: null };
      }
  }

  dealTableCards() {
      for (let i = 0; i < 4; i++) {
          this.#tableCards.push(this.#mazzo.getArray().pop());
      }
      this.#players.forEach((p) => {
          p.send(JSON.stringify({ type: "tableCards", arr: this.#tableCards }));
      });
  }

  dealCards() {
      this.#hands[0] = [];
      this.#hands[1] = [];

      for (let i = 0; i < 3; i++) {
          this.#hands[0].push(this.#mazzo.getArray().pop());
          this.#hands[1].push(this.#mazzo.getArray().pop());
      }
      this.#players.forEach((p, idx) => {
          p.send(JSON.stringify({ type: "startingCards", arr: this.#hands[idx] }));
      });
  }

  getCount() {
      return this.#cards.length;
  }

  waitForResponse(playerIndex, combos) {
      return new Promise((resolve, reject) => {
          this.#players[playerIndex].once("message", (message) => {
              try {
                  const response = JSON.parse(message);

                  if (response.type === "combo_response") {
                      resolve(response);
                  } else {
                      reject("Tipo di risposta errato");
                  }
              } catch (error) {
                  reject("Errore nella risposta");
              }
          });

          this.#players[playerIndex].send(
              JSON.stringify({
                  type: "remove_table_cards_combosAvail",
                  combos: combos,
              })
          );
      });
  }
  updateTableCards() {
      this.#players.forEach((p) => {
          p.send(JSON.stringify({ type: "tableCards", arr: this.#tableCards }));
      });
  }

  endGame() {
      let winnerIndex = this.#points[0] > this.#points[1] ? 0 : 1;
      let loserIndex = winnerIndex === 0 ? 1 : 0;

      this.#players[winnerIndex].send(
          JSON.stringify({ type: "game_over", won: true, points: this.#points })
      );
      this.#players[loserIndex].send(
          JSON.stringify({ type: "game_over", won: false, points: this.#points })
      );
  }
}

module.exports = Partita;
