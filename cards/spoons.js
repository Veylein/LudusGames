
console.log("Game loaded: spoons.js");
{ // SCOPE START

// Spoons - 2 players (1 human, 1 bot), basic pass/grab, first to grab spoon wins
const spoonsRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const spoonsSuits = ["\u2660","\u2665","\u2666","\u2663"];

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
    if(!spoonsPlayerHandDiv) return;
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
		if (card.includes("\u2665") || card.includes("\u2666")) {
			div.classList.add("red");
		}
		div.textContent = card;
		div.onclick = () => spoonsAction('pass', idx);
		spoonsPlayerHandDiv.appendChild(div);
	});

	// Bot hand
	spoonsBotHandDiv.innerHTML = "";
	// Just show backs
	spoonsHands[1].forEach(() => {
		let c = document.createElement("div");
		c.className = "card hidden";
		// c.textContent = "🂠";
		spoonsBotHandDiv.appendChild(c);
	});

	// Pile (render top card if exists)
	spoonsPileDiv.innerHTML = "";
	if (spoonsPile.length > 0) {
		let top = spoonsPile[spoonsPile.length-1];
		let c = document.createElement("div");
		c.className = "card show";
		if (top.includes("\u2665") || top.includes("\u2666")) {
			c.classList.add("red");
		}
		c.textContent = top;
		spoonsPileDiv.appendChild(c);
	}

	// Spoons
	spoonsSpoonsDiv.innerHTML = '';
	// Logic for showing spoons available?
	// The variable is spoonsSpoons = 1 usually.
	if (spoonsSpoons > 0) {
		let s = document.createElement("div");
		s.className = "spoon-icon"; // Custom class or just text
		s.style.fontSize = "40px";
		s.textContent = "🥄";
		spoonsSpoonsDiv.appendChild(s);
	}

	// Scoreboard
	spoonsScoreboard.textContent = `You: ${spoonsScores[0]} | Bot: ${spoonsScores[1]}`;
}

function spoonsAction(action, idx) {
	if (action === 'restart') return spoonsInit();
	if (spoonsGameOver) return;
	
	if (action === 'pass') {
        if (typeof idx === 'number') {
            spoonsSelectCard(idx);
        } else {
             // If no index, maybe bot pass or ignore
             // If player clicks "Pass" button, we might need to select a card first?
             // For now assume clicks on card calls spoonsAction('pass', idx)
             if(spoonsCurrentPlayer === 0) {
                 spoonsLogDiv.textContent = "Click a card to pass it!";
             }
        }
	}
	
	if (action === 'grab') {
        if (spoonsSpoons > 0) {
            spoonsSpoons--;
            spoonsGrabbed[0] = true;
            spoonsLogDiv.innerHTML = "You grabbed the spoon!";
            spoonsCheckGrab();
        }
	}
}

function spoonsSelectCard(idx) {
	if (spoonsCurrentPlayer !== 0 || spoonsGameOver) return;
	let card = spoonsHands[0][idx];
	spoonsHands[0].splice(idx, 1);
	spoonsPile.push(card);
	// Draw new card from deck?? Spoons logic varies.
	if (spoonsDeck.length > 0) {
		spoonsHands[0].push(spoonsDeck.pop());
	}
    
    // Check for 4 of a kind
    if(spoonsHasFourOfAKind(spoonsHands[0])) {
         spoonsLogDiv.innerHTML += "<br>You have 4 of a kind! Grab a spoon!";
    }

	spoonsCurrentPlayer = 1;
	updateSpoonsUI();
	setTimeout(spoonsBotTurn, 900);
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
		if (window.addPoints) window.addPoints(100);
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

if (typeof spoonsInit === 'function') spoonsInit();
} // SCOPE END
