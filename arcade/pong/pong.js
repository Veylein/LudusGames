(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    class PongGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = this.canvas.getContext('2d');
            
            this.startScreen = document.getElementById('start-screen');
            this.playerScoreEl = document.getElementById('player-score');
            this.cpuScoreEl = document.getElementById('cpu-score');
            
            this.btnUp = document.getElementById('up-btn');
            this.btnDown = document.getElementById('down-btn');
            
            this.isRunning = false;
            this.animationId = null;
            
            this.paddleWidth = 10;
            this.paddleHeight = 80;
            this.ballSize = 10;
            
            this.player = {
                x: 10,
                y: this.canvas.height / 2 - 40,
                score: 0,
                dy: 0,
                speed: 6
            };
            
            this.cpu = {
                x: this.canvas.width - 20,
                y: this.canvas.height / 2 - 40,
                score: 0,
                dy: 0,
                speed: 4.5
            };
            
            this.ball = {
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                dx: 5,
                dy: 5,
                speed: 5
            };

            this.boundHandleKeyDown = this.handleKeyDown.bind(this);
            this.boundHandleKeyUp = this.handleKeyUp.bind(this);
            this.boundHandleClick = this.handleClick.bind(this);
            
            this.init();
        }
        
        init() {
            window.addEventListener('keydown', this.boundHandleKeyDown);
            window.addEventListener('keyup', this.boundHandleKeyUp);
            
            // Click to Start
            this.canvas.addEventListener('click', this.boundHandleClick);
            
            if(this.startScreen) {
                this.startScreen.addEventListener('click', this.boundHandleClick);
            }
            
            // Mobile Controls
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

        cleanup() {
            window.removeEventListener('keydown', this.boundHandleKeyDown);
            window.removeEventListener('keyup', this.boundHandleKeyUp);
            this.canvas.removeEventListener('click', this.boundHandleClick);
            if (this.startScreen) {
                this.startScreen.removeEventListener('click', this.boundHandleClick);
            }
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
        }
        
        start() {
            if (this.isRunning) return;
            this.isRunning = true;
            if (this.startScreen) this.startScreen.style.display = 'none';
            this.loop();
        }

        handleClick() {
            if (!this.isRunning) this.start();
        }
        
        handleKeyDown(e) {
            if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
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
            this.ball.dy = (Math.random() > 0.5 ? 1 : -1) * 3;
        }
        
        update() {
            // Check for canvas
            if (!document.getElementById('gameCanvas')) {
                this.cleanup();
                return;
            }

            // Player move
            this.player.y += this.player.dy;
            if (this.player.y < 0) this.player.y = 0;
            if (this.player.y + this.paddleHeight > this.canvas.height) {
                this.player.y = this.canvas.height - this.paddleHeight;
            }
            
            // CPU move
            const cpuCenter = this.cpu.y + this.paddleHeight / 2;
            const ballCenter = this.ball.y;
            
            // Simple AI with deadzone
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
            }
            
            // Paddle Collision
            // Player
            if (
                this.ball.x < this.player.x + this.paddleWidth &&
                this.ball.x + this.ballSize > this.player.x &&
                this.ball.y + this.ballSize > this.player.y &&
                this.ball.y < this.player.y + this.paddleHeight
            ) {
                this.ball.dx = Math.abs(this.ball.dx); // Bounce right
                this.ball.speed += 0.5;
                this.changeBallAngle(this.player);
            }
            
            // CPU
            if (
                this.ball.x + this.ballSize > this.cpu.x &&
                this.ball.x < this.cpu.x + this.paddleWidth &&
                this.ball.y + this.ballSize > this.cpu.y &&
                this.ball.y < this.cpu.y + this.paddleHeight
            ) {
                this.ball.dx = -Math.abs(this.ball.dx); // Bounce left
                this.ball.speed += 0.5;
                this.changeBallAngle(this.cpu);
            }
            
            // Score
            if (this.ball.x < 0) {
                this.cpu.score++;
                if (this.cpuScoreEl) this.cpuScoreEl.innerText = this.cpu.score;
                this.resetBall('cpu');
            } else if (this.ball.x > this.canvas.width) {
                this.player.score++;
                if (this.playerScoreEl) this.playerScoreEl.innerText = this.player.score;
                this.resetBall('player');
            }
        }
        
        changeBallAngle(paddle) {
             const paddleCenter = paddle.y + this.paddleHeight / 2;
             const impactY = (this.ball.y + this.ballSize / 2) - paddleCenter;
             const normalizedImpact = impactY / (this.paddleHeight / 2);
             
             this.ball.dy = normalizedImpact * 5; 
             // Increase speed slightly on hit is handled in update
             this.ball.dx = this.ball.dx > 0 ? this.ball.speed : -this.ball.speed;
        }
    
        draw() {
            // Check for canvas context
            if (!this.ctx) return;

            // Clear
            this.ctx.fillStyle = '#111';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Net
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([10, 15]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width / 2, 0);
            this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Draw Paddles
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(this.player.x, this.player.y, this.paddleWidth, this.paddleHeight);
            this.ctx.fillRect(this.cpu.x, this.cpu.y, this.paddleWidth, this.paddleHeight);
            
            // Draw Ball
            this.ctx.beginPath();
            this.ctx.arc(this.ball.x + this.ballSize/2, this.ball.y + this.ballSize/2, this.ballSize/2, 0, Math.PI*2);
            this.ctx.fill();
        }
        
        loop() {
            if (!this.isRunning) return;
            this.update();
            this.draw();
            if (this.isRunning) {
                this.animationId = requestAnimationFrame(() => this.loop());
            }
        }
    }

    new PongGame();
})();
