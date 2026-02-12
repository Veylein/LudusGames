
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
const potDiv = document.getElementById("pot");
const logDiv = document.getElementById("log");
const scoreboard = document.getElementById("poker-scoreboard");

function pokerInit() {
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
	logDiv.innerHTML = "New hand!";
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
		div.className = "card show";
		div.textContent = card;
		playerHandDiv.appendChild(div);
	});
	// Bot hand (hidden)
	botHandDiv.innerHTML = "";
	botHand.forEach(() => {
		const div = document.createElement("div");
		div.className = "card show";
		div.textContent = "?";
		botHandDiv.appendChild(div);
	});
	// Community cards
	communityDiv.innerHTML = "";
	communityCards.forEach(card => {
		const div = document.createElement("div");
		div.className = "card show";
		div.textContent = card;
		communityDiv.appendChild(div);
	});
	// Pot and scoreboard
	potDiv.textContent = `Pot: $${pot}`;
	scoreboard.textContent = `Player: $${playerChips} | Bot: $${botChips}`;
}

function pokerAction(action) {
	if (playerFolded || botFolded || roundStage === 4) return;
	if (action === 'fold') {
		playerFolded = true;
		logDiv.innerHTML += '<br>You folded. Bot wins the pot!';
		botChips += pot;
		setTimeout(pokerInit, 2000);
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
	if (playerFolded || botFolded || roundStage === 4) return;
	// Simple bot: random fold or call/check
	let botDecision = Math.random();
	if (botDecision < 0.1) {
		botFolded = true;
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
		revealBotHand();
		// Winner determination placeholder
		let winner = Math.random() < 0.5 ? 'player' : 'bot';
		if (winner === 'player') {
			logDiv.innerHTML += '<br>You win the pot!';
			playerChips += pot;
		} else {
			logDiv.innerHTML += '<br>Bot wins the pot!';
			botChips += pot;
		}
		setTimeout(pokerInit, 3000);
	}
}

function revealBotHand() {
	botHandDiv.innerHTML = "";
	botHand.forEach(card => {
		const div = document.createElement("div");
		div.className = "card show";
		div.textContent = card;
		botHandDiv.appendChild(div);
	});
}

window.pokerAction = pokerAction;

pokerInit();
