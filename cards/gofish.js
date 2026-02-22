console.log("Game loaded: gofish.js");
const botHandDiv = document.getElementById("bot-hand");
const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

let deck = [];
let playerHand = [];
let botHand = [];

let playerScore = 0;
let botScore = 0;

let playerTurn = true;
let gameOver = false;

const playerHandDiv = document.getElementById("player-hand");
const logDiv = document.getElementById("log");
const askRankSelect = document.getElementById("ask-rank");
const scoreboard = document.getElementById("scoreboard");

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
    botHandDiv.innerHTML = "";

    playerHand.forEach(card => {
        const div = document.createElement("div");
        // Go Fish cards are just ranks string like "A", "2" so no suit check needed effectively, 
        // but if they added suits we would check. Current impl only has ranks.
        // But to follow instructions if they had suits: they don't seem to have suits in this file.
        // It says: deck.push(rank); no suit. So no red class.
        div.className = "card show";
        div.textContent = card;
        playerHandDiv.appendChild(div);
    });

    botHand.forEach(() => {
        const div = document.createElement("div");
        div.className = "card hidden";
        div.textContent = "?";
        botHandDiv.appendChild(div);
    });
    
    // Update deck visual
    const deckDiv = document.getElementById("deck");
    if (deckDiv) {
        deckDiv.innerHTML = "";
        if (deck.length > 0) {
            let d = document.createElement("div");
            d.className = "card hidden";
            d.textContent = "Deck";
            deckDiv.appendChild(d);
        }
    }

    scoreboard.textContent = `You: ${playerScore} | Bot: ${botScore}`;
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
    if (!playerTurn || gameOver) return;

    const requested = askRankSelect.value;
    log("You ask for " + requested);

    let matches = botHand.filter(card => card === requested);

    if (matches.length > 0) {
        log("Bot had " + matches.length + ". You take them.");
        playerHand = playerHand.concat(matches);
        botHand = botHand.filter(card => card !== requested);
        checkBooks(playerHand, true);
        updateUI();
        populateDropdown();
    } else {
        log("Go Fish!");
        drawCard(playerHand);
        checkBooks(playerHand, true);
        playerTurn = false;
        setTimeout(botTurn, 800);
    }

    checkWin();
}

function botTurn() {
    if (gameOver) return;

    if (botHand.length === 0) {
        drawCard(botHand);
    }

    let requested = botHand[Math.floor(Math.random() * botHand.length)];
    log("Bot asks for " + requested);

    let matches = playerHand.filter(card => card === requested);

    if (matches.length > 0) {
        log("Bot takes " + matches.length + " from you.");
        botHand = botHand.concat(matches);
        playerHand = playerHand.filter(card => card !== requested);
        checkBooks(botHand, false);
        updateUI();
        populateDropdown();
        setTimeout(botTurn, 800); // retains turn
    } else {
        log("Bot goes fishing.");
        drawCard(botHand);
        checkBooks(botHand, false);
        playerTurn = true;
    }

    checkWin();
}

function drawCard(hand) {
    if (deck.length > 0) {
        hand.push(deck.pop());
    }
}

function checkBooks(hand, isPlayer) {
    let counts = {};
    hand.forEach(card => {
        counts[card] = (counts[card] || 0) + 1;
    });

    for (let rank in counts) {
        if (counts[rank] === 4) {
            hand = removeRank(hand, rank);
            if (isPlayer) {
                playerScore++;
                playerHand = hand;
                log("You completed a book of " + rank + "!");
            } else {
                botScore++;
                botHand = hand;
                log("Bot completed a book of " + rank + "!");
            }
        }
    }
}

function removeRank(hand, rank) {
    return hand.filter(card => card !== rank);
}

function checkWin() {
    if (deck.length === 0 && (playerHand.length === 0 || botHand.length === 0)) {
        gameOver = true;

        if (playerScore > botScore) {
            if (window.addPoints) window.addPoints(100);
            log("You win!");
        } else if (botScore > playerScore) {
            log("Bot wins!");
        } else {
            log("It's a tie.");
        }
    }
}

function log(message) {
    logDiv.innerHTML += message + "<br>";
    logDiv.scrollTop = logDiv.scrollHeight;
}

initGame();
