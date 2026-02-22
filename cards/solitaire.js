
console.log("Game loaded: solitaire.js");

// Solitaire (Klondike) - Basic Implementation
const solRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const solSuits = ["\u2660","\u2665","\u2666","\u2663"];

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
	
    // TOP ROW container
    let topRow = document.createElement("div");
    topRow.className = "solitaire-top-row";
    topRow.style.display = "flex";
    topRow.style.gap = "40px";
    topRow.style.justifyContent = "center";
    topRow.style.width = "100%";

	// Stock & Waste
	let swDiv = document.createElement("div");
	swDiv.className = "stock-waste";
	
    let stockDiv = document.createElement("div");
	stockDiv.className = "card stock";
    if (stock.length > 0) {
        stockDiv.classList.add("hidden");
        stockDiv.textContent = "?";
    } else {
        stockDiv.textContent = "↺"; // Restart icon or similar for empty stock
    }
	stockDiv.onclick = drawWaste;
	
    let wasteDiv = document.createElement("div");
	wasteDiv.className = "card waste";
    
    if (waste.length > 0) {
        let topWaste = waste[waste.length-1];
        wasteDiv.textContent = topWaste.card; // topWaste is {card: "10H", ...} wait, waste is array of objects {card, faceUp}
        if (topWaste.card.includes("\u2665") || topWaste.card.includes("\u2666")) wasteDiv.classList.add("red");
    }
	
    swDiv.appendChild(stockDiv);
	swDiv.appendChild(wasteDiv);
    topRow.appendChild(swDiv);

	// Foundations
	let fDiv = document.createElement("div");
	fDiv.className = "foundations";
	for (let i = 0; i < 4; i++) {
		let pile = document.createElement("div");
		pile.className = "card foundation";
        if (foundations[i].length > 0) {
            let topC = foundations[i][foundations[i].length-1];
            pile.textContent = topC;
            if (topC.includes("\u2665") || topC.includes("\u2666")) pile.classList.add("red");
        } else {
            pile.textContent = ["\u2660","\u2665","\u2666","\u2663"][i]; // Placeholder suit
            pile.style.opacity = "0.3";
        }
		fDiv.appendChild(pile);
	}
    topRow.appendChild(fDiv);
    
	boardDiv.appendChild(topRow);

	// Tableau
	let tDiv = document.createElement("div");
	tDiv.className = "tableau";
	for (let i = 0; i < 7; i++) {
		let colDiv = document.createElement("div");
		colDiv.className = "tableau-col";
		tableau[i].forEach((c, idx) => {
			let cardDiv = document.createElement("div");
            cardDiv.className = "card tableau-card";
            if (!c.faceUp) {
                cardDiv.classList.add("hidden");
                cardDiv.textContent = "?";
            } else {
                cardDiv.textContent = c.card;
                if (c.card.includes("\u2665") || c.card.includes("\u2666")) cardDiv.classList.add("red");
            }
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
