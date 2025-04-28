class Player {
    #socket = null;
    #name; //for future use
    #hand = [];
    #points = 0;
    #cardNum = 0;
    #denariNum = 0;
    #primieraNum = 0;

    constructor(socket) {
        this.setSocket(socket);
    }

    getSocket() {
        return this.#socket;
    }

    setSocket(socket) {
        if (!socket) throw new Error("Socket non valido");
        this.#socket = socket;
    }

    getHandLength() {
        return this.#hand.length;
    }

    emptyHand() {
        this.#hand.length = 0;
    }
    getHand() {
        return this.#hand;
    }

    addCard(card) {
        this.#hand.push(card);
    }

    delCard(card) {
        this.#hand = this.#hand.filter((c) => !(c.valore === card.valore && c.seme === card.seme));
    }

    setHand(hand) {
        if (!Array.isArray(hand)) throw new Error("Mano deve essere un array");
        this.#hand = hand;
    }

    getPoints() {
        return this.#points;
    }

    setPoints(points) {
        if (typeof points !== "number" || points < 0) throw new Error("Punti non validi");
        this.#points = points;
    }

    addPoint() {
        this.#points++;
    }

    getCardNum() {
        return this.#cardNum;
    }

    incrementCardNum(n) {
        this.#cardNum += n;
    }

    addCardNum() {
        this.#cardNum++;
    }

    //Denari
    getDenariNum() {
        return this.#denariNum;
    }

    incrementDenariNum(n) {
        this.#denariNum += n;
    }

    addDenariNum() {
        this.#denariNum++;
    }

    //Primiera
    getPrimieraNum() {
        return this.#primieraNum;
    }

    addPrimieraNum() {
        this.#primieraNum++;
    }

    incrementPrimieraNum(n) {
        this.#primieraNum += n;
    }
}

module.exports = Player;
