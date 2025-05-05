const Player = require("../Player/index.js");
const { EventEmitter } = require('events');

class Partita extends EventEmitter {
    #player1;
    #player2;
    #mazzo;
    #playersArray = []; //array per i 2 oggetti Player.
    #tableCards = []; //array carte del tavolo
    #lastToGetCards; //self esplicative
    #pingInterval;

    constructor(socketPlayer1, socketPlayer2, mazzo) {
        super(); //eventemitter
        this.setPlayer1(new Player(socketPlayer1, "Player1"));
        this.setPlayer2(new Player(socketPlayer2, "Player2"));
        this.setMazzo(mazzo);
        this.setPlayersArray(this.getPlayer1(), this.getPlayer2());
        this.startRound();
        this.setKeepAlive(); //ping-pong structure at application level
    }

    //Methods
    startRound() {
        // Invia lo stato iniziale ai player
        this.#playersArray.forEach((p, index) => { //turn da cambiare per i match restartati!!!!!!!!
            p.getSocket().send(JSON.stringify({ type: "start", turn: index === 0 }));
        });
        this.linkMessageEvent(); //linka un metodo apposito per gestire i messaggi ai 2 socket
        this.dealStartingCards(false); //3 carte per player
        this.dealTableCards(); //4 carte nel tavolo
    }

    linkMessageEvent() {
        this.#playersArray.forEach((player) => {
            player.getSocket().on("message", (msg) => this.handleMessages(msg, player, this.getOppositePlayer(player)));
            player.getSocket().on("close", () => {
                if (this.#playersArray.length === 2) {
                    player.getSocket().close();
                    this.removePlayerFromArray(player); //player closed the connection.
                    this.sendToSinglePlayer(this.#playersArray[0], { type: "close" });
                    this.destroy();
                }
                else {
                    player.getSocket().close();
                    this.removePlayerFromArray(player); //player closed the connection.
                }
                console.log("A player disconnected from some match");

            });
        })
    }

    getOppositePlayer(playerBase) {
        // Restituisce il giocatore opposto
        return this.#playersArray[0] === playerBase ? this.#playersArray[1] : this.#playersArray[0];
    }

    dealStartingCards(wait) { //3 per utente
        if (wait) {
            setTimeout(() => {
                for (let i = 0; i < 3; i++) {
                    this.#player1.addCard(this.#mazzo.getArray().pop());
                    this.#player2.addCard(this.#mazzo.getArray().pop());
                }

                this.#playersArray.forEach((p) => {
                    p.getSocket().send(JSON.stringify({ type: "startingCards", arr: p.getHand() }));
                    console.log("Starting cards " + p.getName() + ": " + JSON.stringify(p.getHand()));
                });
            }, 1500);
        }
        else {
            for (let i = 0; i < 3; i++) {
                this.#player1.addCard(this.#mazzo.getArray().pop());
                this.#player2.addCard(this.#mazzo.getArray().pop());
            }

            this.#playersArray.forEach((p) => {
                p.getSocket().send(JSON.stringify({ type: "startingCards", arr: p.getHand() }));
                console.log("Starting cards " + p.getName() + ": " + JSON.stringify(p.getHand()));
            });
        }
    }



    dealTableCards() { //4 al tavolo
        for (let i = 0; i < 4; i++) {
            this.addTableCard(this.#mazzo.getArray().pop());
        }
        this.#playersArray.forEach((p) => {
            p.getSocket().send(JSON.stringify({
                type: "tableCards",
                arr: this.getTableCards()
            }));
        });
    }

    setKeepAlive() {
        this.#pingInterval = setInterval(() => {
            this.#playersArray.forEach((p) => {
                if (!p.isAlive()) {
                    console.log(`Player ${p.getName()} did not respond to ping, terminating connection.`);
                    p.getSocket().terminate();
                    this.removePlayerFromArray(p);

                    if (this.#playersArray.length !== 0) {
                        this.sendToSinglePlayer(this.#playersArray[0], { type: "close" });
                    }

                    this.destroy();
                    return;
                }
                if (p) {
                    p.setAlive(false);
                    this.sendToSinglePlayer(p, { type: "ping" });
                }
            });
        }, 5000);
    }

    sendToAllPlayers(msg) {
        this.#playersArray.forEach((player) => {
            player.getSocket().send(JSON.stringify(msg));
        })
    }

    sendToSinglePlayer(player, msg) {
        player.getSocket().send(JSON.stringify(msg));
    }

    emptyPlayersHands() {
        this.#playersArray.forEach((player) => {
            player.emptyHand();
        })
    }


    // Most important method!
    handleMessages(message, player, oppositePlayer) {
        const data = JSON.parse(message);
        switch (data.type) {
            case "move":
                console.log("Carte in tavola premossa: " + JSON.stringify(this.#tableCards));
                const playedCard = data.card;
                let take = this.managePresa(playedCard, player);

                // Rimuovi carta dalla mano del player
                player.delCard(playedCard);
                console.log("Player deck: " + JSON.stringify(player.getHand()));
                console.log("Opposite player deck: " + JSON.stringify(oppositePlayer.getHand()));
                //Dimensione mazzo check
                console.log("Dimensione mazzo: " + this.#mazzo.getArray().length);

                if (oppositePlayer) {
                    oppositePlayer.getSocket().send(
                        JSON.stringify({ type: "remove_opponent_card" }) //rimuove, dalla vista del giocatore opposto, 1 carta del giocatore che ha iniziato la mossa
                    );
                    if (take.taken == true) {
                        this.#lastToGetCards = player; //set last player to get cards from the table
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
                            this.switchTurns(player, true);
                        }
                    } else {
                        this.sendToAllPlayers({ type: "move", card: data.card });
                        this.switchTurns(player, false);
                    }
                }
                console.log("Carte in tavola postmossa: " + JSON.stringify(this.#tableCards));
                //Check hands and table deck.
                this.checkDecks(player, oppositePlayer);
                break;
            case "combo_response":
                this.switchTurns(player, true);
                break;
            case "getcount":
                this.sendToSinglePlayer(player, { type: "tableCount", count: this.#mazzo.getArray().length });
                break;
            case "pong":
                player.setAlive(true);
                break;
            default:
                console.log("Type non riconosciuto: " + JSON.stringify(data));
        }
    }

    switchTurns(player, wait) {
        //Switch turns
        if (wait) {
            setTimeout(() => {
                this.#playersArray.forEach((p, index) => {
                    p.getSocket().send(
                        JSON.stringify({
                            type: "turn",
                            turn: index !== this.#playersArray.indexOf(player),
                        })
                    );
                })
            }, 1500);
        } else {
            this.#playersArray.forEach((p, index) => {
                p.getSocket().send(
                    JSON.stringify({
                        type: "turn",
                        turn: index !== this.#playersArray.indexOf(player),
                    })
                );
            })
        }

    }

    managePresa(playedCard, player) {
        // Cerca carte di stesso valore
        let singlePresaArray = [];
        let result = {};

        this.#tableCards.forEach((c) => {
            if (c.valore === playedCard.valore)
                singlePresaArray.push([c]);
        })

        if (singlePresaArray.length > 0) {
            if (singlePresaArray.length === 1) {
                console.log("Carta singola disponibile: " + JSON.stringify(singlePresaArray[0]))
                result = {
                    taken: true,
                    cardsTaken: singlePresaArray[0],
                }
                this.delTableCard(singlePresaArray[0][0]);
                this.trackCardPoints(playedCard, player); //count the playedCard
                this.trackCardPoints(singlePresaArray[0][0], player) //count the taken card
            } else {
                console.log("Carte singole disponibili: " + JSON.stringify(singlePresaArray));
                result = {
                    taken: true,
                    combosAvail: singlePresaArray,
                }
            }

        }
        else {
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
                result = {
                    taken: true,
                    combosAvail: combos,
                };
            } else {
                // Se non può prendere niente, la carta rimane sul tavolo
                this.addTableCard(playedCard);
                result = {
                    taken: false,
                    cardsTaken: [],
                };
            }
        }
        if (this.getTableCards().length == 0) {
            //tavolo vuoto = scopa
            player.addScopeNum();
            player.addPoint();
            this.sendToSinglePlayer(player, { type: "scopa" });
            console.log("Scopa NON da combo!");
            //this.sendToAllPlayers({ type: "scopa" });
        }
        return result;
    }

    waitForResponse(player, combos) {
        return new Promise((resolve, reject) => {
            const socket = player.getSocket();

            const handler = (message) => {
                try {
                    const response = JSON.parse(message);

                    if (response.type === "combo_response") {
                        socket.off("message", handler); // Remove listener after success
                        resolve(response);
                    }
                    // Ignore other message types (e.g., "pong")
                } catch (error) {
                    socket.off("message", handler);
                    reject("Errore nella risposta");
                }
            };

            socket.on("message", handler);

            socket.send(
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
            this.trackCardPoints(playedCard, player);
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
    }

    removeComboCards(combos, oppositePlayer, playedCard, player) {
        //1 array di carte. 1 solo scelto dall'utente
        const comboToTake = combos;
        console.log("comboToTake: " + JSON.stringify(combos));
        //console.log("tableCards before: " + JSON.stringify(this.#tableCards));

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
        //console.log("tableCards after: " + JSON.stringify(this.#tableCards));

        this.trackCardPoints(playedCard, player);

        comboToTake.forEach((card) => {
            this.trackCardPoints(card, player);
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

        if (this.getTableCards().length == 0) {
            //tavolo vuoto = scopa
            player.addPoint();
            player.addScopeNum();
            this.sendToSinglePlayer(player, { type: "scopa" });
            console.log("Scopa SI da combo!");
            //this.sendToAllPlayers({ type: "scopa" });
        }
    }

    checkDecks(player, oppositePlayer) {
        if (player.getHandLength() === 0 &&
            oppositePlayer.getHandLength() === 0 &&
            this.#mazzo.getArray().length > 0
        ) {
            this.dealStartingCards(true);
        } else if (
            player.getHandLength() === 0 &&
            oppositePlayer.getHandLength() === 0 &&
            this.#mazzo.getArray().length == 0
        ) {
            this.gestisciUltimeCarte(); //gestisci le carte rimaste
            this.assignScore(player, oppositePlayer); //aggiunge punti ai player
            let continueGame = this.endMatch(player, oppositePlayer);
            if (continueGame) {
                this.#mazzo.rebuild(); //uguale al costruttore
                this.#mazzo.shuffle();
                this.emptyPlayersHands();
                this.#tableCards.length = 0; // reset tableCards array
                setTimeout(() => {
                    this.dealTableCards();
                    console.log("rimescolato: " + this.#mazzo.getArray().length);
                    this.dealStartingCards(false);
                }, 3500);
            }
            else {
                //TBD
            }
        }
    }

    endMatch(player, oppositePlayer) {
        // Sync puntitotali += punti match attuale
        player.updateTotalPoints();
        oppositePlayer.updateTotalPoints();

        console.log(
            "endMatch() Punti locali: " + player.getName() + " " + player.getPoints() + " " + oppositePlayer.getName() + oppositePlayer.getPoints()
        );
        console.log(
            "endMatch() Punti totali: " + player.getName() + " " + player.getTotalPoints() + " " + oppositePlayer.getName() + oppositePlayer.getTotalPoints()
        );

        // Determina il vincitore del match attuale (non della serie)
        let winner = player.getPoints() > oppositePlayer.getPoints() ? player : oppositePlayer;
        let loser = winner === player ? oppositePlayer : player;

        // Controlla se uno dei due ha raggiunto o superato 11 punti totali
        if (player.getTotalPoints() >= 11 || oppositePlayer.getTotalPoints() >= 11) {

            // pareggio 11-11
            if (player.getTotalPoints() === oppositePlayer.getTotalPoints()) {
                console.log("Tie");
                this.sendToAllPlayers({ type: "tieResult", verdict: "pareggiato", points: player.getTotalPoints() });
                this.sendStatistics(player, oppositePlayer);
                player.cleanPoint();
                oppositePlayer.cleanPoint();
                return true;
            }

            // Uno dei due ha vinto la serie
            let finalWinner = player.getTotalPoints() > oppositePlayer.getTotalPoints() ? player : oppositePlayer;
            let loserWinner = finalWinner === player ? oppositePlayer : player;

            console.log(finalWinner.getName() + " won entire series!");
            this.sendToSinglePlayer(finalWinner, {
                type: "matchResult",
                verdict: "vinto",
                points: finalWinner.getTotalPoints(),
                oppositePoints: loserWinner.getTotalPoints()
            });
            this.sendToSinglePlayer(loserWinner, {
                type: "matchResult",
                verdict: "perso",
                points: loserWinner.getTotalPoints(),
                oppositePoints: finalWinner.getTotalPoints()
            });
            this.sendStatistics(player, oppositePlayer);
            player.cleanPoint();
            oppositePlayer.cleanPoint();
            this.destroy();
            return false; // partita finita
        } else if (player.getPoints() === oppositePlayer.getPoints()) {
            // Gestisce il pareggio nel match attuale
            console.log("Match Tie");
            this.sendToAllPlayers({ type: "matchTie", verdict: "pareggiato", points: player.getPoints() });
            this.sendStatistics(player, oppositePlayer);
            player.cleanPoint();
            oppositePlayer.cleanPoint();
            return true; // continua a dare altre carte, altro round da giocare
        } else {
            // Nessuno ha ancora vinto la serie, si continua
            this.sendToSinglePlayer(winner, {
                type: "progressResult",
                verdict: "vinto",
                points: winner.getPoints(),
                oppositePoints: loser.getPoints()
            });
            this.sendToSinglePlayer(loser, {
                type: "progressResult",
                verdict: "perso",
                points: loser.getPoints(),
                oppositePoints: winner.getPoints()
            });
            this.sendStatistics(player, oppositePlayer);
            player.cleanPoint();
            oppositePlayer.cleanPoint();
            return true; // altro round da giocare
        }
    }

    removePlayerFromArray(player) {
        this.#playersArray = this.#playersArray.filter((p) => p !== player);
    }

    sendStatistics(player, oppositePlayer) {
        this.sendToSinglePlayer(player, { type: "stats", youStats: player.toStats(), oppositeStats: oppositePlayer.toStats() });
        this.sendToSinglePlayer(oppositePlayer, { type: "stats", youStats: oppositePlayer.toStats(), oppositeStats: player.toStats() });
    }

    trackCardPoints(card, player) {
        // ogni carta presa conta come “carta”
        player.addCardNum();

        // se è denari, conto denari e (se vale 7 o 10) punto + contatore specifico
        if (card.seme === "D") {
            player.addDenariNum();

            if (card.valore === 7) {
                player.addSetteDenariNum();
                player.addPoint();
            } else if (card.valore === 10) {
                player.addReDenariNum();
                player.addPoint();
            }
        }

        // qualsiasi 7 vale per la primiera
        if (card.valore === 7) {
            player.addPrimieraNum();
        }
        console.log(`[TRACK] ${player.getName()} gets ${card.valore}${card.seme}. Player count: ${player.getCardNum()} `);
    }


    destroy() {
        clearInterval(this.#pingInterval);
        this.#playersArray.length = 0;
        this.emit('end');
    }

    // Getter & Setter
    delTableCard(card) {
        this.#tableCards = this.#tableCards.filter(c => !(c.valore === card.valore && c.seme === card.seme));
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
