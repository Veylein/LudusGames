
console.log("Game loaded: pinochle.js");

// Pinochle - 4 players (1 human, 3 bots), trick-taking only (no bidding, no melds for simplicity)
const pinochleRanks = ["9","J","Q","K","10","A"];
const pinochleSuits = ["♠","♥","♦","♣"];

let pinochleDeck = [];
let pinochleHands = [[],[],[],[]]; // 0: player, 1-3: bots
let pinochleScores = [0,0,0,0];
let pinochleTrick = [];
let pinochleTrickPlayers = [];
let pinochleCurrentPlayer = 0;
let pinochleRoundOver = false;

const pinochlePlayerHandDiv = document.getElementById("player-hand");
const pinochleBot1HandDiv = document.getElementById("bot1-hand");
const pinochleBot2HandDiv = document.getElementById("bot2-hand");
const pinochleBot3HandDiv = document.getElementById("bot3-hand");
const pinochleTrickDiv = document.getElementById("trick");
const pinochleLogDiv = document.getElementById("log");
const pinochleScoreboard = document.getElementById("pinochle-scoreboard");

function pinochleInit() {
	pinochleDeck = createPinochleDeck();
	shuffle(pinochleDeck);
	pinochleHands = [[],[],[],[]];
	for (let i = 0; i < 48; i++) {
		pinochleHands[i%4].push(pinochleDeck[i]);
	}
	pinochleHands.forEach(h => h.sort(pinochleSort));
	pinochleScores = [0,0,0,0];
	pinochleTrick = [];
	pinochleTrickPlayers = [];
	pinochleCurrentPlayer = 0;
	pinochleRoundOver = false;
	updatePinochleUI();
	pinochleLogDiv.innerHTML = "New round!";
	if (pinochleCurrentPlayer !== 0) setTimeout(pinochleBotPlay, 1000);
}

function createPinochleDeck() {
	let deck = [];
	for (let suit of pinochleSuits) {
		for (let rank of pinochleRanks) {
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

function pinochleSort(a, b) {
	let sa = pinochleSuits.indexOf(a.slice(-1));
	let sb = pinochleSuits.indexOf(b.slice(-1));
	if (sa !== sb) return sa - sb;
	return pinochleRanks.indexOf(a.slice(0, -1)) - pinochleRanks.indexOf(b.slice(0, -1));
}

function updatePinochleUI() {
	// Player hand
	pinochlePlayerHandDiv.innerHTML = "";
	pinochleHands[0].forEach((card, idx) => {
		const div = document.createElement("div");
		div.className = `card show ${card.includes('♥') || card.includes('♦') ? 'red' : ''}`;
		div.textContent = card;
		div.onclick = () => pinochlePlayCard(idx);
		pinochlePlayerHandDiv.appendChild(div);
	});
	// Bots (show card count only)
	[pinochleBot1HandDiv, pinochleBot2HandDiv, pinochleBot3HandDiv].forEach((div, i) => {
		div.innerHTML = "";
		for (let j = 0; j < pinochleHands[i+1].length; j++) {
			let c = document.createElement("div");
			c.className = "card hidden";
			c.textContent = "?";
			div.appendChild(c);
		}
	});
	// Trick
	pinochleTrickDiv.innerHTML = "";
	pinochleTrick.forEach((card, i) => {
		let d = document.createElement("div");
		d.className = `card show ${card.includes('♥') || card.includes('♦') ? 'red' : ''}`;
		d.textContent = card;
		pinochleTrickDiv.appendChild(d);
	});
	// Scoreboard
	pinochleScoreboard.textContent = `You: ${pinochleScores[0]} | Bot1: ${pinochleScores[1]} | Bot2: ${pinochleScores[2]} | Bot3: ${pinochleScores[3]}`;
}

function pinochlePlayCard(idx) {
	if (pinochleCurrentPlayer !== 0 || pinochleRoundOver) return;
	let card = pinochleHands[0][idx];
	if (!pinochleIsValidPlay(card)) {
		pinochleLogDiv.innerHTML += '<br>Invalid play!';
		return;
	}
	pinochleTrick.push(card);
	pinochleTrickPlayers.push(0);
	pinochleHands[0].splice(idx, 1);
	pinochleNextPlayer();
}

function pinochleIsValidPlay(card) {
	// Only basic rules: must follow suit if possible
	if (pinochleTrick.length === 0) return true;
	let leadSuit = pinochleTrick[0].slice(-1);
	if (card.slice(-1) === leadSuit) return true;
	return !pinochleHands[0].some(c => c.slice(-1) === leadSuit);
}

function pinochleNextPlayer() {
	if (pinochleTrick.length === 4) {
		// Score trick
		let leadSuit = pinochleTrick[0].slice(-1);
		let highest = 0;
		let highIdx = 0;
		for (let i = 0; i < 4; i++) {
			let c = pinochleTrick[i];
			if (c.slice(-1) === leadSuit) {
				let val = pinochleRanks.indexOf(c.slice(0, -1));
				if (val > highest) {
					highest = val;
					highIdx = i;
				}
			}
		}
		let winner = pinochleTrickPlayers[highIdx];
		pinochleScores[winner] += 1;
		if (window.addPoints && winner === 0) window.addPoints(10);
		pinochleLogDiv.innerHTML += `<br>Trick won by ${winner === 0 ? 'You' : 'Bot'+winner}`;
		pinochleTrick = [];
		pinochleTrickPlayers = [];
		pinochleCurrentPlayer = winner;
		if (pinochleHands[0].length === 0) {
			pinochleRoundOver = true;
			pinochleLogDiv.innerHTML += '<br>Round over!';
		}
		updatePinochleUI();
		if (!pinochleRoundOver && pinochleCurrentPlayer !== 0) setTimeout(pinochleBotPlay, 1000);
		return;
	}
	pinochleCurrentPlayer = (pinochleCurrentPlayer + 1) % 4;
	updatePinochleUI();
	if (pinochleCurrentPlayer !== 0) setTimeout(pinochleBotPlay, 1000);
}

function pinochleBotPlay() {
	if (pinochleRoundOver) return;
	let hand = pinochleHands[pinochleCurrentPlayer];
	// Play first valid card
	let idx = hand.findIndex(pinochleIsValidPlay);
	if (idx === -1) idx = 0;
	let card = hand[idx];
	pinochleTrick.push(card);
	pinochleTrickPlayers.push(pinochleCurrentPlayer);
	hand.splice(idx, 1);
	pinochleNextPlayer();
}

function pinochleAction(action) {
	if (action === 'restart') pinochleInit();
}

window.pinochleAction = pinochleAction;

pinochleInit();
