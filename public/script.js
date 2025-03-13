const socket = new WebSocket("ws://localhost:8080");

let playerNumber;
let myTurn = false;
let myHand = [];

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "welcome") {
        playerNumber = data.playerNumber;
        document.getElementById("status").innerText = `You are Player ${playerNumber}`;
    }

    if (data.type === "start") {
        myTurn = data.turn;
        updateStatus();
        generateHand();
    }

    if (data.type === "move") {
        updateTable(data.card);
    }

    if (data.type === "turn") {
        myTurn = data.turn;
        updateStatus();
    }
};

function updateStatus() {
    document.getElementById("status").innerText = myTurn ? "Your Turn!" : "Opponent's Turn";
}

function generateHand() {
    myHand = ["1", "2", "3", "4"]; // Example cards (replace with real deck logic)
    const handDiv = document.getElementById("player-hand");
    handDiv.innerHTML = "";

    myHand.forEach((card) => {
        const cardDiv = document.createElement("div");
        cardDiv.classList.add("card");
        cardDiv.innerText = card;
        cardDiv.onclick = () => playCard(card);
        handDiv.appendChild(cardDiv);
    });
}

function playCard(card) {
    if (!myTurn) return;
    
    socket.send(JSON.stringify({ type: "move", card: card }));
    myTurn = false; // Temporarily set to false before getting server confirmation
    updateStatus();
}

function updateTable(card) {
    const tableDiv = document.getElementById("table");
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card");
    cardDiv.innerText = card;
    tableDiv.appendChild(cardDiv);
}

