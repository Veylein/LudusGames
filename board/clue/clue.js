/*
 * NEON CLUE
 * 
 * Features:
 * - Canvas-based Blueprint Rendering
 * - Simplified Logic for Arcade
 * - GameUI Integration
 */

(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Constants
    const TILE_SIZE = 30; // 24x25 grid needs roughly 720x750
    const BOARD_WIDTH = 24; 
    const BOARD_HEIGHT = 25;
    
    // Using simple char map
    const LAYOUT = [
        '........................',
        'wwwwww.wwww.wwww.wwwwwww',
        'wKKKKw.wBBw.wCCw.wLLLLLw',
        'wKKKKw.wBBw.wCCw.wLLLLLw',
        'wKKKKw.wBBw.wCCw.wLLLLLw', // K=Kitchen, B=Ballroom, C=Conservatory, L=Lounge?? No
        'wKKKKw......wCCw.wLLLLLw', // Simplified mapping:
        'wwwwww.wBBw.wwww.wwwwwww',
        '.......wBBw.............',
        '.wwwww.wBBw.wwwww.......',
        '.wDDDwwwBBwwwLLww.......',
        '.wDDDDDD..LLLLLLw.......', 
        '.wDDDDDD..LLLLLLw.wwwww.',
        '.wDDDDDD..LLLLLLw.wHHHw.',
        '.wDDDDDD..LLLLLLw.wHHHw.',
        '.wwwwwww..wwwwwww.wHHHw.',
        '..................wHHHw.',
        '.wwwww..wwwww.....wwwww.',
        '.wSSSwwwwKKKw...........',
        '.wSSSSSSSKKKwwwwww......',
        '.wSSSSSSSKKKKKKKKw......',
        '.wSSSSSSSKKKKKKKKw......',
        '.wSSSSSSSKKKKKKKKw......',
        '.wSSSSSSSKKKKKKKKw......',
        '.wwwwwwwwwwwwwwwww......',
        '........................'
    ];
    // This layout is a placeholder approximation for the visual style.
    // 0=Hall, 1=Kitchen, etc.
    // Let's rely on standard grid navigation.

    const COLORS = {
        bg: '#001',
        wall: '#0ff',
        floor: '#002',
        room: 'rgba(0, 255, 255, 0.1)',
        grid: 'rgba(0, 255, 255, 0.05)',
        highlight: 'rgba(255, 255, 0, 0.3)',
        player: '#f00'
    };

    class ClueGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = ctx;
            
            // State
            this.players = [
                { id: 0, name: 'Scarlet', color: '#ff0000', x: 16, y: 0 }, // Start pos roughly
                { id: 1, name: 'Mustard', color: '#ffff00', x: 23, y: 7 },
                { id: 2, name: 'White',   color: '#ffffff', x: 9,  y: 24 },
                { id: 3, name: 'Green',   color: '#00ff00', x: 14, y: 24 },
                { id: 4, name: 'Peacock', color: '#0000ff', x: 0,  y: 18 },
                { id: 5, name: 'Plum',    color: '#800080', x: 0,  y: 5 }
            ];
            
            this.turn = 0; // Player index
            this.dice = 0;
            this.movesLeft = 0;
            this.isMoving = false;
            this.message = 'Roll Dice to Start';
            
            this.init();
        }

        init() {
            // UI bindings
            document.getElementById('roll-btn').addEventListener('click', () => this.rollDice());
            document.getElementById('end-turn-btn').addEventListener('click', () => this.endTurn());
            
            // Canvas input
            this.canvas.addEventListener('click', (e) => this.handleClick(e));
            
            if (window.GameUI) {
                window.GameUI.init(this.canvas, {
                    onStart: () => this.start(),
                    onRestart: () => this.start()
                });
                window.GameUI.showStartScreen();
            } else {
                this.start();
            }
        }
        
        start() {
            this.turn = 0;
            this.message = 'Player 1 (Scarlet) Turn. Roll Dice.';
            this.render();
            if (window.GameUI) window.GameUI.hideStartScreen();
        }
        
        rollDice() {
            if (this.movesLeft > 0) return; // Already rolled
            this.dice = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
            this.movesLeft = this.dice;
            this.message = Rolled . Click grid to move.;
            document.getElementById('roll-btn').classList.add('hidden');
            document.getElementById('end-turn-btn').classList.remove('hidden');
            this.render();
        }
        
        endTurn() {
            this.movesLeft = 0;
            this.turn = (this.turn + 1) % this.players.length;
            this.message = ${this.players[this.turn].name}'s Turn.;
            document.getElementById('roll-btn').classList.remove('hidden');
            document.getElementById('end-turn-btn').classList.add('hidden');
            this.render();
        }
        
        handleClick(e) {
            if (this.movesLeft <= 0) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const col = Math.floor((e.clientX - rect.left) / TILE_SIZE);
            const row = Math.floor((e.clientY - rect.top) / TILE_SIZE);
            
            // Simple teleport movement for prototype
            // In real game: Pathfinding BFS to validate distance
            // Here: Just clamp to distance
            
            const player = this.players[this.turn];
            const dist = Math.abs(col - player.x) + Math.abs(row - player.y);
            
            if (dist <= this.movesLeft && dist > 0) {
                player.x = col;
                player.y = row;
                this.movesLeft -= dist;
                this.message = Moves left: ;
                this.render();
            }
        }

        render() {
            // Clear
            this.ctx.fillStyle = COLORS.bg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw Grid
            this.ctx.lineWidth = 1;
            for(let r=0; r<BOARD_HEIGHT; r++) {
                for(let c=0; c<BOARD_WIDTH; c++) {
                    const char = (LAYOUT[r] && LAYOUT[r][c]) ? LAYOUT[r][c] : '.';
                    const x = c * TILE_SIZE;
                    const y = r * TILE_SIZE;
                    
                    // Room floor
                    if (char !== '.') {
                         this.ctx.fillStyle = COLORS.room;
                         this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    }
                    
                    // Grid lines
                    this.ctx.strokeStyle = COLORS.grid;
                    this.ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
                }
            }
            
            // Draw Players
            this.players.forEach(p => {
                const x = p.x * TILE_SIZE + TILE_SIZE/2;
                const y = p.y * TILE_SIZE + TILE_SIZE/2;
                
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = p.color;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(x, y, TILE_SIZE/3, 0, Math.PI*2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
                
                // Active ring
                if (p === this.players[this.turn]) {
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                }
            });
            
            // Message Overlay
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px monospace';
            this.ctx.fillText(this.message, 20, 30);
        }
    }

    new ClueGame();
})();
