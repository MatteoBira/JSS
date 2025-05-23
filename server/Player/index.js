class Player {
    #socket = null;
    #name; //for future use
    #hand = [];
    #points = 0;
    #scopeNum = 0;
    #totalPoints = 0;
    #cardNum = 0;
    #denariNum = 0;
    #primieraNum = 0;
    #settedenariNum = 0;
    #redenariNum = 0;
    #alive = true;
    #uuid = null; //if present, will be used for stats
    statsObj = { roundwin: 0, roundlost: 0, roundtie: 0, partitewin: 0, partitelost: 0, scope: 0 };

    constructor(socket, name, uuid) {
        this.setSocket(socket);
        this.setName(name);
        this.setUuid(uuid);
    }

    setUuid(uuid) {
        if (uuid)
            this.#uuid = uuid;
        else
            this.#uuid = null;
    }

    getUuid() {
        return this.#uuid;
    }

    isUuid() {
        return this.#uuid != null;
    }


    isAlive() {
        return this.#alive;
    }

    setAlive(bool) {
        this.#alive = bool;
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

    //Scope
    getScopeNum() {
        return this.#scopeNum;
    }

    addScopeNum() {
        this.#scopeNum++;
    }

    incrementScopeNum(n) {
        this.#scopeNum += n;
    }

    //7 denari
    getSetteDenariNum() {
        return this.#settedenariNum;
    }

    setSetteDenariNum(n) {
        if (typeof n !== "number" || n < 0) throw new Error("Valore non valido per sette di denari");
        this.#settedenariNum = n;
    }

    addSetteDenariNum() {
        this.#settedenariNum++;
    }

    //Re denari
    getReDenariNum() {
        return this.#redenariNum;
    }

    setReDenariNum(n) {
        if (typeof n !== "number" || n < 0) throw new Error("Valore non valido per re di denari");
        this.#redenariNum = n;
    }

    addReDenariNum() {
        this.#redenariNum++;
    }

    toStats() {
        return {
            totalPoints: this.getTotalPoints(),
            scope: this.getScopeNum(),
            cardNum: this.getCardNum(),
            denariNum: this.getDenariNum(),
            setteDenari: this.getSetteDenariNum(),
            reDenari: this.getReDenariNum(),
            primiera: this.getPrimieraNum(),
            points: this.getPoints()
        };
    }

    resetExtra() {
        this.#cardNum = 0;
        this.#denariNum = 0;
        this.#primieraNum = 0;
        this.#scopeNum = 0;
        this.#settedenariNum = 0;
        this.#redenariNum = 0;
    }
}

module.exports = Player;
