
// Solitaire (Klondike) - Basic Implementation
const solRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const solSuits = ["♠","♥","♦","♣"];

let solDeck = [];
let tableau = [];
let foundations = [[],[],[],[]];
let stock = [];
let waste = [];
let moves = 0;

const boardDiv = document.getElementById("solitaire-board");
const logDiv = document.getElementById("log");
const scoreboard = document.getElementById("solitaire-scoreboard");

function solitaireInit() {
	solDeck = createSolDeck();
	shuffle(solDeck);
	tableau = [];
	foundations = [[],[],[],[]];
	stock = [];
	waste = [];
	moves = 0;
	// Deal tableau
	for (let i = 0; i < 7; i++) {
		let col = [];
		for (let j = 0; j <= i; j++) {
			col.push({card: solDeck.pop(), faceUp: j === i});
		}
		tableau.push(col);
	}
	// Remaining cards to stock
	stock = solDeck.map(card => ({card, faceUp: false}));
	waste = [];
	updateSolitaireUI();
	logDiv.innerHTML = "New game!";
}

function createSolDeck() {
	let deck = [];
	for (let suit of solSuits) {
		for (let rank of solRanks) {
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

function updateSolitaireUI() {
	boardDiv.innerHTML = "";
	// Foundations
	let fDiv = document.createElement("div");
	fDiv.className = "foundations";
	for (let i = 0; i < 4; i++) {
		let pile = document.createElement("div");
		pile.className = "card foundation";
		pile.textContent = foundations[i].length ? foundations[i][foundations[i].length-1] : "";
		fDiv.appendChild(pile);
	}
	boardDiv.appendChild(fDiv);
	// Stock & Waste
	let swDiv = document.createElement("div");
	swDiv.className = "stock-waste";
	let stockDiv = document.createElement("div");
	stockDiv.className = "card stock";
	stockDiv.textContent = stock.length ? "🂠" : "";
	stockDiv.onclick = drawWaste;
	let wasteDiv = document.createElement("div");
	wasteDiv.className = "card waste";
	wasteDiv.textContent = waste.length ? waste[waste.length-1].card : "";
	swDiv.appendChild(stockDiv);
	swDiv.appendChild(wasteDiv);
	boardDiv.appendChild(swDiv);
	// Tableau
	let tDiv = document.createElement("div");
	tDiv.className = "tableau";
	for (let i = 0; i < 7; i++) {
		let colDiv = document.createElement("div");
		colDiv.className = "tableau-col";
		tableau[i].forEach((c, idx) => {
			let cardDiv = document.createElement("div");
			cardDiv.className = "card tableau-card" + (c.faceUp ? " show" : "");
			cardDiv.textContent = c.faceUp ? c.card : "🂠";
			cardDiv.onclick = () => selectTableau(i, idx);
			colDiv.appendChild(cardDiv);
		});
		tDiv.appendChild(colDiv);
	}
	boardDiv.appendChild(tDiv);
	// Moves
	scoreboard.textContent = `Moves: ${moves}`;
}

function drawWaste() {
	if (stock.length) {
		let c = stock.pop();
		c.faceUp = true;
		waste.push(c);
		moves++;
		updateSolitaireUI();
	} else {
		// Reset stock from waste
		stock = waste.map(c => ({card: c.card, faceUp: false}));
		waste = [];
		moves++;
		updateSolitaireUI();
	}
}

function selectTableau(col, idx) {
	// Placeholder: flip card if faceDown
	if (!tableau[col][idx].faceUp && idx === tableau[col].length-1) {
		tableau[col][idx].faceUp = true;
		moves++;
		updateSolitaireUI();
	}
}

function solitaireAction(action) {
	if (action === 'restart') solitaireInit();
}

window.solitaireAction = solitaireAction;

solitaireInit();
