const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
let deck = [];
let playerHand = [];
let botHand = [];

const playerHandDiv = document.getElementById("player-hand");
const logDiv = document.getElementById("log");
const askRankSelect = document.getElementById("ask-rank");

function initGame() {
    createDeck();
    shuffle(deck);

    playerHand = deck.splice(0, 5);
    botHand = deck.splice(0, 5);

    updateUI();
    populateDropdown();
    log("Game started.");
}

function createDeck() {
    deck = [];
    for (let rank of ranks) {
        for (let i = 0; i < 4; i++) {
            deck.push(rank);
        }
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function updateUI() {
    playerHandDiv.innerHTML = "";
    playerHand.forEach(card => {
        const div = document.createElement("div");
        div.className = "card";
        div.textContent = card;
        playerHandDiv.appendChild(div);
    });
}

function populateDropdown() {
    askRankSelect.innerHTML = "";
    let uniqueRanks = [...new Set(playerHand)];
    uniqueRanks.forEach(rank => {
        const option = document.createElement("option");
        option.value = rank;
        option.textContent = rank;
        askRankSelect.appendChild(option);
    });
}

function askForCard() {
    const requested = askRankSelect.value;
    log("You ask for " + requested);

    let matches = botHand.filter(card => card === requested);

    if (matches.length > 0) {
        log("Bot had " + matches.length + " card(s). You receive them.");
        playerHand = playerHand.concat(matches);
        botHand = botHand.filter(card => card !== requested);
    } else {
        log("Go Fish!");
        if (deck.length > 0) {
            playerHand.push(deck.pop());
        }
    }

    botTurn();
    updateUI();
    populateDropdown();
}

function botTurn() {
    if (botHand.length === 0) return;

    let randomCard = botHand[Math.floor(Math.random() * botHand.length)];
    log("Bot asks for " + randomCard);

    let matches = playerHand.filter(card => card === randomCard);

    if (matches.length > 0) {
        log("Bot takes " + matches.length + " card(s) from you.");
        botHand = botHand.concat(matches);
        playerHand = playerHand.filter(card => card !== randomCard);
    } else {
        if (deck.length > 0) {
            botHand.push(deck.pop());
            log("Bot goes fishing.");
        }
    }
}

function log(message) {
    logDiv.innerHTML += message + "<br>";
}

initGame();
