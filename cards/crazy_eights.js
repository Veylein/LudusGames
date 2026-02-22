
console.log("Game loaded: crazy_eights.js");

// Crazy Eights - 3 players (1 human, 2 bots)
const ceRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const ceSuits = ["♠","♥","♦","♣"];

let ceDeck = [];
let ceHands = [[],[],[]]; // 0: player, 1-2: bots
let ceScores = [0,0,0];
let ceDiscard = [];
let ceDraw = [];
let ceCurrentPlayer = 0;
let ceGameOver = false;

const cePlayerHandDiv = document.getElementById("player-hand");
const ceBot1HandDiv = document.getElementById("bot1-hand");
const ceBot2HandDiv = document.getElementById("bot2-hand");
const ceDiscardDiv = document.getElementById("discard-pile");
const ceDrawDiv = document.getElementById("draw-pile");
const ceLogDiv = document.getElementById("log");
const ceScoreboard = document.getElementById("crazy-eights-scoreboard");

function crazyEightsInit() {
	ceDeck = createCeDeck();
	shuffle(ceDeck);
	ceHands = [[],[],[]];
	for (let i = 0; i < 21; i++) ceHands[i%3].push(ceDeck.pop());
	ceDiscard = [ceDeck.pop()];
	ceDraw = ceDeck;
	ceCurrentPlayer = 0;
	ceGameOver = false;
	updateCeUI();
	ceLogDiv.innerHTML = "New game!";
	if (ceCurrentPlayer !== 0) setTimeout(ceBotPlay, 1000);
}

function createCeDeck() {
	let deck = [];
	for (let suit of ceSuits) {
		for (let rank of ceRanks) {
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

function updateCeUI() {
	// Player hand
	cePlayerHandDiv.innerHTML = "";
	ceHands[0].forEach((card, idx) => {
		const div = document.createElement("div");
		div.className = `card show ${card.includes('♥') || card.includes('♦') ? 'red' : ''}`;
		div.textContent = card;
		div.onclick = () => cePlayCard(idx);
		cePlayerHandDiv.appendChild(div);
	});
	// Bots (show card count only)
	[ceBot1HandDiv, ceBot2HandDiv].forEach((div, i) => {
		div.innerHTML = "";
		for (let j = 0; j < ceHands[i+1].length; j++) {
			let c = document.createElement("div");
			c.className = "card hidden";
			c.textContent = "?";
			div.appendChild(c);
		}
	});
	// Discard pile
	ceDiscardDiv.innerHTML = "";
	if (ceDiscard.length) {
		let d = document.createElement("div");
		let card = ceDiscard[ceDiscard.length-1];
		d.className = `card show ${card.includes('♥') || card.includes('♦') ? 'red' : ''}`;
		d.textContent = card;
		ceDiscardDiv.appendChild(d);
	}
	// Draw pile
	ceDrawDiv.innerHTML = "";
	let drawCardDiv = document.createElement("div");
	drawCardDiv.className = "card hidden";
	drawCardDiv.textContent = ceDraw.length ? "🂠" : "";
	drawCardDiv.onclick = ceDrawCard;
	ceDrawDiv.appendChild(drawCardDiv);
	// Scoreboard
	ceScoreboard.textContent = `You: ${ceScores[0]} | Bot1: ${ceScores[1]} | Bot2: ${ceScores[2]}`;
}

function cePlayCard(idx) {
	if (ceCurrentPlayer !== 0 || ceGameOver) return;
	let card = ceHands[0][idx];
	if (!ceIsValidPlay(card)) {
		ceLogDiv.innerHTML += '<br>Invalid play!';
		return;
	}
	ceDiscard.push(card);
	ceHands[0].splice(idx, 1);
	if (card.startsWith("8")) {
		// For simplicity, auto-choose next suit
		let suit = card.slice(-1);
		ceDiscard[ceDiscard.length-1] = "8" + suit;
		ceLogDiv.innerHTML += `<br>You played 8, suit stays ${suit}`;
	}
	ceCheckWin();
	ceNextPlayer();
}

function ceIsValidPlay(card) {
	let top = ceDiscard[ceDiscard.length-1];
	return card.slice(0,-1) === "8" || card.slice(-1) === top.slice(-1) || card.slice(0,-1) === top.slice(0,-1);
}

function ceDrawCard() {
	if (ceCurrentPlayer !== 0 || ceGameOver) return;
	if (ceDraw.length) {
		ceHands[0].push(ceDraw.pop());
		updateCeUI();
	}
}

function ceNextPlayer() {
	updateCeUI();
	ceCurrentPlayer = (ceCurrentPlayer + 1) % 3;
	if (ceCurrentPlayer !== 0 && !ceGameOver) setTimeout(ceBotPlay, 1000);
}

function ceBotPlay() {
	if (ceGameOver) return;
	let hand = ceHands[ceCurrentPlayer];
	let idx = hand.findIndex(ceIsValidPlay);
	if (idx === -1) {
		if (ceDraw.length) hand.push(ceDraw.pop());
		updateCeUI();
		setTimeout(ceNextPlayer, 800);
		return;
	}
	let card = hand[idx];
	ceDiscard.push(card);
	hand.splice(idx, 1);
	if (card.startsWith("8")) {
		// For simplicity, auto-choose next suit
		let suit = card.slice(-1);
		ceDiscard[ceDiscard.length-1] = "8" + suit;
		ceLogDiv.innerHTML += `<br>Bot${ceCurrentPlayer} played 8, suit stays ${suit}`;
	}
	ceCheckWin();
	setTimeout(ceNextPlayer, 800);
}

function ceCheckWin() {
	for (let i = 0; i < 3; i++) {
		if (ceHands[i].length === 0) {
			ceGameOver = true;
			ceScores[i]++;
			if (window.addPoints && i === 0) window.addPoints(100);
			ceLogDiv.innerHTML += `<br>${i === 0 ? 'You' : 'Bot'+i} wins!`;
			setTimeout(crazyEightsInit, 2000);
		}
	}
}

function crazyEightsAction(action) {
	if (action === 'restart') crazyEightsInit();
}

window.crazyEightsAction = crazyEightsAction;

crazyEightsInit();
