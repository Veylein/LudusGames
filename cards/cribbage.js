
console.log("Game loaded: cribbage.js");

// Cribbage - 2 players (1 human, 1 bot), simplified pegging only
const cribRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const cribSuits = ["\u2660","\u2665","\u2666","\u2663"];

let cribDeck = [];
let cribHands = [[],[]]; // 0: player, 1: bot
let cribScores = [0,0];
let cribPeg = [];
let cribCurrentPlayer = 0;
let cribGameOver = false;

const cribPlayerHandDiv = document.getElementById("player-hand");
const cribBotHandDiv = document.getElementById("bot-hand");
const cribLogDiv = document.getElementById("log");
const cribScoreboard = document.getElementById("cribbage-scoreboard");

function cribbageInit() {
	cribDeck = createCribDeck();
	shuffle(cribDeck);
	cribHands = [[],[]];
	for (let i = 0; i < 12; i++) cribHands[i%2].push(cribDeck.pop());
	cribScores = [0,0];
	cribPeg = [];
	cribCurrentPlayer = 0;
	cribGameOver = false;
	updateCribUI();
	cribLogDiv.innerHTML = "New game! (pegging only)";
}

function createCribDeck() {
	let deck = [];
	for (let suit of cribSuits) {
		for (let rank of cribRanks) {
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

function updateCribUI() {
	// Player hand
	cribPlayerHandDiv.innerHTML = "";
	cribHands[0].forEach((card, idx) => {
		const div = document.createElement("div");
		div.className = `card show ${card.includes('\u2665') || card.includes('\u2666') ? 'red' : ''}`;
		div.textContent = card;
		div.onclick = () => cribPlayCard(idx);
		cribPlayerHandDiv.appendChild(div);
	});
	// Bot (show card count only)
	cribBotHandDiv.innerHTML = "";
	for (let j = 0; j < cribHands[1].length; j++) {
		let c = document.createElement("div");
		c.className = "card hidden";
		c.textContent = "?";
		cribBotHandDiv.appendChild(c);
	}
	// Scoreboard
	cribScoreboard.textContent = `You: ${cribScores[0]} | Bot: ${cribScores[1]}`;
}

function cribPlayCard(idx) {
	if (cribCurrentPlayer !== 0 || cribGameOver) return;
	let card = cribHands[0][idx];
	cribPeg.push(card);
	cribHands[0].splice(idx, 1);
	cribCheckPeg();
	cribNextPlayer();
}

function cribNextPlayer() {
	updateCribUI();
	cribCurrentPlayer = 1;
	setTimeout(cribBotPlay, 800);
}

function cribBotPlay() {
	if (cribGameOver) return;
	let hand = cribHands[1];
	if (hand.length === 0) return;
	let idx = Math.floor(Math.random() * hand.length);
	let card = hand[idx];
	cribPeg.push(card);
	hand.splice(idx, 1);
	cribCheckPeg();
	cribCurrentPlayer = 0;
	updateCribUI();
}

function cribCheckPeg() {
	if (cribPeg.length < 2) return;
	let last = cribPeg[cribPeg.length-1];
	let prev = cribPeg[cribPeg.length-2];
	if (last.slice(0,-1) === prev.slice(0,-1)) {
		let winner = cribCurrentPlayer === 0 ? 1 : 0;
		cribScores[winner]++;
		cribLogDiv.innerHTML += `<br>${winner === 0 ? 'You' : 'Bot'} scored a pair!`;
	}
	if (cribHands[0].length === 0 && cribHands[1].length === 0) {
		cribGameOver = true;
		let winner = cribScores[0] > cribScores[1] ? 'You' : (cribScores[0] < cribScores[1] ? 'Bot' : 'Tie');
		if (window.addPoints && winner === 'You') window.addPoints(100);
		cribLogDiv.innerHTML += `<br>Game over! Winner: ${winner}`;
		setTimeout(cribbageInit, 2000);
	}
}

function cribbageAction(action) {
	if (action === 'restart') cribbageInit();
}

window.cribbageAction = cribbageAction;

cribbageInit();
