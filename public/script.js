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
    socket = new WebSocket("ws://localhost:8080");

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

                myHand.forEach((card) => {
                    const cardDiv = document.createElement("div");
                    cardDiv.classList.add("cards", "side-cards-adjustment");
                    cardDiv.onclick = () => {
                        playCard(card, cardDiv);
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
                    tableCardDiv.dataset.cardValore = card.valore;
                    tableCardDiv.dataset.cardSeme = card.seme;

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
                break;

            case "remove_opponent_card":
                removeOpponentCard();
                break;

            case "remove_table_cards":
                removeTableCards(data.card, data.cards);
                break;

            case "turn":
                myTurn = data.turn;
                updateStatus();
                break;
            case "remove_table_cards_combosAvail":
                showAvailableCombos(data.combos);
                break;

            case "game_over":
                handleGameOver(data.won, data.points);
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
    opponentHand = ["1", 2, 3];
    const oppponentHandDiv = document.getElementById("opponent-hand");
    oppponentHandDiv.innerHTML = "";
    opponentHand.forEach(() => {
        if (cardNumber > 3) cardNumber = 1;
        let idCard = "top-card" + cardNumber;
        const cardDiv = document.createElement("div");
        cardDiv.id = idCard;
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
    deckDiv.appendChild(deckCard);
}

 function removeTableCards(playedCard, cardsToRemove) {
        let tableDiv = document.getElementById("table");

        if (cardsToRemove && cardsToRemove.length > 0) {
            cardsToRemove.forEach(card => {
                const cardDivs = tableDiv.querySelectorAll(".cards");
                cardDivs.forEach(div => {
                   if (div.dataset.cardValore == String(card.valore)) {
                      console.log(tableDiv);
                      div.remove();
                      console.log(div);
                      console.log(tableDiv);
                    }
                });
            });
        }

        if (playedCard) {
            const playedCardDivs = tableDiv.querySelectorAll(".cards");
            playedCardDivs.forEach(div => {
                if (div.dataset.cardValore === String(playedCard.valore) && div.dataset.cardSeme === playedCard.seme) {
                    tableDiv.removeChild(div);
                }
            });
        }
    }
function removeOpponentCard() {
  let opponentHandDiv = document.getElementById("opponent-hand");
  if (opponentHandDiv.children.length > 0) {
    opponentHandDiv.removeChild(opponentHandDiv.children[0]);
  }
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
      volumeIcons.classList.remove("fa-volume-up");
      volumeIcons.classList.add("fa-volume-mute");
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

function showAvailableCombos(combos) {
    const chosenCombo = combos;
    socket.send(JSON.stringify({ type: "combo_response", combo: chosenCombo }));
}

//Aggiungere questa funzione
function playCard(card, cardDiv) {
    if (!myTurn) return;
    socket.send(JSON.stringify({ type: "move", card: card }));
    myTurn = false;
    cardDiv.remove();
    updateStatus();
}

function handleGameOver(won, points) {
    let message = won ? "Hai vinto!" : "Hai perso!";
    alert(`${message} Punteggio finale: ${points[0]} - ${points[1]}`);
    window.location.href = "index.html";
}
