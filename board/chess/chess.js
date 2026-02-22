// chess.js

const BOARD_SIZE = 8;
const boardEl = document.getElementById('chess-board');
const turnIndicator = document.getElementById('turn-indicator');
const whiteCapturedEl = document.getElementById('white-captured');
const blackCapturedEl = document.getElementById('black-captured');
const messageEl = document.getElementById('status-message');
const historyLog = document.getElementById('move-history');
const resetBtn = document.getElementById('reset-btn');
const undoBtn = document.getElementById('undo-btn');

// Game State
let board = []; // 8x8
let turn = 'white';
let selectedSquare = null; // {r, c}
let validMoves = []; // Array of {r, c}
let moveHistory = [];
let captured = { white: [], black: [] };
let gameOver = false;
let promotionPending = null; // { from: {r,c}, to: {r,c} }

// Constants
const WHITE = 'white';
const BLACK = 'black';
const PIECES = {
    P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔', // White
    p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚'  // Black
};

/* 
  Board Representation:
  0,0 is top-left (a8)
  7,7 is bottom-right (h1)
  
  White pieces start at row 6, 7
  Black pieces start at row 0, 1
*/

function initGame() {
    turn = WHITE;
    selectedSquare = null;
    validMoves = [];
    moveHistory = [];
    captured = { white: [], black: [] };
    gameOver = false;
    messageEl.innerText = "";
    
    setupBoard();
    renderBoard();
    updateUI();
}

function setupBoard() {
    // R N B Q K B N R
    // P P P P P P P P
    // . . . . . . . .
    // ...
    const initialSetup = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];

    // Deep copy to ensure no reference issues
    board = initialSetup.map(row => row.slice());
}

function renderBoard() {
    boardEl.innerHTML = '';
    
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((r + c) % 2 === 0 ? 'light' : 'dark');
            square.dataset.r = r;
            square.dataset.c = c;
            
            // Highlight selected
            if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
                square.classList.add('selected');
            }
            
            // Highlight valid moves
            const isMove = validMoves.find(m => m.r === r && m.c === c);
            if (isMove) {
                // If enemy piece, capture hint
                if (board[r][c]) square.classList.add('capture-hint');
                else square.classList.add('hint');
            }
            
            // Piece
            const pieceCode = board[r][c];
            if (pieceCode) {
                const pieceSpan = document.createElement('span');
                pieceSpan.classList.add('piece');
                pieceSpan.innerText = PIECES[pieceCode];
                pieceSpan.style.color = getPieceColor(pieceCode) === WHITE ? '#fff' : '#000';
                // Add text shadow for visibility
                if (getPieceColor(pieceCode) === WHITE) {
                    pieceSpan.style.textShadow = '0 0 2px #000';
                }
                
                // Rotate if black perspective? (Optional, kept static for now)
                
                square.appendChild(pieceSpan);
            }
            
            square.addEventListener('click', () => handleSquareClick(r, c));
            boardEl.appendChild(square);
        }
    }
}

function handleSquareClick(r, c) {
    if (gameOver) return;
    if (promotionPending) return; 

    // If clicking a valid move for the selected piece
    const move = validMoves.find(m => m.r === r && m.c === c);
    if (move) {
        executeMove(selectedSquare, move);
        return;
    }

    // Select a piece
    const piece = board[r][c];
    if (piece) {
        if (getPieceColor(piece) === turn) {
            selectedSquare = { r, c };
            validMoves = getValidMoves(r, c);
            renderBoard();
        } else {
            // Clicked enemy piece not as a capture move -> deselect
            selectedSquare = null;
            validMoves = [];
            renderBoard();
        }
    } else {
        // Clicked empty square
        selectedSquare = null;
        validMoves = [];
        renderBoard();
    }
}

function getPieceColor(code) {
    if (!code) return null;
    return code === code.toUpperCase() ? WHITE : BLACK;
}

// --- Movement Logic ---

function getValidMoves(r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    
    let moves = [];
    const type = piece.toLowerCase();
    const color = getPieceColor(piece);
    const forward = color === WHITE ? -1 : 1;

    if (type === 'p') {
        // Simple move
        if (isValidPos(r + forward, c) && !board[r + forward][c]) {
            moves.push({ r: r + forward, c: c });
            // Double move
            const startRow = color === WHITE ? 6 : 1;
            if (r === startRow && !board[r + forward * 2][c] && !board[r + forward][c]) {
                moves.push({ r: r + forward * 2, c: c });
            }
        }
        // Capture
        [[forward, -1], [forward, 1]].forEach(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            if (isValidPos(nr, nc)) {
                const target = board[nr][nc];
                if (target && getPieceColor(target) !== color) {
                    moves.push({ r: nr, c: nc });
                }
            }
        });
        // En Passant (Not implemented in MVP)
    } 
    else if (type === 'n') { // Knight
        const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        offsets.forEach(([dr, dc]) => {
            const nr = r+dr, nc = c+dc;
            if (isValidPos(nr, nc)) {
                if (!board[nr][nc] || getPieceColor(board[nr][nc]) !== color) {
                    moves.push({ r: nr, c: nc });
                }
            }
        });
    }
    else if (type === 'k') { // King
        const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        offsets.forEach(([dr, dc]) => {
            const nr = r+dr, nc = c+dc;
            if (isValidPos(nr, nc)) {
                if (!board[nr][nc] || getPieceColor(board[nr][nc]) !== color) {
                    moves.push({ r: nr, c: nc });
                }
            }
        });
        // Castling (Not implemented in MVP)
    }
    else { // Sliding pieces (B, R, Q)
        const directions = [];
        if (type === 'b' || type === 'q') {
            directions.push([-1,-1], [-1,1], [1,-1], [1,1]);
        }
        if (type === 'r' || type === 'q') {
            directions.push([-1,0], [1,0], [0,-1], [0,1]);
        }
        
        directions.forEach(([dr, dc]) => {
            let nr = r + dr, nc = c + dc;
            while (isValidPos(nr, nc)) {
                if (!board[nr][nc]) {
                    moves.push({ r: nr, c: nc });
                } else {
                    if (getPieceColor(board[nr][nc]) !== color) {
                        moves.push({ r: nr, c: nc });
                    }
                    break; // Blocked
                }
                nr += dr;
                nc += dc;
            }
        });
    }

    // Filter out moves that leave King in check
    // Clone board, make move, check safe
    return moves.filter(m => !causesCheck(r, c, m.r, m.c, color));
}

function isValidPos(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function causesCheck(fromR, fromC, toR, toC, color) {
    // Simulate move
    const tempBoard = board.map(row => row.slice());
    tempBoard[toR][toC] = tempBoard[fromR][fromC];
    tempBoard[fromR][fromC] = null;
    
    // Find King
    let kingPos = null;
    const kingChar = color === WHITE ? 'K' : 'k';
    
    // If king moved
    if (tempBoard[toR][toC] === kingChar) {
        kingPos = { r: toR, c: toC };
    } else {
        // Find king normally
        for (let r=0; r<8; r++) {
            for (let c=0; c<8; c++) {
                if (tempBoard[r][c] === kingChar) {
                    kingPos = { r, c };
                    break;
                }
            }
        }
    }
    
    if (!kingPos) return false; // Should not happen

    return isSquareAttacked(kingPos.r, kingPos.c, color, tempBoard);
}

function isSquareAttacked(r, c, myColor, boardState) {
    const enemyColor = myColor === WHITE ? BLACK : WHITE;
    const forward = myColor === WHITE ? -1 : 1; // Enemy pawn moves opposite to me? No, enemy pawn moves towards me. Enemy is Black, moves +1.
    // If I am White, enemy is Black (moves Down +1).
    // If I am Black, enemy is White (moves Up -1).
    const enemyForward = myColor === WHITE ? 1 : -1; 

    // 1. Check Pawn attacks
    // Enemy pawns attack from [r - enemyForward][c +/- 1]
    const pawnRow = r - enemyForward;
    if (isValidPos(pawnRow, c-1)) {
        const p = boardState[pawnRow][c-1];
        if (p && p === (myColor === WHITE ? 'p' : 'P')) return true;
    }
    if (isValidPos(pawnRow, c+1)) {
        const p = boardState[pawnRow][c+1];
        if (p && p === (myColor === WHITE ? 'p' : 'P')) return true;
    }

    // 2. Check Knights
    const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    const enemyKnight = myColor === WHITE ? 'n' : 'N';
    for (let o of knightOffsets) {
        if (isValidPos(r+o[0], c+o[1]) && boardState[r+o[0]][c+o[1]] === enemyKnight) return true;
    }
    
    // 3. Check Sliding (Q, R, B)
    const enemyRook = myColor === WHITE ? 'r' : 'R';
    const enemyBishop = myColor === WHITE ? 'b' : 'B';
    const enemyQueen = myColor === WHITE ? 'q' : 'Q';
    
    const directions = [
        {dr:-1,dc:0, types:[enemyRook, enemyQueen]},
        {dr:1,dc:0, types:[enemyRook, enemyQueen]},
        {dr:0,dc:-1, types:[enemyRook, enemyQueen]},
        {dr:0,dc:1, types:[enemyRook, enemyQueen]},
        {dr:-1,dc:-1, types:[enemyBishop, enemyQueen]},
        {dr:-1,dc:1, types:[enemyBishop, enemyQueen]},
        {dr:1,dc:-1, types:[enemyBishop, enemyQueen]},
        {dr:1,dc:1, types:[enemyBishop, enemyQueen]},
    ];

    for (let d of directions) {
        let nr = r + d.dr;
        let nc = c + d.dc;
        while(isValidPos(nr, nc)) {
            const piece = boardState[nr][nc];
            if (piece) {
                if (d.types.includes(piece)) return true;
                break; // Blocked by non-attacking piece
            }
            nr += d.dr;
            nc += d.dc;
        }
    }
    
    // 4. Check King (adjacency)
    const enemyKing = myColor === WHITE ? 'k' : 'K';
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr===0 && dc===0) continue;
            if (isValidPos(r+dr, c+dc) && boardState[r+dr][c+dc] === enemyKing) return true;
        }
    }

    return false;
}

function executeMove(from, to) {
    const piece = board[from.r][from.c];
    const target = board[to.r][to.c];
    
    // Validation for promotion
    if (piece.toLowerCase() === 'p') {
        const promotionRow = getPieceColor(piece) === WHITE ? 0 : 7;
        if (to.r === promotionRow) {
            handlePromotion(from, to);
            return;
        }
    }

    commitMove(from, to, piece, target);
}

function commitMove(from, to, piece, capturedPiece, promotionType = null) {
    // 1. Snapshot for undo
    // Deep clone the board BEFORE applying the move
    const boardState = board.map(row => [...row]); 
    const moveRecord = {
        from: {...from}, 
        to: {...to}, 
        piece: piece, 
        captured: capturedPiece,
        promotionType: promotionType,
        boardState: boardState
    };
    
    moveHistory.push(moveRecord);

    // 2. Apply move
    const finalPieceChar = promotionType 
        ? (getPieceColor(piece) === WHITE ? promotionType.toUpperCase() : promotionType.toLowerCase())
        : piece;
        
    board[to.r][to.c] = finalPieceChar;
    board[from.r][from.c] = null;
    
    // 3. Update Captured
    if (capturedPiece) {
        if (getPieceColor(capturedPiece) === WHITE) captured.black.push(capturedPiece);
        else captured.white.push(capturedPiece);
    }
    
    // 4. Reset Selection
    selectedSquare = null;
    validMoves = [];
    
    // 5. Swap turn
    turn = turn === WHITE ? BLACK : WHITE;
    
    // 6. Check Game State
    checkGameState();
    
    // 7. Render
    renderBoard();
    updateUI();
}

function handlePromotion(from, to) {
    promotionPending = { from, to };
    const color = getPieceColor(board[from.r][from.c]);
    
    // Check if the modal exists, if not, create it
    let modal = document.getElementById('promotion-modal');
    // If not in DOM (should be in HTML file), no action needed

    const container = document.getElementById('promotion-options');
    container.innerHTML = '';
    
    const options = ['q', 'r', 'b', 'n'];
    
    options.forEach(type => {
        // Use correct char for display
        const char = color === WHITE ? type.toUpperCase() : type;
        const btn = document.createElement('div');
        btn.classList.add('promo-option');
        btn.innerText = PIECES[char];
        btn.onclick = () => {
            const piece = board[from.r][from.c];
            const target = board[to.r][to.c];
            modal.classList.add('hidden');
            promotionPending = null;
            // Commit with promotion type
            commitMove(from, to, piece, target, type);
        };
        container.appendChild(btn);
    });
    
    modal.classList.remove('hidden');
}

function checkGameState() {
    // Check if current player has any moves
    let hasMoves = false;
    for (let r=0; r<8; r++) {
        for (let c=0; c<8; c++) {
            const p = board[r][c];
            if (p && getPieceColor(p) === turn) {
                const moves = getValidMoves(r, c);
                if (moves.length > 0) {
                    hasMoves = true;
                    break;
                }
            }
        }
        if (hasMoves) break;
    }
    
    // Check local check status
    // Find King
    let kingPos = null;
    const kingChar = turn === WHITE ? 'K' : 'k';
    for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(board[r][c]===kingChar) kingPos={r,c};
    
    const inCheck = kingPos && isSquareAttacked(kingPos.r, kingPos.c, turn, board);
    
    if (inCheck && !hasMoves) {
        gameOver = true;
        messageEl.innerText = `CHECKMATE! ${turn === WHITE ? 'Black' : 'White'} wins!`;
        showGameOver(`Checkmate! ${turn === WHITE ? 'Black' : 'White'} wins!`);
    } else if (!inCheck && !hasMoves) {
        gameOver = true;
        messageEl.innerText = "STALEMATE! Draw.";
        showGameOver("Stalemate! Game is a draw.");
    } else if (inCheck) {
        messageEl.innerText = "CHECK!";
    } else {
        messageEl.innerText = "";
    }
}

function showGameOver(msg) {
    document.getElementById('game-over-title').innerText = "Game Over";
    document.getElementById('game-over-reason').innerText = msg;
    document.getElementById('game-over-modal').classList.remove('hidden');
}

function updateUI() {
    turnIndicator.innerText = `${turn === WHITE ? "White" : "Black"}'s Turn`;
    turnIndicator.style.backgroundColor = turn === WHITE ? '#fff' : '#000';
    turnIndicator.style.color = turn === WHITE ? '#000' : '#fff';
    
    whiteCapturedEl.innerText = captured.white.map(p => PIECES[p]).join(' ');
    blackCapturedEl.innerText = captured.black.map(p => PIECES[p]).join(' ');

    // Render Log
    historyLog.innerHTML = "";
    moveHistory.forEach((m, i) => {
        const div = document.createElement('div');
         
        // Simple notation: Piece + ToSquare
        // Proper algebraic notation is hard, simplified here
        const fromAlg = String.fromCharCode(97 + m.from.c) + (8 - m.from.r);
        const toAlg = String.fromCharCode(97 + m.to.c) + (8 - m.to.r);
        div.innerText = `${i+1}. ${PIECES[m.piece]}${fromAlg} -> ${toAlg}`;
       
        historyLog.appendChild(div);
    });
    historyLog.scrollTop = historyLog.scrollHeight;
}

resetBtn.addEventListener('click', initGame);
undoBtn.addEventListener('click', () => {
    if (moveHistory.length > 0) {
        // Pop last move
        const lastMove = moveHistory.pop();
        
        // Restore board state
        board = lastMove.boardState;
        
        // Restore turn
        turn = turn === WHITE ? BLACK : WHITE;
        
        // Restore captured list
        if (lastMove.captured) {
             const capColor = getPieceColor(lastMove.captured);
             if (capColor === WHITE) captured.black.pop();
             else captured.white.pop();
        }
        
        // Reset flags
        gameOver = false;
        document.getElementById('game-over-modal').classList.add('hidden');
        messageEl.innerText = "";
        selectedSquare = null;
        validMoves = [];
        
        renderBoard();
        updateUI();
    }
});

document.getElementById('play-again-btn').addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.add('hidden');
    initGame();
});

initGame();
