class Card {
  #valore;
  #seme;

  constructor(valore, seme) {
    this.#valore = valore;
    this.#seme = seme;
  }

  getValore() {
    return this.#valore;
  }

  getSeme() {
    return this.#seme;
  }

  mostraCard() {
    return `${this.#valore} di ${this.#seme}`;
  }
}

// Esportazione della classe
module.exports = Card;
