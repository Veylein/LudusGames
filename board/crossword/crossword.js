/*
 * CYBER CROSSWORD
 * 
 * Features:
 * - Cyberpunk Terminal Aesthetic
 * - DOM-based Input
 * - Auto-Generation Logic preserved
 * - GameUI Integration
 */

(function() {
    console.log('Booting Cyber Crossword...');

    const GRID_SIZE = 13;
    const WORD_BANK = [
        { answer: 'HTML', clue: 'Skeleton of the web' },
        { answer: 'CSS', clue: 'Digital paint' },
        { answer: 'JS', clue: 'The logic engine' },
        { answer: 'NEON', clue: 'Glowing gas' },
        { answer: 'CYBER', clue: 'High tech, low life' },
        { answer: 'MATRIX', clue: 'Simulated reality' },
        { answer: 'GLITCH', clue: 'System error' },
        { answer: 'HACK', clue: 'Access granted' },
        { answer: 'CODE', clue: 'Machine language' },
        { answer: 'DATA', clue: 'Raw information' },
        { answer: 'SERVER', clue: 'Network host' },
        { answer: 'CLOUD', clue: 'Remote storage' },
        { answer: 'PIXEL', clue: 'Picture element' },
        { answer: 'RASTER', clue: 'Bitmap graphic' },
        { answer: 'VECTOR', clue: 'Scalable graphic' },
        { answer: 'SYNTAX', clue: 'Grammar of code' },
        { answer: 'LOOP', clue: 'Repetition structure' },
        { answer: 'ARRAY', clue: 'Ordered collection' },
        { answer: 'OBJECT', clue: 'Key-value pairs' },
        { answer: 'API', clue: 'Application interface' }
    ];

    let grid = [];
    let placedWords = [];
    let selectedCell = null; // {r, c}

    function init() {
         if (window.GameUI) {
            window.GameUI.init(document.body, { // Bind to body or canvas if existing
                onStart: () => startNewGame(),
                onRestart: () => startNewGame()
            });
            window.GameUI.showStartScreen();
         } else {
             startNewGame();
         }
         
         document.getElementById('new-game-btn').addEventListener('click', startNewGame);
         document.getElementById('check-btn').addEventListener('click', checkAnswers);
         document.getElementById('reveal-btn').addEventListener('click', revealWord);
    }

    function startNewGame() {
        if (window.GameUI) window.GameUI.hideStartScreen();
        generateGrid();
        renderGrid();
        renderClues();
        document.getElementById('current-clue-display').innerText = 'SYSTEM READY.';
    }

    function generateGrid() {
        // Reset
        grid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(null));
        placedWords = [];
        
        // Simple placing strategy (just horizontal/vertical random for prototype)
        // A real crossword generator is complex.
        // We will place words randomly checking overlap validity.
        
        let attempts = 0;
        const targetWords = 8;
        
        // Shuffle bank
        const bank = [...WORD_BANK].sort(() => Math.random() - 0.5);
        
        for (let wordObj of bank) {
            if (placedWords.length >= targetWords) break;
            if (attempts > 1000) break;
            
            placeWord(wordObj);
            attempts++;
        }
    }

    function placeWord(wordObj) {
        // Try horizontal or vertical
        const dir = Math.random() > 0.5 ? 'across' : 'down';
        const word = wordObj.answer;
        const len = word.length;
        
        // Random pos
        const r = Math.floor(Math.random() * GRID_SIZE);
        const c = Math.floor(Math.random() * GRID_SIZE);
        
        // Check bounds
        if (dir === 'across' && c + len > GRID_SIZE) return;
        if (dir === 'down' && r + len > GRID_SIZE) return;
        
        // Check collisions
        let valid = true;
        for(let i=0; i<len; i++) {
             const cr = dir === 'down' ? r + i : r;
             const cc = dir === 'across' ? c + i : c;
             
             const existing = grid[cr][cc];
             if (existing && existing.char !== word[i]) {
                 valid = false;
                 break;
             }
        }
        
        if (valid) {
            // Place
            for(let i=0; i<len; i++) {
                const cr = dir === 'down' ? r + i : r;
                const cc = dir === 'across' ? c + i : c;
                grid[cr][cc] = { char: word[i], input: '' };
            }
            
            placedWords.push({
                 word: word,
                 clue: wordObj.clue,
                 r: r, c: c,
                 dir: dir,
                 number: placedWords.length + 1
            });
            
            // Mark start cell with number
            const startCell = grid[r][c];
            if(!startCell.number) startCell.number = placedWords.length;
        }
    }

    function renderGrid() {
        const container = document.getElementById('crossword-grid');
        container.innerHTML = '';
        container.style.gridTemplateColumns = epeat(, 30px);
        
        for(let r=0; r<GRID_SIZE; r++) {
            for(let c=0; c<GRID_SIZE; c++) {
                const cellData = grid[r][c];
                const div = document.createElement('div');
                div.className = 'cell';
                
                if (cellData) {
                    const input = document.createElement('input');
                    input.maxLength = 1;
                    input.dataset.r = r;
                    input.dataset.c = c;
                    input.value = cellData.input || '';
                    
                    input.addEventListener('focus', () => handleFocus(r, c));
                    input.addEventListener('input', (e) => handleInput(e, r, c));
                    
                    div.appendChild(input);
                    
                    if (cellData.number) {
                        const num = document.createElement('span');
                        num.style.position = 'absolute';
                        num.style.top = '1px';
                        num.style.left = '1px';
                        num.style.fontSize = '8px';
                        num.style.color = '#fff';
                        num.innerText = cellData.number;
                        div.appendChild(num);
                    }
                } else {
                    div.classList.add('block');
                }
                
                container.appendChild(div);
            }
        }
    }

    function renderClues() {
        const acrossList = document.getElementById('clues-across');
        const downList = document.getElementById('clues-down');
        acrossList.innerHTML = '';
        downList.innerHTML = '';
        
        placedWords.forEach(w => {
            const li = document.createElement('li');
            li.innerText = ${w.number}. ;
            li.dataset.word = w.word;
            li.addEventListener('click', () => highlightWord(w));
            
            if (w.dir === 'across') acrossList.appendChild(li);
            else downList.appendChild(li);
        });
    }

    function handleFocus(r, c) {
        selectedCell = { r, c };
        // Find word associated with this cell and display clue?
        // Simple: just find first word that passes through here.
        const word = placedWords.find(w => {
            if (w.dir === 'across') return r === w.r && c >= w.c && c < w.c + w.word.length;
            if (w.dir === 'down') return c === w.c && r >= w.r && r < w.r + w.word.length;
        });
        
        if (word) {
            document.getElementById('current-clue-display').innerText = ${word.number}. ;
        }
    }

    function handleInput(e, r, c) {
        const val = e.target.value.toUpperCase();
        if (grid[r][c]) grid[r][c].input = val;
        
        // Auto advance?
        // Simple direction guess
        // Just focus next cell in DOM
    }
    
    function highlightWord(wordObj) {
        // Highlight logic could go here
    }

    function checkAnswers() {
        let allCorrect = true;
        placedWords.forEach(w => {
            let wordCorrect = true;
            for(let i=0; i<w.word.length; i++) {
                const r = w.dir === 'down' ? w.r + i : w.r;
                const c = w.dir === 'across' ? w.c + i : w.c;
                const cell = grid[r][c];
                if (cell.input !== w.word[i]) {
                    wordCorrect = false;
                    allCorrect = false;
                }
            }
        });
        
        if (allCorrect) {
            if (window.GameUI) window.GameUI.showGameOverScreen(100, 100); 
            else alert('SYSTEM SECURE. ALL PASWORDS CRACKED.');
        } else {
            alert('INTEGRITY FAILURE. INCORRECT ENTRIES.');
        }
    }
    
    function revealWord() {
        // Just fill one random word
        if (placedWords.length === 0) return;
        const w = placedWords[Math.floor(Math.random() * placedWords.length)];
        
        for(let i=0; i<w.word.length; i++) {
             const r = w.dir === 'down' ? w.r + i : w.r;
             const c = w.dir === 'across' ? w.c + i : w.c;
             const cell = grid[r][c];
             
             cell.input = w.word[i];
             // Update DOM
             const input = document.querySelector(input[data-r=''][data-c='']);
             if (input) input.value = w.word[i];
        }
    }

    init();
})();
