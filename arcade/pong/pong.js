class PongGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.startScreen = document.getElementById('start-screen');
        this.playerScoreEl = document.getElementById('player-score');
        this.cpuScoreEl = document.getElementById('cpu-score');
        
        this.btnUp = document.getElementById('up-btn');
        this.btnDown = document.getElementById('down-btn');
        
        this.isRunning = false;
        
        this.paddleWidth = 15;
        this.paddleHeight = 80;
        this.ballSize = 15;
        
        this.player = {
            x: 10,
            y: this.canvas.height / 2 - 40,
            score: 0,
            dy: 0,
            speed: 5
        };
        
        this.cpu = {
            x: this.canvas.width - 25,
            y: this.canvas.height / 2 - 40,
            score: 0,
            dy: 0,
            speed: 4
        };
        
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            dx: 5,
            dy: 5,
            speed: 5
        };
        
        this.init();
    }
    
    init() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        if (this.btnUp) {
            this.btnUp.addEventListener('mousedown', () => this.player.dy = -this.player.speed);
            this.btnUp.addEventListener('mouseup', () => this.player.dy = 0);
            this.btnUp.addEventListener('touchstart', (e) => { e.preventDefault(); this.player.dy = -this.player.speed; });
            this.btnUp.addEventListener('touchend', (e) => { e.preventDefault(); this.player.dy = 0; });
        }
        if (this.btnDown) {
            this.btnDown.addEventListener('mousedown', () => this.player.dy = this.player.speed);
            this.btnDown.addEventListener('mouseup', () => this.player.dy = 0);
            this.btnDown.addEventListener('touchstart', (e) => { e.preventDefault(); this.player.dy = this.player.speed; });
            this.btnDown.addEventListener('touchend', (e) => { e.preventDefault(); this.player.dy = 0; });
        }
        
        this.draw();
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.startScreen.style.display = 'none';
        this.loop();
    }
    
    handleKeyDown(e) {
        if (e.code === 'Space' && !this.isRunning) {
            this.start();
            return;
        }
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
            this.player.dy = -this.player.speed;
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            this.player.dy = this.player.speed;
        }
    }
    
    handleKeyUp(e) {
        if ((e.code === 'ArrowUp' || e.code === 'KeyW') && this.player.dy < 0) {
            this.player.dy = 0;
        } else if ((e.code === 'ArrowDown' || e.code === 'KeyS') && this.player.dy > 0) {
            this.player.dy = 0;
        }
    }
    
    resetBall(winner) {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.speed = 5;
        this.ball.dx = (winner === 'player' ? 1 : -1) * this.ball.speed;
        this.ball.dy = (Math.random() > 0.5 ? 1 : -1) * this.ball.speed;
    }
    
    update() {
        // Player move
        this.player.y += this.player.dy;
        if (this.player.y < 0) this.player.y = 0;
        if (this.player.y + this.paddleHeight > this.canvas.height) {
            this.player.y = this.canvas.height - this.paddleHeight;
        }
        
        // CPU move (Simple tracking with delay/error)
        const cpuCenter = this.cpu.y + this.paddleHeight / 2;
        const ballCenter = this.ball.y;
        
        if (cpuCenter < ballCenter - 30) {
            this.cpu.y += this.cpu.speed;
        } else if (cpuCenter > ballCenter + 30) {
            this.cpu.y -= this.cpu.speed;
        }
        
        if (this.cpu.y < 0) this.cpu.y = 0;
        if (this.cpu.y + this.paddleHeight > this.canvas.height) {
            this.cpu.y = this.canvas.height - this.paddleHeight;
        }
        
        // Ball move
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        
        // Wall collision (Top/Bottom)
        if (this.ball.y <= 0 || this.ball.y + this.ballSize >= this.canvas.height) {
            this.ball.dy *= -1;
            // sound?
        }
        
        // Paddle Collision
        // Player
        if (this.ball.x <= this.player.x + this.paddleWidth &&
            this.ball.x + this.ballSize >= this.player.x &&
            this.ball.y + this.ballSize >= this.player.y &&
            this.ball.y <= this.player.y + this.paddleHeight) {
                
            this.ball.dx = Math.abs(this.ball.dx); // Bounce right
            this.ball.speed += 0.2; // Speed up
            this.enhanceBallAngle(this.player);
        }
        
        // CPU
        if (this.ball.x + this.ballSize >= this.cpu.x &&
            this.ball.x <= this.cpu.x + this.paddleWidth &&
            this.ball.y + this.ballSize >= this.cpu.y &&
            this.ball.y <= this.cpu.y + this.paddleHeight) {
                
            this.ball.dx = -Math.abs(this.ball.dx); // Bounce left
            this.ball.speed += 0.2;
            this.enhanceBallAngle(this.cpu);
        }
        
        // Score
        if (this.ball.x < 0) {
            this.cpu.score++;
            this.cpuScoreEl.innerText = this.cpu.score;
            this.resetBall('cpu');
        } else if (this.ball.x > this.canvas.width) {
            this.player.score++;
            this.playerScoreEl.innerText = this.player.score;
            this.resetBall('player');
        }
    }
    
    enhanceBallAngle(paddle) {
        // Change DY based on where it hit the paddle
        const hitPoint = (this.ball.y + this.ballSize/2) - (paddle.y + this.paddleHeight/2);
        // Normalize (-40 to 40) -> -1 to 1
        const normalized = hitPoint / (this.paddleHeight/2);
        
        // Add some angle
        this.ball.dy = normalized * (this.ball.speed + 2);
    }

    draw() {
        // Clear
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Net
        this.ctx.strokeStyle = '#fff';
        this.ctx.setLineDash([10, 15]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Paddles
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(this.player.x, this.player.y, this.paddleWidth, this.paddleHeight);
        this.ctx.fillRect(this.cpu.x, this.cpu.y, this.paddleWidth, this.paddleHeight);
        
        // Ball
        this.ctx.fillRect(this.ball.x, this.ball.y, this.ballSize, this.ballSize);
    }
    
    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

window.onload = () => {
    new PongGame();
};
