
console.log("Game loaded: snap.js");

// Snap - 2 players (1 human, 1 bot)
const snapRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const snapSuits = ["♠","♥","♦","♣"];

let snapDeck = [];
let snapHands = [[],[]]; // 0: player, 1: bot
let snapPile = [];
let snapScores = [0,0];
let snapCurrentPlayer = 0;
let snapGameOver = false;

const snapPlayerHandDiv = document.getElementById("player-hand");
const snapBotHandDiv = document.getElementById("bot-hand");
const snapPileDiv = document.getElementById("pile");
const snapLogDiv = document.getElementById("log");
const snapScoreboard = document.getElementById("snap-scoreboard");

function snapInit() {
	snapDeck = createSnapDeck();
	shuffle(snapDeck);
	snapHands = [snapDeck.slice(0,26), snapDeck.slice(26)];
	snapPile = [];
	snapScores = [0,0];
	snapCurrentPlayer = 0;
	snapGameOver = false;
	updateSnapUI();
	snapLogDiv.innerHTML = "New game!";
}

function createSnapDeck() {
	let deck = [];
	for (let suit of snapSuits) {
		for (let rank of snapRanks) {
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

function updateSnapUI() {
	// Player hand
	snapPlayerHandDiv.innerHTML = "";
	if (snapHands[0].length > 0) {
		let c = document.createElement("div");
		c.className = "card hidden";
		snapPlayerHandDiv.appendChild(c);
		let count = document.createElement("div");
		count.textContent = `x${snapHands[0].length}`;
		snapPlayerHandDiv.appendChild(count);
	} else {
		snapPlayerHandDiv.textContent = "Empty";
	}

	// Bot hand
	snapBotHandDiv.innerHTML = "";
	if (snapHands[1].length > 0) {
		let c = document.createElement("div");
		c.className = "card hidden";
		snapBotHandDiv.appendChild(c);
		let count = document.createElement("div");
		count.textContent = `x${snapHands[1].length}`;
		snapBotHandDiv.appendChild(count);
	} else {
		snapBotHandDiv.textContent = "Empty";
	}

	// Pile
	snapPileDiv.innerHTML = "";
	if (snapPile.length > 0) {
		let topCard = snapPile[snapPile.length - 1];
		let c = document.createElement("div");
		c.className = "card show";
		if (topCard.includes("♥") || topCard.includes("♦")) {
			c.classList.add("red");
		}
		c.textContent = topCard;
		snapPileDiv.appendChild(c);
	} else {
		snapPileDiv.textContent = "[Pile Empty]";
	}

	snapScoreboard.textContent = `You: ${snapScores[0]} | Bot: ${snapScores[1]}`;
}
	for (let i = 0; i < snapHands[0].length; i++) {
		let c = document.createElement("div");
		c.className = "card show";
		c.textContent = "🂠";
		snapPlayerHandDiv.appendChild(c);
	}
	// Bot hand
	snapBotHandDiv.innerHTML = "";
	for (let i = 0; i < snapHands[1].length; i++) {
		let c = document.createElement("div");
		c.className = "card show";
		c.textContent = "🂠";
		snapBotHandDiv.appendChild(c);
	}
	// Pile
	snapPileDiv.innerHTML = "";
	snapPile.forEach(card => {
		let d = document.createElement("div");
		d.className = "card show";
		d.textContent = card;
		snapPileDiv.appendChild(d);
	});
	// Scoreboard
	snapScoreboard.textContent = `You: ${snapScores[0]} | Bot: ${snapScores[1]}`;
}

function snapAction(action) {
	if (snapGameOver && action !== 'restart') return;
	if (action === 'play') {
		if (snapHands[snapCurrentPlayer].length === 0) return;
		let card = snapHands[snapCurrentPlayer].shift();
		snapPile.push(card);
		snapLogDiv.innerHTML += `<br>${snapCurrentPlayer === 0 ? 'You' : 'Bot'} played ${card}`;
		if (snapCurrentPlayer === 1) setTimeout(botSnapCheck, 500);
		snapCurrentPlayer = 1 - snapCurrentPlayer;
		updateSnapUI();
		snapCheckWin();
	} else if (action === 'snap') {
		if (snapPile.length < 2) return;
		let top = snapPile[snapPile.length-1];
		let prev = snapPile[snapPile.length-2];
		if (top.slice(0,-1) === prev.slice(0,-1)) {
			snapScores[0]++;
			snapLogDiv.innerHTML += '<br>You snapped!';
			snapPile = [];
		} else {
			snapLogDiv.innerHTML += '<br>False snap!';
		}
		updateSnapUI();
	} else if (action === 'restart') {
		snapInit();
	}
}

function botSnapCheck() {
	if (snapPile.length < 2) return;
	let top = snapPile[snapPile.length-1];
	let prev = snapPile[snapPile.length-2];
	if (top.slice(0,-1) === prev.slice(0,-1) && Math.random() < 0.7) {
		snapScores[1]++;
		snapLogDiv.innerHTML += '<br>Bot snapped!';
		snapPile = [];
		updateSnapUI();
	}
}

function snapCheckWin() {
	if (snapHands[0].length === 0 && snapHands[1].length === 0) {
		snapGameOver = true;
		let winner = snapScores[0] > snapScores[1] ? 'You' : (snapScores[0] < snapScores[1] ? 'Bot' : 'Tie');
		if (window.addPoints && winner === 'You') window.addPoints(100);
		snapLogDiv.innerHTML += `<br>Game over! Winner: ${winner}`;
		setTimeout(snapInit, 2000);
	}
}

window.snapAction = snapAction;

snapInit();
