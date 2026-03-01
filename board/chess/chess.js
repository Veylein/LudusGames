/*
 * NEON CHESS
 * 
 * Features:
 * - Canvas-based rendering
 * - Neon visual style (Cyan vs Red)
 * - Unicode pieces with glow
 * - GameUI Integration
 */

(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Constants
    const BOARD_SIZE = 8;
    const SQUARE_SIZE = canvas.width / BOARD_SIZE;
    
    // Pieces
    const PIECES = {
        P: '', R: '', N: '', B: '', Q: '', K: '', // White (Cyan)
        p: '', r: '', n: '', b: '', q: '', k: ''  // Black (Red)
    };
    
    // Initial Board Setup
    const INITIAL_BOARD = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];

    const COLORS = {
        bg: '#050510',
        light: '#111',
        dark: '#222', 
        highlight: 'rgba(255, 255, 0, 0.2)',
        validMove: 'rgba(0, 255, 0, 0.4)',
        selectedOutline: '#ff0',
        whitePiece: '#0ff', // Cyan
        whiteGlow: 'rgba(0, 255, 255, 0.6)',
        blackPiece: '#f05', // Neon Red
        blackGlow: 'rgba(255, 0, 85, 0.6)'
    };

    class ChessGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = ctx;
            
            // State
            this.board = [];
            this.turn = 'white'; // white | black
            this.whiteCaptured = [];
            this.blackCaptured = [];
            this.selectedSquare = null; // {r, c}
            this.validMoves = [];
            this.isGameOver = false;
            this.isPaused = false;
            
            this.inputHandler = this.handleInput.bind(this);
            this.init();
        }

        init() {
            this.canvas.addEventListener('click', this.inputHandler);
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
            this.turn = 'white';
            this.selectedSquare = null;
            this.validMoves = [];
            
            // Deep copy initial board
            this.board = INITIAL_BOARD.map(row => [...row]);
            
            if (window.GameUI) {
                window.GameUI.hideStartScreen();
                window.GameUI.hideGameOverScreen();
                // window.GameUI.updateScore(0);
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

        handleInput(e) {
            if (this.isGameOver || this.isPaused) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const c = Math.floor(x / SQUARE_SIZE);
            const r = Math.floor(y / SQUARE_SIZE);
            
            if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return;

            // Move?
            const move = this.validMoves.find(m => m.r === r && m.c === c);
            
            if (move) {
                this.executeMove(move);
            } else {
                // Select?
                const piece = this.board[r][c];
                if (piece && this.isPieceTurn(piece)) {
                    this.selectedSquare = { r, c };
                    this.calculateValidMoves(r, c, piece);
                } else {
                    this.selectedSquare = null;
                    this.validMoves = [];
                }
            }
        }
        
        isPieceTurn(piece) {
            const isWhite = piece === piece.toUpperCase();
            return (this.turn === 'white' && isWhite) || (this.turn === 'black' && !isWhite);
        }

        calculateValidMoves(r, c, piece) {
            this.validMoves = [];
            const type = piece.toLowerCase();
            const isWhite = piece === piece.toUpperCase();
            
            // HELPER: Add move if valid
            const add = (nr, nc) => {
                if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) return false; // OOB
                const target = this.board[nr][nc];
                if (target === null) {
                    this.validMoves.push({ r: nr, c: nc });
                    return true; // Use for sliding continuation
                } else {
                    // Capture?
                    const targetIsWhite = target === target.toUpperCase();
                    if (isWhite !== targetIsWhite) {
                        this.validMoves.push({ r: nr, c: nc, capture: true });
                    }
                    return false; // Blocked
                }
            };
            
            const dr = isWhite ? -1 : 1;
            
            // Pawn
            if (type === 'p') {
                // Forward 1
                if (this.board[r+dr] && this.board[r+dr][c] === null) {
                    this.validMoves.push({r: r+dr, c: c});
                    // Start double
                    if ((isWhite && r === 6) || (!isWhite && r === 1)) {
                        if (this.board[r+dr*2][c] === null) {
                            this.validMoves.push({r: r+dr*2, c: c});
                        }
                    }
                }
                // Diagonals (Capture only)
                const checkDiag = (dc) => {
                    const nr = r + dr; 
                    const nc = c + dc;
                    if (nr>=0 && nr<8 && nc>=0 && nc<8) {
                        const target = this.board[nr][nc];
                        if (target && (isWhite !== (target === target.toUpperCase()))) {
                            this.validMoves.push({ r: nr, c: nc, capture: true });
                        }
                    }
                }
                checkDiag(-1); checkDiag(1);
            }
            
            // Knight
            if (type === 'n') {
                const moves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
                moves.forEach(m => add(r+m[0], c+m[1]));
            }
            
            // King
            if (type === 'k') {
                 const moves = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
                 moves.forEach(m => add(r+m[0], c+m[1]));
            }
            
            // Sliding Pieces (R, B, Q)
            const slide = (dirs) => {
                dirs.forEach(d => {
                    let nr = r + d[0];
                    let nc = c + d[1];
                    while (add(nr, nc)) {
                        nr += d[0];
                        nc += d[1];
                    }
                });
            }
            
            if (type === 'r' || type === 'q') slide([[-1,0],[1,0],[0,-1],[0,1]]); // Rook lines
            if (type === 'b' || type === 'q') slide([[-1,-1],[-1,1],[1,-1],[1,1]]); // Bishop diags
        }

        executeMove(move) {
            const piece = this.board[this.selectedSquare.r][this.selectedSquare.c];
            
            // Capture
            const target = this.board[move.r][move.c];
            if (target) {
                if (target.toUpperCase() === 'K') {
                    // King Capture = Win condition logic (Casual mode)
                    this.gameOver(this.turn);
                    return;
                }
            }
            
            // Move
            this.board[move.r][move.c] = piece;
            this.board[this.selectedSquare.r][this.selectedSquare.c] = null;
            
            // Promotion (Auto Queen for now)
            if (piece === 'P' && move.r === 0) this.board[move.r][move.c] = 'Q';
            if (piece === 'p' && move.r === 7) this.board[move.r][move.c] = 'q';
            
            this.selectedSquare = null;
            this.validMoves = [];
            this.turn = this.turn === 'white' ? 'black' : 'white';
        }
        
        gameOver(winner) {
            this.isGameOver = true;
            if (window.GameUI) {
                window.GameUI.showGameOverScreen(100, 100);
            }
        }

        draw() {
            // Bg
            this.ctx.fillStyle = COLORS.bg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Squares
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    const x = c * SQUARE_SIZE;
                    const y = r * SQUARE_SIZE;
                    const isDark = (r + c) % 2 === 1;
                    
                    this.ctx.fillStyle = isDark ? COLORS.dark : COLORS.light;
                    this.ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
                    
                    // Selected
                    if (this.selectedSquare && this.selectedSquare.r === r && this.selectedSquare.c === c) {
                        this.ctx.fillStyle = COLORS.highlight;
                        this.ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
                        this.ctx.strokeStyle = COLORS.selectedOutline;
                        this.ctx.strokeRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
                    }
                    
                     // Valid Move Hint
                    const move = this.validMoves.find(m => m.r === r && m.c === c);
                    if (move) {
                        this.ctx.fillStyle = COLORS.validMove;
                        this.ctx.beginPath();
                        this.ctx.arc(x + SQUARE_SIZE/2, y + SQUARE_SIZE/2, 10, 0, Math.PI*2);
                        this.ctx.fill();
                        if (this.board[r][c]) { // Threatening?
                             this.ctx.strokeStyle = '#f00';
                             this.ctx.strokeRect(x+2, y+2, SQUARE_SIZE-4, SQUARE_SIZE-4);
                        }
                    }

                    // Piece
                    const piece = this.board[r][c];
                    if (piece) {
                        this.drawPiece(piece, x, y);
                    }
                }
            }
            
             // Turn text
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px monospace';
            this.ctx.fillText(Turn: , 10, 30);
        }
        
        drawPiece(char, x, y) {
            const isWhite = char === char.toUpperCase();
            const symbol = PIECES[char]; // Getting undefined?
            // Wait, PIECES is keyed by P, p... yeah.
            // Oh, I only defined logic for 'P', 'p'?
            // Ah, PIECES object has everything.
            
            this.ctx.font = '50px serif'; // Unicode chess needs serif usually
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            const cx = x + SQUARE_SIZE/2;
            const cy = y + SQUARE_SIZE/2 + 5; // Adjustment
            
            // Glow
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = isWhite ? COLORS.whiteGlow : COLORS.blackGlow;
            
            this.ctx.fillStyle = isWhite ? COLORS.whitePiece : COLORS.blackPiece;
            this.ctx.fillText(symbol || char, cx, cy);
            
            this.ctx.shadowBlur = 0;
        }

        loop() {
            if (this.isPaused) return;
            this.draw();
            requestAnimationFrame(() => this.loop());
        }
    }

    new ChessGame();
})();
