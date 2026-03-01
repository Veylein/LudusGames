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
            
            // Legacy/DOM elements
            this.scoreElement = document.getElementById('score');
            this.levelElement = document.getElementById('level');
            this.linesElement = document.getElementById('lines');
            
            // Neon Palette
            this.colors = [
                null,
                '#FF0055', // T - Red
                '#00FF99', // Z - Green
                '#00CCFF', // S - Cyan
                '#FFCC00', // O - Yellow
                '#9900FF', // I - Purple
                '#FF6600', // L - Orange
                '#0033FF', // J - Blue
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
            this.isPaused = false;
            
            this.nextPiece = null;
            this.requestId = null;

            this.boundHandleInput = this.handleInput.bind(this);
            
            this.init();
        }
        
        init() {
            window.addEventListener('keydown', this.boundHandleInput);
            
            // Mobile/Touch Bindings
            const bindBtn = (id, fn) => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (this.isRunning && !this.isPaused) fn();
                    });
                }
            };
            
            bindBtn('rotate-btn', () => this.playerRotate(1));
            bindBtn('left-btn', () => this.playerMove(-1));
            bindBtn('right-btn', () => this.playerMove(1));
            bindBtn('down-btn', () => this.playerDrop());
            bindBtn('drop-btn', () => this.hardDrop());
            
            // Initial Draw
            this.draw();

            // Show Start Screen via GameUI
            if (window.GameUI) {
                window.GameUI.showStartScreen(
                    "NEON TETRIS",
                    "Arrow keys to move/rotate.<br>Space to Hard Drop.<br>'P' to Pause.",
                    () => this.start()
                );
            } else {
                this.start();
            }
        }
        
        cleanup() {
            window.removeEventListener('keydown', this.boundHandleInput);
            if (this.requestId) cancelAnimationFrame(this.requestId);
            this.isRunning = false;
        }

        start() {
            if (this.isRunning) return;
            
            this.isRunning = true;
            this.isGameOver = false;
            this.isPaused = false;
            
            this.arena.forEach(row => row.fill(0));
            
            this.player.score = 0;
            this.player.lines = 0;
            this.player.level = 1;
            this.dropInterval = 1000;
            this.updateScore();
            
            this.playerReset();
            this.update();
        }

        resetGame() {
            this.isRunning = false;
            this.isGameOver = false;
            this.start();
        }

        togglePause() {
            if (!this.isRunning || this.isGameOver) return;
            
            this.isPaused = !this.isPaused;
            
            if (this.isPaused) {
                if (window.GameUI) {
                    window.GameUI.showPause(
                        () => this.togglePause(), // Resume
                        () => window.history.back() // Quit
                    );
                }
            } else {
                if (window.GameUI) window.GameUI.hide();
                this.lastTime = performance.now();
                this.update();
            }
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

        drawMatrix(matrix, offset, ctx = this.ctx, isGhost = false) {
            if (!ctx) return;
            
            matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        const drawX = (x + offset.x) * this.grid;
                        const drawY = (y + offset.y) * this.grid;
                        const size = this.grid;

                        if (isGhost) {
                            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                            ctx.lineWidth = 1;
                            ctx.strokeRect(drawX, drawY, size, size);
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                            ctx.fillRect(drawX, drawY, size, size);
                        } else {
                            const color = this.colors[value];
                            
                            // Base & Glow
                            ctx.fillStyle = color;
                            ctx.shadowColor = color;
                            ctx.shadowBlur = 10;
                            ctx.fillRect(drawX, drawY, size, size);
                            
                            // Bevels
                            ctx.shadowBlur = 0; 
                            ctx.fillStyle = 'rgba(255,255,255,0.4)';
                            ctx.fillRect(drawX, drawY, size, 2);
                            ctx.fillRect(drawX, drawY, 2, size);

                            ctx.fillStyle = 'rgba(0,0,0,0.2)';
                            ctx.fillRect(drawX, drawY + size - 2, size, 2);
                            ctx.fillRect(drawX + size - 2, drawY, 2, size);
                            
                            // Center detail
                            ctx.fillStyle = 'rgba(255,255,255,0.1)';
                            ctx.fillRect(drawX + 4, drawY + 4, size - 8, size - 8);
                        }
                    }
                });
            });
            ctx.shadowBlur = 0;
        }

        drawGhost() {
            if (!this.player.matrix) return;
            
            const ghost = {
                matrix: this.player.matrix,
                pos: { x: this.player.pos.x, y: this.player.pos.y },
            };
            
            while (!this.collide(this.arena, ghost)) {
                ghost.pos.y++;
            }
            ghost.pos.y--; 
            
            this.drawMatrix(ghost.matrix, ghost.pos, this.ctx, true);
        }

        draw() {
            if (!this.ctx) return;
            
            // Dark Background
            this.ctx.fillStyle = '#101015'; 
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Grid Lines
            this.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            this.ctx.lineWidth = 1;
            for (let i = 0; i <= this.cols; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(i * this.grid, 0);
                this.ctx.lineTo(i * this.grid, this.canvas.height);
                this.ctx.stroke();
            }
            for (let i = 0; i <= this.rows; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, i * this.grid);
                this.ctx.lineTo(this.canvas.width, i * this.grid);
                this.ctx.stroke();
            }

            this.drawMatrix(this.arena, {x: 0, y: 0});
            
            if (!this.isGameOver) this.drawGhost();
            
            this.drawMatrix(this.player.matrix, this.player.pos);
            
            // Next Piece Preview
            if (this.nextCtx) {
                this.nextCtx.clearRect(0, 0, 80, 80);
                this.nextCtx.fillStyle = '#000';
                this.nextCtx.fillRect(0, 0, 80, 80);
                
                if (this.nextPiece) {
                    const offset = {
                        x: (4 - this.nextPiece[0].length) / 2,
                        y: (4 - this.nextPiece.length) / 2
                    };
                    
                    this.nextPiece.forEach((row, y) => {
                        row.forEach((value, x) => {
                            if (value !== 0) {
                                const size = 15;
                                const px = (x + offset.x) * size + 10;
                                const py = (y + offset.y) * size + 10;
                                
                                this.nextCtx.fillStyle = this.colors[value];
                                this.nextCtx.fillRect(px, py, size, size);
                                this.nextCtx.strokeStyle = '#fff';
                                this.nextCtx.strokeRect(px, py, size, size);
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
            } else {
                this.draw(); // optimization: only draw if moved
            }
            this.dropCounter = 0;
            // this.draw(); 
        }
        
        playerMove(dir) {
            this.player.pos.x += dir;
            if (this.collide(this.arena, this.player)) {
                this.player.pos.x -= dir;
            }
            this.draw();
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
            this.draw();
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
                
                if (window.GameUI) {
                    window.GameUI.showGameOver(
                        this.player.score,
                        () => this.resetGame(),
                        () => window.history.back()
                    );
                } else {
                    alert('Game Over! Score: ' + this.player.score);
                    this.resetGame();
                }
            }
            this.draw();
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

        hardDrop() {
             while(!this.collide(this.arena, this.player)) {
                 this.player.pos.y++;
             }
             this.player.pos.y--;
             this.merge(this.arena, this.player);
             this.playerReset();
             this.arenaSweep();
             this.updateScore();
             this.draw();
        }
        
        handleInput(e) {
            if (!document.getElementById('gameCanvas')) return;

            // Pause toggle
            if (e.code === 'KeyP' || e.code === 'Escape') {
                e.preventDefault();
                this.togglePause();
                return;
            }

            if (!this.isRunning || this.isPaused) {
                if (e.code === 'Space' && !this.isRunning && !this.isGameOver) {
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
        }
        
        update(time = 0) {
            if (!document.getElementById('gameCanvas')) {
                this.cleanup();
                return;
            }

            if (!this.isRunning || this.isPaused) return;
            
            const deltaTime = time - this.lastTime;
            this.lastTime = time;
            
            this.dropCounter += deltaTime;
            if (this.dropCounter > this.dropInterval) {
                this.playerDrop();
            }
            
            this.draw();
            this.requestId = requestAnimationFrame((t) => this.update(t));
        }
    }

    // Initialization Wrapper
    function initGame() {
        if (document.getElementById('gameCanvas')) {
            new TetrisGame();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGame);
    } else {
        initGame();
    }

})();
