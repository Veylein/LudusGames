class TetrisGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.linesElement = document.getElementById('lines');
        this.finalScoreElement = document.getElementById('final-score');
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.restartBtn = document.getElementById('restart-btn');
        
        // Mobile
        this.btnRotate = document.getElementById('rotate-btn');
        this.btnLeft = document.getElementById('left-btn');
        this.btnRight = document.getElementById('right-btn');
        this.btnDown = document.getElementById('down-btn');
        this.btnDrop = document.getElementById('drop-btn');
        
        this.cols = 12;
        this.rows = 20;
        this.grid = 20; // Matches 240x400 canvas perfectly
        
        this.colors = [
            null,
            '#FF0D72', // T
            '#0DC2FF', // I
            '#0DFF72', // S
            '#F538FF', // Z
            '#FF8E0D', // L
            '#FFE138', // O
            '#3877FF', // J
        ];

        this.gridState = this.createMatrix(this.cols, this.rows);
        this.player = {
            pos: { x: 0, y: 0 },
            matrix: null,
            score: 0,
            lines: 0,
            level: 1
        };
        
        this.arena = this.createMatrix(this.cols, this.rows);
        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.lastTime = 0;
        this.isGameOver = false;
        this.isRunning = false;
        this.nextPiece = null;

        this.init();
    }
    
    init() {
        window.addEventListener('keydown', (e) => this.handleInput(e));
        
        // Mobile bindings
        if(this.btnRotate) this.btnRotate.addEventListener('click', () => this.playerRotate(1));
        if(this.btnLeft) this.btnLeft.addEventListener('click', () => this.playerMove(-1));
        if(this.btnRight) this.btnRight.addEventListener('click', () => this.playerMove(1));
        if(this.btnDown) this.btnDown.addEventListener('click', () => this.playerDrop());
        if(this.btnDrop) this.btnDrop.addEventListener('click', () => {
             // Hard drop loop
             while(!this.collide(this.arena, this.player)) {
                 this.player.pos.y++;
             }
             this.player.pos.y--;
             this.merge(this.arena, this.player);
             this.playerReset();
             this.arenaSweep();
             this.updateScore();
        });
        
        if(this.restartBtn) this.restartBtn.addEventListener('click', () => this.resetGame());
        
        this.updateScore();
        this.draw();
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.isGameOver = false;
        this.arena.forEach(row => row.fill(0));
        this.player.score = 0;
        this.player.lines = 0;
        this.player.level = 1;
        this.dropInterval = 1000;
        this.updateScore();
        if(this.startScreen) this.startScreen.style.display = 'none';
        if(this.gameOverScreen) this.gameOverScreen.style.display = 'none';
        
        this.playerReset();
        this.update();
    }

    resetGame() {
        this.isRunning = false;
        this.isGameOver = false;
        this.start();
    }
    
    createMatrix(w, h) {
        const matrix = [];
        while (h--) {
            matrix.push(new Array(w).fill(0));
        }
        return matrix;
    }
    
    createPiece(type) {
        if (type === 'I') {
            return [
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0],
            ];
        } else if (type === 'L') {
            return [
                [0, 2, 0],
                [0, 2, 0],
                [0, 2, 2],
            ];
        } else if (type === 'J') {
            return [
                [0, 3, 0],
                [0, 3, 0],
                [3, 3, 0],
            ];
        } else if (type === 'O') {
            return [
                [4, 4],
                [4, 4],
            ];
        } else if (type === 'Z') {
            return [
                [5, 5, 0],
                [0, 5, 5],
                [0, 0, 0],
            ];
        } else if (type === 'S') {
            return [
                [0, 6, 6],
                [6, 6, 0],
                [0, 0, 0],
            ];
        } else if (type === 'T') {
            return [
                [0, 7, 0],
                [7, 7, 7],
                [0, 0, 0],
            ];
        }
    }

    drawMatrix(matrix, offset, ctx = this.ctx) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = this.colors[value];
                    ctx.fillRect((x + offset.x) * this.grid, (y + offset.y) * this.grid, this.grid, this.grid);
                    
                    // Bevel effect
                    ctx.strokeStyle = '#rgba(255,255,255,0.2)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect((x + offset.x) * this.grid, (y + offset.y) * this.grid, this.grid, this.grid);
                }
            });
        });
    }

    draw() {
        // Clear
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawMatrix(this.arena, {x: 0, y: 0});
        this.drawMatrix(this.player.matrix, this.player.pos);
        
        // Draw Next Piece
        this.nextCtx.fillStyle = '#111';
        this.nextCtx.fillRect(0, 0, 80, 80);
        if (this.nextPiece) {
            // Center roughly
            const scale = 20; // smaller grid for preview
            this.nextPiece.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        this.nextCtx.fillStyle = this.colors[value];
                        this.nextCtx.fillRect(x * scale + 10, y * scale + 10, scale, scale);
                    }
                });
            });
        }
    }
    
    merge(arena, player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    if (arena[y + player.pos.y] && arena[y + player.pos.y][x + player.pos.x] !== undefined) {
                         arena[y + player.pos.y][x + player.pos.x] = value;
                    }
                }
            });
        });
    }
    
    rotate(matrix, dir) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [matrix[x][y], matrix[y][x]] = [
                    matrix[y][x],
                    matrix[x][y],
                ];
            }
        }
        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }
    
    playerDrop() {
        this.player.pos.y++;
        if (this.collide(this.arena, this.player)) {
            this.player.pos.y--;
            this.merge(this.arena, this.player);
            this.playerReset();
            this.arenaSweep();
            this.updateScore();
        }
        this.dropCounter = 0;
    }
    
    playerMove(dir) {
        this.player.pos.x += dir;
        if (this.collide(this.arena, this.player)) {
            this.player.pos.x -= dir;
        }
    }
    
    playerRotate(dir) {
        const pos = this.player.pos.x;
        let offset = 1;
        this.rotate(this.player.matrix, dir);
        while (this.collide(this.arena, this.player)) {
            this.player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.player.matrix[0].length) {
                this.rotate(this.player.matrix, -dir);
                this.player.pos.x = pos;
                return;
            }
        }
    }
    
    playerReset() {
        const pieces = 'ILJOTSZ';
        if (!this.nextPiece) {
            this.nextPiece = this.createPiece(pieces[pieces.length * Math.random() | 0]);
        }
        this.player.matrix = this.nextPiece;
        this.nextPiece = this.createPiece(pieces[pieces.length * Math.random() | 0]);
        
        this.player.pos.y = 0;
        this.player.pos.x = (this.arena[0].length / 2 | 0) -
                           (this.player.matrix[0].length / 2 | 0);
                           
        if (this.collide(this.arena, this.player)) {
            this.isGameOver = true;
            this.isRunning = false;
            this.gameOver();
        }
    }
    
    collide(arena, player) {
        const m = player.matrix;
        const o = player.pos;
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                   (arena[y + o.y] &&
                    arena[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }
    
    arenaSweep() {
        let rowCount = 0;
        outer: for (let y = this.arena.length - 1; y > 0; --y) {
            for (let x = 0; x < this.arena[y].length; ++x) {
                if (this.arena[y][x] === 0) {
                    continue outer;
                }
            }
            
            const row = this.arena.splice(y, 1)[0].fill(0);
            this.arena.unshift(row);
            ++y;
            rowCount++;
        }
        
        if (rowCount > 0) {
            const points = [0, 40, 100, 300, 1200];
            this.player.score += points[rowCount] * this.player.level;
            this.player.lines += rowCount;
            // Level up every 10 lines
            this.player.level = Math.floor(this.player.lines / 10) + 1;
            // Increase speed
            this.dropInterval = Math.max(100, 1000 - (this.player.level * 50)); 
            
            this.updateScore();
        }
    }
    
    updateScore() {
        this.scoreElement.innerText = this.player.score;
        this.levelElement.innerText = this.player.level;
        this.linesElement.innerText = this.player.lines;
    }
    
    gameOver() {
        if(this.gameOverScreen) {
            this.finalScoreElement.innerText = this.player.score;
            this.gameOverScreen.style.display = 'flex';
        }
    }
    
    handleInput(e) {
        if (!this.isRunning && e.code === 'Space') {
            this.start();
            return;
        }
        if (!this.isRunning) return;
        
        if (e.code === 'ArrowLeft') {
            this.playerMove(-1);
        } else if (e.code === 'ArrowRight') {
            this.playerMove(1);
        } else if (e.code === 'ArrowDown') {
            this.playerDrop();
        } else if (e.code === 'ArrowUp') {
            this.playerRotate(1);
        } else if (e.code === 'Space') {
            // Hard drop? Or rotate?
            // Usually space is hard drop, Up is rotate.
            // Let's make Space hard drop
             while(!this.collide(this.arena, this.player)) {
                 this.player.pos.y++;
             }
             this.player.pos.y--;
             this.merge(this.arena, this.player);
             this.playerReset();
             this.arenaSweep();
             this.updateScore();
        }
    }
    
    update(time = 0) {
        if (!this.isRunning) return;
        
        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        
        this.dropCounter += deltaTime;
        if (this.dropCounter > this.dropInterval) {
            this.playerDrop();
        }
        
        this.draw();
        requestAnimationFrame((t) => this.update(t));
    }
}

window.onload = () => {
    new TetrisGame();
};
