const Player = require("../Player/index.js");
const Card = require("../Card/index.js");

class Partita {
    #player1;
    #player2;
    #mazzo;
    #playersArray = []; //array per i 2 oggetti Player.
    #tableCards = []; //array carte del tavolo
    #lastToGetCards; //self esplicative

    constructor(socketPlayer1, socketPlayer2, mazzo) {
        this.setPlayer1(new Player(socketPlayer1));
        this.setPlayer2(new Player(socketPlayer2));
        this.setMazzo(mazzo);
        this.setPlayersArray(this.getPlayer1(), this.getPlayer2());
        this.startRound();
        this.setKeepAlive();
    }

    //Methods
    startRound() {
        // Invia lo stato iniziale ai player
        this.#playersArray.forEach((p, index) => {
            p.getSocket().send(JSON.stringify({ type: "start", turn: index === 0 }));
        });
        this.linkMessageEvent(); //linka un metodo apposito per gestire i messaggi ai 2 socket
        this.dealStartingCards(); //3 carte per player
        this.dealTableCards(); //4 carte nel tavolo
    }

    linkMessageEvent() {
        this.#playersArray.forEach((player) => {
            player.getSocket().on("message", (msg) => this.handleMessages(msg, player, this.getOppositePlayer(player)));
            player.getSocket().on("close", () => {
                this.#playersArray = this.#playersArray.filter((p) => p !== player);
                console.log("A player disconnected from some match");
            });
        })


    }

    getOppositePlayer(playerBase) {
        // Restituisce il giocatore opposto
        return this.#playersArray[0] === playerBase ? this.#playersArray[1] : this.#playersArray[0];
    }

    dealStartingCards() { //3 per utente
        for (let i = 0; i < 3; i++) {
            this.#player1.addCard(this.#mazzo.getArray().pop());
            this.#player2.addCard(this.#mazzo.getArray().pop());
        }

        this.#playersArray.forEach((p) => {
            p.getSocket().send(JSON.stringify({ type: "startingCards", arr: p.getHand() }));
            console.log(JSON.stringify(p.getHand()));
        });
    }

    dealTableCards() { //4 al tavolo
        for (let i = 0; i < 4; i++) {
            this.addTableCard(this.#mazzo.getArray().pop());
        }
        this.#playersArray.forEach((p) => {
            p.getSocket().send(JSON.stringify({ type: "tableCards", arr: this.getTableCards() }));
        });
    }

    setKeepAlive() {
        setInterval(() => {
            this.#playersArray.forEach((p) => {
                p.getSocket().send(JSON.stringify({ type: "keepalive" }));
            });
        }, 10000);
    }

    sendToAllPlayers(msg) {
        this.#playersArray.forEach((player) => {
            player.getSocket().send(JSON.stringify(msg));
        })
    }

    emptyPlayersHands() {
        this.#playersArray.forEach((player) => {
            player.emptyHand();
        })
    }


    // Most important method!
    handleMessages(message, player, oppositePlayer) {
        const data = JSON.parse(message);
        console.log("kabuki: " + data.type);
        switch (data.type) {
            case "move":
                const playedCard = data.card;
                let take = this.managePresa(playedCard, player);

                // Rimuovi carta dalla mano del player
                player.delCard(playedCard);
                console.log("Player deck: " + JSON.stringify(player.getHand()));
                console.log("Opposite player deck: " + JSON.stringify(oppositePlayer.getHand()));
                //Dimensione mazzo check
                console.log("dimensione mazzo: " + this.#mazzo.getArray().length);

                if (oppositePlayer) {
                    oppositePlayer.getSocket().send(
                        JSON.stringify({ type: "remove_opponent_card" }) //rimuove, dalla vista del giocatore opposto, 1 carta del giocatore che ha iniziato la mossa
                    );
                    if (take.taken == true) {
                        this.#lastToGetCards = player;
                        if (take.combosAvail) {
                            console.log("Si ci sono combo");
                            this.waitForResponse(player, take.combosAvail)
                                .then((response) => {
                                    this.removeComboCards(
                                        response.combo,
                                        oppositePlayer,
                                        playedCard,
                                        player
                                    );
                                })
                                .catch((error) => {
                                    console.log("Errore nella risposta:", error);
                                });
                        } else {
                            this.sendToAllPlayers({
                                type: "remove_table_cards",
                                card: data.card,
                                cards: take.cardsTaken,
                            });
                        }
                    } else {
                        this.sendToAllPlayers({ type: "move", card: data.card });
                    }
                }

                if (
                    player.getHandLength() === 0 &&
                    oppositePlayer.getHandLength() === 0 &&
                    this.#mazzo.getArray().length > 0
                ) {
                    this.dealStartingCards();
                } else if (
                    player.getHandLength() === 0 &&
                    oppositePlayer.getHandLength() === 0 &&
                    this.#mazzo.getArray().length == 0
                ) {
                    this.gestisciUltimeCarte(); //gestisci le carte rimaste
                    this.assignScore(player, oppositePlayer); //aggiunge punti ai player
                    if (player.getPoints() > 11 || oppositePlayer.getPoints() > 11) {
                        if (player.getPoints() > oppositePlayer.getPoints()) {
                            console.log("player 1 won");
                        } else if (player.getPoints() == oppositePlayer.getPoints()) {
                            console.log("Tie");
                        } else {
                            console.log("player 2 won");
                        }
                    } else {
                        this.#mazzo.rebuild(); //uguale al costruttore
                        this.#mazzo.shuffle();
                        this.sendToAllPlayers({ type: "matchEnd" });
                        this.emptyPlayersHands();
                        this.#tableCards.length = 0;//?
                        this.dealTableCards();
                        console.log("rimescolato: " + this.#mazzo.getArray().length);
                        this.dealStartingCards();
                    }
                }

                //Switch turns
                this.#playersArray.forEach((p, index) => {
                    p.getSocket().send(
                        JSON.stringify({
                            type: "turn",
                            turn: index !== this.#playersArray.indexOf(player),
                        })
                    );
                })
                break;
            default:
                console.log("Type non riconosciuto: " + JSON.stringify(data));
        }
    }

    managePresa(playedCard, player) {
        // Cerca prima una carta dello stesso valore
        const sameValueCard = this.#tableCards.find((c) => c.valore === playedCard.valore);

        if (sameValueCard) {
            console.log("C'è una presa diretta: " + sameValueCard.valore + sameValueCard.seme);

            // Rimuove la carta dal tavolo memorizzato nel server
            this.delTableCard(sameValueCard);

            if (this.getTableCards().length == 0) {
                //tavolo vuoto = scopa
                player.addPoint();
                this.sendToAllPlayers({ type: "scopa" });
            }

            player.incrementCardNum(2);

            if (playedCard.seme == "D") player.addDenariNum();
            if (sameValueCard.seme == "D") player.addDenariNum();

            if (playedCard.seme == "D" && playedCard.valore == 7)
                player.addPoint();
            if (sameValueCard.seme == "D" && playedCard.valore == 7)
                player.addPoint();

            if (playedCard.seme == "D" && playedCard.valore == 10)
                player.addPoint();
            if (sameValueCard.seme == "D" && playedCard.valore == 10)
                player.addPoint();

            if (playedCard.valore == 7) player.addPrimieraNum();
            if (sameValueCard.valore == 7) player.addPrimieraNum();

            return {
                taken: true,
                cardsTaken: [sameValueCard],
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
                combosAvail: combos,
            };
        }

        // Se non può prendere niente, la carta rimane sul tavolo
        this.addTableCard(playedCard);
        return {
            taken: false,
            cardsTaken: [],
        };
    }

    waitForResponse(player, combos) {
        return new Promise((resolve, reject) => {
            // Imposta un listener per la risposta del client
            player.getSocket().once("message", (message) => {
                try {
                    const response = JSON.parse(message);

                    // Verifica che la risposta sia corretta
                    if (response.type === "combo_response") {
                        resolve(response); // Risposta ricevuta con successo
                    } else {
                        reject("Tipo di risposta errato");
                    }
                } catch (error) {
                    reject("Errore nella risposta");
                }
            });

            // Invia il messaggio al client
            player.getSocket().send(
                JSON.stringify({
                    type: "remove_table_cards_combosAvail",
                    combos: combos,
                })
            );
        });
    }

    gestisciUltimeCarte() {
        let arr = this.#tableCards.slice(); //copia
        let player = this.#lastToGetCards;
        arr.forEach((playedCard) => {
            player.addCardNum();
            if (playedCard.seme == "D") player.addDenariNum();
            if (playedCard.seme == "D" && playedCard.valore == 7)
                player.addPoint();
            if (playedCard.seme == "D" && playedCard.valore == 10)
                player.addPoint();
            if (playedCard.valore == 7) player.addPrimieraNum();
        });
        this.sendToAllPlayers({
            type: "remove_table_cards",
            card: null,
            cards: this.#tableCards,
        });
    }

    assignScore(player, oppositePlayer) {
        if (player.getCardNum() > oppositePlayer.getCardNum()) {
            player.addPoint();
        } else if (player.getCardNum() < oppositePlayer.getCardNum()) {
            oppositePlayer.addPoint();
        }

        if (player.getDenariNum() > oppositePlayer.getDenariNum()) {
            player.addPoint();
        } else if (player.getDenariNum() < oppositePlayer.getDenariNum()) {
            oppositePlayer.addPoint();
        }

        if (player.getPrimieraNum() > oppositePlayer.getPrimieraNum()) {
            player.addPoint();
        } else if (player.getPrimieraNum() < oppositePlayer.getPrimieraNum()) {
            oppositePlayer.addPoint();
        }
        console.log(
            "player 1: " + player.getPoints() + " player 2: " + oppositePlayer.getPoints()
        );
    }

    removeComboCards(combos, oppositePlayer, playedCard, player) {
        //1 array di carte. 1 solo scelto dall'utente
        const comboToTake = combos;
        console.log("comboToTake: " + combos);
        console.log("tableCards before: " + JSON.stringify(this.#tableCards));

        this.#tableCards = this.#tableCards.filter(
            // Questa e' la parte di codice che dovrebbe fixare il problema delle carte che scompaiono a caso
            (tableCard) =>
                !comboToTake.some(
                    (comboCard) =>
                        comboCard.valore === tableCard.valore &&
                        comboCard.seme === tableCard.seme
                )
        );
        //    this.#tableCards = this.#tableCards.filter(c => !comboToTake.includes(c)); questa linea non toglieva correttamente le carte combo dal tavolo
        console.log("tableCards after: " + JSON.stringify(this.#tableCards));

        player.addCardNum();
        if (playedCard.seme == "D") player.addDenariNum();
        if (playedCard.seme == "D" && playedCard.valore == 7)
            player.addPoint();
        if (playedCard.seme == "D" && playedCard.valore == 10)
            player.addPoint();
        if (playedCard.valore == 7) player.addPrimieraNum();

        comboToTake.forEach((card) => {
            player.addCardNum();
            if (card.seme == "D") player.addDenariNum();
            if (card.seme == "D" && card.valore == 7) player.addPoint();
            if (card.seme == "D" && card.valore == 10) player.addPoint();
            if (card.valore == 7) player.addPrimieraNum();
        });

        oppositePlayer.getSocket().send(
            JSON.stringify({
                type: "remove_table_cards",
                card: playedCard,
                cards: comboToTake,
            })
        );
        player.getSocket().send(
            JSON.stringify({
                type: "remove_table_cards",
                card: playedCard,
                cards: comboToTake,
            })
        );
    }


    // Getter & Setter

    delTableCard(card) {
        this.#tableCards = this.#tableCards.filter((c) => c.valore !== card.valore);
    }

    addTableCard(card) {
        this.#tableCards.push(card);
    }

    getTableCards() {
        return this.#tableCards;
    }

    getPlayersArray() {
        return this.#playersArray;
    }

    setPlayersArray(player1, player2) {
        this.#playersArray.push(player1);
        this.#playersArray.push(player2);
    }

    getPlayer1() {
        return this.#player1;
    }

    setPlayer1(socket) {
        if (!socket) throw new Error("Socket non valido per player1");
        this.#player1 = socket;
    }

    getPlayer2() {
        return this.#player2;
    }

    setPlayer2(socket) {
        if (!socket) throw new Error("Socket non valido per player2");
        this.#player2 = socket;
    }

    getMazzo() {
        return this.#mazzo;
    }

    setMazzo(mazzo) {
        this.#mazzo = mazzo;
    }
}

module.exports = Partita;