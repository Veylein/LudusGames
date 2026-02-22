
console.log("Game loaded: president.js");

// President - 2 players (1 human, 1 bot), basic play/pass
const presRanks = ["3","4","5","6","7","8","9","10","J","Q","K","A","2"];
const presSuits = ["♠","♥","♦","♣"];

let presDeck = [];
let presHands = [[],[]]; // 0: player, 1: bot
let presPile = [];
let presScores = [0,0];
let presCurrentPlayer = 0;
let presSelected = [];
let presGameOver = false;

const presPlayerHandDiv = document.getElementById("player-hand");
const presBotHandDiv = document.getElementById("bot-hand");
const presPileDiv = document.getElementById("president-pile");
const presLogDiv = document.getElementById("log");
const presScoreboard = document.getElementById("president-scoreboard");

function presidentInit() {
	presDeck = createPresDeck();
	shuffle(presDeck);
	presHands = [[],[]];
	for (let i = 0; i < 26; i++) presHands[i%2].push(presDeck.pop());
	presPile = [];
	presScores = [0,0];
	presCurrentPlayer = 0;
	presSelected = [];
	presGameOver = false;
	updatePresUI();
	presLogDiv.innerHTML = "New game! Play a card to start.";
}

function createPresDeck() {
	let deck = [];
	for (let suit of presSuits) {
		for (let rank of presRanks) {
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

function updatePresUI() {
	// Player hand
	presPlayerHandDiv.innerHTML = "";
	presHands[0].forEach((card, idx) => {
		const div = document.createElement("div");
		div.className = `card show ${card.includes('♥') || card.includes('♦') ? 'red' : ''}` + (presSelected.includes(idx) ? " selected" : "");
		div.textContent = card;
		div.onclick = () => presSelectCard(idx);
		presPlayerHandDiv.appendChild(div);
	});
	// Bot hand (show card count only)
	presBotHandDiv.innerHTML = "";
	for (let j = 0; j < presHands[1].length; j++) {
		let c = document.createElement("div");
		c.className = "card hidden";
		c.textContent = "?";
		presBotHandDiv.appendChild(c);
	}
	// Pile
	let pileContent = "";
	if (presPile.length) {
		let card = presPile[presPile.length-1];
		pileContent = `<div class='card show ${card.includes('♥') || card.includes('♦') ? 'red' : ''}'>${card}</div>`;
	}
	presPileDiv.innerHTML = pileContent;
	// Scoreboard
	presScoreboard.textContent = `You: ${presScores[0]} | Bot: ${presScores[1]}`;
}

function presSelectCard(idx) {
	if (presCurrentPlayer !== 0 || presGameOver) return;
	if (presSelected.includes(idx)) {
		presSelected = presSelected.filter(i => i !== idx);
	} else {
		presSelected.push(idx);
	}
	updatePresUI();
}

function presidentAction(action) {
	if (presGameOver) return;
	if (action === 'restart') return presidentInit();
	if (presCurrentPlayer !== 0) return;
	if (action === 'play') {
		if (presSelected.length === 0) return;
		let cards = presSelected.map(i => presHands[0][i]);
		if (!presValidPlay(cards)) {
			presLogDiv.innerHTML += `<br>Invalid play.`;
			return;
		}
		for (let i of presSelected.sort((a,b)=>b-a)) presHands[0].splice(i,1);
		presPile = presPile.concat(cards);
		presSelected = [];
		presCheckWin();
		presCurrentPlayer = 1;
		updatePresUI();
		setTimeout(presBotTurn, 900);
	} else if (action === 'pass') {
		presLogDiv.innerHTML += `<br>You passed.`;
		presCurrentPlayer = 1;
		updatePresUI();
		setTimeout(presBotTurn, 900);
	}
}

function presValidPlay(cards) {
	if (cards.length === 0) return false;
	// All cards must be same rank
	let rank = cards[0].slice(0,-1);
	if (!cards.every(c => c.slice(0,-1) === rank)) return false;
	// Must beat last pile card (if any)
	if (presPile.length) {
		let last = presPile[presPile.length-1];
		let lastRank = last.slice(0,-1);
		if (presRanks.indexOf(rank) <= presRanks.indexOf(lastRank)) return false;
		if (cards.length !== 1) return false; // Only allow singles for demo
	}
	return true;
}

function presBotTurn() {
	if (presGameOver) return;
	// Bot tries to play a valid card
	let hand = presHands[1];
	let playIdx = -1;
	for (let i = 0; i < hand.length; i++) {
		if (presPile.length === 0 || presRanks.indexOf(hand[i].slice(0,-1)) > presRanks.indexOf(presPile[presPile.length-1].slice(0,-1))) {
			playIdx = i; break;
		}
	}
	if (playIdx !== -1) {
		let card = hand[playIdx];
		hand.splice(playIdx,1);
		presPile.push(card);
		presLogDiv.innerHTML += `<br>Bot played ${card}.`;
	} else {
		presLogDiv.innerHTML += `<br>Bot passed.`;
	}
	presCheckWin();
	presCurrentPlayer = 0;
	updatePresUI();
}

function presCheckWin() {
	if (presHands[0].length === 0 || presHands[1].length === 0) {
		presGameOver = true;
		let winner = presHands[0].length === 0 ? 'You' : 'Bot';
		if (winner === 'You') presScores[0]++;
		else presScores[1]++;
		if (window.addPoints && winner === 'You') window.addPoints(100);
		presLogDiv.innerHTML += `<br>Game over! Winner: ${winner}`;
		setTimeout(presidentInit, 2000);
	}
}

window.presidentAction = presidentAction;

presidentInit();
