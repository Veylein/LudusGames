
/* WAR - BATTLE CARD GAME */

const ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const suits = ["♠","♥","♦","♣"];

let deck = [];
let playerDeck = [];
let botDeck = [];
let battlefield = [];
let gameActive = false;
let autoPlayInterval = null;

const pHandDiv = document.getElementById("player-hand");
const bHandDiv = document.getElementById("bot-hand");
const fieldDiv = document.getElementById("battlefield");
const logDiv = document.getElementById("log");
const scoreDiv = document.getElementById("war-scoreboard");

/* INITIALIZATION */
// Ensure script is ready
if (window.updatePointsDisplay) window.updatePointsDisplay();

function createDeck() {
    let d = [];
    for (let s of suits) {
        for (let r of ranks) {
            d.push({ rank: r, suit: s, value: ranks.indexOf(r) + 2 });
        }
    }
    return d;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function warInit() {
    if (autoPlayInterval) clearInterval(autoPlayInterval);
    deck = createDeck();
    shuffle(deck);
    playerDeck = deck.slice(0, 26);
    botDeck = deck.slice(26);
    battlefield = [];
    gameActive = true;
    logDiv.innerHTML = "WAR! Press Play to fight!";
    updateUI();
}

function updateUI() {
    scoreDiv.innerText = `You: ${playerDeck.length} | Bot: ${botDeck.length}`;
    
    // Visualize decks stack
    pHandDiv.innerHTML = playerDeck.length > 0 ? `<div class="card back"></div><div style="margin-top:5px">${playerDeck.length}</div>` : "Empty";
    bHandDiv.innerHTML = botDeck.length > 0 ? `<div class="card back"></div><div style="margin-top:5px">${botDeck.length}</div>` : "Empty";
    
    // Visualize Battlefield - Show last 2 cards
    fieldDiv.innerHTML = "";
    if (battlefield.length > 0) {
        // Show last two added (current duel)
        const pCard = battlefield[battlefield.length - 2];
        const bCard = battlefield[battlefield.length - 1];
        
        if (pCard && bCard) {
            [pCard, bCard].forEach(card => {
                const c = document.createElement("div");
                c.className = "card";
                if (["", ""].includes(card.suit)) c.classList.add("red");
                c.innerText = `${card.rank}${card.suit}`;
                fieldDiv.appendChild(c);
            });
        }
    }
}

function warAction(action) {
    if (action === "restart") {
        warInit();
        return;
    }
    if (!gameActive) return;

    if (action === "play") {
        playRound();
    }
}

function playRound() {
    if (playerDeck.length === 0 || botDeck.length === 0) {
        checkWin();
        return;
    }

    const pCard = playerDeck.shift();
    const bCard = botDeck.shift();
    
    battlefield.push(pCard, bCard);
    
    // Check values
    const pVal = ranks.indexOf(pCard.rank);
    const bVal = ranks.indexOf(bCard.rank);

    updateUI();

    if (pVal > bVal) {
        logDiv.innerHTML = `You win! ${pCard.rank} beats ${bCard.rank}`;
        winRound("player");
    } else if (bVal > pVal) {
        logDiv.innerHTML = `Bot wins! ${bCard.rank} beats ${pCard.rank}`;
        winRound("bot");
    } else {
        // WAR logic
        logDiv.innerHTML = `<span style="color:red">WAR!</span> Tie on ${pCard.rank}`;
        
        const difficulty = window.getDifficulty ? window.getDifficulty() : 1;
        // 0: Apprentice, 1: Gambler, 2: Ruthless

        // Difficulty Logic for Ties
        if (difficulty === 0) {
            logDiv.innerHTML += " (Apprentice Luck: You win tie!)";
            winRound("player");
        } else if (difficulty === 2) {
            logDiv.innerHTML += " (Ruthless Luck: Bot wins tie!)";
            winRound("bot");
        } else {
            setTimeout(doWar, 1000);
        }
    }
}

function doWar() {
    // Check card count
    if (playerDeck.length < 4 || botDeck.length < 4) {
        // Not enough cards for war, whoever runs out loses immediately? 
        // Or specific rule: use what you have. 
        // Simplifying: if < 4, you lose all remaining to opponent?
        // Let is use min available.
        logDiv.innerHTML = "Not enough cards for War! Sudden Death!";
        // Just end game based on current count
        checkWin();
        return;
    }

    logDiv.innerHTML = "I DECLARE... WAAAAR!";
    
    // Burn 3 cards
    for(let i=0; i<3; i++) battlefield.push(playerDeck.shift());
    for(let i=0; i<3; i++) battlefield.push(botDeck.shift());
    
    // Play next card face up by calling playRound again recursively?
    // playRound logic handles standard comparison.
    setTimeout(playRound, 1500); 
}

function winRound(winner) {
    if (winner === "player") {
        // Add points for winning a round
        if (window.addPoints) window.addPoints(10); 
        playerDeck.push(...battlefield);
    } else {
        botDeck.push(...battlefield);
    }
    battlefield = [];
    setTimeout(() => {
        logDiv.innerHTML = "Next Round...";
        checkWin();
    }, 1500);
}

function checkWin() {
    if (playerDeck.length === 0) {
        gameActive = false;
        logDiv.innerHTML = "DEFEAT! Bot has all the cards!";
    } else if (botDeck.length === 0) {
        gameActive = false;
        logDiv.innerHTML = "VICTORY! You have all the cards!";
        if (window.addPoints) window.addPoints(500);
    }
    updateUI();
}

window.warAction = warAction;
warInit();

