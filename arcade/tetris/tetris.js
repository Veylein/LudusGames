(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    class TetrisGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = this.canvas.getContext('2d');
            this.nextCanvas = document.getElementById('nextCanvas');
            this.nextCtx = this.nextCanvas ? this.nextCanvas.getContext('2d') : null;
            
            this.cols = 12;
            this.rows = 20;
            this.grid = 20;
            
            this.canvas.width = this.cols * this.grid;
            this.canvas.height = this.rows * this.grid;
            
            this.scoreElement = document.getElementById('score');
            this.levelElement = document.getElementById('level');
            this.linesElement = document.getElementById('lines');
            this.finalScoreElement = document.getElementById('final-score');
            this.startScreen = document.getElementById('start-screen');
            this.gameOverScreen = document.getElementById('game-over-screen');
            this.restartBtn = document.getElementById('restart-btn');
            
            this.btnRotate = document.getElementById('rotate-btn');
            this.btnLeft = document.getElementById('left-btn');
            this.btnRight = document.getElementById('right-btn');
            this.btnDown = document.getElementById('down-btn');
            this.btnDrop = document.getElementById('drop-btn');
            
            this.colors = [
                null,
                '#FF0D72', 
                '#0DC2FF', 
                '#0DFF72', 
                '#F538FF', 
                '#FF8E0D', 
                '#FFE138', 
                '#3877FF', 
            ];

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

            this.boundHandleInput = this.handleInput.bind(this);
            this.boundClickStart = this.clickStart.bind(this);

            this.init();
        }
        
        init() {
            window.addEventListener('keydown', this.boundHandleInput);
            
            this.canvas.addEventListener('click', this.boundClickStart);
            this.canvas.addEventListener('touchstart', (e) => { 
                e.preventDefault(); 
                this.clickStart(e); 
            });
            
            if(this.startScreen) this.startScreen.addEventListener('click', this.boundClickStart);
            
            if(this.btnRotate) this.btnRotate.addEventListener('click', () => this.playerRotate(1));
            if(this.btnLeft) this.btnLeft.addEventListener('click', () => this.playerMove(-1));
            if(this.btnRight) this.btnRight.addEventListener('click', () => this.playerMove(1));
            if(this.btnDown) this.btnDown.addEventListener('click', () => this.playerDrop());
            if(this.btnDrop) this.btnDrop.addEventListener('click', () => {
                 this.hardDrop();
            });
            
            if(this.restartBtn) this.restartBtn.addEventListener('click', () => this.resetGame());
            
            this.updateScore();
            this.draw();
        }
        
        cleanup() {
            window.removeEventListener('keydown', this.boundHandleInput);
            this.canvas.removeEventListener('click', this.boundClickStart);
            if(this.startScreen) this.startScreen.removeEventListener('click', this.boundClickStart);
            this.isRunning = false;
        }

        clickStart(e) {
             if(e.target.tagName === 'BUTTON') return;
             if(!this.isRunning) {
                 if(this.isGameOver) this.resetGame();
                 else this.start();
             }
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
            if (!ctx) return;
            matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        ctx.fillStyle = this.colors[value];
                        ctx.fillRect((x + offset.x) * this.grid, (y + offset.y) * this.grid, this.grid, this.grid);
                        
                        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                        ctx.lineWidth = 2;
                        ctx.strokeRect((x + offset.x) * this.grid, (y + offset.y) * this.grid, this.grid, this.grid);
                    }
                });
            });
        }

        draw() {
            if (!this.ctx) return;
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.drawMatrix(this.arena, {x: 0, y: 0});
            this.drawMatrix(this.player.matrix, this.player.pos);
            
            if (this.nextCtx) {
                this.nextCtx.fillStyle = '#111';
                this.nextCtx.fillRect(0, 0, 80, 80);
                if (this.nextPiece) {
                    const scale = 15; 
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
        }
        
        merge(arena, player) {
            player.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        // Ensure row exists before accessing
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
                this.player.level = Math.floor(this.player.lines / 10) + 1;
                this.dropInterval = Math.max(100, 1000 - (this.player.level * 50)); 
                
                this.updateScore();
            }
        }
        
        updateScore() {
            if (this.scoreElement) this.scoreElement.innerText = this.player.score;
            if (this.levelElement) this.levelElement.innerText = this.player.level;
            if (this.linesElement) this.linesElement.innerText = this.player.lines;
        }
        
        gameOver() {
            if(this.gameOverScreen) {
                if (this.finalScoreElement) this.finalScoreElement.innerText = this.player.score;
                this.gameOverScreen.style.display = 'flex';
            }
        }

        hardDrop() {
             while(!this.collide(this.arena, this.player)) {
                 this.player.pos.y++;
             }
             this.player.pos.y--;
             this.merge(this.arena, this.player);
             this.playerReset();
             this.arenaSweep();
             this.updateScore();
        }
        
        handleInput(e) {
            // Check canvas existence here too
            if (!document.getElementById('gameCanvas')) return;

            if (!this.isRunning) {
                if (e.code === 'Space') {
                    e.preventDefault();
                    this.start();
                }
                return;
            }
            
            if (e.code === 'ArrowLeft') {
                e.preventDefault();
                this.playerMove(-1);
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                this.playerMove(1);
            } else if (e.code === 'ArrowDown') {
                e.preventDefault();
                this.playerDrop();
            } else if (e.code === 'ArrowUp') {
                e.preventDefault();
                this.playerRotate(1);
            } else if (e.code === 'Space') {
                e.preventDefault();
                this.hardDrop();
            }
            this.draw(); // Redraw on input
        }
        
        update(time = 0) {
            if (!document.getElementById('gameCanvas')) {
                this.cleanup();
                return;
            }

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
    
    new TetrisGame();
})();
