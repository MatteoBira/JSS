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


  generateTrickSet() {
    // Svuota il mazzo
    this.#mazzo = [];

    // Scegli un valore casuale (da 1 a 10)
    const valore = Math.floor(Math.random() * 10) + 1;

    // Scegli tre semi casuali tra 'B', 'C', 'D', 'S'
    const semiDisponibili = ['B', 'C', 'D', 'S'];
    const semiScelti = [];

    while (semiScelti.length < 3) {
      const randomIndex = Math.floor(Math.random() * semiDisponibili.length);
      const seme = semiDisponibili.splice(randomIndex, 1)[0];
      semiScelti.push(seme);
    }

    // Crea le tre carte da piazzare in fondo
    const cartaUltima = new Card(valore, semiScelti[0]);
    const cartaMeno7 = new Card(valore, semiScelti[1]);
    const cartaMeno8 = new Card(valore, semiScelti[2]);

    // Crea tutte le altre carte tranne quelle 3
    const semi = ['B', 'C', 'D', 'S'];
    for (let s of semi) {
      for (let v = 1; v <= 10; v++) {
        if (!(v === valore && semiScelti.includes(s))) {
          this.#mazzo.push(new Card(v, s));
        }
      }
    }

    // Mischia il mazzo parziale
    this.shuffle();

    // Inserisci le carte in posizione -8, -7 e -1
    const posMeno8 = this.#mazzo.length - 7; // posizione che diventerà -8 dopo l'inserimento
    this.#mazzo.splice(posMeno8, 0, cartaMeno8);         // diventa -8
    this.#mazzo.splice(posMeno8 + 1, 0, cartaMeno7);     // diventa -7
    this.#mazzo.push(cartaUltima);                       // ultima

    // Debug opzionale
    console.log("Ultime 8 carte:");
    console.log(this.#mazzo.slice(-8));
  }



  removeCard(card) {
    this.#mazzo = this.#mazzo.filter(c => !(c.valore === card.valore && c.seme === card.seme));
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

  rebuild() {
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
}

// Esportazione della classe
module.exports = Mazzo;
