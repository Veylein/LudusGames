
console.log("Game loaded: slapjack.js");

// Slapjack - 2 players (1 human, 1 bot)
const sjRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const sjSuits = ["\u2660","\u2665","\u2666","\u2663"];

let sjDeck = [];
let sjHands = [[],[]]; // 0: player, 1: bot
let sjPile = [];
let sjScores = [0,0];
let sjCurrentPlayer = 0;
let sjGameOver = false;

const sjPlayerHandDiv = document.getElementById("player-hand");
const sjBotHandDiv = document.getElementById("bot-hand");
const sjPileDiv = document.getElementById("pile");
const sjLogDiv = document.getElementById("log");
const sjScoreboard = document.getElementById("slapjack-scoreboard");

function slapjackInit() {
	sjDeck = createSjDeck();
	shuffle(sjDeck);
	sjHands = [sjDeck.slice(0,26), sjDeck.slice(26)];
	sjPile = [];
	sjScores = [0,0];
	sjCurrentPlayer = 0;
	sjGameOver = false;
	updateSjUI();
	sjLogDiv.innerHTML = "New game!";
}

function createSjDeck() {
	let deck = [];
	for (let suit of sjSuits) {
		for (let rank of sjRanks) {
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

function updateSjUI() {
	// Player hand
	sjPlayerHandDiv.innerHTML = "";
	// Just show a stack representation
	if (sjHands[0].length > 0) {
		let c = document.createElement("div");
		c.className = "card hidden";
		// c.textContent = "🂠";
		sjPlayerHandDiv.appendChild(c);
		let count = document.createElement("div");
		count.textContent = `x${sjHands[0].length}`;
		sjPlayerHandDiv.appendChild(count);
	} else {
		sjPlayerHandDiv.textContent = "Empty";
	}

	// Bot hand
	sjBotHandDiv.innerHTML = "";
	if (sjHands[1].length > 0) {
		let c = document.createElement("div");
		c.className = "card hidden";
		// c.textContent = "🂠";
		sjBotHandDiv.appendChild(c);
		let count = document.createElement("div");
		count.textContent = `x${sjHands[1].length}`;
		sjBotHandDiv.appendChild(count);
	} else {
		sjBotHandDiv.textContent = "Empty";
	}

	// Pile
	sjPileDiv.innerHTML = "";
	if (sjPile.length > 0) {
		let topCard = sjPile[sjPile.length - 1];
		let c = document.createElement("div");
		c.className = "card show";
		if (topCard.includes("\u2665") || topCard.includes("\u2666")) {
			c.classList.add("red");
		}
		c.textContent = topCard;
		sjPileDiv.appendChild(c);
	} else {
		sjPileDiv.textContent = "[Pile Empty]";
	}

	sjScoreboard.textContent = `You: ${sjScores[0]} | Bot: ${sjScores[1]}`;
}
	for (let i = 0; i < sjHands[0].length; i++) {
		let c = document.createElement("div");
		c.className = "card show";
		c.textContent = "🂠";
		sjPlayerHandDiv.appendChild(c);
	}
	// Bot hand
	sjBotHandDiv.innerHTML = "";
	for (let i = 0; i < sjHands[1].length; i++) {
		let c = document.createElement("div");
		c.className = "card show";
		c.textContent = "🂠";
		sjBotHandDiv.appendChild(c);
	}
	// Pile
	sjPileDiv.innerHTML = "";
	sjPile.forEach(card => {
		let d = document.createElement("div");
		d.className = "card show";
		d.textContent = card;
		sjPileDiv.appendChild(d);
	});
	// Scoreboard
	sjScoreboard.textContent = `You: ${sjScores[0]} | Bot: ${sjScores[1]}`;
}

function slapjackAction(action) {
	if (sjGameOver && action !== 'restart') return;
	if (action === 'play') {
		if (sjHands[sjCurrentPlayer].length === 0) return;
		let card = sjHands[sjCurrentPlayer].shift();
		sjPile.push(card);
		sjLogDiv.innerHTML += `<br>${sjCurrentPlayer === 0 ? 'You' : 'Bot'} played ${card}`;
		if (sjCurrentPlayer === 1) setTimeout(botSlapjackCheck, 500);
		sjCurrentPlayer = 1 - sjCurrentPlayer;
		updateSjUI();
		sjCheckWin();
	} else if (action === 'slap') {
		if (sjPile.length === 0) return;
		let top = sjPile[sjPile.length-1];
		if (top.slice(0,-1) === "J") {
			sjScores[0]++;
			sjLogDiv.innerHTML += '<br>You slapped a Jack!';
			sjPile = [];
		} else {
			sjLogDiv.innerHTML += '<br>False slap!';
		}
		updateSjUI();
	} else if (action === 'restart') {
		slapjackInit();
	}
}

function botSlapjackCheck() {
	if (sjPile.length === 0) return;
	let top = sjPile[sjPile.length-1];
	if (top.slice(0,-1) === "J" && Math.random() < 0.7) {
		sjScores[1]++;
		sjLogDiv.innerHTML += '<br>Bot slapped a Jack!';
		sjPile = [];
		updateSjUI();
	}
}

function sjCheckWin() {
	if (sjHands[0].length === 0 && sjHands[1].length === 0) {
		sjGameOver = true;
		let winner = sjScores[0] > sjScores[1] ? 'You' : (sjScores[0] < sjScores[1] ? 'Bot' : 'Tie');
		if (window.addPoints && winner === 'You') window.addPoints(100);
		sjLogDiv.innerHTML += `<br>Game over! Winner: ${winner}`;
		setTimeout(slapjackInit, 2000);
	}
}

window.slapjackAction = slapjackAction;

slapjackInit();
