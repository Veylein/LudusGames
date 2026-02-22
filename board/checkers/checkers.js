// checkers.js

const BOARD_SIZE = 8;
const boardEl = document.getElementById('checkers-board');
const turnIndicator = document.getElementById('turn-indicator');
const redCountEl = document.getElementById('red-count');
const blackCountEl = document.getElementById('black-count');
const messageEl = document.getElementById('status-message');
const resetBtn = document.getElementById('reset-btn');

// Game State
let board = [];
let turn = 'red'; // 'red' or 'black'
let redPieces = 12;
let blackPieces = 12;
let selectedPiece = null; // {r, c}
let validMoves = []; // Array of {toR, toC, isJump, jumpR, jumpC, nextJumps}
let mustJump = false; // If a jump is available, player must take it (standard rule) -> Forced jumps simplified for now: optional but highlighted

/*
  Board:
  0,0 is Top-Left.
  Red starts at top (rows 0,1,2). Moves DOWN (+row).
  Black starts at bottom (rows 5,6,7). Moves UP (-row).
  
  Actually standard is Black at top, Red at bottom? 
  Let's stick to: Red at Top (moves down), Black at Bottom (moves up).
  
  Pieces: { color: 'red'|'black', isKing: boolean }
*/

function initGame() {
    turn = 'red'; // Red goes first usually, or black? Let's say Red.
    redPieces = 12;
    blackPieces = 12;
    selectedPiece = null;
    validMoves = [];
    mustJump = false;
    messageEl.innerText = "";
    
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

            const pieceData = board[r][c];
            if (pieceData) {
                const piece = document.createElement('div');
                piece.classList.add('piece', pieceData.color);
                if (pieceData.isKing) piece.classList.add('king');
                
                // Click handler for piece
                piece.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handlePieceClick(r, c);
                });
                
                square.appendChild(piece);
            } else {
                // Empty dark square click
                 if ((r + c) % 2 === 1) {
                    square.addEventListener('click', (e) => {
                        handleSquareClick(r, c);
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
        calculateValidMoves(r, c);
        renderBoard();
    }
}

function handleSquareClick(r, c) {
    // If we clicked an empty square that is a valid move
    const move = validMoves.find(m => m.toR === r && m.toC === c);
    if (move) {
        executeMove(move);
    } else {
        // Deselect if clicking elsewhere
        selectedPiece = null;
        validMoves = [];
        renderBoard();
    }
}

function calculateValidMoves(r, c) {
    validMoves = [];
    const piece = board[r][c];
    if (!piece) return;
    
    // Check jumps first (forced jumps logic could be here, but for now we look for all jumps)
    const jumps = getJumps(r, c, piece);
    
    if (jumps.length > 0) {
        validMoves = jumps;
        // Strict rule: if jump exists, you must jump. But usually that applies to ANY piece.
        // For simple UX, we show jumps for THIS piece.
        // If we want to enforce "Must Jump" globally, we'd need to check all pieces first.
        return;
    }
    
    // If no jumps, moves
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
        // Kings can jump backward too? Yes. 
        // Non-kings can only jump forward? In standard English Draughts, yes.
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
    if (move.isJump) {
        board[move.jumpR][move.jumpC] = null; // Remove captured
        if (turn === 'red') blackPieces--;
        else redPieces--;
        jumpOccurred = true;
    }
    
    // King Promotion
    let promoted = false;
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
    // If we just jumped, and can jump again with the SAME piece, turn continues
    // UNLESS we just promoted (rules vary, but usually promotion ends turn)
    let canJumpAgain = false;
    if (jumpOccurred && !promoted) {
        // Check moves from new position
        const furtherJumps = getJumps(move.toR, move.toC, piece);
        if (furtherJumps.length > 0) {
            canJumpAgain = true;
            // Force selection of this piece
            selectedPiece = { r: move.toR, c: move.toC };
            validMoves = furtherJumps;
            messageEl.innerText = "Double Jump!";
            renderBoard();
            updateUI();
            return; // Exit, do not switch turn
        }
    }
    
    // End Turn
    endTurn();
}

function endTurn() {
    selectedPiece = null;
    validMoves = [];
    messageEl.innerText = "";
    
    if (redPieces === 0) {
        gameOver("Black Wins!");
        return;
    }
    if (blackPieces === 0) {
        gameOver("Red Wins!");
        return;
    }

    turn = turn === 'red' ? 'black' : 'red';
    
    // Check valid moves for new player (Stalemate check)
    // Naively iterate all pieces
    if (!hasAnyMoves(turn)) {
        gameOver(turn === 'red' ? "Red has no moves. Black Wins!" : "Black has no moves. Red Wins!");
        return;
    }

    renderBoard();
    updateUI();
}

function hasAnyMoves(player) {
    for (let r=0; r<8; r++) {
        for (let c=0; c<8; c++) {
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
    document.getElementById('game-over-title').innerText = "Game Over";
    document.getElementById('game-over-reason').innerText = msg;
    document.getElementById('game-over-modal').classList.remove('hidden');
}

function updateUI() {
    turnIndicator.innerText = `${turn === 'red' ? "Red" : "Black"}'s Turn`;
    turnIndicator.className = `turn-indicator ${turn}-turn`;
    
    redCountEl.innerText = redPieces;
    blackCountEl.innerText = blackPieces;
}

resetBtn.addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.add('hidden');
    initGame();
});

document.getElementById('play-again-btn').addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.add('hidden');
    initGame();
});

// Init
initGame();
