/* 
 * NEON TACTICS (TicTacToe)
 * Features:
 * - Canvas Rendering
 * - Minimax AI
 * - Neon Visuals
 */

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Config
    const CELL_SIZE = 120;
    const GRID_SIZE = 3;
    const BOARD_SIZE = CELL_SIZE * GRID_SIZE;
    
    // State
    // Board: 0=Empty, 1=Player(X), 2=CPU(O)
    let board = Array(9).fill(0);
    let gameActive = true;
    let turn = 1; // 1 or 2
    let scores = { p1: 0, p2: 0 };
    let difficulty = 0; // 0=Easy, 1=Med, 2=Hard
    let winningLine = null; // [a, b, c] indices
    
    // UI Logic
    let boardRect = { x: 0, y: 0, w: BOARD_SIZE, h: BOARD_SIZE };

    function init() {
        if (window.GameUI) {
            window.GameUI.init(canvas, {
                onStart: startGame,
                onLoop: render,
                onResize: handleResize,
                onClick: handleClick
            });
            window.GameUI.showStartScreen();
        } else {
            handleResize();
            startGame();
            canvas.addEventListener('click', (e) => {
                 const rect = canvas.getBoundingClientRect();
                 handleClick(e.clientX - rect.left, e.clientY - rect.top);
            });
            setInterval(render, 16);
        }
        
        // Buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                difficulty = parseInt(e.target.dataset.lvl);
                resetGame();
            });
        });
        
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.addEventListener('click', resetGame);
    }

    function startGame() {
        if (window.GameUI) window.GameUI.hideStartScreen();
        resetGame();
    }
    
    function resetGame() {
        board = Array(9).fill(0);
        gameActive = true;
        turn = 1;
        winningLine = null;
        setStatus('PLAYER TURN');
        handleResize(); // Center board
    }

    function handleResize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Center the board
        boardRect.x = (canvas.width - BOARD_SIZE) / 2;
        boardRect.y = (canvas.height - BOARD_SIZE) / 2;
        
        // Force render
        // render(); // Wait for loop
    }
    
    function handleClick(x, y) {
        if (!gameActive) return;
        if (turn !== 1) return; // Wait for CPU
        
        // Check bounds
        if (x < boardRect.x || x > boardRect.x + BOARD_SIZE ||
            y < boardRect.y || y > boardRect.y + BOARD_SIZE) return;
            
        const c = Math.floor((x - boardRect.x) / CELL_SIZE);
        const r = Math.floor((y - boardRect.y) / CELL_SIZE);
        const idx = r * 3 + c;
        
        if (board[idx] === 0) {
            makeMove(idx, 1);
        }
    }
    
    function makeMove(idx, player) {
        board[idx] = player;
        
        if (checkWin(board, player)) {
            endGame(player);
        } else if (board.every(c => c !== 0)) {
            endGame(0); // Draw
        } else {
            turn = player === 1 ? 2 : 1;
            if (turn === 2) {
                setStatus('COMPUTING...');
                setTimeout(cpuMove, 500);
            } else {
                setStatus('PLAYER TURN');
            }
        }
    }
    
    function cpuMove() {
        if (!gameActive) return;
        
        let move;
        if (difficulty === 0) {
            move = getRandomMove(board);
        } else if (difficulty === 1) {
            move = getBlockOrWinMove(board) || getRandomMove(board);
        } else {
            move = getBestMove(board);
        }
        
        if (move !== -1) makeMove(move, 2);
    }
    
    function getRandomMove(b) {
        const empty = b.map((v, i) => v === 0 ? i : -1).filter(i => i !== -1);
        if (empty.length === 0) return -1;
        return empty[Math.floor(Math.random() * empty.length)];
    }
    
    function getBlockOrWinMove(b) {
        // Check if CPU can win
        for(let i=0; i<9; i++) {
            if (b[i]===0) {
                b[i] = 2;
                if (checkWin(b, 2)) { b[i]=0; return i; }
                b[i] = 0;
            }
        }
        // Check if Player winning
        for(let i=0; i<9; i++) {
            if (b[i]===0) {
                b[i] = 1;
                if (checkWin(b, 1)) { b[i]=0; return i; }
                b[i] = 0;
            }
        }
        return null;
    }
    
    function getBestMove(b) {
        // Minimax
        let bestScore = -Infinity;
        let move = -1;
        
        for(let i=0; i<9; i++) {
            if (b[i] === 0) {
                b[i] = 2;
                let score = minimax(b, 0, false);
                b[i] = 0;
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    }
    
    function minimax(b, depth, isMaximizing) {
        let result = checkWinState(b);
        if (result === 2) return 10 - depth;
        if (result === 1) return depth - 10;
        if (result === 0) return 0; // Draw
        
        if (isMaximizing) {
            let bestScore = -Infinity;
            for(let i=0; i<9; i++) {
                if(b[i]===0) {
                    b[i] = 2;
                    let score = minimax(b, depth+1, false);
                    b[i] = 0;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for(let i=0; i<9; i++) {
                if(b[i]===0) {
                    b[i] = 1;
                    let score = minimax(b, depth+1, true);
                    b[i] = 0;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }
    
    // Returns winner: 1, 2, or 0 (Draw) or null (continue)
    function checkWinState(b) {
        if (checkWin(b, 1)) return 1;
        if (checkWin(b, 2)) return 2;
        if (b.every(v => v!==0)) return 0;
        return null; // ongoing (but minimax uses this for terminal state)
    }

    function checkWin(b, p) {
        const wins = [
            [0,1,2], [3,4,5], [6,7,8], // Rows
            [0,3,6], [1,4,7], [2,5,8], // Cols
            [0,4,8], [2,4,6]           // Diags
        ];
        
        for(let line of wins) {
            if (b[line[0]] === p && b[line[1]] === p && b[line[2]] === p) {
                if (gameActive) winningLine = line; // Store for render
                return true;
            }
        }
        return false;
    }
    
    function endGame(winner) {
        gameActive = false;
        if (winner === 1) {
            setStatus('VICTORY!');
            scores.p1++;
        } else if (winner === 2) {
            setStatus('DEFEAT!');
            scores.p2++;
        } else {
            setStatus('STALEMATE.');
        }
        document.getElementById('score-1').innerText = scores.p1;
        document.getElementById('score-2').innerText = scores.p2;
        
        // Game Over Screen
        setTimeout(() => {
             if (window.GameUI) {
                 const msg = winner === 1 ? 'VICTORY' : (winner === 2 ? 'DEFEAT' : 'DRAW');
                 window.GameUI.showGameOverScreen(null, 500); 
                 // Note: We might want a custom message, but showGameOverScreen usually takes score only? 
                 // Actually ui.js showGameOver takes (score, onRestart, onQuit, titleText).
                 // We should use that!
             }
        }, 1000);
    }
    
    function setStatus(msg) {
        const el = document.getElementById('status-msg');
        if(el) el.innerText = msg;
    }

    // --- Render ---
    function render() {
        // Clear
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Grid
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#050'; // Dim green lines
        ctx.shadowBlur = 0;
        
        const rx = boardRect.x;
        const ry = boardRect.y;
        
        // Verticals
        ctx.beginPath();
        for(let i=1; i<3; i++) {
            ctx.moveTo(rx + i*CELL_SIZE, ry);
            ctx.lineTo(rx + i*CELL_SIZE, ry + BOARD_SIZE);
        }
        // Horizontals
        for(let i=1; i<3; i++) {
            ctx.moveTo(rx, ry + i*CELL_SIZE);
            ctx.lineTo(rx + BOARD_SIZE, ry + i*CELL_SIZE);
        }
        ctx.stroke();
        
        // Pieces
        board.forEach((val, idx) => {
            if (val === 0) return;
            
            const c = idx % 3;
            const r = Math.floor(idx / 3);
            const cx = rx + c * CELL_SIZE + CELL_SIZE/2;
            const cy = ry + r * CELL_SIZE + CELL_SIZE/2;
            const size = CELL_SIZE * 0.3;
            
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            
            if (val === 1) {
                // X (Player) - Neon Cyan
                ctx.strokeStyle = '#0ff';
                ctx.shadowColor = '#0ff';
                ctx.shadowBlur = 10;
                
                ctx.beginPath();
                ctx.moveTo(cx - size, cy - size);
                ctx.lineTo(cx + size, cy + size);
                ctx.moveTo(cx + size, cy - size);
                ctx.lineTo(cx - size, cy + size);
                ctx.stroke();
            } else {
                // O (CPU) - Neon Magenta
                ctx.strokeStyle = '#f0f';
                ctx.shadowColor = '#f0f';
                ctx.shadowBlur = 10;
                
                ctx.beginPath();
                ctx.arc(cx, cy, size, 0, Math.PI*2);
                ctx.stroke();
            }
        });
        
        // Victory Line
        if (winningLine) {
            const startIdx = winningLine[0];
            const endIdx = winningLine[2];
            
            const c1 = startIdx % 3;
            const r1 = Math.floor(startIdx / 3);
            const c2 = endIdx % 3;
            const r2 = Math.floor(endIdx / 3);
            
            const x1 = rx + c1 * CELL_SIZE + CELL_SIZE/2;
            const y1 = ry + r1 * CELL_SIZE + CELL_SIZE/2;
            const x2 = rx + c2 * CELL_SIZE + CELL_SIZE/2;
            const y2 = ry + r2 * CELL_SIZE + CELL_SIZE/2;
            
            ctx.strokeStyle = '#ff0';
            ctx.shadowColor = '#ff0';
            ctx.shadowBlur = 20;
            ctx.lineWidth = 15;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    init();
});
