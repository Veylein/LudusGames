class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
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
        
        this.init();
    }

    init() {
        this.highScoreElement.textContent = this.highScore;
        
        // Event Listeners
        document.addEventListener('keydown', (e) => this.handleInput(e));
        
        this.restartBtn.addEventListener('click', () => this.resetGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());

        this.difficultySelect.addEventListener('change', () => this.setDifficulty());

        // Mobile Touch Listeners
        this.setupMobileControls();

        // Initial Draw
        this.draw();
        // this.drawStartScreen(); // Not needed as HTML overlay handles it
    }
    
    setupMobileControls() {
        const handleTouch = (dx, dy) => {
            if (!this.isGameRunning) {
                this.startGame();
                return;
            }
            
            // Prevent reversing
            // Moving Right? Can't go Left (-1)
            if (dx === -1 && this.dx === 1) return;
            // Moving Left? Can't go Right (1)
            if (dx === 1 && this.dx === -1) return;
            // Moving Down? Can't go Up (-1)
            if (dy === -1 && this.dy === 1) return;
            // Moving Up? Can't go Down (1)
            if (dy === 1 && this.dy === -1) return;
            
            this.nextDx = dx;
            this.nextDy = dy;
        };

        this.btnUp.addEventListener('click', () => handleTouch(0, -1));
        this.btnDown.addEventListener('click', () => handleTouch(0, 1));
        this.btnLeft.addEventListener('click', () => handleTouch(-1, 0));
        this.btnRight.addEventListener('click', () => handleTouch(1, 0));
    }

    setDifficulty() {
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
        this.startScreen.style.display = 'none';
        this.gameOverScreen.style.display = 'none';
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

    togglePause() {
        if (!this.isGameRunning) return;
        
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            clearInterval(this.gameInterval);
            this.pauseBtn.innerText = 'RESUME';
            this.pauseBtn.classList.add('paused');
        } else {
            this.gameInterval = setInterval(() => this.gameLoop(), this.speed);
            this.pauseBtn.innerText = 'PAUSE';
            this.pauseBtn.classList.remove('paused');
        }
    }

    gameLoop() {
        if (this.isPaused) return;

        this.update();
        this.draw();
    }

    update() {
        // Update direction from buffer
        this.dx = this.nextDx;
        this.dy = this.nextDy;

        // Calculate new head position
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

        // Check collisions with next snake position (except the tail, which will move)
        // Actually, checking existing snake array is correct, but we need to account for the tail moving if we don't eat food.
        // However, checking the current array is safer to prevent crashing into tail immediately.

        // Add new head
        this.snake.unshift(head);

        // Check Food Collision
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.updateScore();
            this.spawnFood();
            // Don't pop the tail, so snake grows
        } else {
            this.snake.pop(); // Remove tail
        }
    }

    draw() {
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
                
                // Adjust eye pos based on direction
                if(this.dx === 1) { // Right
                   lx = 10; ly = 4; rx = 10; ry = 12;
                } else if(this.dx === -1) { // Left
                   lx = 4; ly = 4; rx = 4; ry = 12;
                } else if(this.dy === 1) { // Down
                   lx = 4; ly = 10; rx = 12; ry = 10;
                }
                
                this.ctx.fillRect(x + lx, y + ly, 4, 4);
                this.ctx.fillRect(x + rx, y + ry, 4, 4);
                
                // Tongue (Red pixel)
                if (Math.floor(Date.now() / 150) % 2 === 0) {
                    this.ctx.fillStyle = '#ff0000';
                    let tx = 8, ty = -4; // Up
                    if(this.dx === 1) { tx = 20; ty = 8; }
                    else if(this.dx === -1) { tx = -4; ty = 8; }
                    else if(this.dy === 1) { tx = 8; ty = 20; }
                    
                    if (this.dx !== 0) this.ctx.fillRect(x + tx, y + ty, 4, 4);
                    else this.ctx.fillRect(x + tx, y + ty, 4, 4);
                }
                
            } else {
                // Body Segment (Alternating or scaled)
                // Arcade style: slightly smaller box inside to show segmentation
                this.ctx.fillStyle = '#00cc00';
                this.ctx.fillRect(x, y, s, s);
                
                // Highlight/Shine
                this.ctx.fillStyle = '#66ff66';
                this.ctx.fillRect(x + 2, y + 2, 4, 4);
            }
        });
    }
    
    drawFood() {
        const x = this.food.x * this.gridSize;
        const y = this.food.y * this.gridSize;
        const s = this.gridSize;
        
        // Apple Sprite (Pixel Art 20x20 scale)
        // Red Body
        this.ctx.fillStyle = '#ff0000';
        // Cross shape rounded
        this.ctx.fillRect(x + 4, y, s - 8, s); // V
        this.ctx.fillRect(x, y + 4, s, s - 8); // H
        this.ctx.fillRect(x + 2, y + 2, s - 4, s - 4); // Center fill
        
        // Stem (Brown/Green)
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(x + 8, y - 4, 4, 4); // Stem top
    }

    spawnFood() {
        let validPosition = false;
        while (!validPosition) {
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
        this.scoreElement.innerText = this.score;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.highScoreElement.innerText = this.highScore;
            localStorage.setItem('snakeHighScore', this.highScore);
        }
    }

    gameOver() {
        this.isGameRunning = false;
        clearInterval(this.gameInterval);
        this.finalScoreElement.innerText = this.score;
        this.gameOverScreen.style.display = 'flex';
    }

    handleInput(e) {
        // Prevent default scrolling for arrow keys
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].indexOf(e.code) > -1) {
            e.preventDefault();
        }

        if (!this.isGameRunning) {
            // Start game on any arrow key or Space
            if (e.code === 'Space' || e.code.startsWith('Arrow')) {
                this.startGame();
            }
            return;
        }

        // Direction logic: Prevent reversing into self
        switch(e.code) {
            case 'ArrowUp':
                if (this.dy === 1) return; // Cannot go down while moving up
                this.nextDx = 0; this.nextDy = -1;
                break;
            case 'ArrowDown':
                if (this.dy === -1) return; // Cannot go up while moving down
                this.nextDx = 0; this.nextDy = 1;
                break;
            case 'ArrowLeft':
                if (this.dx === 1) return; // Cannot go right while moving left
                this.nextDx = -1; this.nextDy = 0;
                break;
            case 'ArrowRight':
                if (this.dx === -1) return; // Cannot go left while moving right
                this.nextDx = 1; this.nextDy = 0;
                break;
            case 'Space':
                this.togglePause();
                break;
        }
    }
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
});
