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
        this.clearCanvas();
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
        this.clearCanvas();
        this.drawFood();
        this.drawSnake();
    }

    clearCanvas() {
        // Theme-based background
        if (this.themeToggle.checked) {
             // Retro Mode: Dark Green background
             this.ctx.fillStyle = '#0f380f';
             this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

             // Draw Grid for retro feel
             this.ctx.strokeStyle = '#306230';
             this.ctx.lineWidth = 0.5;
             for (let i = 0; i < this.canvas.width; i += this.gridSize) {
                 this.ctx.beginPath();
                 this.ctx.moveTo(i, 0);
                 this.ctx.lineTo(i, this.canvas.height);
                 this.ctx.stroke();
             }
             for (let i = 0; i < this.canvas.height; i += this.gridSize) {
                 this.ctx.beginPath();
                 this.ctx.moveTo(0, i);
                 this.ctx.lineTo(this.canvas.width, i);
                 this.ctx.stroke();
             }
        } else {
             // Modern Mode: Black background
             this.ctx.fillStyle = '#000000';
             this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawSnake() {
        const isRetro = this.themeToggle.checked;
        
        for (let i = 0; i < this.snake.length; i++) {
            const segment = this.snake[i];
            
            // Choose color based on theme
            if (isRetro) {
                // Retro Mode: Light Green
                this.ctx.fillStyle = '#8bac0f';
                this.ctx.strokeStyle = '#0f380f';
            } else {
                // Modern Mode: Neon Green
                // Head is different color
                this.ctx.fillStyle = (i === 0) ? '#00ff9d' : '#00cc7a';
                this.ctx.shadowBlur = (i === 0) ? 15 : 5;
                this.ctx.shadowColor = '#00ff9d';
            }

            this.ctx.fillRect(segment.x * this.gridSize, segment.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
            
            // Draw eyes on head in Modern Mode
            if (i === 0 && !isRetro) {
                this.ctx.shadowBlur = 0;
                this.ctx.fillStyle = '#000';
                
                const eyeSize = 4;
                const eyeOffset = 6;
                let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
                
                // Position eyes based on direction
                if (this.dx === 1) { // Moving Right
                    leftEyeX = segment.x * this.gridSize + 12; leftEyeY = segment.y * this.gridSize + 5;
                    rightEyeX = segment.x * this.gridSize + 12; rightEyeY = segment.y * this.gridSize + 15;
                } else if (this.dx === -1) { // Moving Left
                    leftEyeX = segment.x * this.gridSize + 8; leftEyeY = segment.y * this.gridSize + 5;
                    rightEyeX = segment.x * this.gridSize + 8; rightEyeY = segment.y * this.gridSize + 15;
                } else if (this.dy === -1) { // Moving Up
                    leftEyeX = segment.x * this.gridSize + 5; leftEyeY = segment.y * this.gridSize + 8;
                    rightEyeX = segment.x * this.gridSize + 15; rightEyeY = segment.y * this.gridSize + 8;
                } else { // Moving Down (or stationary)
                    leftEyeX = segment.x * this.gridSize + 5; leftEyeY = segment.y * this.gridSize + 12;
                    rightEyeX = segment.x * this.gridSize + 15; rightEyeY = segment.y * this.gridSize + 12;
                }
                
                this.ctx.fillRect(leftEyeX, leftEyeY, eyeSize, eyeSize);
                this.ctx.fillRect(rightEyeX, rightEyeY, eyeSize, eyeSize);
            }
        }
        
        // Reset Shadow
        this.ctx.shadowBlur = 0;
    }
    
    drawFood() {
        if (this.themeToggle.checked) {
            // Retro Mode: Blocky Food
            this.ctx.fillStyle = '#8bac0f';
            this.ctx.fillRect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
        } else {
            // Modern Mode: Red Apple/Circle
            this.ctx.fillStyle = '#ff0055';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#ff0055';
            
            this.ctx.beginPath();
            this.ctx.arc(
                this.food.x * this.gridSize + this.gridSize / 2, 
                this.food.y * this.gridSize + this.gridSize / 2, 
                this.gridSize / 2 - 2, 
                0, Math.PI * 2
            );
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
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
