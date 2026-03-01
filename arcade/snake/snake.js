(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    class SnakeGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = this.canvas.getContext('2d');
            this.canvas.width = 600;
            this.canvas.height = 400;

            // UI Elements
            this.scoreElement = document.getElementById('score');
            this.highScoreElement = document.getElementById('high-score');
            this.startScreen = document.getElementById('start-screen');
            this.gameOverScreen = document.getElementById('game-over-screen');
            this.finalScoreElement = document.getElementById('final-score');
            this.restartBtn = document.getElementById('restart-btn');
            this.pauseBtn = document.getElementById('pause-btn');
            this.difficultySelect = document.getElementById('difficulty-select');
            this.themeToggle = document.getElementById('checkbox');
            
            // Mobile Controls
            this.btnUp = document.getElementById('up-btn');
            this.btnDown = document.getElementById('down-btn');
            this.btnLeft = document.getElementById('left-btn');
            this.btnRight = document.getElementById('right-btn');

            // Game Constants
            this.gridSize = 20;
            this.tileCountX = this.canvas.width / this.gridSize;
            this.tileCountY = this.canvas.height / this.gridSize;
            
            // Game State
            this.snake = [];
            this.food = { x: 15, y: 15 };
            this.dx = 0;
            this.dy = 0;
            this.nextDx = 0;
            this.nextDy = 0;
            this.score = 0;
            this.highScore = localStorage.getItem('snakeHighScore') || 0;
            this.gameInterval = null;
            this.isGameRunning = false;
            this.isPaused = false;
            this.speed = 100;
            
            this.boundHandleInput = this.handleInput.bind(this);
            this.boundClickStart = this.clickStart.bind(this);
            this.boundTouchStart = this.touchStart.bind(this);

            this.init();
        }

        init() {
            if (this.highScoreElement) this.highScoreElement.textContent = this.highScore;
            
            // Event Listeners
            document.addEventListener('keydown', this.boundHandleInput);
            
            this.canvas.addEventListener('click', this.boundClickStart);
            this.canvas.addEventListener('touchstart', this.boundTouchStart);
            
            if(this.startScreen) {
                 this.startScreen.addEventListener('click', this.boundClickStart);
            }
            
            if (this.restartBtn) this.restartBtn.addEventListener('click', () => this.resetGame());
            if (this.pauseBtn) this.pauseBtn.addEventListener('click', () => this.togglePause());

            if (this.difficultySelect) this.difficultySelect.addEventListener('change', () => this.setDifficulty());

            // Mobile Touch Listeners
            this.setupMobileControls();

            // Initial Draw
            this.draw();
        }
        
        cleanup() {
            document.removeEventListener('keydown', this.boundHandleInput);
            this.canvas.removeEventListener('click', this.boundClickStart);
            this.canvas.removeEventListener('touchstart', this.boundTouchStart);
            if(this.startScreen) {
                 this.startScreen.removeEventListener('click', this.boundClickStart);
            }
            if (this.gameInterval) clearInterval(this.gameInterval);
            this.isGameRunning = false;
        }

        clickStart(e) {
             if(e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
             if(!this.isGameRunning) this.startGame();
        }

        touchStart(e) {
            if(!this.isGameRunning) {
                e.preventDefault(); 
                this.startGame();
            }
        }
        
        setupMobileControls() {
            const handleTouch = (dx, dy) => {
                if (!this.isGameRunning) {
                    this.startGame();
                    return;
                }
                
                // Prevent reversing
                if (dx === -1 && this.dx === 1) return;
                if (dx === 1 && this.dx === -1) return;
                if (dy === -1 && this.dy === 1) return;
                if (dy === 1 && this.dy === -1) return;
                
                this.nextDx = dx;
                this.nextDy = dy;
            };

            if (this.btnUp) this.btnUp.addEventListener('click', () => handleTouch(0, -1));
            if (this.btnDown) this.btnDown.addEventListener('click', () => handleTouch(0, 1));
            if (this.btnLeft) this.btnLeft.addEventListener('click', () => handleTouch(-1, 0));
            if (this.btnRight) this.btnRight.addEventListener('click', () => handleTouch(1, 0));
        }

        setDifficulty() {
            if (!this.difficultySelect) return;
            const level = this.difficultySelect.value;
            switch(level) {
                case 'slug': this.speed = 150; break;
                case 'worm': this.speed = 100; break;
                case 'python': this.speed = 60; break;
                case 'cobra': this.speed = 40; break;
            }
            // If game is running, update the interval immediately
            if (this.isGameRunning && !this.isPaused) {
                clearInterval(this.gameInterval);
                this.gameInterval = setInterval(() => this.gameLoop(), this.speed);
            }
        }

        startGame() {
            if (this.isGameRunning) return;
            
            this.isGameRunning = true;
            this.isPaused = false;
            if (this.startScreen) this.startScreen.style.display = 'none';
            if (this.gameOverScreen) this.gameOverScreen.style.display = 'none';
            this.resetSnake();
            this.spawnFood();
            this.score = 0;
            this.updateScore();
            this.setDifficulty();
            
            // Default movement
            this.dx = 1;
            this.dy = 0;
            this.nextDx = 1;
            this.nextDy = 0;

            if (this.gameInterval) clearInterval(this.gameInterval);
            this.gameInterval = setInterval(() => this.gameLoop(), this.speed);
        }
        
        resetGame() {
            this.isGameRunning = false;
            this.startGame();
        }

        resetSnake() {
            // Start snake in the middle-ish
            this.snake = [
                { x: 10, y: 10 },
                { x: 9, y: 10 },
                { x: 8, y: 10 }
            ];
        }

        togglePause(force) {
            if (!this.isGameRunning) return;
            
            const shouldPause = (typeof force !== 'undefined') ? force : !this.isPaused;
            this.isPaused = shouldPause;
            
            if (this.isPaused) {
                if (this.gameInterval) clearInterval(this.gameInterval);
                if(window.GameUI) {
                    window.GameUI.showPause(
                        () => this.togglePause(false),
                        () => {
                            this.isGameRunning = false;
                            window.history.back(); // Exit
                        }
                    );
                }
            } else {
                if(window.GameUI) window.GameUI.hide();
                this.gameInterval = setInterval(() => this.gameLoop(), this.speed);
                if (this.pauseBtn) {
                    this.pauseBtn.innerText = 'PAUSE';
                    this.pauseBtn.classList.remove('paused');
                }
            }
        }

        gameLoop() {
            if (!document.getElementById('gameCanvas')) {
                this.cleanup();
                return;
            }

            if (this.isPaused) return;

            this.update();
            this.draw();
        }

        update() {
            // Update direction from buffer
            this.dx = this.nextDx;
            this.dy = this.nextDy;

            // Calculate new head position
            if (this.snake.length === 0) return; // Guard against empty snake

            const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };

            // Check Wall Collision
            if (head.x < 0 || head.x >= this.tileCountX || head.y < 0 || head.y >= this.tileCountY) {
                this.gameOver();
                return;
            }

            // Check Self Collision
            for (let i = 0; i < this.snake.length; i++) {
                if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                    this.gameOver();
                    return;
                }
            }

            // Add new head
            this.snake.unshift(head);

            // Check Food Collision
            if (head.x === this.food.x && head.y === this.food.y) {
                this.score += 10;
                this.updateScore();
                this.spawnFood();
            } else {
                this.snake.pop(); // Remove tail
            }
        }

        draw() {
            // Check canvas context
            if (!this.ctx) return;

            // Arcade Background
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Subtle Grid
            this.ctx.strokeStyle = '#111';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.canvas.height);
            }
            for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.canvas.width, y);
            }
            this.ctx.stroke();

            this.drawFood();
            this.drawSnake();
        }

        drawSnake() {
            this.snake.forEach((segment, i) => {
                const x = segment.x * this.gridSize;
                const y = segment.y * this.gridSize;
                const s = this.gridSize;
                
                // Head vs Body
                if (i === 0) {
                    // Head Sprite (Green)
                    this.ctx.fillStyle = '#00ff00';
                    this.ctx.fillRect(x, y, s, s);
                    
                    // Eyes (Pixelated)
                    this.ctx.fillStyle = '#000';
                    let lx = 4, ly = 4, rx = 12, ry = 4; // Default Up
                    
                    if(this.dx === 1) { // Right
                       lx = 10; ly = 4; rx = 10; ry = 12;
                    } else if(this.dx === -1) { // Left
                       lx = 4; ly = 4; rx = 4; ry = 12;
                    } else if(this.dy === 1) { // Down
                       lx = 4; ly = 10; rx = 12; ry = 10;
                    }
                    
                    this.ctx.fillRect(x + lx, y + ly, 4, 4);
                    this.ctx.fillRect(x + rx, y + ry, 4, 4);
                    
                } else {
                    this.ctx.fillStyle = '#00cc00';
                    this.ctx.fillRect(x, y, s, s);
                    this.ctx.fillStyle = '#66ff66';
                    this.ctx.fillRect(x + 2, y + 2, 4, 4);
                }
            });
        }
        
        drawFood() {
            const x = this.food.x * this.gridSize;
            const y = this.food.y * this.gridSize;
            const s = this.gridSize;
            
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(x + 4, y, s - 8, s); 
            this.ctx.fillRect(x, y + 4, s, s - 8); 
            this.ctx.fillRect(x + 2, y + 2, s - 4, s - 4); 
            
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(x + 8, y - 4, 4, 4); 
        }
    
        spawnFood() {
            let validPosition = false;
            // Prevent infinite loop if screen is full
            let attempts = 0;
            while (!validPosition && attempts < 100) {
                attempts++;
                this.food = {
                    x: Math.floor(Math.random() * this.tileCountX),
                    y: Math.floor(Math.random() * this.tileCountY)
                };
                
                validPosition = true;
                // Ensure food doesn't spawn on snake
                for (let segment of this.snake) {
                    if (this.food.x === segment.x && this.food.y === segment.y) {
                        validPosition = false;
                        break;
                    }
                }
            }
        }
    
        updateScore() {
            if (this.scoreElement) this.scoreElement.innerText = this.score;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                if (this.highScoreElement) this.highScoreElement.innerText = this.highScore;
                localStorage.setItem('snakeHighScore', this.highScore);
            }
        }
    
        gameOver() {
            this.isGameRunning = false;
            clearInterval(this.gameInterval);
            
            if(window.GameUI) {
                window.GameUI.showGameOver(
                    this.score,
                    () => this.resetGame(),
                    () => { window.history.back(); }
                );
            } else {
               if (this.finalScoreElement) this.finalScoreElement.innerText = this.score;
               if (this.gameOverScreen) this.gameOverScreen.style.display = 'flex';
            }
        }
    
        handleInput(e) {
            // Prevent default scrolling for arrow keys
            if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code) && document.getElementById('gameCanvas')) {
                e.preventDefault();
            }
    
            if (!this.isGameRunning) {
                if ((e.code === 'Space' || e.code.startsWith('Arrow')) && document.getElementById('gameCanvas')) {
                    this.startGame();
                }
                return;
            }
    
            switch(e.code) {
                case 'ArrowUp':
                    if (this.dy === 1) return;
                    this.nextDx = 0; this.nextDy = -1;
                    break;
                case 'ArrowDown':
                    if (this.dy === -1) return;
                    this.nextDx = 0; this.nextDy = 1;
                    break;
                case 'ArrowLeft':
                    if (this.dx === 1) return;
                    this.nextDx = -1; this.nextDy = 0;
                    break;
                case 'ArrowRight':
                    if (this.dx === -1) return;
                    this.nextDx = 1; this.nextDy = 0;
                    break;
                case 'Space':
                    this.togglePause();
                    break;
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
             if (document.getElementById('gameCanvas')) new SnakeGame();
        });
    } else {
         if (document.getElementById('gameCanvas')) new SnakeGame();
    }
})();
