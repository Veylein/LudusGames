/*
 * NEON CONNECT 4
 * 
 * Features:
 * - Canvas-based rendering
 * - Neon visual style
 * - Animated chip drops
 * - GameUI Integration
 */

(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Constants
    const COLS = 7;
    const ROWS = 6;
    const CELL_SIZE = 80;
    const OFFSET_X = (canvas.width - (COLS * CELL_SIZE)) / 2;
    const OFFSET_Y = (canvas.height - (ROWS * CELL_SIZE)) / 2;
    
    const COLORS = {
        bg: '#000000',
        board: '#0033cc', // Dark Blue
        boardGlow: 'rgba(0, 51, 204, 0.5)',
        hole: '#050510',
        p1: '#ff0000', // Red
        p1Glow: 'rgba(255, 0, 0, 0.6)',
        p2: '#ffff00', // Yellow
        p2Glow: 'rgba(255, 255, 0, 0.6)',
        highlight: 'rgba(255, 255, 255, 0.1)',
        winLine: '#fff'
    };

    class Connect4Game {
        constructor() {
            this.canvas = canvas;
            this.ctx = ctx;
            
            this.grid = []; // 6x7 0=empty, 1=p1, 2=p2
            this.turn = 1;
            this.isGameOver = false;
            this.isPaused = false;
            this.animations = [];
            
            this.inputHandler = this.handleInput.bind(this);
            this.init();
        }

        init() {
            this.canvas.addEventListener('click', this.inputHandler);
            this.canvas.addEventListener('mousemove', (e) => this.mouseX = e.clientX);
            
            if (window.GameUI) {
                window.GameUI.init(this.canvas, {
                    onStart: () => this.start(),
                    onPause: () => this.togglePause(),
                    onRestart: () => this.start()
                });
                window.GameUI.showStartScreen();
            } else {
                this.start();
            }
        }

        start() {
            this.isGameOver = false;
            this.isPaused = false;
            this.turn = 1;
            this.animations = [];
            this.resetGrid();
            
            if (window.GameUI) {
                window.GameUI.hideStartScreen();
                window.GameUI.hideGameOverScreen();
            }
            this.loop();
        }
        
        togglePause() {
            if (this.isGameOver) return;
            this.isPaused = !this.isPaused;
            if (this.isPaused) {
                if (window.GameUI) window.GameUI.showPauseScreen();
            } else {
                if (window.GameUI) window.GameUI.hidePauseScreen();
                this.loop();
            }
        }

        resetGrid() {
            this.grid = [];
            for(let r=0; r<ROWS; r++) {
                this.grid.push(new Array(COLS).fill(0));
            }
        }

        handleInput(e) {
            if (this.isGameOver || this.isPaused || this.animations.length > 0) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            
            // Map x to column
            // Need to account for OFFSET_X if grid is centered
            const col = Math.floor((x - OFFSET_X) / CELL_SIZE);
            
            if (col >= 0 && col < COLS) {
                this.dropPiece(col);
            }
        }
        
        dropPiece(col) {
            // Find lowest available row
            let row = -1;
            for(let r=ROWS-1; r>=0; r--) {
                if (this.grid[r][col] === 0) {
                    row = r;
                    break;
                }
            }
            
            if (row !== -1) {
                // Animate drop
                this.animations.push({
                    col: col,
                    targetRow: row,
                    y: -CELL_SIZE, // Start above board
                    player: this.turn,
                    velocity: 0
                });
                
                // Set state afterwards? No, set state but don't draw in grid yet?
                // Or draw animation on top.
                // We'll mark grid ONLY after animation finishes.
            }
        }
        
        update() {
            // Process animations
            for (let i = this.animations.length - 1; i >= 0; i--) {
                const anim = this.animations[i];
                anim.velocity += 2; // Gravity
                anim.y += anim.velocity;
                
                const targetY = anim.targetRow * CELL_SIZE; // Relative to grid top
                
                if (anim.y >= targetY) {
                    // Bounce? Or just stop.
                    // Simple stop
                    anim.y = targetY;
                    this.grid[anim.targetRow][anim.col] = anim.player;
                    
                    // Check win
                    if (this.checkWin(anim.targetRow, anim.col, anim.player)) {
                        this.gameOver(anim.player);
                    } else {
                        this.turn = this.turn === 1 ? 2 : 1;
                    }
                    
                    this.animations.splice(i, 1);
                }
            }
        }
        
        checkWin(r, c, p) {
            // Check directions
            const dirs = [[0,1], [1,0], [1,1], [1,-1]];
            
            for (let d of dirs) {
                let count = 1;
                // Check forward
                let i = 1;
                while (true) {
                    const nr = r + d[0]*i;
                    const nc = c + d[1]*i;
                    if (nr>=0 && nr<ROWS && nc>=0 && nc<COLS && this.grid[nr][nc]===p) count++;
                    else break;
                    i++;
                }
                // Check backward
                i = 1;
                while (true) {
                    const nr = r - d[0]*i;
                    const nc = c - d[1]*i;
                    if (nr>=0 && nr<ROWS && nc>=0 && nc<COLS && this.grid[nr][nc]===p) count++;
                    else break;
                    i++;
                }
                
                if (count >= 4) return true;
            }
            return false;
        }
        
        gameOver(winner) {
            this.isGameOver = true;
            if (window.GameUI) {
                window.GameUI.showGameOverScreen(winner === 1 ? 100 : 200, 100);
            }
        }

        draw() {
            this.ctx.fillStyle = COLORS.bg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw Dropping pieces (behind board?)
            // Actually, usually pieces are between two board layers or behind board.
            // Let's draw pieces first, then board with holes.
            
            this.ctx.save();
            this.ctx.translate(OFFSET_X, OFFSET_Y);
            
            // 1. Draw Static Pieces
            for(let r=0; r<ROWS; r++) {
                for(let c=0; c<COLS; c++) {
                    const p = this.grid[r][c];
                    if (p !== 0) {
                        this.drawPiece(c * CELL_SIZE, r * CELL_SIZE, p);
                    }
                }
            }
            
            // 2. Draw Animated Pieces
            this.animations.forEach(anim => {
                this.drawPiece(anim.col * CELL_SIZE, anim.y, anim.player);
            });
            
            // 3. Draw Board Overlay (Blue with holes)
            // Use 'destination-out' to cut holes? Or just draw blue path around holes.
            // Simplified: Draw giant blue rect with hole cutouts using path.
            
            this.ctx.fillStyle = COLORS.board;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = COLORS.boardGlow;
            
            this.ctx.beginPath();
            // Outer rect
            this.ctx.rect(-10, -10, (COLS*CELL_SIZE)+20, (ROWS*CELL_SIZE)+20);
            
            // Cutouts (Counter-clockwise)
            for(let r=0; r<ROWS; r++) {
                for(let c=0; c<COLS; c++) {
                    this.ctx.moveTo((c*CELL_SIZE) + CELL_SIZE/2 + 35, (r*CELL_SIZE) + CELL_SIZE/2);
                    this.ctx.arc((c*CELL_SIZE) + CELL_SIZE/2, (r*CELL_SIZE) + CELL_SIZE/2, 35, 0, Math.PI*2, true);
                }
            }
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            this.ctx.restore();
            
            // Turn
             this.ctx.fillStyle = '#fff';
             this.ctx.font = '20px monospace';
             this.ctx.fillText(Turn: , 10, 30);
        }
        
        drawPiece(x, y, p) {
            const cx = x + CELL_SIZE/2;
            const cy = y + CELL_SIZE/2;
            const r = 35;
            
            const color = p === 1 ? COLORS.p1 : COLORS.p2;
            const glow = p === 1 ? COLORS.p1Glow : COLORS.p2Glow;
            
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = glow;
            this.ctx.fillStyle = color;
            
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Shine
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.beginPath();
            this.ctx.arc(cx - 10, cy - 10, 5, 0, Math.PI*2);
            this.ctx.fill();
        }

        loop() {
            if (this.isPaused) return;
            this.update();
            this.draw();
            requestAnimationFrame(() => this.loop());
        }
    }

    new Connect4Game();
})();
