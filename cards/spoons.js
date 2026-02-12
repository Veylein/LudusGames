
// Spoons - 2 players (1 human, 1 bot), basic pass/grab, first to grab spoon wins
const spoonsRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const spoonsSuits = ["♠","♥","♦","♣"];

let spoonsDeck = [];
let spoonsHands = [[],[]]; // 0: player, 1: bot
let spoonsPile = [];
let spoonsSpoons = 1;
let spoonsScores = [0,0];
let spoonsCurrentPlayer = 0;
let spoonsGameOver = false;
let spoonsGrabbed = [false, false];

const spoonsPlayerHandDiv = document.getElementById("player-hand");
const spoonsBotHandDiv = document.getElementById("bot-hand");
const spoonsPileDiv = document.getElementById("spoons-pile");
const spoonsSpoonsDiv = document.getElementById("spoons-spoons");
const spoonsLogDiv = document.getElementById("log");
const spoonsScoreboard = document.getElementById("spoons-scoreboard");

function spoonsInit() {
	spoonsDeck = createSpoonsDeck();
	shuffle(spoonsDeck);
	spoonsHands = [[],[]];
	for (let i = 0; i < 8; i++) spoonsHands[i%2].push(spoonsDeck.pop());
	spoonsPile = [];
	spoonsSpoons = 1;
	spoonsScores = [0,0];
	spoonsCurrentPlayer = 0;
	spoonsGameOver = false;
	spoonsGrabbed = [false, false];
	updateSpoonsUI();
	spoonsLogDiv.innerHTML = "New game! Pass cards and grab the spoon when you have 4 of a kind.";
}

function createSpoonsDeck() {
	let deck = [];
	for (let suit of spoonsSuits) {
		for (let rank of spoonsRanks) {
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

function updateSpoonsUI() {
	// Player hand
	spoonsPlayerHandDiv.innerHTML = "";
	spoonsHands[0].forEach((card, idx) => {
		const div = document.createElement("div");
		div.className = "card show";
		div.textContent = card;
		div.onclick = () => spoonsSelectCard(idx);
		spoonsPlayerHandDiv.appendChild(div);
	});
	// Bot hand (show card count only)
	spoonsBotHandDiv.innerHTML = "";
	for (let j = 0; j < spoonsHands[1].length; j++) {
		let c = document.createElement("div");
		c.className = "card show";
		c.textContent = "?";
		spoonsBotHandDiv.appendChild(c);
	}
	// Pile
	spoonsPileDiv.innerHTML = spoonsPile.length ? `<div class='card show'>${spoonsPile[spoonsPile.length-1]}</div>` : "";
	// Spoons
	spoonsSpoonsDiv.innerHTML = '';
	for (let i = 0; i < spoonsSpoons; i++) {
		let s = document.createElement("div");
		s.className = "spoon";
		s.textContent = "🥄";
		spoonsSpoonsDiv.appendChild(s);
	}
	// Scoreboard
	spoonsScoreboard.textContent = `You: ${spoonsScores[0]} | Bot: ${spoonsScores[1]}`;
}

function spoonsSelectCard(idx) {
	if (spoonsCurrentPlayer !== 0 || spoonsGameOver) return;
	// Pass selected card to pile
	let card = spoonsHands[0][idx];
	spoonsHands[0].splice(idx, 1);
	spoonsPile.push(card);
	spoonsHands[0].push(spoonsDeck.pop());
	spoonsCurrentPlayer = 1;
	updateSpoonsUI();
	setTimeout(spoonsBotTurn, 900);
}

function spoonsAction(action) {
	if (spoonsGameOver) return;
	if (action === 'restart') return spoonsInit();
	if (action === 'pass' && spoonsCurrentPlayer === 0) {
		// Pass first card
		spoonsSelectCard(0);
	}
	if (action === 'grab' && !spoonsGrabbed[0]) {
		spoonsGrabbed[0] = true;
		spoonsCheckGrab();
	}
}

function spoonsBotTurn() {
	if (spoonsGameOver) return;
	// Bot passes random card
	let idx = Math.floor(Math.random() * spoonsHands[1].length);
	let card = spoonsHands[1][idx];
	spoonsHands[1].splice(idx, 1);
	spoonsPile.push(card);
	spoonsHands[1].push(spoonsDeck.pop());
	// Bot checks for 4 of a kind
	let botHas4 = spoonsHasFourOfAKind(spoonsHands[1]);
	if (botHas4 && !spoonsGrabbed[1]) {
		spoonsGrabbed[1] = true;
		spoonsCheckGrab();
	}
	spoonsCurrentPlayer = 0;
	updateSpoonsUI();
}

function spoonsHasFourOfAKind(hand) {
	let counts = {};
	for (let card of hand) {
		let rank = card.slice(0,-1);
		counts[rank] = (counts[rank]||0)+1;
		if (counts[rank] === 4) return true;
	}
	return false;
}

function spoonsCheckGrab() {
	if (spoonsGrabbed[0] && !spoonsGrabbed[1]) {
		spoonsGameOver = true;
		spoonsScores[0]++;
		spoonsLogDiv.innerHTML += `<br>You grabbed the spoon! You win!`;
		setTimeout(spoonsInit, 2000);
	} else if (spoonsGrabbed[1] && !spoonsGrabbed[0]) {
		spoonsGameOver = true;
		spoonsScores[1]++;
		spoonsLogDiv.innerHTML += `<br>Bot grabbed the spoon! Bot wins!`;
		setTimeout(spoonsInit, 2000);
	} else if (spoonsGrabbed[0] && spoonsGrabbed[1]) {
		spoonsGameOver = true;
		spoonsLogDiv.innerHTML += `<br>Both grabbed at once! Tie!`;
		setTimeout(spoonsInit, 2000);
	}
}

window.spoonsAction = spoonsAction;

spoonsInit();
