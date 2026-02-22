
console.log("Game loaded: canasta.js");

// Canasta - 2 players (1 human, 1 bot), simplified draw/discard
const canastaRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const canastaSuits = ["♠","♥","♦","♣"];

let canastaDeck = [];
let canastaHands = [[],[]]; // 0: player, 1: bot
let canastaScores = [0,0];
let canastaDiscard = [];
let canastaDraw = [];
let canastaCurrentPlayer = 0;
let canastaGameOver = false;

const canastaPlayerHandDiv = document.getElementById("player-hand");
const canastaBotHandDiv = document.getElementById("bot-hand");
const canastaDiscardDiv = document.getElementById("discard-pile");
const canastaDrawDiv = document.getElementById("draw-pile");
const canastaLogDiv = document.getElementById("log");
const canastaScoreboard = document.getElementById("canasta-scoreboard");

function canastaInit() {
	canastaDeck = createCanastaDeck();
	shuffle(canastaDeck);
	canastaHands = [[],[]];
	for (let i = 0; i < 22; i++) canastaHands[i%2].push(canastaDeck.pop());
	canastaDiscard = [canastaDeck.pop()];
	canastaDraw = canastaDeck;
	canastaCurrentPlayer = 0;
	canastaGameOver = false;
	updateCanastaUI();
	canastaLogDiv.innerHTML = "New game!";
	if (canastaCurrentPlayer !== 0) setTimeout(canastaBotPlay, 1000);
}

function createCanastaDeck() {
	let deck = [];
	for (let suit of canastaSuits) {
		for (let rank of canastaRanks) {
			deck.push(rank + suit);
			deck.push(rank + suit); // double deck
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

function updateCanastaUI() {
	// Player hand
	canastaPlayerHandDiv.innerHTML = "";
	canastaHands[0].forEach((card, idx) => {
		const div = document.createElement("div");
		div.className = `card show ${card.includes('♥') || card.includes('♦') ? 'red' : ''}`;
		div.textContent = card;
		div.onclick = () => canastaPlayCard(idx);
		canastaPlayerHandDiv.appendChild(div);
	});
	// Bot (show card count only)
	canastaBotHandDiv.innerHTML = "";
	for (let j = 0; j < canastaHands[1].length; j++) {
		let c = document.createElement("div");
		c.className = "card hidden";
		c.textContent = "?";
		canastaBotHandDiv.appendChild(c);
	}
	// Discard pile
	canastaDiscardDiv.innerHTML = "";
	if (canastaDiscard.length) {
		let d = document.createElement("div");
		let card = canastaDiscard[canastaDiscard.length-1];
		d.className = `card show ${card.includes('♥') || card.includes('♦') ? 'red' : ''}`;
		d.textContent = card;
		canastaDiscardDiv.appendChild(d);
	}
	// Draw pile
	canastaDrawDiv.innerHTML = "";
	let drawCardDiv = document.createElement("div");
	drawCardDiv.className = "card hidden";
	drawCardDiv.textContent = canastaDraw.length ? "🂠" : "";
	drawCardDiv.onclick = canastaDrawCard;
	canastaDrawDiv.appendChild(drawCardDiv);
	// Scoreboard
	canastaScoreboard.textContent = `You: ${canastaScores[0]} | Bot: ${canastaScores[1]}`;
}

function canastaPlayCard(idx) {
	if (canastaCurrentPlayer !== 0 || canastaGameOver) return;
	// For simplicity, just discard a card
	let card = canastaHands[0][idx];
	canastaDiscard.push(card);
	canastaHands[0].splice(idx, 1);
	canastaCheckWin();
	canastaNextPlayer();
}

function canastaDrawCard() {
	if (canastaCurrentPlayer !== 0 || canastaGameOver) return;
	if (canastaDraw.length) {
		canastaHands[0].push(canastaDraw.pop());
		updateCanastaUI();
	}
}

function canastaNextPlayer() {
	updateCanastaUI();
	canastaCurrentPlayer = (canastaCurrentPlayer + 1) % 2;
	if (canastaCurrentPlayer !== 0 && !canastaGameOver) setTimeout(canastaBotPlay, 1000);
}

function canastaBotPlay() {
	if (canastaGameOver) return;
	let hand = canastaHands[1];
	// For simplicity, just discard a random card
	if (canastaDraw.length) hand.push(canastaDraw.pop());
	let idx = Math.floor(Math.random() * hand.length);
	let card = hand[idx];
	canastaDiscard.push(card);
	hand.splice(idx, 1);
	canastaCheckWin();
	setTimeout(canastaNextPlayer, 800);
}

function canastaCheckWin() {
	for (let i = 0; i < 2; i++) {
		if (canastaHands[i].length === 0) {
			canastaGameOver = true;
			canastaScores[i]++;
			if (window.addPoints && i === 0) window.addPoints(100);
			canastaLogDiv.innerHTML += `<br>${i === 0 ? 'You' : 'Bot'} wins!`;
			setTimeout(canastaInit, 2000);
		}
	}
}

function canastaAction(action) {
	if (action === 'restart') canastaInit();
}

window.canastaAction = canastaAction;

canastaInit();
