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
let startButtonClick = false;
let heartbeat = false;
let timeout;
let carteSelezionate = [];
let scopeTotali = 0;
let popupText;
const resultMatch = document.getElementById('result');
const showTablePoints = document.getElementById('round-summary')
const playedCardSound = document.getElementById("playedCardSound");
const scopaSound = document.getElementById("scopaSound");
const victorySound = document.getElementById("victorySound");
const dealingSound = document.getElementById("dealCards");

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("content").style.display = "none";
});

function closeMatch(text) {
  if (document.getElementById("content").style.display != "none") {
    document.getElementById('popupText').textContent = text;
    mostraPopup();
  } else {
    document.getElementById("play-button").innerText = text;
  }
  setTimeout(() => {
    window.location.reload(); //reloada la schermata e torna al menu
  }, 3500);
}

function playGame() {
  if (startButtonClick) {
    startButtonClick = false;
    socket.close();
    return;
  }

  startButtonClick = true;
  socket = new WebSocket("wss://ws.playscopa.online");


  socket.onclose = () => {
    if(!startButtonClick)
    closeMatch("Annullamento del Matchmaking...");
    else
    closeMatch("Il server ha terminato la connessione oppure non è disponibile!"); //server closed "manually"
    socket.close();
  }

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "welcome":
        playerNumber = data.playerNumber;
        document.getElementById("status").innerText = `You are Player ${playerNumber}`;
        break;

      case "startingCards":
        dealingSound.play();
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

        let cardIdNumberCorrection = document.getElementById("player-hand").getElementsByTagName("div");
        cardIdNumberCorrection[0].id = "bot-card1";
        cardIdNumberCorrection[1].id = "bot-card2";
        cardIdNumberCorrection[2].id = "bot-card3";
/*
        cardIdNumberCorrection[0].addEventListener('click', function() {
        });
        cardIdNumberCorrection[1].addEventListener('click', function() {
        });
        cardIdNumberCorrection[2].addEventListener('click', function() {
        });
*/
        generateHand();
        socket.send(JSON.stringify({ type: "getcount" }));
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
        timeout = setInterval(() => {
          if (heartbeat) {
            console.log("Checko heartbeat: " + heartbeat);
            heartbeat = false; // Reset for next cycle
          } else {
            closeMatch("Il server non risponde!"); // No ping in 7 seconds
            clearInterval(timeout); // Stop checking
          }
        }, 7000);
        myTurn = data.turn;
        startGame();
        break;

      case "move":
        updateTable(data.card);
        console.log("Check array dopo 'move': " + JSON.stringify(tableHand));
        break;

      case "remove_table_cards_combosAvail":
        let arrayDaPrendere = data.combos;
        if (arrayDaPrendere.length > 1)
          inizializzaMenu(arrayDaPrendere);
        else
          socket.send(JSON.stringify({ type: "combo_response", combo: data.combos[0] }));
        break;

      case "remove_opponent_card":
        playedCardSound.play();
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
        scopeTotali++;
        aggiornaScopaDisplay();
        mostraPopup();
        break;

      case "progressResult":
        popupText = "Hai " + data.verdict + " il round!";
        resultMatch.textContent = popupText;
        if (data.verdict == "vinto")
          {
            scopaSound.play();
          }
        setResultColor(data.verdict);
        showTablePoints.style.display = "block"
        scopeTotali = 0;
        aggiornaScopaDisplay();
        tableHand.length = 0;
        break;

      case "matchResult":
        popupText = "Partita FINITA: Hai " + data.verdict + " il match!";
        resultMatch.textContent = popupText;
        setResultColor(data.verdict);
        if (data.verdict == "vinto")
          victorySound.play();
        scopeTotali = 0;
        aggiornaScopaDisplay();
        fineGame();
        showTablePoints.style.display = "block"
        tableHand.length = 0;
        break;

      case "tieResult":
        popupText = "Hai " + data.verdict + " la partita!";
        resultMatch.textContent = popupText;
        setResultColor(data.verdict);
        showTablePoints.style.display = "block"
        clearInterval(timeout);
        scopeTotali = 0;
        aggiornaScopaDisplay();
        tableHand.length = 0;
        break;
      case "stats":
        setPoints(data);
        break;
      case "matchTie":
        popupText = "Hai " + data.verdict + " il round!";
        resultMatch.textContent = popupText;
        setResultColor(data.verdict);
        showTablePoints.style.display = "block"
        tableHand.length = 0;
        break;

      case "ping":
        socket.send(JSON.stringify({ type: "pong" }));
        heartbeat = true;
        break;

      case "close":
        closeMatch("Il tuo avversario si è disconnesso!");
        clearInterval(timeout);
        break;
      case "tableCount":
        deckNumberUpdate(data.count);
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
  const count = document.createElement("div");
  count.id = "deckNumDiv";
  const countP = document.createElement("p");
  countP.id = "deckNum";
  countP.textContent = "";
  deckCard.classList.add("cards");
  deckCard.id = "deckCards";

  count.appendChild(countP);
  deckCard.appendChild(count);
  deckDiv.appendChild(deckCard);
}

function playCard(card) {
  if (!myTurn) return;

  socket.send(JSON.stringify({ type: "move", card: card.toJSON() }));
  myTurn = false;

  // Rimuovi la carta da myHand
  myHand = myHand.filter((c) => c !== card);
  console.log(JSON.stringify(tableHand));
  setTimeout(() => {
    card.getDiv().remove();
    card.setDiv(null);
  }, "0");
  playedCardSound.play();    
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
  
  let cardsAdjust = document.getElementById("player-hand").getElementsByTagName("div");
  if(cardsAdjust.length == 1)
    cardsAdjust[0].id = "bot-card2";
  else if(cardsAdjust.length == 2){
    cardsAdjust[0].id = "bot-card1";
    cardsAdjust[1].id = "bot-card3";
  }
  let opponentCardsAdjust = document.getElementById("opponent-hand").getElementsByTagName("div");
  if(opponentCardsAdjust.length == 1)
    opponentCardsAdjust[0].id = "top-card2";
  else if(opponentCardsAdjust.length == 2){
    opponentCardsAdjust[0].id = "top-card1";
    opponentCardsAdjust[1].id = "top-card3";
  }
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
  localStorage.setItem('background', sfondo);
}

function cambiaVolume(value) {
  const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        audio.volume = value / 100;
    });

  localStorage.setItem('volume', value);
}

function avviaMusica() {
  let audio = document.getElementById("audio");
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
      localStorage.setItem('icon', "fa-volume-up");
    });
  } else {
    audio.muted = true;
    volumeIcons.forEach((icon) => {
      icon.classList.remove("fa-volume-up");
      icon.classList.add("fa-volume-mute");
      localStorage.setItem('icon', "fa-volume-mute");
    });
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
    nascondiPopup();
  }, 3000);
}

function nascondiPopup() {
  const popup = document.getElementById('popup');
  popup.style.display = 'none';
  popup.style.transform = 'translate(-50%, -50%) scale(0)';
  popup.style.opacity = '0';
}

function chiudiMenu() {
  document.getElementById('cardSelectionPopup').style.display = 'none';
}

function apriMenu() {
  document.getElementById('cardSelectionPopup').style.display = 'flex';
}


function inizializzaMenu(arrayDaPrendere) {
  apriMenu();
  const cardSelectionMenu = document.getElementById('cardSelectionMenu');
  const cardSelectionPopup = document.getElementById("cardSelectionPopup");

  cardSelectionMenu.innerHTML = "";
  carteSelezionate = [];

  arrayDaPrendere.forEach(combo => {
    const comboText = combo.map(card => `${card.valore} di ${card.seme}`).join(', ');
    aggiungiCardOption(comboText, cardSelectionMenu, combo);
  });

  if (!cardSelectionPopup.contains(cardSelectionMenu)) {
    cardSelectionPopup.appendChild(cardSelectionMenu);
  }
}

function aggiungiCardOption(carte, cardSelectionMenu, comboCards) {
  console.log("Cosa trovo? " + carte);
  const convertedCards = convertCarte(carte);

  const cardOption = document.createElement('div');
  cardOption.classList.add('cardOption');

  cardOption.onclick = function () {
    const isSelected = cardOption.classList.toggle('selected');
    if (isSelected) {
      comboCards.forEach(card => {
        const cardString = card.valore + card.seme.toUpperCase();
        if (!carteSelezionate.includes(cardString)) {
          carteSelezionate.push(cardString);
        }
      });
    } else {
      comboCards.forEach(card => {
        const cardString = card.valore + card.seme.toUpperCase();
        const idx = carteSelezionate.indexOf(cardString);
        if (idx > -1) {
          carteSelezionate.splice(idx, 1);
        }
      });
    }
    selezionaSet();
  };

  const cardSet = document.createElement('div');
  cardSet.classList.add('cardSet');

  convertedCards.forEach((src, index) => {
    const cardPreview = document.createElement('img');
    cardPreview.classList.add('cardPreview');
    cardPreview.src = `./img/cards/${src}.webp`;
    cardPreview.alt = "Carta " + index;
    cardSet.appendChild(cardPreview);
  });

  cardOption.appendChild(cardSet);
  cardSelectionMenu.appendChild(cardOption);
}

function convertCarte(carte) {
  let cardsArray;

  if (Array.isArray(carte)) {
    cardsArray = carte;
  } else if (typeof carte === 'string') {
    cardsArray = carte.split(',').map(s => s.trim());
  } else {
    console.error('Input must be an array or comma-separated string');
    return [];
  }

  return cardsArray.map(item => {
    const regex = /^(\d+)\s+di\s+([A-Za-z])$/;
    const match = item.match(regex);
    if (match) {
      const number = match[1];
      const suit = match[2].toUpperCase();
      return number + suit;
    }
    console.error(`Formato carta non valido: ${item}`);
    return null;
  }).filter(x => x !== null);
}

function selezionaSet() {
  console.log("Invio carte selezionate:", carteSelezionate);
  const arrayDaPrendere = convertiCarte(carteSelezionate);
  console.log("ArrayDaPrendere oggetti Carta:", arrayDaPrendere);
  socket.send(JSON.stringify({ type: "combo_response", combo: arrayDaPrendere }));
  chiudiMenu();
}

function convertiCarte(array) {
  const cardDiv = document.createElement("div");
  cardDiv.classList.add("cards");
  return array.map(carta => {
    const valore = parseInt(carta.slice(0, -1), 10);
    const seme = carta.slice(-1);
    return new Carta(cardDiv, valore, seme);
  });
}

function deckNumberUpdate(deckCount) {
  const deckNum = document.getElementById("deckNum");

  deckNum.textContent = deckCount;
}

function iniziaNuovoRound() {
  document.getElementById("round-summary").style.display = "none";
}

function fineGame() {
  document.getElementById("fineGameButton").textContent = "Esci"
  scopeTotali = 0;
  document.getElementById("fineGameButton").onclick = function() {
    window.location.reload();
};

}

function setPoints(data) {
  document.getElementById("totPlayer").textContent = data.youStats.totalPoints;
  document.getElementById("totOpponent").textContent = data.oppositeStats.totalPoints;
  document.getElementById("scopesPlayer").textContent = data.youStats.scope;
  document.getElementById("scopesOpponent").textContent = data.oppositeStats.scope;
  document.getElementById("cardsPlayer").textContent = data.youStats.cardNum;
  document.getElementById("cardsOpponent").textContent = data.oppositeStats.cardNum;
  document.getElementById("denariPlayer").textContent = data.youStats.denariNum;
  document.getElementById("denariOpponent").textContent = data.oppositeStats.denariNum;
  document.getElementById("settePlayer").textContent = data.youStats.setteDenari;
  document.getElementById("setteOpponent").textContent = data.oppositeStats.setteDenari;
  document.getElementById("dieciPlayer").textContent = data.youStats.reDenari;
  document.getElementById("dieciOpponent").textContent = data.oppositeStats.reDenari;
  document.getElementById("primieraPlayer").textContent = data.youStats.primiera;
  document.getElementById("primieraOpponent").textContent = data.oppositeStats.primiera;
  document.getElementById("roundPlayer").textContent = data.youStats.points;
  document.getElementById("roundOpponent").textContent = data.oppositeStats.points;
}

function setResultColor(check) {
  if (check == "vinto")
  {
    resultMatch.style.color = "green";
    scopaSound.play();
  }
  else if (check == "perso")
    resultMatch.style.color = "red";
  else if (check == "pareggiato")
    resultMatch.style.color = "whitesmoke";
}

window.onload = function() {
  const icon = localStorage.getItem('icon');
  let audio = document.getElementById("audio");
  const savedVolume = localStorage.getItem('volume');
  const savedBackground = localStorage.getItem('background');
  const audioIcon = document.querySelectorAll(".volume-icon");
  audioIcon.forEach((iconImage) => {
    if (icon == "fa-volume-mute"){
        iconImage.classList.remove("fa-volume-up");
        iconImage.classList.add("fa-volume-mute");
        audio.muted = true;
      }
  });

  if (savedVolume) {
      document.getElementById('volumeControl').value = savedVolume;
      cambiaVolume(savedVolume);
  }

  if (savedBackground) {
      document.body.style.backgroundImage = `url('${savedBackground}')`;
  }
};

function aggiornaScopaDisplay() {
    if(scopeTotali == 0){
      document.getElementById("scopaCardContainer").style.display = "none";
      return;
    }
    else {
    document.getElementById("scopaCardContainer").style.display = "block";
    const text = document.getElementById('scopaCardText');
    text.textContent = `Scopa x${scopeTotali}`;

    scopaSound.play();
  }
}