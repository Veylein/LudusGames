/*
 * NEON CHECKERS
 * 
 * Features:
 * - Canvas-based rendering
 * - Neon visual style (Red vs Cyan)
 * - Animated piece movement
 * - GameUI Integration
 */

(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Constants
    const BOARD_SIZE = 8;
    // Set explicit size if needed, but assuming 600 from HTML
    const SQUARE_SIZE = canvas.width / BOARD_SIZE;
    
    const COLORS = {
        bg: '#000000',
        gridLight: '#111',
        gridDark: '#222', 
        gridBorder: '#0ff', // Neon Blue
        p1: '#ff0055',      // Neon Red
        p1Glow: 'rgba(255, 0, 85, 0.6)',
        p2: '#00ccff',      // Neon Cyan
        p2Glow: 'rgba(0, 204, 255, 0.6)',
        highlight: 'rgba(255, 255, 0, 0.3)',
        validMove: 'rgba(0, 255, 0, 0.5)',
        text: '#fff'
    };

    class CheckersGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = ctx;
            
            // Game State
            this.board = []; // 8x8 Grid
            this.turn = 1;   // 1 (Red/Bottom) or 2 (Cyan/Top)
            this.selectedPiece = null; // {r, c}
            this.validMoves = [];      // Array of moves
            this.redPieces = 12;
            this.cyanPieces = 12;
            this.isGameOver = false;
            this.isPaused = false;
            
            this.init();
        }

        init() {
            this.canvas.addEventListener('click', (e) => this.handleInput(e));
            
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
            this.redPieces = 12;
            this.cyanPieces = 12;
            this.resetBoard();
            
            if (window.GameUI) {
                window.GameUI.hideStartScreen();
                window.GameUI.hideGameOverScreen();
                window.GameUI.updateScore(0);
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
        
        resetBoard() {
            this.board = [];
            for (let r = 0; r < BOARD_SIZE; r++) {
                let row = [];
                for (let c = 0; c < BOARD_SIZE; c++) {
                    let piece = null;
                    if ((r + c) % 2 === 1) { // Dark squares only
                        if (r < 3) piece = { player: 2, isKing: false }; // Cyan
                        else if (r > 4) piece = { player: 1, isKing: false }; // Red
                    }
                    row.push(piece);
                }
                this.board.push(row);
            }
        }

        handleInput(e) {
            if (this.isGameOver || this.isPaused) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const c = Math.floor(x / SQUARE_SIZE);
            const r = Math.floor(y / SQUARE_SIZE);
            
            if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return;

            // Check if clicked strictly within a valid move hint
            const move = this.validMoves.find(m => m.toR === r && m.toC === c);
            
            if (move) {
                this.executeMove(move);
            } else {
                // Select piece
                const piece = this.board[r][c];
                if (piece && piece.player === this.turn) {
                    this.selectedPiece = { r, c };
                    this.calculateValidMoves(r, c, piece);
                } else {
                    this.selectedPiece = null;
                    this.validMoves = [];
                }
            }
        }

        calculateValidMoves(r, c, piece) {
            this.validMoves = [];
            const directions = [];
            
            if (piece.player === 1 || piece.isKing) { // Red moves UP (-r)
                directions.push({dr: -1, dc: -1});
                directions.push({dr: -1, dc: 1});
            }
            if (piece.player === 2 || piece.isKing) { // Cyan moves DOWN (+r)
                directions.push({dr: 1, dc: -1});
                directions.push({dr: 1, dc: 1});
            }

            // Simple Moves
            directions.forEach(dir => {
                const nr = r + dir.dr;
                const nc = c + dir.dc;
                
                if (this.isValidPos(nr, nc) && this.board[nr][nc] === null) {
                    this.validMoves.push({ 
                        toR: nr, toC: nc, 
                        isJump: false 
                    });
                }
            });

            // Capture Moves (Jumps)
            directions.forEach(dir => {
                const midR = r + dir.dr;
                const midC = c + dir.dc;
                const destR = r + dir.dr * 2;
                const destC = c + dir.dc * 2;
                
                if (this.isValidPos(destR, destC)) {
                    const midPiece = this.board[midR][midC];
                    const destPiece = this.board[destR][destC];
                    
                    if (midPiece && midPiece.player !== piece.player && destPiece === null) {
                         this.validMoves.push({
                            toR: destR, toC: destC,
                            isJump: true,
                            jumpR: midR,
                            jumpC: midC
                         });
                    }
                }
            });
        }
        
        isValidPos(r, c) {
            return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
        }

        executeMove(move) {
            const piece = this.board[this.selectedPiece.r][this.selectedPiece.c];
            
            // Move Logic
            this.board[this.selectedPiece.r][this.selectedPiece.c] = null;
            this.board[move.toR][move.toC] = piece;
            
            // Handle Jump
            if (move.isJump) {
                const captured = this.board[move.jumpR][move.jumpC];
                this.board[move.jumpR][move.jumpC] = null;
                if (captured.player === 1) this.redPieces--;
                else this.cyanPieces--;
            }
            
            // King Promotion
            if (piece.player === 1 && move.toR === 0) piece.isKing = true;
            if (piece.player === 2 && move.toR === BOARD_SIZE - 1) piece.isKing = true;
            
            this.selectedPiece = null;
            this.validMoves = [];
            
            // Check Win
            if (this.redPieces === 0) this.gameOver(2);
            else if (this.cyanPieces === 0) this.gameOver(1);
            else {
                this.turn = this.turn === 1 ? 2 : 1;
            }
        }
        
        gameOver(winner) {
            this.isGameOver = true;
            if (window.GameUI) {
                window.GameUI.showGameOverScreen(winner === 1 ? 100 : 0, 100); 
            }
        }

        update() {
            // Update particles if any
        }

        draw() {
            // Clear
            this.ctx.fillStyle = COLORS.bg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw Board
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    const x = c * SQUARE_SIZE;
                    const y = r * SQUARE_SIZE;
                    
                    const isDark = (r + c) % 2 === 1;
                    
                    this.ctx.fillStyle = isDark ? COLORS.gridDark : COLORS.gridLight;
                    this.ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
                    
                    // Grid Lines
                    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
                    this.ctx.strokeRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
                    
                    // Highlight Start/Dest
                    if (this.selectedPiece && this.selectedPiece.r === r && this.selectedPiece.c === c) {
                        this.ctx.fillStyle = COLORS.highlight;
                        this.ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
                        this.ctx.strokeStyle = '#ff0';
                        this.ctx.strokeRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
                    }
                    
                    // Pieces
                    const piece = this.board[r][c];
                    if (piece) {
                        this.drawPiece(x + SQUARE_SIZE/2, y + SQUARE_SIZE/2, piece.player, piece.isKing);
                    }
                    
                    // Move Hints
                    const move = this.validMoves.find(m => m.toR === r && m.toC === c);
                    if (move) {
                        this.ctx.fillStyle = COLORS.validMove;
                        this.ctx.beginPath();
                        this.ctx.arc(x + SQUARE_SIZE/2, y + SQUARE_SIZE/2, 10, 0, Math.PI*2);
                        this.ctx.fill();
                        
                        if (move.isJump) {
                            this.ctx.strokeStyle = '#f00';
                            this.ctx.lineWidth = 2;
                            this.ctx.stroke();
                        }
                    }
                }
            }
            
            // Turn text
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px monospace';
            this.ctx.fillText(Turn: , 10, 30);
        }
        
        drawPiece(cx, cy, player, isKing) {
            const r = SQUARE_SIZE * 0.35;
            
            const color = player === 1 ? COLORS.p1 : COLORS.p2;
            const glow = player === 1 ? COLORS.p1Glow : COLORS.p2Glow;
            
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r, 0, Math.PI*2);
            this.ctx.fill();
            
            this.ctx.lineWidth = 4;
            this.ctx.strokeStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r, 0, Math.PI*2);
            this.ctx.stroke();
            
            if (isKing) {
                this.ctx.fillStyle = color;
                this.ctx.font = '30px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('K', cx, cy);
            } else {
                 // Inner Ring
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, r * 0.5, 0, Math.PI*2);
                this.ctx.stroke();
            }
            
            this.ctx.shadowBlur = 0;
        }

        loop() {
            if (this.isPaused) return;

            this.update();
            this.draw();
            requestAnimationFrame(() => this.loop());
        }
    }

    new CheckersGame();
})();
