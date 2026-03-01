/*
 * DATA MINER (Word Search)
 * Theme: Matrix/Hacking
 * Logic: Grid generation and Canvas selection
 */

(function() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Config
    const CELL_SIZE = 35;
    const GRID_W = 15;
    const GRID_H = 15;
    
    const TERMS = [
        'ALGORITHM', 'BINARY', 'CACHE', 'DATA', 'ENCRYPT', 'FIREWALL', 'GLITCH', 'HACKER', 
        'INPUT', 'JAVA', 'KERNEL', 'LOGIN', 'MALWARE', 'NETWORK', 'OUTPUT', 'PIXEL', 
        'QUERY', 'ROUTER', 'SERVER', 'TOKEN', 'USER', 'VIRUS', 'WIFI', 'ZERO',
        'ADMIN', 'BACKUP', 'COOKIE', 'DEBUG', 'EMAIL', 'FOLDER', 'GIGABYTE', 'HTML'
    ];
    
    // State
    let grid = []; // 2D array of chars
    let words = []; // List of {word, found, color}
    let placedWords = []; // List of {word, r, c, dr, dc, len} to verify location
    
    let selection = { active: false, r1: -1, c1: -1, r2: -1, c2: -1 };
    let foundLines = []; // {r1,c1, r2,c2, color}
    
    // Layout
    let offsetX = 0;
    let offsetY = 0;
    let startTime = 0;
    let timerInterval = null;

    function init() {
        if (window.GameUI) {
            window.GameUI.init(canvas, {
                onStart: startGame,
                onLoop: loop,
                onResize: handleResize
            });
            
            // Custom Input Handling for Drag
            // GameUI might capture clicks, but we need drag.
            // Let's attach our own listeners to canvas, GameUI won't mind if we don't block.
            canvas.addEventListener('mousedown', handleDown);
            canvas.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
            canvas.addEventListener('touchstart', handleDown);
            canvas.addEventListener('touchmove', handleMove);
            window.addEventListener('touchend', handleUp);
            
            window.GameUI.showStartScreen();
        } else {
            handleResize();
            startGame();
            setInterval(loop, 16);
        }
    }

    function startGame() {
        if (window.GameUI) window.GameUI.hideStartScreen();
        
        generateGrid();
        startTime = Date.now();
        if(timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
        
        updateUI();
    }
    
    function updateTimer() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const s = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('timer-stat').innerText = TIME: :;
    }

    function generateGrid() {
        // Init Empty
        grid = Array(GRID_H).fill(0).map(() => Array(GRID_W).fill(''));
        placedWords = [];
        foundLines = [];
        
        // Pick random words
        const pool = [...TERMS].sort(() => Math.random() - 0.5);
        const targetCount = 12;
        words = [];
        
        for(let w of pool) {
            if (words.length >= targetCount) break;
            if (placeWord(w)) {
                words.push({ text: w, found: false });
            }
        }
        
        // Fill empty
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for(let r=0; r<GRID_H; r++) {
            for(let c=0; c<GRID_W; c++) {
                if(grid[r][c] === '') {
                    grid[r][c] = chars[Math.floor(Math.random() * chars.length)];
                }
            }
        }
    }
    
    function placeWord(word) {
        // Try random positions and directions
        const dirs = [
            {r:0, c:1}, {r:1, c:0}, {r:1, c:1}, {r:1, c:-1}, // Standard
            {r:0, c:-1}, {r:-1, c:0}, {r:-1, c:-1}, {r:-1, c:1} // Reverse
        ];
        
        for(let attempt=0; attempt<50; attempt++) {
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            const r = Math.floor(Math.random() * GRID_H);
            const c = Math.floor(Math.random() * GRID_W);
            
            if (canPlace(word, r, c, dir)) {
                // Place
                for(let i=0; i<word.length; i++) {
                    grid[r + dir.r*i][c + dir.c*i] = word[i];
                }
                placedWords.push({ word, r, c, dr: dir.r, dc: dir.c, len: word.length });
                return true;
            }
        }
        return false;
    }
    
    function canPlace(word, r, c, dir) {
        if (r < 0 || c < 0 || r >= GRID_H || c >= GRID_W) return false;
        
        // Check end bounds
        const endR = r + dir.r * (word.length - 1);
        const endC = c + dir.c * (word.length - 1);
        if (endR < 0 || endC < 0 || endR >= GRID_H || endC >= GRID_W) return false;
        
        // Check overlap
        for(let i=0; i<word.length; i++) {
            const char = grid[r + dir.r*i][c + dir.c*i];
            if (char !== '' && char !== word[i]) return false;
        }
        
        return true;
    }
    
    function handleResize() {
        canvas.width = window.innerWidth - 250; // Sidebar adjustment
        canvas.height = window.innerHeight;
        
        if (canvas.width <= 0) canvas.width = window.innerWidth; // Mobile fallback
        
        offsetX = (canvas.width - GRID_W * CELL_SIZE) / 2;
        offsetY = (canvas.height - GRID_H * CELL_SIZE) / 2;
    }
    
    // --- Input ---
    
    function getGridPos(e) {
        const rect = canvas.getBoundingClientRect();
        let x, y;
        if (e.touches) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        
        const c = Math.floor((x - offsetX) / CELL_SIZE);
        const r = Math.floor((y - offsetY) / CELL_SIZE);
        return {r, c};
    }
    
    function handleDown(e) {
        const pos = getGridPos(e);
        if (pos.r >= 0 && pos.r < GRID_H && pos.c >= 0 && pos.c < GRID_W) {
            selection.active = true;
            selection.r1 = pos.r;
            selection.c1 = pos.c;
            selection.r2 = pos.r;
            selection.c2 = pos.c;
        }
    }
    
    function handleMove(e) {
        if (!selection.active) return;
        const pos = getGridPos(e);
        
        // Constrain dragging to 8 directions? 
        // Or just let it float and snap to nearest valid 45-degree line end?
        // Let's update raw 2, but we validate later
        selection.r2 = pos.r;
        selection.c2 = pos.c;
    }
    
    function handleUp(e) {
        if (!selection.active) return;
        selection.active = false;
        
        checkSelection();
    }
    
    function checkSelection() {
        // Normalize vector to nearest 45 deg
        let dr = selection.r2 - selection.r1;
        let dc = selection.c2 - selection.c1;
        
        if (dr === 0 && dc === 0) return;
        
        // Get direction
        // If mostly horizontal, make vertical 0
        if (Math.abs(dr) > Math.abs(dc) * 2) dc = 0;
        else if (Math.abs(dc) > Math.abs(dr) * 2) dr = 0;
        else {
            // Diagonal needs equal steps
            const dist = Math.max(Math.abs(dr), Math.abs(dc));
            dr = Math.sign(dr) * dist;
            dc = Math.sign(dc) * dist;
        }
        
        const len = Math.max(Math.abs(dr), Math.abs(dc));
        const stepR = Math.sign(dr);
        const stepC = Math.sign(dc);
        
        // Construct string
        let str = '';
        let rev = ''; // User might drag backwards
        
        for(let i=0; i<=len; i++) {
            const r = selection.r1 + stepR * i;
            const c = selection.c1 + stepC * i;
            if (r<0 || r>=GRID_H || c<0 || c>=GRID_W) break; // Out of bounds
            str += grid[r][c];
        }
        rev = str.split('').reverse().join('');
        
        // Check match
        let foundWord = words.find(w => !w.found && (w.text === str || w.text === rev));
        
        if (foundWord) {
            foundWord.found = true;
            foundLines.push({
                r1: selection.r1, c1: selection.c1,
                r2: selection.r1 + dr, c2: selection.c1 + dc,
                color: '#0f0'
            });
            updateUI();
            
            if (words.every(w => w.found)) {
                // Win
                window.GameUI.showGameOverScreen ? window.GameUI.showGameOverScreen(100, 100) : alert('ALL DATA MINED!');
            }
        }
    }
    
    function updateUI() {
        // Update list
        const list = document.getElementById('word-bank');
        list.innerHTML = '';
        words.forEach(w => {
            const div = document.createElement('div');
            div.className = 'word-item ' + (w.found ? 'found' : '');
            div.innerText = w.text;
            list.appendChild(div);
        });
        
        document.getElementById('found-stat').innerText = FOUND: /;
    }
    
    function loop() {
        // Clear
        ctx.fillStyle = '#000500';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(offsetX, offsetY);
        
        // Grid Values
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '20px Courier New';
        
        for(let r=0; r<GRID_H; r++) {
            for(let c=0; c<GRID_W; c++) {
                const char = grid[r][c];
                const x = c * CELL_SIZE + CELL_SIZE/2;
                const y = r * CELL_SIZE + CELL_SIZE/2;
                
                // Color
                ctx.fillStyle = '#050';
                
                // If part of found line? (Handled by foundLines overlay)
                
                ctx.fillText(char, x, y);
            }
        }
        
        // Found Lines
        foundLines.forEach(l => {
            drawLine(l.r1, l.c1, l.r2, l.c2, '#0f0', 0.5);
        });
        
        // Active Selection
        if (selection.active) {
            drawLine(selection.r1, selection.c1, selection.r2, selection.c2, '#0ff', 0.3);
        }
        
        ctx.restore();
    }
    
    function drawLine(r1, c1, r2, c2, color, alpha) {
        const x1 = c1 * CELL_SIZE + CELL_SIZE/2;
        const y1 = r1 * CELL_SIZE + CELL_SIZE/2;
        const x2 = c2 * CELL_SIZE + CELL_SIZE/2;
        const y2 = r2 * CELL_SIZE + CELL_SIZE/2;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 25;
        ctx.lineCap = 'round';
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    init();
})();
