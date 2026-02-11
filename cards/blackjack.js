import { createDeck, shuffle } from "./engine.js";
import { renderCard } from "./cardRenderer.js";

let deck;
let playerHand = [];
let dealerHand = [];
let gameOver = false;

const playerHandDiv = document.getElementById("player-hand");
const dealerHandDiv = document.getElementById("dealer-hand");
const playerScoreDiv = document.getElementById("player-score");
const dealerScoreDiv = document.getElementById("dealer-score");
const resultOverlay = document.getElementById("resultOverlay");
const resultText = document.getElementById("resultText");

document.getElementById("hitBtn").onclick = hit;
document.getElementById("standBtn").onclick = stand;
document.getElementById("restartBtn").onclick = startGame;

function startGame() {
    deck = createDeck();
    shuffle(deck);

    playerHand = [];
    dealerHand = [];
    gameOver = false;

    resultOverlay.classList.add("hidden");

    dealCard(playerHand);
    dealCard(dealerHand);
    dealCard(playerHand);
    dealCard(dealerHand);

    updateUI(true);
}

function dealCard(hand) {
    hand.push(deck.pop());
}

function getValue(hand) {
    let total = 0;
    let aces = 0;

    hand.forEach(card => {
        if (["J","Q","K"].includes(card.rank)) total += 10;
        else if (card.rank === "A") {
            total += 11;
            aces++;
        } else total += parseInt(card.rank);
    });

    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }

    return total;
}

function updateUI(hideDealerCard) {
    playerHandDiv.innerHTML = "";
    dealerHandDiv.innerHTML = "";

    playerHand.forEach(card => {
        playerHandDiv.appendChild(renderCard(card));
    });

    dealerHand.forEach((card, index) => {
        if (index === 0 && hideDealerCard && !gameOver) {
            dealerHandDiv.appendChild(renderCard(card, true));
        } else {
            dealerHandDiv.appendChild(renderCard(card));
        }
    });

    playerScoreDiv.textContent = "Score: " + getValue(playerHand);

    if (!hideDealerCard || gameOver) {
        dealerScoreDiv.textContent = "Score: " + getValue(dealerHand);
    } else {
        dealerScoreDiv.textContent = "Score: ?";
    }
}

function hit() {
    if (gameOver) return;

    dealCard(playerHand);
    updateUI(true);

    if (getValue(playerHand) > 21) {
        endGame();
    }
}

function stand() {
    if (gameOver) return;

    while (getValue(dealerHand) < 17) {
        dealCard(dealerHand);
    }

    endGame();
}

function endGame() {
    gameOver = true;

    const playerScore = getValue(playerHand);
    const dealerScore = getValue(dealerHand);

    updateUI(false);

    let result;

    if (playerScore > 21) result = "Bust! Dealer Wins.";
    else if (dealerScore > 21) result = "Dealer Busts! You Win.";
    else if (playerScore > dealerScore) result = "You Win!";
    else if (dealerScore > playerScore) result = "Dealer Wins.";
    else result = "Push.";

    resultText.textContent = result;
    resultOverlay.classList.remove("hidden");
}

startGame();
