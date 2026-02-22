// wordsearch.js

// Game State
let gridSize = 15;
let words = [];
let wordGrid = [];
let foundWords = [];
let timerInterval;
let startTime;

// Word list: Can be expanded or fetched from an API
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

// Elements
const wordGridEl = document.getElementById('word-grid');
const wordListEl = document.getElementById('word-list');
const foundCountEl = document.getElementById('found-count');
const totalCountEl = document.getElementById('total-count');
const timerEl = document.getElementById('timer');
const newGameBtn = document.getElementById('new-game-btn');
const modal = document.getElementById('win-message');
const finalTimeEl = document.getElementById('final-time');
const playAgainBtn = document.getElementById('play-again-btn');

// Start Game
function initGame() {
    clearInterval(timerInterval);
    foundWords = [];
    words = selectRandomWords();
    wordGrid = generateGrid(words);
    
    renderGrid();
    renderWordList();
    startTimer();
    
    modal.classList.add('hidden');
    foundCountEl.innerText = 0;
    totalCountEl.innerText = words.length;
}

// Select random words
function selectRandomWords() {
    let internalList = [...allWords];
    let selected = [];
    while (selected.length < NUM_WORDS) {
        const index = Math.floor(Math.random() * internalList.length);
        selected.push(internalList[index]);
        internalList.splice(index, 1); // remove to avoid duplicates
    }
    return selected;
}

// Generate Grid with words placed
function generateGrid(wordsToPlace) {
    // Fill with empty strings
    let grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(''));

    // Attempt to place each word
    for (let word of wordsToPlace) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            placed = tryPlaceWord(grid, word);
            attempts++;
        }
        if (!placed) {
            console.warn(`Could not place word: ${word}`);
            words = words.filter(w => w !== word); // Remove from list if not placed
        }
    }

    // Fill remaining spots with random letters
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
        { r: 0, c: 1 },  // Horizontal
        { r: 1, c: 0 },  // Vertical
        { r: 1, c: 1 },  // Diagonal Down-Right
        { r: -1, c: 1 }, // Diagonal Up-Right
    ];
    
    const dir = directions[Math.floor(Math.random() * directions.length)];
    
    // Random starting position
    let startRow = Math.floor(Math.random() * ROWS);
    let startCol = Math.floor(Math.random() * COLS);

    // Check bounds
    let endRow = startRow + dir.r * (word.length - 1);
    let endCol = startCol + dir.c * (word.length - 1);

    if (endRow < 0 || endRow >= ROWS || endCol < 0 || endCol >= COLS) return false;

    // Check collisions
    for (let i = 0; i < word.length; i++) {
        let r = startRow + dir.r * i;
        let c = startCol + dir.c * i;
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) return false;
    }

    // Place
    for (let i = 0; i < word.length; i++) {
        let r = startRow + dir.r * i;
        let c = startCol + dir.c * i;
        grid[r][c] = word[i];
    }

    return true;
}

function renderGrid() {
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
            
            // Mouse events handled by parent wrapper (event delegation) or individually
            cell.addEventListener('mousedown', handleMouseDown);
            cell.addEventListener('mouseover', handleMouseOver);
            cell.addEventListener('mouseup', handleMouseUp);
            
            wordGridEl.appendChild(cell);
        }
    }
}

function renderWordList() {
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
    
    const target = e.target;
    if (!target.classList.contains('grid-cell')) return;

    const endCell = {
        r: parseInt(target.dataset.row),
        c: parseInt(target.dataset.col)
    };

    // Calculate line from start to end (Bresenham's line algorithm simplified for 8 directions)
    // Actually we only need to valid directions: Horizontal, Vertical, Diagonal
    currentSelection = getCellsBetween(startCell, endCell);
    highlightSelection();
}

function handleMouseUp() {
    if (!isSelecting) return;
    isSelecting = false;
    
    checkWord();
    clearSelection();
}

// Add global mouse up to catch drags outside
document.addEventListener('mouseup', () => {
    if (isSelecting) {
        isSelecting = false;
        checkWord(); // Optional: Check if valid word formed when mouse released outside
        clearSelection();
    }
});

function getCellsBetween(start, end) {
    let cells = [];
    let dr = end.r - start.r;
    let dc = end.c - start.c;
    
    // Normalize to -1, 0, 1
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    
    // Only valid lines (horizontal, vertical, diagonal) have |dr| == |dc| or one is 0
    if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) {
        return []; // Invalid dragged line
    }

    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

    for (let i = 0; i <= steps; i++) {
        let r = start.r + i * stepR;
        let c = start.c + i * stepC;
        
        // Find DOM element
        const cell = document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
        if (cell) cells.push(cell);
    }
    return cells;
}

function highlightSelection() {
    // Clear previous temporary highlights (but not permanent 'found' class)
    document.querySelectorAll('.grid-cell.selected').forEach(el => el.classList.remove('selected'));
    
    currentSelection.forEach(cell => {
        cell.classList.add('selected');
    });
}

function clearSelection() {
    document.querySelectorAll('.grid-cell.selected').forEach(el => el.classList.remove('selected'));
    currentSelection = [];
    startCell = null;
}

function checkWord() {
    const selectedWord = currentSelection.map(cell => cell.innerText).join('');
    const reversedWord = selectedWord.split('').reverse().join('');
    
    // Check if the word is in the list and not already found
    if (words.includes(selectedWord) && !foundWords.includes(selectedWord)) {
        markWordFound(selectedWord, currentSelection);
    } else if (words.includes(reversedWord) && !foundWords.includes(reversedWord)) {
        // It's the reversed word, but we want to mark it using the original word from the list
        // Note: if palindrome, reversedWord == selectedWord
        markWordFound(reversedWord, currentSelection);
    }
}

function markWordFound(word, cells) {
    foundWords.push(word);
    
    // Mark styling on grid permanently
    cells.forEach(cell => {
        cell.classList.add('found');
        // cell.classList.remove('selected'); handled by clearSelection, but we want a different color for found
    });

    // Cross off list
    const listEl = document.getElementById(`word-${word}`);
    if (listEl) listEl.classList.add('found');

    foundCountEl.innerText = foundWords.length;

    // Check win
    if (foundWords.length === words.length) {
        gameWin();
    }
}

// Timer
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const delta = Math.floor((Date.now() - startTime) / 1000);
        const m = Math.floor(delta / 60).toString().padStart(2, '0');
        const s = (delta % 60).toString().padStart(2, '0');
        timerEl.innerText = `${m}:${s}`;
    }, 1000);
}

function gameWin() {
    clearInterval(timerInterval);
    finalTimeEl.innerText = timerEl.innerText;
    modal.classList.remove('hidden');
}

// Event Listeners
newGameBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', initGame);

// Initial start
initGame();
