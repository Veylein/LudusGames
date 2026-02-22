// crossword.js

// Game State
const GRID_SIZE = 12; // Smaller for easier generation
const MIN_WORDS = 8;
const MAX_WORDS = 15;

let grid = []; // 2D array of cells { char: 'A', number: 1, across: true, down: false, etc }
let placedWords = [];
let currentFocus = { row: 0, col: 0, dir: 'across' }; // dir: 'across' or 'down'

// Word and Clue Database
const wordBank = [
    { answer: "HTML", clue: "Standard markup language for Web pages" },
    { answer: "CSS", clue: "Style sheet language used for describing the presentation of a document" },
    { answer: "JAVASCRIPT", clue: "Programming language that is one of the core technologies of the World Wide Web" },
    { answer: "PYTHON", clue: "High-level, general-purpose programming language" },
    { answer: "JAVA", clue: "Class-based, object-oriented programming language designed to have as few implementation dependencies as possible" },
    { answer: "PHP", clue: "Popular general-purpose scripting language that is especially suited to web development" },
    { answer: "RUBY", clue: "Interpreted, high-level, general-purpose programming language" },
    { answer: "SQL", clue: "Domain-specific language used in programming and designed for managing data held in a RDBMS" },
    { answer: "REACT", clue: "JavaScript library for building user interfaces" },
    { answer: "ANGULAR", clue: "Platform for building mobile and desktop web applications" },
    { answer: "VUE", clue: "Progressive JavaScript framework" },
    { answer: "NODE", clue: "JavaScript runtime built on Chrome's V8 JavaScript engine" },
    { answer: "LINUX", clue: "Family of open-source Unix-like operating systems" },
    { answer: "WINDOWS", clue: "Group of several proprietary graphical operating system families developed by Microsoft" },
    { answer: "APPLE", clue: "American multinational technology company headquartered in Cupertino, California" },
    { answer: "GOOGLE", clue: "American multinational technology company that specializes in Internet-related services and products" },
    { answer: "AMAZON", clue: "American multinational technology company which focuses on e-commerce, cloud computing, digital streaming, and artificial intelligence" },
    { answer: "FACEBOOK", clue: "American online social media and social networking service based in Menlo Park, California" },
    { answer: "TWITTER", clue: "American microblogging and social networking service on which users post and interact with messages known as 'tweets'" },
    { answer: "INSTAGRAM", clue: "American photo and video sharing social networking service" },
    { answer: "TIKTOK", clue: "Video-sharing social networking service owned by Chinese company ByteDance" },
    { answer: "YOUTUBE", clue: "American online video sharing and social media platform" },
    { answer: "NETFLIX", clue: "American over-the-top content platform and production company" },
    { answer: "SPOTIFY", clue: "Swedish audio streaming and media services provider" },
    { answer: "TESLA", clue: "American electric vehicle and clean energy company" },
    { answer: "SPACEX", clue: "American aerospace manufacturer and space transportation services company" },
    { answer: "NASA", clue: "Independent agency of the U.S. federal government responsible for the civilian space program" },
    { answer: "MARS", clue: "Fourth planet from the Sun and the second-smallest planet in the Solar System" },
    { answer: "EARTH", clue: "Third planet from the Sun and the only astronomical object known to harbor life" },
    { answer: "MOON", clue: "Earth's only natural satellite" },
    { answer: "SUN", clue: "Star around which the Earth and the other components of the Solar System orbit" },
    { answer: "GALAXY", clue: "Gravitationally bound system of stars, stellar remnants, interstellar gas, dust, and dark matter" },
    { answer: "UNIVERSE", clue: "All of space and time and their contents" },
    { answer: "ATOM", clue: "Smallest unit of ordinary matter that forms a chemical element" },
    { answer: "MOLECULE", clue: "Electrically neutral group of two or more atoms held together by chemical bonds" },
    { answer: "CELL", clue: "Basic structural, functional, and biological unit of all known organisms" },
    { answer: "DNA", clue: "Molecule that carries genetic instructions used in the growth, development, functioning, and reproduction of all known living organisms" },
    { answer: "RNA", clue: "Polymeric molecule essential in various biological roles in coding, decoding, regulation and expression of genes" },
    { answer: "PROTEIN", clue: "Large biomolecules, or macromolecules, consisting of one or more long chains of amino acid residues" },
    { answer: "WATER", clue: "Inorganic, transparent, tasteless, odorless, and nearly colorless chemical substance" },
    { answer: "FIRE", clue: "Rapid oxidation of a material in the exothermic chemical process of combustion" },
    { answer: "AIR", clue: "Invisible mixture of gases that surrounds the Earth" },
    { answer: "CODE", clue: "Collection of computer instructions" },
    { answer: "DEBUG", clue: "Process of finding and resolving defects or problems within a computer program" },
    { answer: "ALGORITHM", clue: "Finite sequence of well-defined, computer-implementable instructions" },
    { answer: "DATA", clue: "Information processed or stored by a computer" },
    { answer: "SERVER", clue: "Details about a computer or system that provides resources, data, services, or programs to other computers" },
    { answer: "CLIENT", clue: "Computer hardware or software that accesses a service made available by a server" },
    { answer: "API", clue: "Set of functions and procedures allowing the creation of applications that access the features or data of an operating system, application, or other service" },
    { answer: "JSON", clue: "Open standard file format and data interchange format that uses human-readable text to store and transmit data objects" },
    { answer: "XML", clue: "Markup language that defines a set of rules for encoding documents in a format that is both human-readable and machine-readable" }
];

// Elements
const gridEl = document.getElementById('crossword-grid');
const cluesAcrossEl = document.getElementById('clues-across');
const cluesDownEl = document.getElementById('clues-down');
const timerEl = document.getElementById('timer');
const checkBtn = document.getElementById('check-btn');
const revealBtn = document.getElementById('reveal-btn');
const newGameBtn = document.getElementById('new-game-btn');
const currentClueText = document.getElementById('current-clue-text');
const modal = document.getElementById('win-message');
const playAgainBtn = document.getElementById('play-again-btn');

let startTime;
let timerInterval;

// --- Initialization ---

function initGame() {
    clearInterval(timerInterval);
    placedWords = [];
    grid = createEmptyGrid(GRID_SIZE);
    
    // Select Words
    let availableWords = [...wordBank];
    availableWords.sort(() => 0.5 - Math.random());
    
    // Attempt generation
    generatePuzzle(availableWords);
    
    // Render
    renderGrid();
    renderClues();
    
    // Timer
    startTimer();
    modal.classList.add('hidden');
    
    // Focus first available cell
    if (placedWords.length > 0) {
        focusCell(placedWords[0].row, placedWords[0].col, placedWords[0].direction);
    }
}

function createEmptyGrid(size) {
    return Array(size).fill(null).map(() => Array(size).fill(null));
}

// --- Puzzle Generation (Simplified) ---

function generatePuzzle(words) {
    // 1. Place first word in the middle
    let firstWord = words.pop();
    let startRow = Math.floor(GRID_SIZE / 2);
    let startCol = Math.floor((GRID_SIZE - firstWord.answer.length) / 2);
    
    placeWord(firstWord, startRow, startCol, 'across');
    
    let attempts = 0;
    let maxAttempts = words.length * 20;
    
    while (words.length > 0 && attempts < maxAttempts && placedWords.length < MAX_WORDS) {
        let currentWord = words[words.length - 1]; // Peek
        let placed = false;
        
        // Try to hook onto existing words
        // Iterate through all placed words, find intersection chars
        for (let pw of placedWords) {
            if (placed) break;
            
            // Iterate through chars of the placed word
            for (let i = 0; i < pw.answer.length; i++) {
                let char = pw.answer[i];
                let pRow = pw.row + (pw.direction === 'down' ? i : 0);
                let pCol = pw.col + (pw.direction === 'across' ? i : 0);
                
                // Try to match with current word
                for (let j = 0; j < currentWord.answer.length; j++) {
                    if (currentWord.answer[j] === char) {
                        // Found intersection point
                        // If placed word is across, new word must be down, and vice versa
                        let newDir = pw.direction === 'across' ? 'down' : 'across';
                        let newRow = pRow - (newDir === 'down' ? j : 0);
                        let newCol = pCol - (newDir === 'across' ? j : 0);
                        
                        if (canPlace(currentWord.answer, newRow, newCol, newDir)) {
                            placeWord(currentWord, newRow, newCol, newDir);
                            words.pop(); // Remove
                            placed = true;
                            break;
                        }
                    }
                }
                if (placed) break;
            }
        }
        
        if (!placed) {
            // Move to back of line or discard slightly to prevent infinite loops
            let w = words.pop();
            if (Math.random() > 0.5) words.unshift(w);
        }
        attempts++;
    }
    
    // Sort placed words by number for UI
    placedWords.sort((a,b) => a.number - b.number);
}

function canPlace(word, row, col, dir) {
    if (row < 0 || col < 0) return false;
    if (dir === 'across') {
        if (col + word.length > GRID_SIZE) return false;
        if (col - 1 >= 0 && grid[row][col-1] !== null) return false; 
        if (col + word.length < GRID_SIZE && grid[row][col+word.length] !== null) return false;
        
        for (let i = 0; i < word.length; i++) {
            let cell = grid[row][col+i];
            if (cell !== null && cell.char !== word[i]) return false;
            
            // Check neighbors (above/below) ensuring we aren't creating accidental 2-letter words
            // If cell is empty (placing new char), check neighbors
            if (cell === null) {
                if (row - 1 >= 0 && grid[row-1][col+i] !== null) return false;
                if (row + 1 < GRID_SIZE && grid[row+1][col+i] !== null) return false;
            }
        }
    } else { // DOWN
        if (row + word.length > GRID_SIZE) return false;
        if (row - 1 >= 0 && grid[row-1][col] !== null) return false;
        if (row + word.length < GRID_SIZE && grid[row+word.length][col] !== null) return false;
        
        for (let i = 0; i < word.length; i++) {
            let cell = grid[row+i][col];
            if (cell !== null && cell.char !== word[i]) return false;
            
            if (cell === null) {
                if (col - 1 >= 0 && grid[row+i][col-1] !== null) return false;
                if (col + 1 < GRID_SIZE && grid[row+i][col+1] !== null) return false;
            }
        }
    }
    return true;
}

function placeWord(wordObj, row, col, dir) {
    // Check if a number already exists at this start position
    let number = 0;
    
    // Check if any word starts here
    let existingWord = placedWords.find(w => w.row === row && w.col === col);
    if (existingWord) {
        number = existingWord.number;
    } else {
        // Find next available number
        // Simple heuristic: just max + 1. Better: re-calculate numbers based on position (TL to BR)
        // For simplicity now, we re-number everything at the end usually, but for dynamic generation:
        const maxNum = placedWords.reduce((max, w) => Math.max(max, w.number), 0);
        number = maxNum + 1;
    }

    // Actually write to grid
    for (let i = 0; i < wordObj.answer.length; i++) {
        let r = row + (dir === 'down' ? i : 0);
        let c = col + (dir === 'across' ? i : 0);
        
        if (!grid[r][c]) {
            grid[r][c] = { char: wordObj.answer[i], r, c, number: (i===0 ? number : null) };
        } else {
            // Already has char, update metadata if starting new word (shared start)
            if (i === 0 && !grid[r][c].number) {
                grid[r][c].number = number;
            }
        }
    }
    
    placedWords.push({
        ...wordObj,
        row,
        col,
        direction: dir,
        number
    });
}

// Only renumber after everything is placed to ensure standard crossword numbering
// Standard: reading order (left-right, top-bottom)
function renumberWords() {
    // Not strictly implementing "Standard" numbering for this MVP to avoid complexity
    // sticking with generation order or simple ID
}

// --- Rendering ---

function renderGrid() {
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 32px)`;
    gridEl.style.gridTemplateRows = `repeat(${GRID_SIZE}, 32px)`;

    grid.forEach((row, r) => {
        row.forEach((cell, c) => {
            const cellDiv = document.createElement('div');
            cellDiv.classList.add('grid-cell');
            cellDiv.dataset.row = r;
            cellDiv.dataset.col = c;
            
            if (!cell) {
                cellDiv.classList.add('black-cell');
            } else {
                cellDiv.classList.add('active-cell');
                
                // Number
                if (cell.number) {
                    const numSpan = document.createElement('span');
                    numSpan.classList.add('cell-number');
                    numSpan.innerText = cell.number;
                    cellDiv.appendChild(numSpan);
                }
                
                // Input
                const input = document.createElement('input');
                input.classList.add('cell-input');
                input.maxLength = 1;
                input.addEventListener('keydown', handleInput);
                input.addEventListener('focus', () => handleFocus(r, c));
                input.addEventListener('click', () => handleClick(r, c)); // Toggle direction
                cellDiv.appendChild(input);
            }
            gridEl.appendChild(cellDiv);
        });
    });
}

function renderClues() {
    cluesAcrossEl.innerHTML = '';
    cluesDownEl.innerHTML = '';
    
    // Sort for display
    let sortedWords = [...placedWords].sort((a,b) => a.number - b.number);
    
    sortedWords.forEach(w => {
        const li = document.createElement('li');
        li.classList.add('clue-item');
        li.id = `clue-${w.number}-${w.direction}`;
        li.innerText = `${w.number}. ${w.clue}`;
        li.dataset.row = w.row;
        li.dataset.col = w.col;
        li.dataset.dir = w.direction;
        
        li.addEventListener('click', () => {
            focusCell(w.row, w.col, w.direction);
        });
        
        if (w.direction === 'across') {
            cluesAcrossEl.appendChild(li);
        } else {
            cluesDownEl.appendChild(li);
        }
    });
}


// --- Interaction ---

function handleFocus(r, c) {
    if (grid[r][c] === null) return;
    
    currentFocus.row = r;
    currentFocus.col = c;
    
    highlightActiveWord();
}

function handleClick(r, c) {
    // If clicking already focused cell, toggle direction
    if (currentFocus.row === r && currentFocus.col === c) {
        currentFocus.dir = currentFocus.dir === 'across' ? 'down' : 'across';
        highlightActiveWord();
    }
}

function highlightActiveWord() {
    // Clear
    document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('highlight-word', 'highlight-selected'));
    document.querySelectorAll('.clue-item').forEach(c => c.classList.remove('active-clue'));
    
    const cellEl = getCellEl(currentFocus.row, currentFocus.col);
    if(cellEl) cellEl.parentElement.classList.add('highlight-selected');

    // Find the word that contains this cell given the current direction
    // There might be multiple words overlapping, pick the one matching current dir
    let word = placedWords.find(w => {
        if (w.direction !== currentFocus.dir) return false;
        if (w.direction === 'across') {
            return w.row === currentFocus.row && currentFocus.col >= w.col && currentFocus.col < w.col + w.answer.length;
        } else {
            return w.col === currentFocus.col && currentFocus.row >= w.row && currentFocus.row < w.row + w.answer.length;
        }
    });
    
    // If no word in that direction (user clicked a cell with only 1 word but wrong dir), switch dir
    if (!word) {
        currentFocus.dir = currentFocus.dir === 'across' ? 'down' : 'across';
        word = placedWords.find(w => {
            if (w.direction !== currentFocus.dir) return false;
            if (w.direction === 'across') {
                return w.row === currentFocus.row && currentFocus.col >= w.col && currentFocus.col < w.col + w.answer.length;
            } else {
                return w.col === currentFocus.col && currentFocus.row >= w.row && currentFocus.row < w.row + w.answer.length;
            }
        });
    }

    if (word) {
        // Highlight Cells
        for(let i=0; i<word.answer.length; i++) {
            let r = word.row + (word.direction==='down'?i:0);
            let c = word.col + (word.direction==='across'?i:0);
            const el = getCellEl(r,c);
            if(el) el.parentElement.classList.add('highlight-word');
        }
        
        // Highlight Clue
        const clueEl = document.getElementById(`clue-${word.number}-${word.direction}`);
        if(clueEl) {
            clueEl.classList.add('active-clue');
            clueEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            currentClueText.innerText = `${word.number} ${word.direction.toUpperCase()}: ${word.clue}`;
        }
    }
}

function handleInput(e) {
    const key = e.key.toUpperCase();
    const r = currentFocus.row;
    const c = currentFocus.col;
    let nextR = r, nextC = c;

    if (e.ctrlKey || e.altKey || e.metaKey) return; 

    // Navigation
    if (e.key === 'ArrowRight') {
        currentFocus.dir = 'across';
        moveFocusByDir(r, c, 0, 1);
        return;
    }
    if (e.key === 'ArrowLeft') {
        currentFocus.dir = 'across';
        moveFocusByDir(r, c, 0, -1);
        return;
    }
    if (e.key === 'ArrowDown') {
        currentFocus.dir = 'down';
        moveFocusByDir(r, c, 1, 0);
        return;
    }
    if (e.key === 'ArrowUp') {
        currentFocus.dir = 'down';
        moveFocusByDir(r, c, -1, 0);
        return;
    }
    
    if (e.key === 'Backspace') {
        e.preventDefault();
        const el = e.target;
        if (el.value === '') {
            if (currentFocus.dir === 'across') moveFocusByDir(r, c, 0, -1);
            else moveFocusByDir(r, c, -1, 0);
        } else {
            el.value = '';
        }
        return;
    }

    if (key.length === 1 && key.match(/[a-zA-Z]/)) {
        e.preventDefault();
        const el = e.target;
        el.value = key;
        
        // Advance
        if (currentFocus.dir === 'across') moveFocusByDir(currentFocus.row, currentFocus.col, 0, 1);
        else moveFocusByDir(currentFocus.row, currentFocus.col, 1, 0);
    }
}

function focusCell(r, c, dir) {
    // Only focus if valid
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return;
    
    // Check if cell is black 
    if (grid[r][c] === null) return;

    const inputEl = document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"] input`);
    if (inputEl) {
        currentFocus.dir = dir; 
        inputEl.focus();
    }
}

function moveFocusByDir(r, c, dr, dc) {
    let nr = r + dr;
    let nc = c + dc;
    
    // Safety break
    let loops = 0;
    while(nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && loops < GRID_SIZE) {
        if (grid[nr][nc] !== null) {
            // We found a valid cell
            // We pass the current direction or the direction implied by movement?
            // If moving horizontally, prefer across. 
            let newDir = currentFocus.dir;
            if (dr !== 0) newDir = 'down'; // Explicit vertical move
            if (dc !== 0) newDir = 'across'; // Explicit horizontal move

            focusCell(nr, nc, newDir);
            return;
        }
        nr += dr;
        nc += dc;
        loops++;
    }
}

function focusCell(r, c, dir) {
    currentFocus.dir = dir;
    moveFocus(r, c);
}

function getCellEl(r, c) {
    return document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"] input`);
}

// --- Logic ---

function checkPuzzle() {
    let errors = 0;
    let filled = 0;
    let total = 0;

    grid.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell) {
                total++;
                const el = getCellEl(r,c);
                const val = el.value.toUpperCase();
                
                if (val !== '') filled++;
                
                if (val === cell.char) {
                    el.parentElement.classList.add('correct');
                    el.parentElement.classList.remove('incorrect');
                } else if (val !== '') {
                    el.parentElement.classList.add('incorrect');
                    el.parentElement.classList.remove('correct');
                    errors++;
                }
            }
        });
    });
    
    if (filled === total && errors === 0) {
        gameWin();
    }
}

function revealLetter() {
    // Reveal current cell
    const cell = grid[currentFocus.row][currentFocus.col];
    if (cell) {
        const el = getCellEl(currentFocus.row, currentFocus.col);
        el.value = cell.char;
        el.parentElement.classList.add('correct');
    }
}

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
    document.getElementById('final-time').innerText = timerEl.innerText;
    modal.classList.remove('hidden');
}

// Listeners
checkBtn.addEventListener('click', checkPuzzle);
revealBtn.addEventListener('click', revealLetter);
newGameBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', initGame);

// Init
initGame();
