console.log("Game loaded: wordsearch.js");
{ // SCOPE START

// Game State
let gridSize = 15;
let words = [];
let wordGrid = [];
let foundWords = [];
let timerInterval;
let startTime;

// Word list
const allWords = [
    "APPLE", "BANANA", "CHERRY", "DATE", "FIG", "GRAPE", "HONEY", "LIME", "KIWI", "LEMON", "MANGO", 
    "ORANGE", "PEACH", "PLUM", "RASPBERRY", "STRAWBERRY", "WATERMELON", "BLUEBERRY", "BLACKBERRY",
    "PINEAMPLE", "COCONUT", "AVOCADO", "TOMATO", "POTATO", "ONION", "GARLIC", "PEPPER", "CARROT",
    "BROCCOLI", "SPINACH", "KALE", "LETTUCE", "CABBAGE", "CELERY", "CUCUMBER", "ZUCCHINI", "EGGPLANT",
    "SQUASH", "PUMPKIN", "RADISH", "BEET", "TURNIP", "PARSNIP", "RUTABAGA", "YAM", "OKRA", "ASPARAGUS",
    "ARTICHOKE", "MUSHROOM", "CORN", "PEAS", "BEANS", "LENTILS", "CHICKPEAS", "SOYBEANS", "NUTS", "SEEDS",
    "GRAINS", "RICE", "WHEAT", "OATS", "BARLEY", "RYE", "QUINOA", "MILLET", "SORGHUM", "BUCKWHEAT", "AMARANTH",
    "SPELT", "TEFF", "FARRO", "KAMUT", "TRITICALE", "FONIO", "CANARY", "POPCORN", "CORNMEAL", "FLOUR", "BREAD",
    "PASTA", "NOODLES", "CEREAL", "GRANOLA", "MUESLI", "OATMEAL", "PORRIDGE", "PANCAKES", "WAFFLES", "TOAST",
    "BAGEL", "CROISSANT", "DONUT", "MUFFIN", "SCONE", "BISCUIT", "COOKIE", "CAKE", "PIE", "TART", "BROWNIE",
    "CUPCAKE", "PUDDING", "CUSTARD", "MOUSSE", "GELATO", "ICE", "CREAM", "SHERBET", "SORBET", "YOGURT", "CHEESE",
    "MILK", "BUTTER", "CREAM", "SOUR", "COTTAGE", "RICOTTA", "MASCARPONE", "MOZZARELLA", "CHEDDAR", "GOUDA",
    "BRIE", "CAMEMBERT", "ROQUEFORT", "GORGONZOLA", "FETA", "PARMESAN", "PECORINO", "MANCHEGO", "GRUYERE",
    "SWISS", "PROVOLONE", "HAVARTI", "EDAM", "COLBY", "MONTEREY", "JACK", "MUENSTER", "LIMBURGER", "EPOISSES"
];

const ROWS = 15;
const COLS = 15;
const NUM_WORDS = 10;

// Variables to hold DOM elements
let wordGridEl;
let wordListEl;
let foundCountEl;
let totalCountEl;
let timerEl;
let newGameBtn;
let modal;
let finalTimeEl;
let playAgainBtn;

// Start Game
function initGame() {
    // Guard: Check if game exists
    if (!document.getElementById('word-grid')) return;

    // Initialize DOM elements
    wordGridEl = document.getElementById('word-grid');
    wordListEl = document.getElementById('word-list');
    foundCountEl = document.getElementById('found-count');
    totalCountEl = document.getElementById('total-count');
    timerEl = document.getElementById('timer');
    newGameBtn = document.getElementById('new-game-btn');
    modal = document.getElementById('win-message');
    finalTimeEl = document.getElementById('final-time');
    playAgainBtn = document.getElementById('play-again-btn');

    // Attach listeners here to avoid duplications if they were global
    // But since we are inside a scope that runs once per load, we need to be careful.
    // Ideally we remove old listeners. But since elements are re-created (innerHTML replacement of parent or navigation),
    // the elements are new. 'newGameBtn' etc are new elements.
    if (newGameBtn) newGameBtn.onclick = initGame;
    if (playAgainBtn) playAgainBtn.onclick = initGame;
    
    // Global mouseup needs care. 
    // We'll attach it to document, but we must check if game is active inside it.
    // Also, to prevent stacking listeners indefinitely on document, we can try to remove it first?
    // We can't remove anonymous functions.
    // We'll rely on a flag or just checking element existence.

    clearInterval(timerInterval);
    foundWords = [];
    words = selectRandomWords();
    wordGrid = generateGrid(words);
    
    renderGrid();
    renderWordList();
    startTimer();
    
    if (modal) modal.classList.add('hidden');
    if (foundCountEl) foundCountEl.innerText = 0;
    if (totalCountEl) totalCountEl.innerText = words.length;
}

// Select random words
function selectRandomWords() {
    let internalList = [...allWords];
    let selected = [];
    while (selected.length < NUM_WORDS && internalList.length > 0) {
        const index = Math.floor(Math.random() * internalList.length);
        selected.push(internalList[index]);
        internalList.splice(index, 1); 
    }
    return selected;
}

// Generate Grid with words placed
function generateGrid(wordsToPlace) {
    let grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(''));

    for (let word of wordsToPlace) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            placed = tryPlaceWord(grid, word);
            attempts++;
        }
        if (!placed) {
            console.warn(`Could not place word: ${word}`);
            // Note: In a real game we might retry or pick another word.
        }
    }

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] === '') {
                grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
            }
        }
    }
    return grid;
}

function tryPlaceWord(grid, word) {
    const directions = [
        { r: 0, c: 1 },  
        { r: 1, c: 0 },  
        { r: 1, c: 1 },  
        { r: -1, c: 1 }, 
    ];
    
    const dir = directions[Math.floor(Math.random() * directions.length)];
    
    let startRow = Math.floor(Math.random() * ROWS);
    let startCol = Math.floor(Math.random() * COLS);

    let endRow = startRow + dir.r * (word.length - 1);
    let endCol = startCol + dir.c * (word.length - 1);

    if (endRow < 0 || endRow >= ROWS || endCol < 0 || endCol >= COLS) return false;

    for (let i = 0; i < word.length; i++) {
        let r = startRow + dir.r * i;
        let c = startCol + dir.c * i;
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) return false;
    }

    for (let i = 0; i < word.length; i++) {
        let r = startRow + dir.r * i;
        let c = startCol + dir.c * i;
        grid[r][c] = word[i];
    }

    return true;
}

function renderGrid() {
    if (!wordGridEl) return;
    wordGridEl.innerHTML = '';
    wordGridEl.style.gridTemplateColumns = `repeat(${COLS}, 30px)`;
    wordGridEl.style.gridTemplateRows = `repeat(${ROWS}, 30px)`;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.innerText = wordGrid[r][c];
            
            cell.addEventListener('mousedown', handleMouseDown);
            cell.addEventListener('mouseover', handleMouseOver);
            cell.addEventListener('mouseup', handleMouseUp);
            
            wordGridEl.appendChild(cell);
        }
    }
}

function renderWordList() {
    if (!wordListEl) return;
    wordListEl.innerHTML = '';
    words.forEach(word => {
        const li = document.createElement('li');
        li.classList.add('word-item');
        li.id = `word-${word}`;
        li.innerText = word;
        wordListEl.appendChild(li);
    });
}

// Interaction
let isSelecting = false;
let startCell = null;
let currentSelection = [];

function handleMouseDown(e) {
    isSelecting = true;
    startCell = { 
        r: parseInt(e.target.dataset.row), 
        c: parseInt(e.target.dataset.col) 
    };
    currentSelection = [e.target];
    highlightSelection();
}

function handleMouseOver(e) {
    if (!isSelecting) return;
    
    // Check if still on the board page
    if (!document.contains(e.target)) {
        isSelecting = false;
        return;
    }

    const target = e.target;
    if (!target.classList.contains('grid-cell')) return;

    const endCell = {
        r: parseInt(target.dataset.row),
        c: parseInt(target.dataset.col)
    };

    let cells = getCellsBetween(startCell, endCell);
    if (cells.length > 0) {
        currentSelection = cells;
        highlightSelection();
    }
}

function handleMouseUp() {
    if (!isSelecting) return;
    isSelecting = false;
    
    checkWord();
    clearSelection();
}

// Global mouse up to catch drags outside
// Only attach if not already attached? No easy way to check.
// We'll rely on the handler checking for game existence.
document.addEventListener('mouseup', () => {
    if (isSelecting) {
        isSelecting = false;
        // Verify we are still on the game page before doing logic?
        if (document.getElementById('word-grid')) {
            checkWord();
            clearSelection();
        }
    }
});

function getCellsBetween(start, end) {
    let cells = [];
    let dr = end.r - start.r;
    let dc = end.c - start.c;
    
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    
    if (Math.abs(dr) !== Math.abs(dc) && dr !== 0 && dc !== 0) {
        // Not a straight line or perfect diagonal
        return []; 
    }

    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

    for (let i = 0; i <= steps; i++) {
        let r = start.r + i * stepR;
        let c = start.c + i * stepC;
        
        let cell = null;
        if (wordGridEl) {
           // We can't use document.querySelector easily if multiple grids existed (unlikely)
           // But let's use the container to scope query
           cell = wordGridEl.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
        }
        if (cell) cells.push(cell);
    }
    return cells;
}

function highlightSelection() {
    // Clear previous
    if (wordGridEl) {
        wordGridEl.querySelectorAll('.grid-cell.selected').forEach(el => el.classList.remove('selected'));
    }
    currentSelection.forEach(cell => {
        cell.classList.add('selected');
    });
}

function clearSelection() {
    if (wordGridEl) {
        wordGridEl.querySelectorAll('.grid-cell.selected').forEach(el => el.classList.remove('selected'));
    }
    currentSelection = [];
    startCell = null;
}

function checkWord() {
    const selectedWord = currentSelection.map(cell => cell.innerText).join('');
    const reversedWord = selectedWord.split('').reverse().join('');
    
    if (words.includes(selectedWord) && !foundWords.includes(selectedWord)) {
        markWordFound(selectedWord, currentSelection);
    } else if (words.includes(reversedWord) && !foundWords.includes(reversedWord)) {
        markWordFound(reversedWord, currentSelection);
    }
}

function markWordFound(word, cells) {
    if (foundWords.includes(word)) return; // Double check

    foundWords.push(word);
    
    cells.forEach(cell => {
        cell.classList.add('found');
    });

    const listEl = document.getElementById(`word-${word}`);
    if (listEl) listEl.classList.add('found');

    if (foundCountEl) foundCountEl.innerText = foundWords.length;

    if (foundWords.length === words.length) {
        gameWin();
    }
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        if (!document.getElementById('timer')) {
             clearInterval(timerInterval);
             return;
        }
        const delta = Math.floor((Date.now() - startTime) / 1000);
        const m = Math.floor(delta / 60).toString().padStart(2, '0');
        const s = (delta % 60).toString().padStart(2, '0');
        if (timerEl) timerEl.innerText = `${m}:${s}`;
    }, 1000);
}

function gameWin() {
    clearInterval(timerInterval);
    if (finalTimeEl && timerEl) finalTimeEl.innerText = timerEl.innerText;
    if (modal) modal.classList.remove('hidden');
}

// Initial start
initGame();

} // SCOPE END
