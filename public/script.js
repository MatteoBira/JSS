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
    /*
    socket = null;
    startButtonClick = false;
    let btn = event.currentTarget;
    btn.innerText = "Play";
    btn.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    */
  }

  startButtonClick = true;
  socket = new WebSocket("ws://10.0.0.8:8180");

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "welcome":
        playerNumber = data.playerNumber;
        document.getElementById("status").innerText = `You are Player ${playerNumber}`;
        break;
    
      case "startingCards":
        const handDiv = document.getElementById("player-hand");
        myHand = data.arr.slice();
        console.log(myHand);
    
        myHand.forEach((card) => {
          const cardDiv = document.createElement("div");
          cardDiv.classList.add("cards", "side-cards-adjustment");
          cardDiv.onclick = function () {
            playCard(card, this);
          };
    
          const imagePath = getCardImagePath(card);
          cardDiv.style.backgroundImage = `url('${imagePath}')`;
    
          handDiv.appendChild(cardDiv);
          cardNumber++;
        });
    
        let cardIdNumberCorrection = document.getElementById("player-hand").getElementsByTagName("div");
        cardIdNumberCorrection[0].id = "bot-card1";
        cardIdNumberCorrection[1].id = "bot-card2";
        cardIdNumberCorrection[2].id = "bot-card3";
    
        generateHand();
        break;
    
      case "tableCards":
        let tableDiv = document.getElementById("table");
        tableDiv.innerHTML = "";
        tableHand = data.arr.slice();
        tableHand.forEach((card) => {
          const tableCardDiv = document.createElement("div");
          tableCardDiv.classList.add("cards");
    
          const imagePath = getCardImagePath(card);
          tableCardDiv.style.backgroundImage = `url('${imagePath}')`;
    
          tableDiv.appendChild(tableCardDiv);
        });
        break;
    
      case "start":
        myTurn = data.turn;
        startGame();
        break;
    
      case "move":
        updateTable(data.card);
        break;
    
      case "remove_opponent_card":
        removeOpponentCard();
        break;
    
      case "remove_table_cards":
        removeTableCards(data.card);
        break;
    
      case "turn":
        myTurn = data.turn;
        updateStatus();
        break;
    
      default:
        console.warn("Tipo di messaggio sconosciuto:", data);
    }
  }

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
  /*myHand = ["1", "2", "3"];
  const handDiv = document.getElementById("player-hand");
  handDiv.innerHTML = "";

  myHand.forEach((card) => {
    if (cardNumber > 3) cardNumber = 1;
    let idCard = "card" + cardNumber;
    const cardDiv = document.createElement("div");
    cardDiv.id = "bot-" + idCard;
    cardDiv.classList.add("cards");
    cardDiv.classList.add("side-cards-adjustment");
    cardDiv.onclick = () => playCard(card);
    handDiv.appendChild(cardDiv);
    cardNumber++;
  });*/

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

function playCard(card, cardElement) {
  if (!myTurn) return;

  socket.send(JSON.stringify({ type: "move", card: card }));
  myTurn = false;

  // Rimuove il div della carta giocata dal deck del player (credo)
  cardElement.remove();

  updateStatus();
  updateTable(card);
}

function updateTable(card) {
  const tableDiv = document.getElementById("table");
  const cardDiv = document.createElement("div");
  cardDiv.classList.add("cards");
  const imagePath = getCardImagePath(card);
  cardDiv.style.backgroundImage = `url('${imagePath}')`;
  tableDiv.appendChild(cardDiv);
}

function removeOpponentCard() {
  let opponentHandDiv = document.getElementById("opponent-hand");
  if (opponentHandDiv.children.length > 0) {
    opponentHandDiv.removeChild(opponentHandDiv.children[0]);
  }
}

 function removeTableCards(card){
  let tableDiv = document.getElementById("table"); //ottengo il div delle carte al centro
  cardsToRemove = card.slice();
  tableHand.forEach((card) => {
    if (card.valore == cardsToRemove.valore && card.seme == cardsToRemove.seme)
      tableDiv.removeChild(card); //cava la carta dal tavolo
  });
}

function exitGame() {
  window.close();
}

function apriImpostazioni() {
  document.getElementById("settingsPopup").style.display = "block";
  document.getElementById("main-menu").style.display = "none";
}

function chiudiImpostazioni() {
  document.getElementById("settingsPopup").style.display = "none";
  document.getElementById("main-menu").style.display = "flex";
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
  document.getElementById("starting-menu").style.display = "none";
  document.getElementById("content").style.display = "flex";
  document.getElementById("banner").style.display = "none";
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
  document.getElementById("pdfIframe").src = "pdf/guide.pdf";
}

function closeGuide() {
  document.getElementById("pdfContainer").style.display = "none";
  document.getElementById("pdfIframe").src = "";
}




function getCardImagePath(card) {
  return `./img/cards/${card.valore}${card.seme}.svg`;
}
