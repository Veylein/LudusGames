console.log("Game loaded: tictactoe.js");
{ // SCOPE START

// Class definition inside scope
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
        this.cells.forEach(cell => {
             // Clone node to remove old listeners if re-initializing? 
             // Logic: DOM is fresh if page reloaded via SPA navigation usually. 
             // But if we just re-ran script on same DOM, we add duplicate listeners.
             // Best practice: rely on fresh DOM from navigation.
             cell.onclick = (e) => this.handleCellClick(e);
        });
        
        if (this.resetBtn) this.resetBtn.onclick = () => this.resetGame();
        
        if (this.modalRestart) this.modalRestart.onclick = () => {
            if (this.modal) this.modal.style.display = 'none';
            this.resetGame();
        };
        
        if (this.difficultySelect) this.difficultySelect.onchange = (e) => {
            this.difficulty = e.target.value;
            this.resetGame();
        };

        this.updateStatus("Your Turn (X)");
    }

    handleCellClick(e) {
        const index = parseInt(e.target.dataset.index);
        if (this.boardState[index] !== "" || !this.gameActive || this.currentPlayer !== "X") return;

        this.makeMove(index, "X");

        if (this.gameActive) {
            this.updateStatus("Bot Thinking...");
            setTimeout(() => this.botMove(), 500);
        }
    }

    makeMove(index, player) {
        this.boardState[index] = player;
        const cell = this.cells[index];
        if (cell) {
            cell.innerText = player;
            cell.classList.add(player.toLowerCase());
        }

        const winResult = this.checkWin(player);
        if (winResult) {
            this.handleWin(player, winResult);
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
        
        const availableMoves = [];
        this.boardState.forEach((val, idx) => {
            if (val === "") availableMoves.push(idx);
        });

        if (availableMoves.length === 0) return;

        if (this.difficulty === 'easy') {
            moveIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        } 
        else if (this.difficulty === 'medium') {
            moveIndex = this.findBlockingMove('O'); 
            // Reuse logic: findWinningMove covers blocking/winning logic
            if (moveIndex === -1) {
                moveIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)];
            }
        }
        else {
            if (availableMoves.length === 9) {
                moveIndex = 4; 
            } else if (availableMoves.length === 8 && availableMoves.includes(4)) {
                moveIndex = 4; 
            } else {
                // Minimax
                // Need a deep copy of board state for recursion ideally, but we modify-backtrack arrays
                // Wait, this.minimax needs to be called carefully
                const result = this.minimax([...this.boardState], 'O'); 
                moveIndex = result.index;
            }
        }

        if (moveIndex !== -1 && moveIndex !== undefined) {
             this.makeMove(moveIndex, "O");
        } else if (availableMoves.length > 0) {
             // Fallback
             this.makeMove(availableMoves[0], "O");
        }
    }
    
    findBlockingMove(player) {
        // block opponent winning
        const opponent = player === 'X' ? 'O' : 'X';
        
        // 1. Can I win?
        let winMove = this.findWinningSpot(player);
        if (winMove !== -1) return winMove;
        
        // 2. Must I block?
        let blockMove = this.findWinningSpot(opponent);
        if (blockMove !== -1) return blockMove;
        
        return -1;
    }

    findWinningSpot(player) {
         const wins = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        
        for (let combo of wins) {
            const [a, b, c] = combo;
            if (this.boardState[a] === player && this.boardState[b] === player && this.boardState[c] === "") return c;
            if (this.boardState[a] === player && this.boardState[c] === player && this.boardState[b] === "") return b;
            if (this.boardState[b] === player && this.boardState[c] === player && this.boardState[a] === "") return a;
        }
        return -1;
    }

    minimax(newBoard, player) {
        const availSpots = [];
        newBoard.forEach((val, idx) => { if (val === "") availSpots.push(idx); });

        if (this.checkWinState(newBoard, "X")) return { score: -10 };
        if (this.checkWinState(newBoard, "O")) return { score: 10 };
        if (availSpots.length === 0) return { score: 0 };

        const moves = [];

        for (let i = 0; i < availSpots.length; i++) {
            const move = {};
            move.index = availSpots[i];
            
            newBoard[availSpots[i]] = player;

            if (player === "O") {
                const result = this.minimax(newBoard, "X");
                move.score = result.score;
            } else {
                const result = this.minimax(newBoard, "O");
                move.score = result.score;
            }

            newBoard[availSpots[i]] = ""; // reset
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
        return combo ? { combo, player } : null;
    }

    handleWin(player, winInfo) {
        this.gameActive = false;
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
            if (this.cells[idx]) {
                // Keep styles inline or separate class
                this.cells[idx].classList.add('win-highlight'); 
                // Need CSS for this, or use inline
                this.cells[idx].style.background = '#21262d'; 
                this.cells[idx].style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.5)';
            }
        });
    }

    endGame(result) {
        if (!this.modal) return;
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
        
        if (this.statusDisplay) {
            this.statusDisplay.innerText = "Player Start (X)";
            this.statusDisplay.style.color = "#58a6ff";
        }
        
        this.cells.forEach(cell => {
            cell.innerText = "";
            cell.classList.remove("x", "o", "win-highlight");
            cell.style.background = ""; 
            cell.style.boxShadow = "";
        });

        if (this.modal) this.modal.style.display = 'none';
        
        // Ensure difficulty stays set? Yes it's instance var.
    }

    updateStatus(msg) {
        if (this.statusDisplay) this.statusDisplay.innerText = msg;
    }

    updateScores() {
        if (this.scoreDisplayX) this.scoreDisplayX.innerText = this.scores.x;
        if (this.scoreDisplayO) this.scoreDisplayO.innerText = this.scores.o;
    }
}

// Check for unique element to this game
if (document.getElementById('strike-line')) {
    new TicTacToe();
}

} // SCOPE END
