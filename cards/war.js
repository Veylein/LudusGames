
// War - 2 players (1 human, 1 bot)
const warRanks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const warSuits = ["♠","♥","♦","♣"];

let warDeck = [];
let warHands = [[],[]]; // 0: player, 1: bot
let warBattlefield = [];
let warGameOver = false;

const warPlayerHandDiv = document.getElementById("player-hand");
const warBotHandDiv = document.getElementById("bot-hand");
const warBattlefieldDiv = document.getElementById("battlefield");
const warLogDiv = document.getElementById("log");
const warScoreboard = document.getElementById("war-scoreboard");

function warInit() {
	warDeck = createWarDeck();
	shuffle(warDeck);
	warHands = [warDeck.slice(0,26), warDeck.slice(26)];
	warBattlefield = [];
	warGameOver = false;
	updateWarUI();
	warLogDiv.innerHTML = "New game!";
}

function createWarDeck() {
	let deck = [];
	for (let suit of warSuits) {
		for (let rank of warRanks) {
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

function updateWarUI() {
	// Player hand
	warPlayerHandDiv.innerHTML = "";
	for (let i = 0; i < warHands[0].length; i++) {
		let c = document.createElement("div");
		c.className = "card show";
		c.textContent = "🂠";
		warPlayerHandDiv.appendChild(c);
	}
	// Bot hand
	warBotHandDiv.innerHTML = "";
	for (let i = 0; i < warHands[1].length; i++) {
		let c = document.createElement("div");
		c.className = "card show";
		c.textContent = "🂠";
		warBotHandDiv.appendChild(c);
	}
	// Battlefield
	warBattlefieldDiv.innerHTML = "";
	warBattlefield.forEach(card => {
		let d = document.createElement("div");
		d.className = "card show";
		d.textContent = card;
		warBattlefieldDiv.appendChild(d);
	});
	// Scoreboard
	warScoreboard.textContent = `You: ${warHands[0].length} | Bot: ${warHands[1].length}`;
}

function warAction(action) {
	if (warGameOver && action !== 'restart') return;
	if (action === 'play') {
		if (warHands[0].length === 0 || warHands[1].length === 0) return;
		let playerCard = warHands[0].shift();
		let botCard = warHands[1].shift();
		warBattlefield = [playerCard, botCard];
		let pVal = warRanks.indexOf(playerCard.slice(0,-1));
		let bVal = warRanks.indexOf(botCard.slice(0,-1));
		if (pVal > bVal) {
			warHands[0].push(playerCard, botCard);
			warLogDiv.innerHTML += `<br>You win the round!`;
		} else if (bVal > pVal) {
			warHands[1].push(playerCard, botCard);
			warLogDiv.innerHTML += `<br>Bot wins the round!`;
		} else {
			warLogDiv.innerHTML += `<br>War!`;
			warWar([playerCard, botCard]);
		}
		updateWarUI();
		warCheckWin();
	} else if (action === 'restart') {
		warInit();
	}
}

function warWar(pile) {
	// Each player puts 3 cards face down, 1 face up
	let pWar = [pile[0]];
	let bWar = [pile[1]];
	for (let i = 0; i < 3; i++) {
		if (warHands[0].length) pWar.push(warHands[0].shift());
		if (warHands[1].length) bWar.push(warHands[1].shift());
	}
	let pUp = warHands[0].shift();
	let bUp = warHands[1].shift();
	if (pUp) pWar.push(pUp);
	if (bUp) bWar.push(bUp);
	warBattlefield = [...pWar, ...bWar];
	let pVal = pUp ? warRanks.indexOf(pUp.slice(0,-1)) : -1;
	let bVal = bUp ? warRanks.indexOf(bUp.slice(0,-1)) : -1;
	if (pVal > bVal) {
		warHands[0].push(...warBattlefield);
		warLogDiv.innerHTML += `<br>You win the war!`;
	} else if (bVal > pVal) {
		warHands[1].push(...warBattlefield);
		warLogDiv.innerHTML += `<br>Bot wins the war!`;
	} else {
		warLogDiv.innerHTML += `<br>Another war!`;
		if (warHands[0].length && warHands[1].length) warWar([]);
	}
}

function warCheckWin() {
	if (warHands[0].length === 0) {
		warGameOver = true;
		warLogDiv.innerHTML += `<br>Bot wins the game!`;
		setTimeout(warInit, 2000);
	} else if (warHands[1].length === 0) {
		warGameOver = true;
		warLogDiv.innerHTML += `<br>You win the game!`;
		setTimeout(warInit, 2000);
	}
}

window.warAction = warAction;

warInit();
