class Carta {
  #div;
  #valore;
  #seme;

  constructor(div, valore, seme) {
    this.#div = div;
    this.#valore = valore;
    this.#seme = seme;
  }

  mostraCard() {
    return `${this.#valore} di ${this.#seme}`;
  }

  getValore() {
    return this.#valore;
  }

  getSeme() {
    return this.#seme;
  }

  getDiv() {
    return this.#div;
  }

  setDiv(div) {
    this.#div = div;
  }

  setValore(valore) {
    this.#valore = valore;
  }

  setSeme(seme) {
    this.#seme = seme;
  }

  toJSON() {
    return {
      valore: this.#valore,
      seme: this.#seme,
    };
  }
}

let socket = null;
let playerNumber;
let myTurn = false;
let myHand = [];
let tableHand = [];
let cardNumber = 1;
let prevVolume;
let music = 0.005;
let startButtonClick = false;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("content").style.display = "none";
});

function playGame() {
  if (startButtonClick) {
    return;
  }

  startButtonClick = true;
  socket = new WebSocket("wss://ws.alphvino.eu.org");

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    let popupText;
    switch (data.type) {
      case "welcome":
        playerNumber = data.playerNumber;
        document.getElementById(
          "status"
        ).innerText = `You are Player ${playerNumber}`;
        break;

      case "startingCards":
        const handDiv = document.getElementById("player-hand");
        const tempArray = data.arr.slice();

        tempArray.forEach((cardData) => {
          const cardDiv = document.createElement("div");
          cardDiv.classList.add("cards", "side-cards-adjustment");

          let tempCard = new Carta(cardDiv, cardData.valore, cardData.seme);
          const imagePath = getCardImagePath(tempCard);
          cardDiv.style.backgroundImage = `url('${imagePath}')`;
          myHand.push(tempCard);
          cardDiv.onclick = function () {
            playCard(tempCard);
          };
          handDiv.appendChild(cardDiv);
          cardNumber++;
        });
        console.log(myHand);

        let cardIdNumberCorrection = document
          .getElementById("player-hand")
          .getElementsByTagName("div");
        cardIdNumberCorrection[0].id = "bot-card1";
        cardIdNumberCorrection[1].id = "bot-card2";
        cardIdNumberCorrection[2].id = "bot-card3";

        generateHand();
        break;

      case "tableCards":
        console.log("Carte tavolo update: " + JSON.stringify(tableHand));
        let tableDiv = document.getElementById("table");
        tableDiv.innerHTML = "";
        tableHand = data.arr.map((cardData) => {
          const cardDiv = document.createElement("div");
          cardDiv.classList.add("cards");

          let card = new Carta(cardDiv, cardData.valore, cardData.seme);
          const imagePath = getCardImagePath(card);
          cardDiv.style.backgroundImage = `url('${imagePath}')`;

          tableDiv.appendChild(cardDiv);
          return card;
        });
        console.log(tableHand);
        break;

      case "start":
        myTurn = data.turn;
        startGame();
        break;

      case "move":
        updateTable(data.card);
        console.log("Check array dopo 'move': " + JSON.stringify(tableHand));
        break;

      case "remove_table_cards_combosAvail":
        let arrayDaPrendere = data.combos[0];
        socket.send(
          JSON.stringify({ type: "combo_response", combo: arrayDaPrendere })
        );
        break;

      case "remove_opponent_card":
        removeOpponentCard();
        break;

      case "remove_table_cards":
        removeTableCards(data.card, data.cards);
        break;

      case "turn": //turn cambiato solo su richiesta del server.
        myTurn = data.turn;
        updateStatus();
        break;

      case "scopa":
        document.getElementById('popupText').textContent = "Scopa!";
        mostraPopup();
        break;

      case "progressResult":
        popupText = "Hai " + data.verdict + " il match con " + data.points + " punti contro " + data.oppositePoints + " punti del tuo avversario!";
        document.getElementById('popupText').textContent = popupText;
        mostraPopup();
        tableHand.length = 0;
        break;

      case "matchResult":
        popupText = "Hai " + data.verdict + " il match con " + data.points + " punti contro " + data.oppositePoints + " punti del tuo avversario! Partita FINITA!";
        document.getElementById('popupText').textContent = popupText;
        mostraPopup();
        tableHand.length = 0;
        break;

      case "tieResult":
        popupText = "Hai " + data.verdict + " la partita con " + data.points + " punti! Partita FINITA!";
        document.getElementById('popupText').textContent = popupText;
        mostraPopup();
        tableHand.length = 0;
        break;

      case "matchTie":
        popupText = "Hai " + data.verdict + " il match con " + data.points + " punti!";
        document.getElementById('popupText').textContent = popupText;
        mostraPopup();
        tableHand.length = 0;
        break;

      case "keepalive":
        break;

      default:
        console.warn("Tipo di messaggio sconosciuto:", data);
    }
  };

  let btn = event.currentTarget;
  btn.innerText = "Searching for an opponent...";
  btn.style.backgroundColor = "grey";
  avviaMusica();
}

function updateStatus() {
  document.getElementById("status").innerText = myTurn
    ? "Your Turn!"
    : "Waiting for a move...";
  document.getElementById("opponent").innerText = myTurn ? "" : "";
}

function generateHand() {
  opponentHand = ["1", "2", "3"];
  const oppponentHandDiv = document.getElementById("opponent-hand");
  oppponentHandDiv.innerHTML = "";

  opponentHand.forEach(() => {
    if (cardNumber > 3) cardNumber = 1;
    let idCard = "card" + cardNumber;
    const cardDiv = document.createElement("div");
    cardDiv.id = "top-" + idCard;
    cardDiv.classList.add("cards");
    cardDiv.classList.add("side-cards-adjustment");
    oppponentHandDiv.appendChild(cardDiv);
    cardNumber++;
  });
}

function generateDeck() {
  let deckDiv = document.getElementById("deck");
  deckDiv.innerHTML = "";
  const deckCard = document.createElement("div");
  deckCard.classList.add("cards");
  deckCard.id = "deckCards";
  deckDiv.appendChild(deckCard);
}

function playCard(card) {
  if (!myTurn) return;

  socket.send(JSON.stringify({ type: "move", card: card.toJSON() }));
  myTurn = false;

  // Rimuovi la carta da myHand
  myHand = myHand.filter((c) => c !== card);
  console.log(JSON.stringify(tableHand));

  card.getDiv().remove();
  card.setDiv(null);
}

function updateTable(cardData) {
  const tableDiv = document.getElementById("table");
  const cardDiv = document.createElement("div");
  cardDiv.classList.add("cards");
  const card = new Carta(cardDiv, cardData.valore, cardData.seme);
  const imagePath = getCardImagePath(card);
  cardDiv.style.backgroundImage = `url('${imagePath}')`;
  tableDiv.appendChild(cardDiv);
  tableHand.push(card);
  return card;
}

function removeOpponentCard() {
  let opponentHandDiv = document.getElementById("opponent-hand");
  if (opponentHandDiv.children.length > 0) {
    opponentHandDiv.removeChild(opponentHandDiv.children[0]);
  }
}

function removeSingleCard(cardToRemove) {
  const tableDiv = document.getElementById("table");

  tableHand = tableHand.filter((card) => {
    if (
      card.getValore() == cardToRemove.getValore() &&
      card.getSeme() == cardToRemove.getSeme()
    ) {
      console.log("Tolta la carta");
      tableDiv.removeChild(card.getDiv());
      return false; // elimina dal tableHand
    }
    return true;
  });
}

function removeTableCards(playedCard, cards) {
  const tableDiv = document.getElementById("table");
  const array = cards.slice(); // Copia delle carte da rimuovere
  const carteDaRimuovere = [...array];
  console.log("Carta presa:", JSON.stringify(array));

  if (!array || array.length === 0) return;

  if (playedCard) { //remove_table_cards to clean table at the end with card = null, handling
    const card = updateTable(playedCard); // Aggiunge la carta giocata al tavolo
    card.getDiv().style.boxShadow = "0 0 10px red";
    carteDaRimuovere.push(playedCard);
  }

  array.forEach((card) => {
    tableHand.forEach((c) => {
      if (card.valore == c.getValore() && card.seme == c.getSeme()) {
        c.getDiv().style.boxShadow = "0 0 10px blue";
      }
    });
  });

  setTimeout(() => {
    // rimuoviamo sia le carte prese sia quella giocata
    carteDaRimuovere.forEach((cardData) => { // rimuoviamo sia le carte prese sia quella giocata
      tableHand = tableHand.filter((cardTable) => {
        if (
          cardTable.getValore() === cardData.valore &&
          cardTable.getSeme() === cardData.seme
        ) {
          tableDiv.removeChild(cardTable.getDiv());
          return false; // rimuovilo da tableHand
        }
        return true;
      });
    });
  }, 1500);
}

function exitGame() {
  if (confirm("Sei sicuro di voler uscire?")) {
    window.location.href = "https://www.google.com/";
  }
}

function apriImpostazioni() {
  document.getElementById("settingsPopup").style.display = "block";
  document.getElementById("main-menu").style.display = "none";
}

function chiudiImpostazioni() {
  document.getElementById("settingsPopup").style.display = "none";
  document.getElementById("main-menu").style.display = "block";
}

function apriBackground() {
  document.getElementById("backgroundPopup").style.display = "flex";
  document.getElementById("banner").style.display = "none";
  document.getElementById("starting-menu").style.display = "none";
}

function chiudiBackground() {
  document.getElementById("backgroundPopup").style.display = "none";
  document.getElementById("banner").style.display = "flex";
  document.getElementById("starting-menu").style.display = "flex";
}

function apriIGBackground() {
  document.getElementById("backgroundIGPopup").style.display = "flex";
  document.getElementById("inGameSettings").style.display = "none";
}

function chiudiIGBackground() {
  document.getElementById("backgroundIGPopup").style.display = "none";
  document.getElementById("inGameSettings").style.display = "flex";
}

function cambiaBackground(sfondo) {
  document.body.style.backgroundImage = `url(${sfondo})`;
}

function backToMenu(){

}

function cambiaVolume(value) {
  let audio = document.getElementById("audio");
  audio.volume = value / 100;
}

function avviaMusica() {
  let audio = document.getElementById("audio");
  audio.volume = music;
  audio.play().then(() => console.log("Musica avviata con successo."));
}

function volumeChanger() {
  let volumeIcons = document.querySelectorAll(".volume-icon");
  let audio = document.getElementById("audio");

  if (audio.muted) {
    audio.muted = false;
    volumeIcons.forEach((icon) => {
      icon.classList.remove("fa-volume-mute");
      icon.classList.add("fa-volume-up");
    });
  } else {
    audio.muted = true;
    volumeIcons.forEach((icon) => {
      icon.classList.remove("fa-volume-up");
      icon.classList.add("fa-volume-mute");
    });
  }

  if (!audio.muted) {
    audio.volume = music;
  }
}

function startGame() {
  document.getElementById("main-container").style.display = "none";
  document.getElementById("content").style.display = "flex";
  updateStatus();
  generateDeck();
  generateHand();
}

function inGameSettings() {
  document.getElementById("inGameSettings").style.display = "flex";
}

function chiudiIGImpostazioni() {
  document.getElementById("inGameSettings").style.display = "none";
}

function openGuide() {
  document.getElementById("pdfContainer").style.display = "flex";
}

function closeGuide() {
  document.getElementById("pdfContainer").style.display = "none";
}

function getCardImagePath(card) {
  return `./img/cards/${card.getValore()}${card.getSeme()}.webp`;
}

function mostraPopup() {
  const popup = document.getElementById('popup');
  popup.style.display = 'block';

  void popup.offsetWidth;

  popup.style.transform = 'translate(-50%, -50%) scale(1)';
  popup.style.opacity = '1';

  setTimeout(() => {
    popup.style.display = 'none';
    nascondiPopup();
  }, 5000);
}

function nascondiPopup() {
  const popup = document.getElementById('popup');
  popup.style.transform = 'translate(-50%, -50%) scale(0)';
  popup.style.opacity = '0';
}