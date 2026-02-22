document.addEventListener('DOMContentLoaded', () => {
    const game = new MouseTrapGame();
});

class MouseTrapGame {
    constructor() {
        this.boardSize = 32; // 9x9 perimeter
        this.players = [
            { id: 1, pos: 0, cheese: 0, color: 'red', piece: document.getElementById('p1-piece') },
            { id: 2, pos: 0, cheese: 0, color: 'blue', piece: document.getElementById('p2-piece') }
        ];
        this.currentPlayerIndex = 0;
        this.trapParts = ['gear', 'crank', 'bucket', 'cage'];
        this.builtParts = []; // Global trap state? Or per player?
        // Let's make it global: players cooperate to build, but compete to use it.
        // Actually, competitive building makes more sense.
        // Simplified: Global trap. Anyone can build. Who turns the crank gets the benefit?
        // Benefit: Catch opponent if they are on DANGER space.
        
        this.spaces = [];
        this.isAnimating = false;

        this.ui = {
            board: document.getElementById('game-board'),
            rollBtn: document.getElementById('roll-btn'),
            diceDisplay: document.getElementById('dice-val'),
            log: document.getElementById('game-log'),
            p1Card: document.getElementById('p1-card'),
            p2Card: document.getElementById('p2-card'),
            p1Cheese: document.getElementById('p1-cheese'),
            p2Cheese: document.getElementById('p2-cheese'),
            trapMsg: document.getElementById('trap-msg')
        };

        this.initBoard();
        this.updatePlayerStats();
        
        this.ui.rollBtn.addEventListener('click', () => this.handleTurn());
    }

    initBoard() {
        // Define space types pattern
        // 0: Start
        // Types: safe, cheese, build, danger, crank
        const pattern = [
            'start', 'safe', 'cheese', 'safe', 'build', 'danger', 'cheese', 'safe', 
            'crank', 'safe', 'cheese', 'danger', 'build', 'safe', 'cheese', 'safe',
            'crank', 'safe', 'cheese', 'safe', 'build', 'danger', 'cheese', 'safe',
            'crank', 'safe', 'cheese', 'danger', 'build', 'safe', 'cheese', 'danger'
        ];

        // Ensure 32 spaces
        for (let i = 0; i < this.boardSize; i++) {
            const type = pattern[i] || 'safe';
            const space = document.createElement('div');
            space.className = `space ${type}`;
            space.dataset.index = i;
            
            // Icon based on type
            let icon = '';
            if (type === 'start') icon = '🏁';
            else if (type === 'cheese') icon = '🧀';
            else if (type === 'build') icon = '🔨';
            else if (type === 'danger') icon = '⚠️';
            else if (type === 'crank') icon = '⚙️';
            
            space.innerHTML = `<span>${icon}</span><small style="position:absolute;bottom:2px;font-size:0.6rem;opacity:0.5">${i}</small>`;
            
            // Calculate Grid Position
            // 0-8: Top Row (1,1 -> 1,9)
            // 9-16: Right Col (2,9 -> 9,9)
            // 17-24: Bottom Row (9,8 -> 9,1)
            // 25-31: Left Col (8,1 -> 2,1)
            let row, col;
            
            if (i <= 8) {
                row = 1; col = i + 1;
            } else if (i <= 16) {
                row = i - 8 + 1; col = 9;
            } else if (i <= 24) {
                row = 9; col = 9 - (i - 16);
            } else {
                row = 9 - (i - 24); col = 1;
            }

            space.style.gridRow = row;
            space.style.gridColumn = col;
            this.ui.board.appendChild(space);
            this.spaces.push({ element: space, type: type, row, col });
        }

        // Initial Piece Placement
        this.updatePiecePositions();
    }

    
    updatePiecePositions() {
        this.players.forEach(p => {
            const spaceInfo = this.spaces[p.pos];
            const space = spaceInfo.element;
            
            // Get spacing relative to board container
            const boardRect = this.ui.board.getBoundingClientRect();
            const spaceRect = space.getBoundingClientRect();
            
            const relativeTop = spaceRect.top - boardRect.top;
            const relativeLeft = spaceRect.left - boardRect.left;
            
            // Add jitter for multiple players
            // Center in 60x60 cell (approx). Piece is 40x40.
            const centerX = (spaceRect.width - 40) / 2;
            const centerY = (spaceRect.height - 40) / 2;

            const offsetX = p.id === 1 ? -5 : 5;
            const offsetY = p.id === 1 ? -5 : 5;
            
            p.piece.style.display = 'flex';
            p.piece.style.left = `${relativeLeft + centerX + offsetX}px`;
            p.piece.style.top = `${relativeTop + centerY + offsetY}px`;
            // Note: removed transform, using left/top absolute positioning for simplicity
        });
    }

    async handleTurn() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.ui.rollBtn.disabled = true;

        const player = this.players[this.currentPlayerIndex];
        this.log(`${this.getPlayerName(player)} rolling...`);

        // Dice Roll
        const roll = Math.floor(Math.random() * 6) + 1;
        this.ui.diceDisplay.textContent = this.getDiceFace(roll);
        
        await this.wait(500);
        
        // Move Step by Step
        for (let i = 0; i < roll; i++) {
            player.pos = (player.pos + 1) % this.boardSize;
            this.updatePiecePositions();
            // Play sound?
            await this.wait(300);
        }

        this.log(`${this.getPlayerName(player)} landed on Space ${player.pos} (${this.spaces[player.pos].type})`);
        
        await this.handleLandEffect(player);
        
        // Check Win Condition
        if (player.cheese >= 10) {
            this.log(`🏆 ${this.getPlayerName(player)} WINS with 10 Cheese!`);
            alert(`${this.getPlayerName(player)} WINS!`);
            location.reload(); 
            return;
        }

        // Next Turn
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.updateUI();
        this.isAnimating = false;
        this.ui.rollBtn.disabled = false;
    }

    async handleLandEffect(player) {
        const type = this.spaces[player.pos].type;
        
        switch (type) {
            case 'cheese':
                player.cheese++;
                this.log(`🧀 found! Total: ${player.cheese}`);
                this.triggerEffect(player.pos, 'pop');
                break;
            case 'build':
                if (this.builtParts.length < 4) {
                    const part = this.trapParts[this.builtParts.length];
                    this.builtParts.push(part);
                    document.getElementById(`part-${part}`).classList.add('collected');
                    this.log(`🔨 Built ${part}!`);
                    this.triggerEffect(player.pos, 'construct');
                } else {
                    this.log(`Trap already fully built!`);
                }
                break;
            case 'crank':
                if (this.builtParts.length === 4) {
                    this.log(`⚙️ CRANK TURNED! TRAP ACTIVATED!`);
                    await this.activateTrap(player);
                } else {
                    this.log(`⚙️ Trap not ready... (${this.builtParts.length}/4 parts)`);
                }
                break;
            case 'danger':
                this.log(`⚠️ Danger zone... careful!`);
                break;
            case 'start':
                this.log(`🏁 Back to start. +1 Cheese bonus.`);
                player.cheese++;
                break;
        }
        
        this.updatePlayerStats();
    }

    async activateTrap(activePlayer) {
        // Check opponents on Danger spaces
        let caught = false;
        this.players.forEach(p => {
            if (p.id !== activePlayer.id) {
                const spaceType = this.spaces[p.pos].type;
                if (spaceType === 'danger' || spaceType === 'cheese') { // Danger or Cheese spaces are risky
                    this.log(`🪤 CAUGHT ${this.getPlayerName(p)}!`);
                    
                    // Penalty
                    const penalty = Math.ceil(p.cheese / 2);
                    p.cheese -= penalty;
                    activePlayer.cheese += penalty;
                    this.log(`Stealing ${penalty} cheese!`);
                    
                    // Reset position?
                    // p.pos = 0;
                    caught = true;
                }
            }
        });

        if (!caught) {
            this.log(`Trap sprung but missed! Opponents safe.`);
        }
        this.triggerEffect(activePlayer.pos, 'shake');
        await this.wait(1000);
    }

    triggerEffect(pos, type) {
        // Visual flair via CSS classes on the board space
        const spaceEl = this.spaces[pos].element;
        spaceEl.classList.add('pulse');
        setTimeout(() => spaceEl.classList.remove('pulse'), 500);
    }

    updateUI() {
        this.ui.p1Card.classList.toggle('active', this.currentPlayerIndex === 0);
        this.ui.p2Card.classList.toggle('active', this.currentPlayerIndex === 1);
        this.ui.trapMsg.textContent = this.builtParts.length === 4 ? "TRAP READY! Land on Crank!" : `Build parts: ${this.builtParts.length}/4`;
    }

    updatePlayerStats() {
        this.ui.p1Cheese.textContent = this.players[0].cheese;
        this.ui.p2Cheese.textContent = this.players[1].cheese;
    }

    getPlayerName(p) {
        return p.id === 1 ? "Player 1" : "Player 2";
    }

    getDiceFace(val) {
        return ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][val-1];
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    log(msg) {
        this.ui.log.textContent = msg;
    }
}
