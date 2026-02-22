/* SINGLE PLAYER RETRO BLACKJACK */

const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const suits = ["\u2660", "\u2665", "\u2666", "\u2663"];

let deck = [];
let dealerHand = [];
let playerHand = [];
let gameActive = false;
let wins = 0;
let currentBet = 100;

/* UI ELEMENTS */
const messageLog = document.getElementById("log");
const dealerArea = document.getElementById("dealer-hand");
const playerArea = document.getElementById("player-hand");
const dealerScoreText = document.getElementById("dealer-score");
const playerScoreText = document.getElementById("player-score");
const scoreboard = document.getElementById("blackjack-scoreboard");

/* INITIALIZATION */
if (window.updatePointsDisplay) window.updatePointsDisplay();

function createDeck() {
    let d = [];
    for (let s of suits) {
        for (let r of ranks) {
            d.push({ rank: r, suit: s, value: getValue(r) });
        }
    }
    return d;
}

function getValue(rank) {
    if (["J", "Q", "K"].includes(rank)) return 10;
    if (rank === "A") return 11;
    return parseInt(rank);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function calculateScore(hand) {
    let score = 0;
    let aces = 0;
    for (const c of hand) {
        score += c.value;
        if (c.rank === "A") aces++;
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
}

/* GAME ACTIONS */

function newGame() {
    if (gameActive) {
        if (!confirm("Start new round? Current one will be forfeited.")) return;
    }
    
    // Betting Logic
    const points = window.getPoints ? window.getPoints() : 1000;
    if (points < currentBet) {
        messageLog.innerText = "Not enough points! (Need " + currentBet + ")";
        return;
    }
    if (window.addPoints) window.addPoints(-currentBet);

    deck = createDeck();
    shuffle(deck);
    dealerHand = [];
    playerHand = [];
    gameActive = true;
    messageLog.innerHTML = `Bet: ${currentBet} | Classic Blackjack`;

    // Deal
    playerHand.push(deck.pop());
    dealerHand.push(deck.pop());
    playerHand.push(deck.pop());
    dealerHand.push(deck.pop());

    updateDisplay();

    // Check Player Blackjack
    if (calculateScore(playerHand) === 21) {
        endGame("blackjack");
    }
}

// Wrapper for HTML calls
function blackjackAction(action) {
    if (!gameActive) return;
    if (action === "hit") hit();
    if (action === "stand") stand();
}

function hit() {
    playerHand.push(deck.pop());
    updateDisplay();
    
    if (calculateScore(playerHand) > 21) {
        endGame("bust");
    }
}

function stand() {
    // Dealer Turn
    let dScore = calculateScore(dealerHand);
    while (dScore < 17) {
        dealerHand.push(deck.pop());
        dScore = calculateScore(dealerHand);
    }
    updateDisplay(true); // show all cards
    
    // Determine Winner
    const pScore = calculateScore(playerHand);
    const difficulty = window.getDifficulty ? window.getDifficulty() : 1; 

    if (dScore > 21) {
        endGame("dealer_bust");
    } else if (pScore > dScore) {
        endGame("win");
    } else if (dScore > pScore) {
        endGame("lose");
    } else {
        // Tie logic based on difficulty
        if (difficulty === 0) endGame("win_tie"); // Apprentice wins ties
        else if (difficulty === 2) endGame("lose_tie"); // Ruthless loses ties
        else endGame("push"); // Gambler pushes
    }
}

function endGame(result) {
    gameActive = false;
    let payout = 0;
    let msg = "";
    
    const difficulty = window.getDifficulty ? window.getDifficulty() : 1;
    
    switch(result) {
        case "blackjack":
            const bjMult = difficulty === 0 ? 3 : (difficulty === 1 ? 2.5 : 2);
            payout = Math.floor(currentBet * bjMult);
            msg = "BLACKJACK! You Win!";
            wins++;
            break;
        case "bust":
            msg = "BUST! You went over 21.";
            break;
        case "dealer_bust":
            payout = currentBet * 2;
            msg = "Dealer Busted! You Win!";
            wins++;
            break;
        case "win":
            payout = currentBet * 2;
            msg = "You Win!";
            wins++;
            break;
        case "win_tie":
            payout = currentBet * 2;
            msg = "Tie! (Apprentice wins ties!)";
            wins++;
            break;
        case "lose":
            msg = "Dealer Wins.";
            break;
        case "lose_tie":
            msg = "Tie! (Ruthless Dealer wins ties!)";
            break;
        case "push":
            payout = currentBet;
            msg = "Push. Bet returned.";
            break;
    }

    if (payout > 0 && window.addPoints) window.addPoints(payout);
    
    messageLog.innerHTML = `${msg} ${payout > 0 ? "(+" + payout + ")" : ""}`;
    scoreboard.innerText = `Wins: ${wins}`;
    
    updateDisplay(true); 
}

function updateDisplay(showDealer = false) {
    // Render Dealer
    dealerArea.innerHTML = "";
    dealerHand.forEach((card, idx) => {
        const cDiv = document.createElement("div");
        cDiv.className = "card";
        
        // Hide first card
        if (idx === 0 && !showDealer && gameActive) {
            cDiv.classList.add("back");
        } else {
            cDiv.innerText = `${card.rank}${card.suit}`;
            if (card.suit === "\u2665" || card.suit === "\u2666") cDiv.classList.add("red");
        }
        dealerArea.appendChild(cDiv);
    });
    
    const dScore = calculateScore(dealerHand);
    dealerScoreText.innerText = (gameActive && !showDealer) ? "?" : `Score: ${dScore}`;

    // Render Player
    playerArea.innerHTML = "";
    playerHand.forEach(card => {
        const cDiv = document.createElement("div");
        cDiv.className = "card";
        cDiv.innerText = `${card.rank}${card.suit}`;
        if (card.suit === "\u2665" || card.suit === "\u2666") cDiv.classList.add("red");
        playerArea.appendChild(cDiv);
    });
    
    playerScoreText.innerText = `Score: ${calculateScore(playerHand)}`;
}

window.newGame = newGame;
window.blackjackAction = blackjackAction;
messageLog.innerText = "Press New Hand to Start";
