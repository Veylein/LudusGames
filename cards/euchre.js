
console.log("Game loaded: euchre.js");

// Euchre - 4 players (1 human, 3 bots), trick-taking only (no bidding, no trump for simplicity)
const euchreRanks = ["9","10","J","Q","K","A"];
const euchreSuits = ["♠","♥","♦","♣"];

let euchreDeck = [];
let euchreHands = [[],[],[],[]]; // 0: player, 1-3: bots
let euchreScores = [0,0,0,0];
let euchreTrick = [];
let euchreTrickPlayers = [];
let euchreCurrentPlayer = 0;
let euchreRoundOver = false;

const euchrePlayerHandDiv = document.getElementById("player-hand");
const euchreBot1HandDiv = document.getElementById("bot1-hand");
const euchreBot2HandDiv = document.getElementById("bot2-hand");
const euchreBot3HandDiv = document.getElementById("bot3-hand");
const euchreTrickDiv = document.getElementById("trick");
const euchreLogDiv = document.getElementById("log");
const euchreScoreboard = document.getElementById("euchre-scoreboard");

function euchreInit() {
	euchreDeck = createEuchreDeck();
	shuffle(euchreDeck);
	euchreHands = [[],[],[],[]];
	for (let i = 0; i < 20; i++) {
		euchreHands[i%4].push(euchreDeck[i]);
	}
	euchreHands.forEach(h => h.sort(euchreSort));
	euchreScores = [0,0,0,0];
	euchreTrick = [];
	euchreTrickPlayers = [];
	euchreCurrentPlayer = 0;
	euchreRoundOver = false;
	updateEuchreUI();
	euchreLogDiv.innerHTML = "New round!";
	if (euchreCurrentPlayer !== 0) setTimeout(euchreBotPlay, 1000);
}

function createEuchreDeck() {
	let deck = [];
	for (let suit of euchreSuits) {
		for (let rank of euchreRanks) {
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

function euchreSort(a, b) {
	let sa = euchreSuits.indexOf(a.slice(-1));
	let sb = euchreSuits.indexOf(b.slice(-1));
	if (sa !== sb) return sa - sb;
	return euchreRanks.indexOf(a.slice(0, -1)) - euchreRanks.indexOf(b.slice(0, -1));
}

function updateEuchreUI() {
	// Player hand
	euchrePlayerHandDiv.innerHTML = "";
	euchreHands[0].forEach((card, idx) => {
		const div = document.createElement("div");
		div.className = `card show ${card.includes('♥') || card.includes('♦') ? 'red' : ''}`;
		div.textContent = card;
		div.onclick = () => euchrePlayCard(idx);
		euchrePlayerHandDiv.appendChild(div);
	});
	// Bots (show card count only)
	[euchreBot1HandDiv, euchreBot2HandDiv, euchreBot3HandDiv].forEach((div, i) => {
		div.innerHTML = "";
		for (let j = 0; j < euchreHands[i+1].length; j++) {
			let c = document.createElement("div");
			c.className = "card hidden";
			c.textContent = "?";
			div.appendChild(c);
		}
	});
	// Trick
	euchreTrickDiv.innerHTML = "";
	euchreTrick.forEach((card, i) => {
		let d = document.createElement("div");
		d.className = `card show ${card.includes('♥') || card.includes('♦') ? 'red' : ''}`;
		d.textContent = card;
		euchreTrickDiv.appendChild(d);
	});
	// Scoreboard
	euchreScoreboard.textContent = `You: ${euchreScores[0]} | Bot1: ${euchreScores[1]} | Bot2: ${euchreScores[2]} | Bot3: ${euchreScores[3]}`;
}

function euchrePlayCard(idx) {
	if (euchreCurrentPlayer !== 0 || euchreRoundOver) return;
	let card = euchreHands[0][idx];
	if (!euchreIsValidPlay(card)) {
		euchreLogDiv.innerHTML += '<br>Invalid play!';
		return;
	}
	euchreTrick.push(card);
	euchreTrickPlayers.push(0);
	euchreHands[0].splice(idx, 1);
	euchreNextPlayer();
}

function euchreIsValidPlay(card) {
	// Only basic rules: must follow suit if possible
	if (euchreTrick.length === 0) return true;
	let leadSuit = euchreTrick[0].slice(-1);
	if (card.slice(-1) === leadSuit) return true;
	return !euchreHands[0].some(c => c.slice(-1) === leadSuit);
}

function euchreNextPlayer() {
	if (euchreTrick.length === 4) {
		// Score trick
		let leadSuit = euchreTrick[0].slice(-1);
		let highest = 0;
		let highIdx = 0;
		for (let i = 0; i < 4; i++) {
			let c = euchreTrick[i];
			if (c.slice(-1) === leadSuit) {
				let val = euchreRanks.indexOf(c.slice(0, -1));
				if (val > highest) {
					highest = val;
					highIdx = i;
				}
			}
		}
		let winner = euchreTrickPlayers[highIdx];
		euchreScores[winner] += 1;
		if (window.addPoints && winner === 0) window.addPoints(10);
		euchreLogDiv.innerHTML += `<br>Trick won by ${winner === 0 ? 'You' : 'Bot'+winner}`;
		euchreTrick = [];
		euchreTrickPlayers = [];
		euchreCurrentPlayer = winner;
		if (euchreHands[0].length === 0) {
			euchreRoundOver = true;
			euchreLogDiv.innerHTML += '<br>Round over!';
		}
		updateEuchreUI();
		if (!euchreRoundOver && euchreCurrentPlayer !== 0) setTimeout(euchreBotPlay, 1000);
		return;
	}
	euchreCurrentPlayer = (euchreCurrentPlayer + 1) % 4;
	updateEuchreUI();
	if (euchreCurrentPlayer !== 0) setTimeout(euchreBotPlay, 1000);
}

function euchreBotPlay() {
	if (euchreRoundOver) return;
	let hand = euchreHands[euchreCurrentPlayer];
	// Play first valid card
	let idx = hand.findIndex(euchreIsValidPlay);
	if (idx === -1) idx = 0;
	let card = hand[idx];
	euchreTrick.push(card);
	euchreTrickPlayers.push(euchreCurrentPlayer);
	hand.splice(idx, 1);
	euchreNextPlayer();
}

function euchreAction(action) {
	if (action === 'restart') euchreInit();
}

window.euchreAction = euchreAction;

euchreInit();
