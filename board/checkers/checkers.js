// checkers.js

console.log("Game loaded: checkers.js");
{ // SCOPE START

const BOARD_SIZE = 8;
// Select elements dynamically inside init or check for them
// But here they are consts at top of scope. 
// If script runs, these run. If element missing, they are null.
const boardEl = document.getElementById('checkers-board');
const turnIndicator = document.getElementById('turn-indicator');
const redCountEl = document.getElementById('red-count');
const blackCountEl = document.getElementById('black-count');
const messageEl = document.getElementById('status-message');
const resetBtn = document.getElementById('reset-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const gameOverModal = document.getElementById('game-over-modal');

// Game State
let board = [];
let turn = 'red'; // 'red' or 'black'
// Standard: Black (dark) starts. But here Red.
let redPieces = 12;
let blackPieces = 12;
let selectedPiece = null; // {r, c}
let validMoves = []; // Array of {toR, toC, isJump, jumpR, jumpC}

function initGame() {
    if(!boardEl) return;
    turn = 'red'; 
    redPieces = 12;
    blackPieces = 12;
    selectedPiece = null;
    validMoves = [];
    if (messageEl) messageEl.innerText = "";
    if (gameOverModal) gameOverModal.classList.add('hidden');
    
    // Setup Board
    board = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        let row = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
            if ((r + c) % 2 === 1) { // Dark squares
                if (r < 3) row.push({ color: 'red', isKing: false });
                else if (r > 4) row.push({ color: 'black', isKing: false });
                else row.push(null);
            } else {
                row.push(null); // Light squares are unused
            }
        }
        board.push(row);
    }
    
    renderBoard();
    updateUI();
}

function renderBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = '';
    
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const square = document.createElement('div');
            square.classList.add('square');
            if ((r + c) % 2 === 1) square.classList.add('dark');
            
            square.dataset.r = r;
            square.dataset.c = c;
            
            // Highlight selected
            if (selectedPiece && selectedPiece.r === r && selectedPiece.c === c) {
                square.classList.add('selected');
            }
            
            // Highlight valid moves (dots)
            const move = validMoves.find(m => m.toR === r && m.toC === c);
            if (move) {
                const hint = document.createElement('div');
                hint.classList.add('move-hint');
                square.appendChild(hint);
                // Allow clicking hint to move
                hint.addEventListener('click', (e) => {
                    e.stopPropagation();
                    executeMove(move);
                });
            }

            // Piece or Empty Click
            // Logic: 
            // 1. If square has piece -> Render piece
            // 2. If square empty but dark -> Clickable for move (handled by hint primarily, but sometimes direct click desired)
            
            const pieceData = board[r][c];
            if (pieceData) {
                const piece = document.createElement('div');
                piece.classList.add('piece', pieceData.color);
                if (pieceData.isKing) piece.classList.add('king');
                
                // Click handler for piece
                piece.addEventListener('click', (e) => {
                    e.stopPropagation(); // prevent square click
                    handlePieceClick(r, c);
                });
                
                square.appendChild(piece);
            } else {
                // Empty dark square click target for moving to empty spot IF hint doesn't cover it?
                // Actually hint handles it.
                if ((r + c) % 2 === 1) {
                    square.addEventListener('click', (e) => {
                         // Check valid move
                         const m = validMoves.find(m => m.toR === r && m.toC === c);
                         if (m) executeMove(m);
                         else if (selectedPiece) {
                             selectedPiece = null;
                             validMoves = [];
                             renderBoard();
                         }
                    });
                }
            }
            
            boardEl.appendChild(square);
        }
    }
}

function handlePieceClick(r, c) {
    const piece = board[r][c];
    if (!piece) return;
    
    if (piece.color === turn) {
        // Select this piece
        selectedPiece = { r, c };
        calculateValidMoves(r, c, piece);
        renderBoard();
    }
}

function calculateValidMoves(r, c, piece) {
    validMoves = [];
    if (!piece) return;
    
    const jumps = getJumps(r, c, piece);
    if (jumps.length > 0) {
        validMoves = jumps;
        return;
    }
    
    const slides = getSlides(r, c, piece);
    validMoves = slides;
}

function getSlides(r, c, piece) {
    let moves = [];
    let dirs = [];
    
    if (piece.isKing) {
        dirs = [[-1,-1], [-1,1], [1,-1], [1,1]];
    } else {
        // Red moves down (+1), Black moves up (-1)
        const forward = piece.color === 'red' ? 1 : -1;
        dirs = [[forward, -1], [forward, 1]];
    }
    
    for (let d of dirs) {
        let nr = r + d[0];
        let nc = c + d[1];
        
        if (isValidPos(nr, nc) && board[nr][nc] === null) {
            moves.push({ toR: nr, toC: nc, isJump: false });
        }
    }
    return moves;
}

function getJumps(r, c, piece) {
    let moves = [];
    let dirs = [];
    
    if (piece.isKing) {
        dirs = [[-1,-1], [-1,1], [1,-1], [1,1]];
    } else {
        const forward = piece.color === 'red' ? 1 : -1;
        dirs = [[forward, -1], [forward, 1]];
    }
    
    for (let d of dirs) {
        let midR = r + d[0];
        let midC = c + d[1];
        let toR = r + d[0] * 2;
        let toC = c + d[1] * 2;
        
        if (isValidPos(toR, toC)) {
            const midPiece = board[midR][midC];
            const destPiece = board[toR][toC];
            
            if (midPiece && midPiece.color !== piece.color && destPiece === null) {
                // Valid jump
                moves.push({ 
                    toR, toC, 
                    isJump: true, 
                    jumpR: midR, jumpC: midC 
                });
            }
        }
    }
    return moves;
}

function isValidPos(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function executeMove(move) {
    const piece = board[selectedPiece.r][selectedPiece.c];
    
    // Move piece
    board[move.toR][move.toC] = piece;
    board[selectedPiece.r][selectedPiece.c] = null;
    
    // Handle Jump
    let jumpOccurred = false;
    let promoted = false;

    if (move.isJump) {
        board[move.jumpR][move.jumpC] = null; // Remove captured
        if (turn === 'red') blackPieces--;
        else redPieces--;
        jumpOccurred = true;
    }
    
    // King Promotion
    if (!piece.isKing) {
        if (turn === 'red' && move.toR === 7) {
            piece.isKing = true;
            promoted = true;
        } else if (turn === 'black' && move.toR === 0) {
            piece.isKing = true;
            promoted = true;
        }
    }
    
    // Multi-jump logic
    if (jumpOccurred && !promoted) {
        const furtherJumps = getJumps(move.toR, move.toC, piece);
        if (furtherJumps.length > 0) {
            // Force continuation
            selectedPiece = { r: move.toR, c: move.toC };
            validMoves = furtherJumps;
            if (messageEl) messageEl.innerText = "Double Jump!";
            renderBoard();
            updateUI();
            return; 
        }
    }
    
    endTurn();
}

function endTurn() {
    selectedPiece = null;
    validMoves = [];
    if (messageEl) messageEl.innerText = "";
    
    if (redPieces === 0) {
        gameOver("Black Wins!");
        return;
    }
    if (blackPieces === 0) {
        gameOver("Red Wins!");
        return;
    }

    turn = turn === 'red' ? 'black' : 'red';
    
    // Check if new player has moves
    if (!hasAnyMoves(turn)) {
        gameOver(turn === 'red' ? "Red has no moves. Black Wins!" : "Black has no moves. Red Wins!");
        return;
    }

    renderBoard();
    updateUI();
}

function hasAnyMoves(player) {
    for (let r=0; r<BOARD_SIZE; r++) {
        for (let c=0; c<BOARD_SIZE; c++) {
            const p = board[r][c];
            if (p && p.color === player) {
                if (getJumps(r, c, p).length > 0) return true;
                if (getSlides(r, c, p).length > 0) return true;
            }
        }
    }
    return false;
}

function gameOver(msg) {
    const title = document.getElementById('game-over-title');
    const reason = document.getElementById('game-over-reason');
    if (title) title.innerText = "Game Over";
    if (reason) reason.innerText = msg;
    if (gameOverModal) gameOverModal.classList.remove('hidden');
}

function updateUI() {
    if (turnIndicator) {
        turnIndicator.innerText = `${turn === 'red' ? "Red" : "Black"}'s Turn`;
        turnIndicator.className = `turn-indicator ${turn}-turn`;
    }
    
    if (redCountEl) redCountEl.innerText = redPieces;
    if (blackCountEl) blackCountEl.innerText = blackPieces;
}

// Event Listeners
if (resetBtn) resetBtn.addEventListener('click', () => {
    initGame();
});

if (playAgainBtn) playAgainBtn.addEventListener('click', () => {
    initGame();
});

// Init
initGame();

} // SCOPE END
