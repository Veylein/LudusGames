const bjRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const bjSuits = ["♠","♥","♦","♣"];

let bjDeck = [];
let playerHand = [];
let dealerHand = [];
let playerScore = 0;
let dealerScore = 0;
let gameOver = false;
let playerStands = false;

const playerHandDiv = document.getElementById("player-hand");
const dealerHandDiv = document.getElementById("dealer-hand");
const logDiv = document.getElementById("log");
const scoreboard = document.getElementById("blackjack-scoreboard");

function bjInit() {
	bjDeck = createBJDeck();
	shuffle(bjDeck);
	playerHand = [bjDeck.pop(), bjDeck.pop()];
	dealerHand = [bjDeck.pop(), bjDeck.pop()];
	gameOver = false;
	playerStands = false;
	updateBJUI();
	logDiv.innerHTML = "New hand!";
}

function createBJDeck() {
	let deck = [];
	for (let suit of bjSuits) {
		for (let rank of bjRanks) {
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

function updateBJUI() {
	// Player hand
	playerHandDiv.innerHTML = "";
	playerHand.forEach(card => {
		const div = document.createElement("div");
		div.className = "card show";
		div.textContent = card;
		playerHandDiv.appendChild(div);
	});
	// Dealer hand
	dealerHandDiv.innerHTML = "";
	dealerHand.forEach((card, i) => {
		const div = document.createElement("div");
		div.className = "card show";
		if (i === 0 && !gameOver && !playerStands) {
			div.textContent = "?";
		} else {
			div.textContent = card;
		}
		dealerHandDiv.appendChild(div);
	});
	// Scoreboard
	scoreboard.textContent = `Player: ${playerScore} | Dealer: ${dealerScore}`;
}

function blackjackAction(action) {
	if (gameOver && action !== 'restart') return;
	if (action === 'hit') {
		playerHand.push(bjDeck.pop());
		logDiv.innerHTML += '<br>You hit.';
		if (bjValue(playerHand) > 21) {
			logDiv.innerHTML += '<br>You bust! Dealer wins.';
			dealerScore++;
			gameOver = true;
			revealDealer();
			setTimeout(bjInit, 2000);
		}
	} else if (action === 'stand') {
		playerStands = true;
		logDiv.innerHTML += '<br>You stand.';
		dealerTurn();
	} else if (action === 'restart') {
		bjInit();
		return;
	}
	updateBJUI();
}

function dealerTurn() {
	revealDealer();
	while (bjValue(dealerHand) < 17) {
		dealerHand.push(bjDeck.pop());
		updateBJUI();
	}
	let playerVal = bjValue(playerHand);
	let dealerVal = bjValue(dealerHand);
	if (dealerVal > 21) {
		logDiv.innerHTML += '<br>Dealer busts! You win!';
		playerScore++;
	} else if (dealerVal > playerVal) {
		logDiv.innerHTML += '<br>Dealer wins!';
		dealerScore++;
	} else if (dealerVal < playerVal) {
		logDiv.innerHTML += '<br>You win!';
		playerScore++;
	} else {
		logDiv.innerHTML += '<br>Push!';
	}
	gameOver = true;
	setTimeout(bjInit, 2000);
}

function revealDealer() {
	updateBJUI();
}

function bjValue(hand) {
	let value = 0;
	let aces = 0;
	for (let card of hand) {
		let rank = card.slice(0, -1);
		if (["J","Q","K"].includes(rank)) value += 10;
		else if (rank === "A") {
			value += 11;
			aces++;
		} else value += parseInt(rank);
	}
	while (value > 21 && aces > 0) {
		value -= 10;
		aces--;
	}
	return value;
}

window.blackjackAction = blackjackAction;

bjInit();
// Blackjack game logic will go here
