const Card = require("../Card/index.js");

class Tavolo {
  #tavolo = [];

  constructor() {
    // Vuoto
  }

  getArray() {
    return this.#tavolo.map(carta => ({
      valore: carta.getValore(),
      seme: carta.getSeme()
    }));
  }

  addCard(carta) {
    if (carta instanceof Card) {
      this.#tavolo.push(carta);
    } else {
      throw new Error("L'elemento aggiunto deve essere un'istanza di Card");
    }
  }

  removeCard(carta) {
    const index = this.#tavolo.findIndex(
      c => c.getValore() === carta.getValore() && c.getSeme() === carta.getSeme()
    );
    return index !== -1 ? this.#tavolo.splice(index, 1)[0] : null;
  }

  combinations(carta, carteTavolo = []) {
    if (!(carta instanceof Card)) {
      throw new Error("Non è una carta");
    }
    if (!Array.isArray(carteTavolo) || !carteTavolo.every(c => c instanceof Card)) {
      throw new Error("Non sono delle carte");
    }
  
    if (this.#tavolo.some(c => c.getValore() === carta.getValore())) { //c'è già una carta con lo stesso valore
      return false;
    }
  
    let sommaCarteTavolo = carteTavolo.reduce((acc, c) => acc + c.getValore(), 0);
    if (sommaCarteTavolo !== carta.getValore()) {
      return false;
    }

    for (let card of carteTavolo) { //controllo se le carte sono presenti nel tavolo
      const found = this.#tavolo.some(
        c => c.getValore() === card.getValore() && c.getSeme() === card.getSeme()
      );
      if (!found) {
        return false;
      }
    }

    for (let card of carteTavolo) {
      this.removeCard(card);
    }
    
    return true;
  }
}

// Esportazione della classe
module.exports = Tavolo;
