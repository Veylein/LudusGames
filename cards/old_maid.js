
console.log("Game loaded: old_maid.js");

// Old Maid - 3 players (1 human, 2 bots)
const omRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const omSuits = ["\u2660","\u2665","\u2666","\u2663"];

let omDeck = [];
let omHands = [[],[],[]]; // 0: player, 1-2: bots
let omScores = [0,0,0];
let omCurrentPlayer = 0;
let omGameOver = false;

const omPlayerHandDiv = document.getElementById("player-hand");
const omBot1HandDiv = document.getElementById("bot1-hand");
const omBot2HandDiv = document.getElementById("bot2-hand");
const omLogDiv = document.getElementById("log");
const omScoreboard = document.getElementById("old-maid-scoreboard");

function oldMaidInit() {
	omDeck = createOmDeck();
	shuffle(omDeck);
	omHands = [[],[],[]];
	for (let i = 0; i < omDeck.length; i++) omHands[i%3].push(omDeck[i]);
	omHands = omHands.map(removePairs);
	omScores = [0,0,0];
	omCurrentPlayer = 0;
	omGameOver = false;
	updateOmUI();
	omLogDiv.innerHTML = "New game!";
	if (omCurrentPlayer !== 0) setTimeout(omBotPlay, 1000);
}

function createOmDeck() {
	let deck = [];
	for (let suit of omSuits) {
		for (let rank of omRanks) {
			deck.push(rank + suit);
		}
	}
	deck.pop(); // Remove one card for Old Maid
	return deck;
}

function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

function removePairs(hand) {
	let counts = {};
	hand.forEach(card => {
		let rank = card.slice(0,-1);
		counts[rank] = (counts[rank] || 0) + 1;
	});
	let newHand = [];
	let used = {};
	hand.forEach(card => {
		let rank = card.slice(0,-1);
		if (counts[rank] % 2 === 1 && !used[card]) {
			newHand.push(card);
			used[card] = true;
		} else if (counts[rank] % 2 === 0 && !used[card]) {
			used[card] = true;
			let found = false;
			for (let i = 0; i < newHand.length; i++) {
				if (newHand[i].slice(0,-1) === rank) {
					newHand.splice(i, 1);
					found = true;
					break;
				}
			}
			if (!found) newHand.push(card);
		}
	});
	return newHand;
}

function updateOmUI() {
	// Player hand
	omPlayerHandDiv.innerHTML = "";
	omHands[0].forEach((card, idx) => {
		const div = document.createElement("div");
		div.className = `card show ${card.includes('\u2665') || card.includes('\u2666') ? 'red' : ''}`;
		div.textContent = card;
		// In Old Maid, you generally don't click your own cards to play, 
		// but maybe to see them. The game logic `omPickCard` seems to pick from *next* player?
		// "div.onclick = () => omPickCard(idx);" -- wait, the original code had this.
		// Looking at omPickCard logic: it ignores idx and picks random from next bot.
		// So clicking any card triggers picking from bot.
		div.onclick = () => omPickCard(idx);
		omPlayerHandDiv.appendChild(div);
	});
	// Bots (show card count only)
	[omBot1HandDiv, omBot2HandDiv].forEach((div, i) => {
		div.innerHTML = "";
		for (let j = 0; j < omHands[i+1].length; j++) {
			let c = document.createElement("div");
			c.className = "card hidden";
			c.textContent = "?";
			div.appendChild(c);
		}
	});
	// Scoreboard
	omScoreboard.textContent = `You: ${omScores[0]} | Bot1: ${omScores[1]} | Bot2: ${omScores[2]}`;
}

function omPickCard(idx) {
	if (omCurrentPlayer !== 0 || omGameOver) return;
	// Pick a random card from next bot
	let next = 1;
	if (omHands[next].length === 0) next = 2;
	if (omHands[next].length === 0) return;
	let pickIdx = Math.floor(Math.random() * omHands[next].length);
	let card = omHands[next][pickIdx];
	omHands[next].splice(pickIdx, 1);
	omHands[0].push(card);
	omHands[0] = removePairs(omHands[0]);
	omCheckWin();
	omNextPlayer();
}

function omNextPlayer() {
	updateOmUI();
	omCurrentPlayer = (omCurrentPlayer + 1) % 3;
	if (omCurrentPlayer !== 0 && !omGameOver) setTimeout(omBotPlay, 1000);
}

function omBotPlay() {
	if (omGameOver) return;
	let next = (omCurrentPlayer + 1) % 3;
	if (omHands[next].length === 0) next = (omCurrentPlayer + 2) % 3;
	if (omHands[next].length === 0) return;
	let pickIdx = Math.floor(Math.random() * omHands[next].length);
	let card = omHands[next][pickIdx];
	omHands[next].splice(pickIdx, 1);
	omHands[omCurrentPlayer].push(card);
	omHands[omCurrentPlayer] = removePairs(omHands[omCurrentPlayer]);
	omCheckWin();
	setTimeout(omNextPlayer, 800);
}

function omCheckWin() {
	for (let i = 0; i < 3; i++) {
		if (omHands[i].length === 0 && omScores[i] === 0) {
			omScores[i] = 1;
			if (window.addPoints && i === 0) window.addPoints(100);
			omLogDiv.innerHTML += `<br>${i === 0 ? 'You' : 'Bot'+i} is out!`;
		}
	}
	let left = omHands.filter(h => h.length > 0).length;
	if (left === 1) {
		omGameOver = true;
		let loser = omHands.findIndex(h => h.length > 0);
		omLogDiv.innerHTML += `<br>${loser === 0 ? 'You' : 'Bot'+loser} is the Old Maid!`;
		setTimeout(oldMaidInit, 2000);
	}
}

function oldMaidAction(action) {
	if (action === 'restart') oldMaidInit();
}

window.oldMaidAction = oldMaidAction;

oldMaidInit();
