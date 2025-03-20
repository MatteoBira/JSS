let socket = null;
let playerNumber;
let myTurn = false;
let myHand = [];
let cardNumber = 1;
let prevVolume;
let music = 0.01;


function updateStatus() {
    document.getElementById("status").innerText = myTurn ? "Your Turn!" : "Waiting for a move...";
    document.getElementById("opponent").innerText = myTurn ? "" : "";
}

function generateHand() {
    myHand = ["1", "2", "3"];
    const handDiv = document.getElementById("player-hand");
    handDiv.innerHTML = "";

    myHand.forEach((card) => {
        
        if(cardNumber > 3)
            cardNumber = 1;
        let idCard = "card" + cardNumber;
        const cardDiv = document.createElement("div");
        cardDiv.id = "bot-" + idCard;
        cardDiv.classList.add("cards");
        cardDiv.classList.add("side-cards-adjustment");
        cardDiv.onclick = () => playCard(card);
        handDiv.appendChild(cardDiv);
        cardNumber++;
    });

    opponentHand = ["1", "2", "3"];
    const oppponentHandDiv = document.getElementById("opponent-hand");
    oppponentHandDiv.innerHTML = "";

    opponentHand.forEach(() => {
        if(cardNumber > 3)
            cardNumber = 1;
        let idCard = "card" + cardNumber;
        const cardDiv = document.createElement("div");
        cardDiv.id = "top-" + idCard;
        cardDiv.classList.add("cards");
        cardDiv.classList.add("side-cards-adjustment");
        oppponentHandDiv.appendChild(cardDiv);
        cardNumber++;
    });
}

function generateTable() {
    let tableHand = ["1","2","3","4"];
    let tableDiv = document.getElementById("table");
    tableDiv.innerHTML = "";

    tableHand.forEach(() => {
        const tableCardDiv = document.createElement("div");
        tableCardDiv.classList.add("cards");
        tableDiv.appendChild(tableCardDiv);
    })
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
    let myCardRemover = event.currentTarget.id;
    socket.send(JSON.stringify({ type: "move", card: card }));
    myTurn = false; // Temporarily set to false before getting server confirmation
    document.getElementById(myCardRemover).remove();
    updateStatus();
    updateTable();
}

function updateTable(cardId) {
    const tableDiv = document.getElementById("table");
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("cards");
    tableDiv.appendChild(cardDiv);
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("content").style.display = "none";
    avviaMusica();
})

function playGame() {
    socket = new WebSocket("ws://localhost:8080");
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
    
        if (data.type === "welcome") {
            playerNumber = data.playerNumber;
            document.getElementById("status").innerText = `You are Player ${playerNumber}`;
        }
    
        if (data.type === "start") {
            myTurn = data.turn;
            startGame();
        }
    
        if (data.type === "move") {
            updateTable(data.card);
        }
    
        if (data.type === "turn") {
            myTurn = data.turn;
            updateStatus();
        }
    };
    let btn = event.currentTarget;
    btn.innerText = "Searching for an opponent...";
    btn.style.backgroundColor = "grey";
    avviaMusica();
}

function exitGame() {
    window.close();
}

function apriImpostazioniMenu() {
    document.getElementById('settingsPopupMenu').style.display = 'flex';
}

function apriImpostazioniGame() {
    document.getElementById('settingsPopupGame').style.display = 'flex';
}

function chiudiImpostazioni() {
    document.getElementById('settingsPopupGame').style.display = 'none';
    document.getElementById('settingsPopupMenu').style.display = 'none';
}

function cambiaVolume(value) {
    let audio = document.getElementById('audio');
    audio.volume = value / 100;
}

function avviaMusica() {
    let audio = document.getElementById('audio');
    audio.volume = music;
    audio.play().then(() => console.log("Musica avviata con successo."))
}

function volumeChanger() {
    volumeIcon = document.getElementById("volume-icon");
    if (audio.muted) {
        audio.muted = false;
        volumeIcon.classList.remove("fa-volume-mute");
        volumeIcon.classList.add("fa-volume-up");
    } else {
        audio.muted = true;
        volumeIcon.classList.remove("fa-volume-up");
        volumeIcon.classList.add("fa-volume-mute");
    }    
    avviaMusica();
}

function startGame() {
    document.getElementById("starting-menu").style.display = "none";
    document.getElementById("content").style.display = "flex";
    document.title = "Scopa - Game"
    updateStatus();
    generateDeck();
    generateTable();
    generateHand();
}

function quitGame() {
    alert("Non funziona...");
}