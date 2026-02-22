
console.log("Game loaded: gin_rummy.js");

// Gin Rummy - 2 players (1 human, 1 bot), basic draw/discard/knock
const ginRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const ginSuits = ["\u2660","\u2665","\u2666","\u2663"];

let ginDeck = [];
let ginHands = [[],[]]; // 0: player, 1: bot
let ginDiscard = [];
let ginScores = [0,0];
let ginCurrentPlayer = 0;
let ginDrawn = false;
let ginGameOver = false;

const ginPlayerHandDiv = document.getElementById("player-hand");
const ginBotHandDiv = document.getElementById("bot-hand");
const ginDeckDiv = document.getElementById("ginrummy-deck");
const ginDiscardDiv = document.getElementById("ginrummy-discard");
const ginLogDiv = document.getElementById("log");
const ginScoreboard = document.getElementById("ginrummy-scoreboard");

function ginRummyInit() {
	ginDeck = createGinDeck();
	shuffle(ginDeck);
	ginHands = [[],[]];
	for (let i = 0; i < 20; i++) ginHands[i%2].push(ginDeck.pop());
	ginDiscard = [ginDeck.pop()];
	ginScores = [0,0];
	ginCurrentPlayer = 0;
	ginDrawn = false;
	ginGameOver = false;
	updateGinUI();
	ginLogDiv.innerHTML = "New game! Draw a card to start.";
}

function createGinDeck() {
	let deck = [];
	for (let suit of ginSuits) {
		for (let rank of ginRanks) {
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

function updateGinUI() {
	// Player hand
	ginPlayerHandDiv.innerHTML = "";
	ginHands[0].forEach((card, idx) => {
		const div = document.createElement("div");
		div.className = `card show ${card.includes('\u2665') || card.includes('\u2666') ? 'red' : ''}`;
		div.textContent = card;
		if (ginDrawn && ginCurrentPlayer === 0) {
			div.onclick = () => ginDiscardCard(idx);
			div.title = "Click to discard";
		}
		ginPlayerHandDiv.appendChild(div);
	});
	// Bot hand (show card count only)
	ginBotHandDiv.innerHTML = "";
	for (let j = 0; j < ginHands[1].length; j++) {
		let c = document.createElement("div");
		c.className = "card hidden";
		c.textContent = "?";
		ginBotHandDiv.appendChild(c);
	}
	// Deck
	ginDeckDiv.innerHTML = `<div class='card hidden'>Deck (${ginDeck.length})</div>`;
	ginDeckDiv.onclick = () => ginRummyAction('draw');
	// Discard
	let discardContent = "";
	if (ginDiscard.length) {
		let card = ginDiscard[ginDiscard.length-1];
		discardContent = `<div class='card show ${card.includes('\u2665') || card.includes('\u2666') ? 'red' : ''}'>${card}</div>`;
	}
	ginDiscardDiv.innerHTML = discardContent;
	ginDiscardDiv.onclick = () => ginRummyAction('draw_discard');
	// Scoreboard
	ginScoreboard.textContent = `You: ${ginScores[0]} | Bot: ${ginScores[1]}`;
}

function ginRummyAction(action) {
	if (ginGameOver) return;
	if (action === 'restart') return ginRummyInit();
	if (ginCurrentPlayer !== 0) return;
	if (!ginDrawn && (action === 'draw' || action === 'draw_discard')) {
		if (action === 'draw') {
			ginHands[0].push(ginDeck.pop());
			ginLogDiv.innerHTML += `<br>You drew from deck.`;
		} else if (action === 'draw_discard' && ginDiscard.length) {
			ginHands[0].push(ginDiscard.pop());
			ginLogDiv.innerHTML += `<br>You drew from discard.`;
		}
		ginDrawn = true;
		updateGinUI();
		return;
	}
	if (action === 'knock' && ginDrawn) {
		ginGameOver = true;
		let playerScore = ginCalculateScore(ginHands[0]);
		let botScore = ginCalculateScore(ginHands[1]);
		ginScores[0] += playerScore;
		ginScores[1] += botScore;
		let winner = playerScore > botScore ? 'You' : (playerScore < botScore ? 'Bot' : 'Tie');
		if (window.addPoints && winner === 'You') window.addPoints(100);
		ginLogDiv.innerHTML += `<br>Knock! You: ${playerScore}, Bot: ${botScore}. Winner: ${winner}`;
		setTimeout(ginRummyInit, 2500);
		updateGinUI();
		return;
	}
}

function ginDiscardCard(idx) {
	if (!ginDrawn || ginCurrentPlayer !== 0 || ginGameOver) return;
	let card = ginHands[0][idx];
	ginHands[0].splice(idx, 1);
	ginDiscard.push(card);
	ginDrawn = false;
	ginCurrentPlayer = 1;
	updateGinUI();
	setTimeout(ginBotTurn, 900);
}

function ginBotTurn() {
	if (ginGameOver) return;
	// Bot draws
	if (Math.random() < 0.5 && ginDiscard.length) {
		ginHands[1].push(ginDiscard.pop());
		ginLogDiv.innerHTML += `<br>Bot drew from discard.`;
	} else {
		ginHands[1].push(ginDeck.pop());
		ginLogDiv.innerHTML += `<br>Bot drew from deck.`;
	}
	// Bot discards random card
	let idx = Math.floor(Math.random() * ginHands[1].length);
	let card = ginHands[1][idx];
	ginHands[1].splice(idx, 1);
	ginDiscard.push(card);
	// Bot may knock randomly
	if (Math.random() < 0.2) {
		ginGameOver = true;
		let playerScore = ginCalculateScore(ginHands[0]);
		let botScore = ginCalculateScore(ginHands[1]);
		ginScores[0] += playerScore;
		ginScores[1] += botScore;
		let winner = playerScore > botScore ? 'You' : (playerScore < botScore ? 'Bot' : 'Tie');
		if (window.addPoints && winner === 'You') window.addPoints(100);
		ginLogDiv.innerHTML += `<br>Bot knocked! You: ${playerScore}, Bot: ${botScore}. Winner: ${winner}`;
		setTimeout(ginRummyInit, 2500);
	}
	ginCurrentPlayer = 0;
	updateGinUI();
}

function ginCalculateScore(hand) {
	// Simplified: score = number of cards in sets/runs (not real Gin scoring)
	// Real scoring is complex; for demo, just count pairs
	let counts = {};
	for (let card of hand) {
		let rank = card.slice(0,-1);
		counts[rank] = (counts[rank]||0)+1;
	}
	let score = 0;
	for (let k in counts) if (counts[k] >= 2) score += counts[k];
	return score;
}

window.ginRummyAction = ginRummyAction;

ginRummyInit();
