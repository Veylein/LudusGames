console.log("Game loaded: rummy.js");

// Rummy game logic will go here
// Rummy - 2 players (1 human, 1 bot)
const rummyRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const rummySuits = ["\u2660","\u2665","\u2666","\u2663"];

let rummyDeck = [];
let rummyHands = [[],[]]; // 0: player, 1: bot
let rummyScores = [0,0];
let rummyDiscard = [];
let rummyDraw = [];
let rummyCurrentPlayer = 0;
let rummyGameOver = false;

const rummyPlayerHandDiv = document.getElementById("player-hand");
const rummyBotHandDiv = document.getElementById("bot-hand");
const rummyDiscardDiv = document.getElementById("discard-pile");
const rummyDrawDiv = document.getElementById("draw-pile");
const rummyLogDiv = document.getElementById("log");
const rummyScoreboard = document.getElementById("rummy-scoreboard");

function rummyInit() {
	rummyDeck = createRummyDeck();
	shuffle(rummyDeck);
	rummyHands = [[],[]];
	for (let i = 0; i < 14; i++) rummyHands[i%2].push(rummyDeck.pop());
	rummyDiscard = [rummyDeck.pop()];
	rummyDraw = rummyDeck;
	rummyCurrentPlayer = 0;
	rummyGameOver = false;
	updateRummyUI();
	rummyLogDiv.innerHTML = "New game!";
	if (rummyCurrentPlayer !== 0) setTimeout(rummyBotPlay, 1000);
}

function createRummyDeck() {
	let deck = [];
	for (let suit of rummySuits) {
		for (let rank of rummyRanks) {
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

function updateRummyUI() {
	// Player hand
	rummyPlayerHandDiv.innerHTML = "";
	rummyHands[0].forEach((card, idx) => {
		const div = document.createElement("div");
		div.className = `card show ${card.includes('\u2665') || card.includes('\u2666') ? 'red' : ''}`;
		div.textContent = card;
		div.onclick = () => rummyPlayCard(idx);
		rummyPlayerHandDiv.appendChild(div);
	});
	// Bot (show card count only)
	rummyBotHandDiv.innerHTML = "";
	for (let j = 0; j < rummyHands[1].length; j++) {
		let c = document.createElement("div");
		c.className = "card hidden";
		c.textContent = "?";
		rummyBotHandDiv.appendChild(c);
	}
	// Discard pile
	rummyDiscardDiv.innerHTML = "";
	if (rummyDiscard.length) {
		let d = document.createElement("div");
		let card = rummyDiscard[rummyDiscard.length-1];
		d.className = `card show ${card.includes('\u2665') || card.includes('\u2666') ? 'red' : ''}`;
		d.textContent = card;
		rummyDiscardDiv.appendChild(d);
	}
	// Draw pile
	rummyDrawDiv.innerHTML = "";
	let drawCardDiv = document.createElement("div");
	drawCardDiv.className = "card hidden";
	drawCardDiv.textContent = rummyDraw.length ? "🂠" : "";
	drawCardDiv.onclick = rummyDrawCard;
	rummyDrawDiv.appendChild(drawCardDiv);
	// Scoreboard
	rummyScoreboard.textContent = `You: ${rummyScores[0]} | Bot: ${rummyScores[1]}`;
}

function rummyPlayCard(idx) {
	if (rummyCurrentPlayer !== 0 || rummyGameOver) return;
	// For simplicity, just discard a card
	let card = rummyHands[0][idx];
	rummyDiscard.push(card);
	rummyHands[0].splice(idx, 1);
	rummyCheckWin();
	rummyNextPlayer();
}

function rummyDrawCard() {
	if (rummyCurrentPlayer !== 0 || rummyGameOver) return;
	if (rummyDraw.length) {
		rummyHands[0].push(rummyDraw.pop());
		updateRummyUI();
	}
}

function rummyNextPlayer() {
	updateRummyUI();
	rummyCurrentPlayer = (rummyCurrentPlayer + 1) % 2;
	if (rummyCurrentPlayer !== 0 && !rummyGameOver) setTimeout(rummyBotPlay, 1000);
}

function rummyBotPlay() {
	if (rummyGameOver) return;
	let hand = rummyHands[1];
	// For simplicity, just discard a random card
	if (rummyDraw.length) hand.push(rummyDraw.pop());
	let idx = Math.floor(Math.random() * hand.length);
	let card = hand[idx];
	rummyDiscard.push(card);
	hand.splice(idx, 1);
	rummyCheckWin();
	setTimeout(rummyNextPlayer, 800);
}

function rummyCheckWin() {
	for (let i = 0; i < 2; i++) {
		if (rummyHands[i].length === 0) {
			rummyGameOver = true;
			rummyScores[i]++;
			if (window.addPoints && i === 0) window.addPoints(100);
			rummyLogDiv.innerHTML += `<br>${i === 0 ? 'You' : 'Bot'} wins!`;
			setTimeout(rummyInit, 2000);
		}
	}
}

function rummyAction(action) {
	if (action === 'restart') rummyInit();
}

window.rummyAction = rummyAction;

rummyInit();
