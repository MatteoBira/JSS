const Card = require("../Card/index.js");

class Mazzo {
  #mazzo = [];

  constructor() {
    for (let y = 1; y <= 10; y++) {
      this.#mazzo.push(new Card(y, "B"));
    }
    for (let y = 1; y <= 10; y++) {
      this.#mazzo.push(new Card(y, "D"));
    }
    for (let y = 1; y <= 10; y++) {
      this.#mazzo.push(new Card(y, "S"));
    }
    for (let y = 1; y <= 10; y++) {
      this.#mazzo.push(new Card(y, "C"));
    }
  }

  getArray() {
    return this.#mazzo;
  }

  shuffle() {
    for (let i = this.#mazzo.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.#mazzo[i], this.#mazzo[j]] = [this.#mazzo[j], this.#mazzo[i]];
    }
  }
}

// Esportazione della classe
module.exports = Mazzo;
