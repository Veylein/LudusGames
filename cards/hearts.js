
console.log("Game loaded: hearts.js");

// Hearts - Basic 4-player (1 human, 3 bots)
const heartsRanks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const heartsSuits = ["\u2660","\u2665","\u2666","\u2663"];

let heartsDeck = [];
let hands = [[],[],[],[]]; // 0: player, 1-3: bots
let scores = [0,0,0,0];
let trick = [];
let trickPlayers = [];
let currentPlayer = 0;
let heartsBroken = false;
let roundOver = false;

const playerHandDiv = document.getElementById("player-hand");
const bot1HandDiv = document.getElementById("bot1-hand");
const bot2HandDiv = document.getElementById("bot2-hand");
const bot3HandDiv = document.getElementById("bot3-hand");
const trickDiv = document.getElementById("trick");
const logDiv = document.getElementById("log");
const scoreboard = document.getElementById("hearts-scoreboard");

function heartsInit() {
	heartsDeck = createHeartsDeck();
	shuffle(heartsDeck);
	hands = [[],[],[],[]];
	for (let i = 0; i < 52; i++) {
		hands[i%4].push(heartsDeck[i]);
	}
	hands.forEach(h => h.sort(heartsSort));
	scores = [0,0,0,0];
	trick = [];
	trickPlayers = [];
	currentPlayer = hands[0].findIndex(c => c === "2\u2663"); // 2\u2663 starts
	if (currentPlayer === -1) currentPlayer = 0;
	heartsBroken = false;
	roundOver = false;
	updateHeartsUI();
	logDiv.innerHTML = "New round! 2\u2663 starts.";
	if (currentPlayer !== 0) setTimeout(botPlay, 1000);
}

function createHeartsDeck() {
	let deck = [];
	for (let suit of heartsSuits) {
		for (let rank of heartsRanks) {
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

function heartsSort(a, b) {
	let sa = heartsSuits.indexOf(a.slice(-1));
	let sb = heartsSuits.indexOf(b.slice(-1));
	if (sa !== sb) return sa - sb;
	return heartsRanks.indexOf(a.slice(0, -1)) - heartsRanks.indexOf(b.slice(0, -1));
}

function updateHeartsUI() {
	// Player hand
	playerHandDiv.innerHTML = "";
	hands[0].forEach((card, idx) => {
		const div = document.createElement("div");
		div.className = `card show ${card.includes('\u2665') || card.includes('\u2666') ? 'red' : ''}`;
		div.textContent = card;
		div.onclick = () => playCard(idx);
		playerHandDiv.appendChild(div);
	});
	// Bots (show card count only)
	[bot1HandDiv, bot2HandDiv, bot3HandDiv].forEach((div, i) => {
		div.innerHTML = "";
		for (let j = 0; j < hands[i+1].length; j++) {
			let c = document.createElement("div");
			c.className = "card hidden";
			c.textContent = "?";
			div.appendChild(c);
		}
	});
	// Trick
	trickDiv.innerHTML = "";
	trick.forEach((card, i) => {
		let d = document.createElement("div");
		d.className = `card show ${card.includes('\u2665') || card.includes('\u2666') ? 'red' : ''}`;
		d.textContent = card;
		trickDiv.appendChild(d);
	});
	// Scoreboard
	scoreboard.textContent = `You: ${scores[0]} | Bot1: ${scores[1]} | Bot2: ${scores[2]} | Bot3: ${scores[3]}`;
}

function playCard(idx) {
	if (currentPlayer !== 0 || roundOver) return;
	let card = hands[0][idx];
	if (!isValidPlay(card)) {
		logDiv.innerHTML += '<br>Invalid play!';
		return;
	}
	trick.push(card);
	trickPlayers.push(0);
	hands[0].splice(idx, 1);
	nextPlayer();
}

function isValidPlay(card) {
	// Only basic rules: must follow suit if possible
	if (trick.length === 0) return true;
	let leadSuit = trick[0].slice(-1);
	if (card.slice(-1) === leadSuit) return true;
	return !hands[0].some(c => c.slice(-1) === leadSuit);
}

function nextPlayer() {
	if (trick.length === 4) {
		// Score trick
		let leadSuit = trick[0].slice(-1);
		let highest = 0;
		let highIdx = 0;
		for (let i = 0; i < 4; i++) {
			let c = trick[i];
			if (c.slice(-1) === leadSuit) {
				let val = heartsRanks.indexOf(c.slice(0, -1));
				if (val > highest) {
					highest = val;
					highIdx = i;
				}
			}
		}
		let winner = trickPlayers[highIdx];
		let points = trick.filter(c => c.slice(-1) === "\u2665").length + trick.filter(c => c === "Q\u2660").length * 13;
		scores[winner] += points;
		if (window.addPoints && winner === 0) window.addPoints(10);
		logDiv.innerHTML += `<br>Trick won by ${winner === 0 ? 'You' : 'Bot'+winner} (+${points})`;
		trick = [];
		trickPlayers = [];
		currentPlayer = winner;
		if (hands[0].length === 0) {
			roundOver = true;
			logDiv.innerHTML += '<br>Round over!';
		}
		updateHeartsUI();
		if (!roundOver && currentPlayer !== 0) setTimeout(botPlay, 1000);
		return;
	}
	currentPlayer = (currentPlayer + 1) % 4;
	updateHeartsUI();
	if (currentPlayer !== 0) setTimeout(botPlay, 1000);
}

function botPlay() {
	if (roundOver) return;
	let hand = hands[currentPlayer];
	// Play first valid card
	let idx = hand.findIndex(isValidPlay);
	if (idx === -1) idx = 0;
	let card = hand[idx];
	trick.push(card);
	trickPlayers.push(currentPlayer);
	hand.splice(idx, 1);
	nextPlayer();
}

function heartsAction(action) {
	if (action === 'restart') heartsInit();
}

window.heartsAction = heartsAction;

heartsInit();
