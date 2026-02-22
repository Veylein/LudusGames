
console.log("Game loaded: bridge.js");

// Bridge - 4 players (1 human, 3 bots), trick-taking only (no bidding)
const bridgeRanks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const bridgeSuits = ["\u2660","\u2665","\u2666","\u2663"];

let bridgeDeck = [];
let bridgeHands = [[],[],[],[]]; // 0: player, 1-3: bots
let bridgeScores = [0,0,0,0];
let bridgeTrick = [];
let bridgeTrickPlayers = [];
let bridgeCurrentPlayer = 0;
let bridgeRoundOver = false;

const bridgePlayerHandDiv = document.getElementById("player-hand");
const bridgeBot1HandDiv = document.getElementById("bot1-hand");
const bridgeBot2HandDiv = document.getElementById("bot2-hand");
const bridgeBot3HandDiv = document.getElementById("bot3-hand");
const bridgeTrickDiv = document.getElementById("trick");
const bridgeLogDiv = document.getElementById("log");
const bridgeScoreboard = document.getElementById("bridge-scoreboard");

function bridgeInit() {
	bridgeDeck = createBridgeDeck();
	shuffle(bridgeDeck);
	bridgeHands = [[],[],[],[]];
	for (let i = 0; i < 52; i++) {
		bridgeHands[i%4].push(bridgeDeck[i]);
	}
	bridgeHands.forEach(h => h.sort(bridgeSort));
	bridgeScores = [0,0,0,0];
	bridgeTrick = [];
	bridgeTrickPlayers = [];
	bridgeCurrentPlayer = 0;
	bridgeRoundOver = false;
	updateBridgeUI();
	bridgeLogDiv.innerHTML = "New round!";
	if (bridgeCurrentPlayer !== 0) setTimeout(bridgeBotPlay, 1000);
}

function createBridgeDeck() {
	let deck = [];
	for (let suit of bridgeSuits) {
		for (let rank of bridgeRanks) {
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

function bridgeSort(a, b) {
	let sa = bridgeSuits.indexOf(a.slice(-1));
	let sb = bridgeSuits.indexOf(b.slice(-1));
	if (sa !== sb) return sa - sb;
	return bridgeRanks.indexOf(a.slice(0, -1)) - bridgeRanks.indexOf(b.slice(0, -1));
}

function updateBridgeUI() {
	// Player hand
	bridgePlayerHandDiv.innerHTML = "";
	bridgeHands[0].forEach((card, idx) => {
		const div = document.createElement("div");
		div.className = `card show ${card.includes('\u2665') || card.includes('\u2666') ? 'red' : ''}`;
		div.textContent = card;
		div.onclick = () => bridgePlayCard(idx);
		bridgePlayerHandDiv.appendChild(div);
	});
	// Bots (show card count only)
	[bridgeBot1HandDiv, bridgeBot2HandDiv, bridgeBot3HandDiv].forEach((div, i) => {
		div.innerHTML = "";
		for (let j = 0; j < bridgeHands[i+1].length; j++) {
			let c = document.createElement("div");
			c.className = "card hidden";
			c.textContent = "?";
			div.appendChild(c);
		}
	});
	// Trick
	bridgeTrickDiv.innerHTML = "";
	bridgeTrick.forEach((card, i) => {
		let d = document.createElement("div");
		d.className = `card show ${card.includes('\u2665') || card.includes('\u2666') ? 'red' : ''}`;
		d.textContent = card;
		bridgeTrickDiv.appendChild(d);
	});
	// Scoreboard
	bridgeScoreboard.textContent = `You: ${bridgeScores[0]} | Bot1: ${bridgeScores[1]} | Bot2: ${bridgeScores[2]} | Bot3: ${bridgeScores[3]}`;
}

function bridgePlayCard(idx) {
	if (bridgeCurrentPlayer !== 0 || bridgeRoundOver) return;
	let card = bridgeHands[0][idx];
	if (!bridgeIsValidPlay(card)) {
		bridgeLogDiv.innerHTML += '<br>Invalid play!';
		return;
	}
	bridgeTrick.push(card);
	bridgeTrickPlayers.push(0);
	bridgeHands[0].splice(idx, 1);
	bridgeNextPlayer();
}

function bridgeIsValidPlay(card) {
	// Only basic rules: must follow suit if possible
	if (bridgeTrick.length === 0) return true;
	let leadSuit = bridgeTrick[0].slice(-1);
	if (card.slice(-1) === leadSuit) return true;
	return !bridgeHands[0].some(c => c.slice(-1) === leadSuit);
}

function bridgeNextPlayer() {
	if (bridgeTrick.length === 4) {
		// Score trick
		let leadSuit = bridgeTrick[0].slice(-1);
		let highest = 0;
		let highIdx = 0;
		for (let i = 0; i < 4; i++) {
			let c = bridgeTrick[i];
			if (c.slice(-1) === leadSuit) {
				let val = bridgeRanks.indexOf(c.slice(0, -1));
				if (val > highest) {
					highest = val;
					highIdx = i;
				}
			}
		}
		let winner = bridgeTrickPlayers[highIdx];
		bridgeScores[winner] += 1;
		if (window.addPoints && winner === 0) window.addPoints(10);
		bridgeLogDiv.innerHTML += `<br>Trick won by ${winner === 0 ? 'You' : 'Bot'+winner}`;
		bridgeTrick = [];
		bridgeTrickPlayers = [];
		bridgeCurrentPlayer = winner;
		if (bridgeHands[0].length === 0) {
			bridgeRoundOver = true;
			bridgeLogDiv.innerHTML += '<br>Round over!';
		}
		updateBridgeUI();
		if (!bridgeRoundOver && bridgeCurrentPlayer !== 0) setTimeout(bridgeBotPlay, 1000);
		return;
	}
	bridgeCurrentPlayer = (bridgeCurrentPlayer + 1) % 4;
	updateBridgeUI();
	if (bridgeCurrentPlayer !== 0) setTimeout(bridgeBotPlay, 1000);
}

function bridgeBotPlay() {
	if (bridgeRoundOver) return;
	let hand = bridgeHands[bridgeCurrentPlayer];
	// Play first valid card
	let idx = hand.findIndex(bridgeIsValidPlay);
	if (idx === -1) idx = 0;
	let card = hand[idx];
	bridgeTrick.push(card);
	bridgeTrickPlayers.push(bridgeCurrentPlayer);
	hand.splice(idx, 1);
	bridgeNextPlayer();
}

function bridgeAction(action) {
	if (action === 'restart') bridgeInit();
}

window.bridgeAction = bridgeAction;

bridgeInit();
