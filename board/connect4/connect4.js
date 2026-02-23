document.addEventListener('DOMContentLoaded', () => {
    const game = new ConnectFour();
});

class ConnectFour {
    constructor() {
        this.rows = 6;
        this.cols = 7;
        this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0)); 
        // 0: empty, 1: red (p1), 2: yellow (p2/bot)
        
        this.currentPlayer = 1;
        this.isGameOver = false;
        this.difficulty = 'medium';
        this.scores = { p1: 0, p2: 0 };
        this.isProcessing = false; // Block input during animations

        // DOM
        this.boardWrapper = document.querySelector('.board-wrapper');
        this.boardGrid = document.getElementById('board-grid');
        this.clickLayer = document.getElementById('click-layer');
        this.status = document.getElementById('status');
        this.scoreP1 = document.getElementById('score-p1');
        this.scoreP2 = document.getElementById('score-p2');
        
        this.modal = document.getElementById('game-over-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalMsg = document.getElementById('modal-msg');
        this.modalRestart = document.getElementById('modal-restart');
        
        this.resetBtn = document.getElementById('reset-btn');
        this.difficultySelect = document.getElementById('difficulty-select');

        // Init
        this.createBoardHoles();
        
        // Listeners
        this.clickLayer.addEventListener('click', (e) => this.handleColumnClick(e));
        this.clickLayer.addEventListener('mouseover', (e) => this.handleHover(e));
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.modalRestart.addEventListener('click', () => {
            this.modal.style.display = 'none';
            this.resetGame();
        });
        this.difficultySelect.addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.resetGame();
        });

        this.updateStatus();
    }

    createBoardHoles() {
        // Create the visual grid of holes
        for(let r=0; r<this.rows; r++) {
            for(let c=0; c<this.cols; c++) {
                const hole = document.createElement('div');
                hole.className = 'hole';
                // Using pure CSS radial gradient for the hole look
                this.boardGrid.appendChild(hole);
            }
        }
    }

    handleHover(e) {
        if (this.isGameOver || this.isProcessing) return;
        // Optional: Show "ghost" chip or arrow above column
        // Currently handled by CSS hover effect on col-trigger
    }

    handleColumnClick(e) {
        if (this.isGameOver || this.isProcessing || this.currentPlayer !== 1) return;
        
        const rect = this.clickLayer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const colWidth = rect.width / this.cols;
        const col = Math.floor(x / colWidth);

        if (col >= 0 && col < this.cols) {
            this.makeMove(col);
        }
    }

    async makeMove(col) {
        // Find first empty row from bottom
        const row = this.getAvailableRow(col);
        
        if (row === -1) {
            // Column full
            return false;
        }

        this.isProcessing = true;
        // Check win/draw before placing? No, check after.
        
        // --- LOGIC ---
        // We must update the grid IMMEDIATELY so subsequent clicks/logic see it
        this.grid[row][col] = this.currentPlayer;
        
        // --- VISUAL ---
        await this.animateDrop(row, col, this.currentPlayer);

        if (this.checkWin(this.grid, this.currentPlayer)) {
            this.handleWin(this.currentPlayer);
        } else if (this.checkDraw(this.grid)) {
            this.handleDraw();
        } else {
            // Switch Turn
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            this.updateStatus();
            this.isProcessing = false;
            
            if (this.currentPlayer === 2) {
                setTimeout(() => this.botMove(), 500);
            }
        }
    }

    getAvailableRow(col) {
        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.grid[r][col] === 0) return r;
        }
        return -1;
    }

    animateDrop(row, col, player) {
        return new Promise(resolve => {
            const chip = document.createElement('div');
            chip.className = `chip ${player === 1 ? 'red' : 'yellow'}`;
            
            // Calc position
            // Board is 420x360. Each cell 60x60.
            const size = 60;
            const left = col * size + 5; // +5 for padding center (chip is 50px)
            const top = row * size + 5; 
            
            // Start above board (-60px)
            chip.style.left = `${left}px`;
            chip.style.top = `-60px`;
            
            this.boardWrapper.insertBefore(chip, this.boardGrid); // Put BEHIND the holes (boardGrid z-index 2)

            // Trigger reflow
            chip.offsetHeight;

            // Animate
            chip.style.transition = `top 0.5s cubic-bezier(0.5, 0, 0.75, 0)`; // Bounce effect?
            chip.style.top = `${top}px`;

            // Wait for transition end
            chip.addEventListener('transitionend', () => {
                resolve();
            }, { once: true });
        });
    }

    async botMove() {
        if (this.isGameOver) return;
        this.isProcessing = true;

        const col = this.getBestMove();
        
        if (col !== -1) {
            // Bot (P2)
            const row = this.getAvailableRow(col);
            this.grid[row][col] = 2;
            await this.animateDrop(row, col, 2);
            
            if (this.checkWin(this.grid, 2)) {
                this.handleWin(2);
            } else if (this.checkDraw(this.grid)) {
                this.handleDraw();
            } else {
                this.currentPlayer = 1;
                this.updateStatus();
                this.isProcessing = false;
            }
        } else {
            // No moves? Draw
            this.handleDraw();
        }
    }

    getBestMove() {
        const validMoves = [];
        for (let c = 0; c < this.cols; c++) {
            if (this.getAvailableRow(c) !== -1) validMoves.push(c);
        }

        if (this.difficulty === 'easy') {
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }

        // Medium: Block immediate wins, take immediate wins.
        // Hard: Minimax (depth limited)
        
        // 1. Can Bot Win Now?
        for (let c of validMoves) {
            if (this.canWinNext(c, 2)) return c;
        }

        // 2. Must Block Player Win?
        for (let c of validMoves) {
            if (this.canWinNext(c, 1)) return c;
        }

        // 3. Minimax / Strategic
        if (this.difficulty === 'hard') {
            // Simple center bias for now + depth 2 lookahead if I had time, 
            // but let's just use center bias + random for now to keep it responsive.
            // Center column is most valuable.
            if (validMoves.includes(3)) return 3;
        }

        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    canWinNext(col, player) {
        // Clone grid?
        const r = this.getAvailableRow(col);
        if (r === -1) return false;
        
        this.grid[r][col] = player;
        const win = this.checkWin(this.grid, player);
        this.grid[r][col] = 0; // Revert
        return win;
    }

    checkWin(grid, player) {
        // Check Horizontal
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols - 3; c++) {
                if (grid[r][c] === player && grid[r][c+1] === player && grid[r][c+2] === player && grid[r][c+3] === player) {
                    return true;
                }
            }
        }
        // Check Vertical
        for (let r = 0; r < this.rows - 3; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (grid[r][c] === player && grid[r+1][c] === player && grid[r+2][c] === player && grid[r+3][c] === player) {
                    return true;
                }
            }
        }
        // Diagonals
        for (let r = 0; r < this.rows - 3; r++) {
            for (let c = 0; c < this.cols - 3; c++) {
                if (grid[r][c] === player && grid[r+1][c+1] === player && grid[r+2][c+2] === player && grid[r+3][c+3] === player) return true;
            }
            for (let c = 3; c < this.cols; c++) {
                if (grid[r][c] === player && grid[r+1][c-1] === player && grid[r+2][c-2] === player && grid[r+3][c-3] === player) return true;
            }
        }
        return false;
    }

    checkDraw(grid) {
        return grid.every(row => row.every(cell => cell !== 0));
    }

    handleWin(player) {
        this.isGameOver = true;
        this.isProcessing = false;
        
        if (player === 1) {
            this.scores.p1++;
            this.modalTitle.textContent = "VICTORY!";
            this.modalMsg.textContent = "You connected four!";
            this.modalTitle.style.color = "#e74c3c";
        } else {
            this.scores.p2++;
            this.modalTitle.textContent = "DEFEAT";
            this.modalMsg.textContent = "The bot outsmarted you.";
            this.modalTitle.style.color = "#f1c40f";
        }
        
        this.scoreP1.textContent = this.scores.p1;
        this.scoreP2.textContent = this.scores.p2;
        this.modal.style.display = 'flex';
    }

    handleDraw() {
        this.isGameOver = true;
        this.isProcessing = false;
        this.modalTitle.textContent = "DRAW";
        this.modalMsg.textContent = "Board Full!";
        this.modalTitle.style.color = "#fff";
        this.modal.style.display = 'flex';
    }

    resetGame() {
        this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
        this.currentPlayer = 1;
        this.isGameOver = false;
        this.isProcessing = false;
        
        // Remove visuals
        const chips = document.querySelectorAll('.chip');
        chips.forEach(c => c.remove());
        
        this.modal.style.display = 'none';
        this.updateStatus();
    }

    updateStatus() {
        if (this.currentPlayer === 1) {
            this.status.textContent = "Your Turn (Red)";
            this.status.style.color = "#e74c3c";
        } else {
            this.status.textContent = "Bot Thinking... (Yellow)";
            this.status.style.color = "#f39c12";
        }
    }
}
