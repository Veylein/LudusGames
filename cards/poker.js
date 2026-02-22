
console.log("Game loaded: poker.js");

// Poker (Texas Hold'em) - Simple Single Player vs Bot
const pokerRanks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const pokerSuits = ["♠","♥","♦","♣"];

let pokerDeck = [];
let playerChips = 1000;
let botChips = 1000;
let pot = 0;
let playerHand = [];
let botHand = [];
let communityCards = [];
let playerFolded = false;
let botFolded = false;
let roundStage = 0; // 0: pre-flop, 1: flop, 2: turn, 3: river, 4: showdown

const playerHandDiv = document.getElementById("player-hand");
const botHandDiv = document.getElementById("bot-hand");
const communityDiv = document.getElementById("community-cards");

function pokerInit() {
    const logDiv = document.getElementById("log");
	pokerDeck = createPokerDeck();
	shuffle(pokerDeck);
	playerHand = [pokerDeck.pop(), pokerDeck.pop()];
	botHand = [pokerDeck.pop(), pokerDeck.pop()];
	communityCards = [];
	pot = 0;
	playerFolded = false;
	botFolded = false;
	roundStage = 0;
	updatePokerUI();
	logDiv.innerHTML = "New Hand! Pre-flop.";
}

function createPokerDeck() {
	let deck = [];
	for (let suit of pokerSuits) {
		for (let rank of pokerRanks) {
			deck.push(rank + suit);
		}
	}
	return deck;
}

function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

function updatePokerUI() {
	// Player hand
	playerHandDiv.innerHTML = "";
	playerHand.forEach(card => {
		const div = document.createElement("div");
		div.className = "card";
        if (card.includes('♥') || card.includes('♦')) div.classList.add('red');
		div.textContent = card;
		playerHandDiv.appendChild(div);
	});
	// Bot hand (hidden)
	botHandDiv.innerHTML = "";
	botHand.forEach((card, index) => {
		const div = document.createElement("div");
		div.className = "card";
        // If showing down, reveal
        if (roundStage === 4 && !botFolded) {
             if (card.includes('♥') || card.includes('♦')) div.classList.add('red');
             div.textContent = card;
        } else {
             div.textContent = "?";
             div.classList.add("hidden");
        }
		botHandDiv.appendChild(div);
	});
	// Community cards
	communityDiv.innerHTML = "";
	communityCards.forEach(card => {
		const div = document.createElement("div");
		div.className = "card";
        if (card.includes('♥') || card.includes('♦')) div.classList.add('red');
		div.textContent = card;
		communityDiv.appendChild(div);
	});
    
	// Pot and chips
	document.getElementById("pot").textContent = `Pot: $${pot}`;
    document.getElementById("player-chips").textContent = `Chips: $${playerChips}`;
    document.getElementById("bot-chips").textContent = `Chips: $${botChips}`;
    
    // Log scroll to bottom
    const logDiv = document.getElementById("log");
    logDiv.scrollTop = logDiv.scrollHeight;
}

function pokerAction(action) {
    const logDiv = document.getElementById("log");
	if (playerFolded || botFolded || roundStage === 4) return;
	if (action === 'fold') {
		playerFolded = true;
		logDiv.innerHTML += '<br>You folded. Bot wins the pot!';
		botChips += pot;
		setTimeout(pokerInit, 2000);
        updatePokerUI();
		return;
	}
	if (action === 'bet') {
		let bet = 100;
		if (playerChips < bet) bet = playerChips;
		playerChips -= bet;
		pot += bet;
		logDiv.innerHTML += `<br>You bet $${bet}.`;
		botPokerAction();
	} else if (action === 'check') {
		logDiv.innerHTML += '<br>You check.';
		botPokerAction();
	}
	updatePokerUI();
}

function botPokerAction() {
    const logDiv = document.getElementById("log");
	if (playerFolded || botFolded || roundStage === 4) return;
	// Simple bot: random fold or call/check
	let botDecision = Math.random();
	if (botDecision < 0.1) {
		botFolded = true;
		if (window.addPoints) window.addPoints(100);
		logDiv.innerHTML += '<br>Bot folds. You win the pot!';
		playerChips += pot;
		setTimeout(pokerInit, 2000);
		updatePokerUI();
		return;
	} else if (botDecision < 0.6) {
		let bet = 100;
		if (botChips < bet) bet = botChips;
		botChips -= bet;
		pot += bet;
		logDiv.innerHTML += `<br>Bot bets $${bet}.`;
	} else {
		logDiv.innerHTML += '<br>Bot checks.';
	}
	nextPokerStage();
	updatePokerUI();
}

function nextPokerStage() {
    const logDiv = document.getElementById("log");
	roundStage++;
	if (roundStage === 1) {
		// Flop
		communityCards = [pokerDeck.pop(), pokerDeck.pop(), pokerDeck.pop()];
		logDiv.innerHTML += '<br>Flop dealt.';
	} else if (roundStage === 2) {
		// Turn
		communityCards.push(pokerDeck.pop());
		logDiv.innerHTML += '<br>Turn dealt.';
	} else if (roundStage === 3) {
		// River
		communityCards.push(pokerDeck.pop());
		logDiv.innerHTML += '<br>River dealt.';
	} else if (roundStage === 4) {
		// Showdown
		logDiv.innerHTML += '<br>Showdown!';
		// Winner determination
		let winner = Math.random() < 0.5 ? 'player' : 'bot';
		if (winner === 'player') {
			if (window.addPoints) window.addPoints(100);
			logDiv.innerHTML += '<br>You win the pot!';
			playerChips += pot;
		} else {
			logDiv.innerHTML += '<br>Bot wins the pot!';
			botChips += pot;
		}
		updatePokerUI();
		setTimeout(pokerInit, 3000);
	}
}

window.pokerAction = pokerAction;

pokerInit();
