// Initialize game
function initTicTacToe() {
    window.ticTacToeGame = new TicTacToe();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTicTacToe);
} else {
    initTicTacToe();
}

class TicTacToe {
    constructor() {
        this.boardState = ["", "", "", "", "", "", "", "", ""];
        this.currentPlayer = "X"; // Human always X
        this.gameActive = true;
        this.scores = { x: 0, o: 0 };
        this.difficulty = 'medium';

        // DOM
        this.cells = Array.from(document.querySelectorAll('.cell'));
        this.statusDisplay = document.getElementById('status');
        this.scoreDisplayX = document.getElementById('score-x');
        this.scoreDisplayO = document.getElementById('score-o');
        
        this.modal = document.getElementById('game-over-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalMsg = document.getElementById('modal-msg');
        this.modalRestart = document.getElementById('modal-restart');
        
        this.resetBtn = document.getElementById('reset-btn');
        this.difficultySelect = document.getElementById('difficulty-select');

        // Bind
        this.cells.forEach(cell => cell.addEventListener('click', (e) => this.handleCellClick(e)));
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.modalRestart.addEventListener('click', () => {
            this.modal.style.display = 'none';
            this.resetGame();
        });
        this.difficultySelect.addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.resetGame();
        });

        this.updateStatus("Your Turn (X)");
    }

    handleCellClick(e) {
        const index = parseInt(e.target.dataset.index);

        if (this.boardState[index] !== "" || !this.gameActive || this.currentPlayer !== "X") return;

        this.makeMove(index, "X");

        if (this.gameActive) {
            this.updateStatus("Bot Thinking...");
            // Use setTimeout to allow UI to update before blocking
            setTimeout(() => this.botMove(), 500);
        }
    }

    makeMove(index, player) {
        this.boardState[index] = player;
        const cell = this.cells[index];
        cell.innerText = player;
        cell.classList.add(player.toLowerCase());
        
        // Play sound effect? 
        // if(window.playSound) window.playSound('click');

        const winInfo = this.checkWin(player);
        if (winInfo) {
            this.handleWin(player, winInfo);
        } else if (!this.boardState.includes("")) {
            this.endGame("draw");
        } else {
            this.currentPlayer = player === "X" ? "O" : "X";
            if(this.currentPlayer === "X") this.updateStatus("Your Turn (X)");
        }
    }

    botMove() {
        if (!this.gameActive) return;

        let moveIndex = -1;
        
        // Find empty spots
        const availableMoves = [];
        this.boardState.forEach((val, idx) => {
            if (val === "") availableMoves.push(idx);
        });

        if (availableMoves.length === 0) return;

        if (this.difficulty === 'easy') {
            // Pure random
            moveIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        } 
        else if (this.difficulty === 'medium') {
            // 1. Check if can win
            moveIndex = this.findWinningMove('O');
            
            // 2. Check if must block
            if (moveIndex === -1) {
                moveIndex = this.findWinningMove('X');
            }
            
            // 3. Random if neither
            if (moveIndex === -1) {
                moveIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)];
            }
        }
        else {
            // Hard / Impossible (Minimax)
            // Optimization: If board is empty or near empty, play center or corner to save compute
            if (availableMoves.length === 9) {
                moveIndex = 4; // Center
            } else if (availableMoves.length === 8 && availableMoves.includes(4)) {
                moveIndex = 4; // Take center if player missed it
            } else {
                const best = this.minimax(this.boardState, 'O');
                moveIndex = best.index;
            }
        }

        if (moveIndex !== -1) {
            this.makeMove(moveIndex, "O");
        }
    }

    findWinningMove(player) {
         const wins = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        
        for (let combo of wins) {
            const [a, b, c] = combo;
            // Check for 2 of player and 1 empty
            if (this.boardState[a] === player && this.boardState[b] === player && this.boardState[c] === "") return c;
            if (this.boardState[a] === player && this.boardState[c] === player && this.boardState[b] === "") return b;
            if (this.boardState[b] === player && this.boardState[c] === player && this.boardState[a] === "") return a;
        }
        return -1;
    }

    minimax(board, player) {
        const availSpots = [];
        board.forEach((val, idx) => { if (val === "") availSpots.push(idx); });

        if (this.checkWinState(board, "X")) return { score: -10 };
        if (this.checkWinState(board, "O")) return { score: 10 };
        if (availSpots.length === 0) return { score: 0 };

        const moves = [];

        for (let i = 0; i < availSpots.length; i++) {
            const move = {};
            move.index = availSpots[i];
            
            // Clone board? No, modify and revert.
            board[availSpots[i]] = player;

            if (player === "O") {
                const result = this.minimax(board, "X");
                move.score = result.score;
            } else {
                const result = this.minimax(board, "O");
                move.score = result.score;
            }

            board[availSpots[i]] = ""; // Backtrack
            moves.push(move);
        }

        let bestMove;
        if (player === "O") {
            let bestScore = -10000;
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].score > bestScore) {
                    bestScore = moves[i].score;
                    bestMove = i;
                }
            }
        } else {
            let bestScore = 10000;
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].score < bestScore) {
                    bestScore = moves[i].score;
                    bestMove = i;
                }
            }
        }
        return moves[bestMove];
    }
    
    // Static check for minimax recursion
    checkWinState(board, player) {
         const wins = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        return wins.some(w => board[w[0]] === player && board[w[1]] === player && board[w[2]] === player);
    }

    checkWin(player) {
         const wins = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        
        const combo = wins.find(w => this.boardState[w[0]] === player && this.boardState[w[1]] === player && this.boardState[w[2]] === player);
        
        if (combo) return { combo, player };
        return null;
    }

    handleWin(player, winInfo) {
        this.gameActive = false;
        
        // Draw strike line?
        // Wait for next refactor to do fancy strike line
        this.highlightWin(winInfo.combo);
        
        setTimeout(() => {
            this.endGame(player === "X" ? "win" : "lose");
            if (player === "X") this.scores.x++;
            else this.scores.o++;
            this.updateScores();
        }, 1000);
    }

    highlightWin(combo) {
        combo.forEach(idx => {
            this.cells[idx].style.background = '#21262d';
            this.cells[idx].style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.5)';
        });
    }

    endGame(result) {
        this.modal.style.display = 'flex';
        if (result === "win") {
            this.modalTitle.innerText = "VICTORY!";
            this.modalMsg.innerText = "You defeated the bot!";
            this.modalTitle.style.color = "#238636";
        } else if (result === "lose") {
            this.modalTitle.innerText = "DEFEAT";
            this.modalMsg.innerText = "The bot outsmarted you.";
            this.modalTitle.style.color = "#f85149";
        } else {
            this.modalTitle.innerText = "DRAW";
            this.modalMsg.innerText = "It's a tie!";
            this.modalTitle.style.color = "#e6edf3";
        }
    }

    resetGame() {
        this.gameActive = true;
        this.currentPlayer = "X";
        this.boardState = ["", "", "", "", "", "", "", "", ""];
        
        this.statusDisplay.innerText = "Player Start (X)";
        this.statusDisplay.style.color = "#58a6ff";
        
        this.cells.forEach(cell => {
            cell.innerText = "";
            cell.classList.remove("x", "o");
            cell.style.background = ""; // Clear highlight
            cell.style.boxShadow = "";
        });

        this.modal.style.display = 'none';
        
        // If bot goes first? No, player always starts for now.
    }

    updateStatus(msg) {
        this.statusDisplay.innerText = msg;
    }

    updateScores() {
        this.scoreDisplayX.innerText = this.scores.x;
        this.scoreDisplayO.innerText = this.scores.o;
    }
}
