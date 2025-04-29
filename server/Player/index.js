class Player {
    #socket = null;
    #name; //for future use
    #hand = [];
    #points = 0;
    #totalPoints = 0;
    #cardNum = 0;
    #denariNum = 0;
    #primieraNum = 0;

    constructor(socket, name) {
        this.setSocket(socket);
        this.setName(name);
    }

    getName() {
        return this.#name;
    }

    setName(name) {
        this.#name = name;
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

    //Points
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

    updateTotalPoints() {
        this.#totalPoints += this.getPoints();
    }

    cleanPoint() {
        this.setPoints(0); //reset counter
        this.resetExtra(); //reset other counters
    }

    getTotalPoints() {
        return this.#totalPoints;
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

    resetExtra() {
        this.#cardNum = 0;
        this.#denariNum = 0;
        this.#primieraNum = 0;
    }
}

module.exports = Player;
