(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    class PongGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = this.canvas.getContext('2d');
            
            // Standardize Dimensions
            this.canvas.width = 800;
            this.canvas.height = 500;
            
            // UI
            this.scoreElement = document.getElementById('score'); // Unified score container if exists
            
            // Consts
            this.paddleWidth = 15;
            this.paddleHeight = 80;
            this.ballSize = 12;
            
            // State
            this.player = {
                x: 30,
                y: this.canvas.height / 2 - 40,
                score: 0,
                dy: 0,
                speed: 8,
                color: '#00ffff' // Cyan
            };
            
            this.cpu = {
                x: this.canvas.width - 45,
                y: this.canvas.height / 2 - 40,
                score: 0,
                dy: 0,
                speed: 6,
                color: '#ff00ff' // Magenta
            };
            
            this.ball = {
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                dx: 0,
                dy: 0,
                speed: 7,
                trail: [] // Array of {x, y, opacity}
            };
            
            this.isRunning = false;
            this.isPaused = false;
            this.animationId = null;

            this.boundHandleKeyDown = this.handleKeyDown.bind(this);
            this.boundHandleKeyUp = this.handleKeyUp.bind(this);
            this.boundHandleClick = this.handleClick.bind(this);

            this.init();
        }
        
        init() {
            window.addEventListener('keydown', this.boundHandleKeyDown);
            window.addEventListener('keyup', this.boundHandleKeyUp);
            this.canvas.addEventListener('click', this.boundHandleClick);

            // Mobile Setup
            this.setupMobileControls();

            // Initial Draw
            this.draw();
            
            // Show Start Screen
            if (window.GameUI) {
                window.GameUI.showStartScreen(
                    "NEON PONG",
                    "Use Arrow Keys or W/S to move.<br>First to 10 wins.",
                    () => this.start()
                );
            }
        }
        
        setupMobileControls() {
            const btnUp = document.getElementById('up-btn');
            const btnDown = document.getElementById('down-btn');
            
            const handlePress = (dir) => {
                if (!this.isRunning && !this.isPaused) this.start();
                this.player.dy = dir * this.player.speed;
            };
            
            const handleRelease = () => {
                this.player.dy = 0;
            };
            
            if (btnUp) {
                btnUp.addEventListener('mousedown', () => handlePress(-1));
                btnUp.addEventListener('mouseup', handleRelease);
                btnUp.addEventListener('touchstart', (e) => { e.preventDefault(); handlePress(-1); });
                btnUp.addEventListener('touchend', (e) => { e.preventDefault(); handleRelease(); });
            }
            if (btnDown) {
                btnDown.addEventListener('mousedown', () => handlePress(1));
                btnDown.addEventListener('mouseup', handleRelease);
                btnDown.addEventListener('touchstart', (e) => { e.preventDefault(); handlePress(1); });
                btnDown.addEventListener('touchend', (e) => { e.preventDefault(); handleRelease(); });
            }
        }

        cleanup() {
            window.removeEventListener('keydown', this.boundHandleKeyDown);
            window.removeEventListener('keyup', this.boundHandleKeyUp);
            this.canvas.removeEventListener('click', this.boundHandleClick);
            if (this.animationId) cancelAnimationFrame(this.animationId);
            this.isRunning = false;
        }
        
        start() {
            if (this.isRunning) return;
            this.isRunning = true;
            this.isPaused = false;
            // Reset scores
            this.player.score = 0;
            this.cpu.score = 0;
            this.resetBall();
            this.loop();
        }
        
        pause() {
            if (!this.isRunning) return;
            this.isPaused = !this.isPaused;
            
            if (this.isPaused) {
                if (window.GameUI) {
                    window.GameUI.showPause(
                        () => this.pause(),
                        () => {
                            this.isRunning = false; 
                            window.history.back();
                        }
                    );
                }
            } else {
                if (window.GameUI) window.GameUI.hide();
                this.loop();
            }
        }

        handleClick() {
            if (!this.isRunning) this.start();
        }
        
        handleKeyDown(e) {
            if (!document.getElementById('gameCanvas')) return;
            
            // Prevent Scroll
            if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
            
            // Pause
            if (e.code === 'KeyP' || e.code === 'Escape') {
                this.pause();
                return;
            }
            
            if (e.code === 'Space' && !this.isRunning) {
                this.start();
                return;
            }
            
            if (this.isRunning && !this.isPaused) {
                if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                    this.player.dy = -this.player.speed;
                } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                    this.player.dy = this.player.speed;
                }
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
            this.ball.speed = 7;
            this.ball.dx = (winner === 'player' ? 1 : -1) * this.ball.speed;
            
            // If new game, random start dir
            if (!winner) this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * this.ball.speed;
            
            this.ball.dy = (Math.random() * 2 - 1) * 3;
            this.ball.trail = [];
        }
        
        update() {
            if (!document.getElementById('gameCanvas')) return;
            if (this.isPaused) return;

            // Player Bounds
            this.player.y += this.player.dy;
            if (this.player.y < 0) this.player.y = 0;
            if (this.player.y + this.paddleHeight > this.canvas.height) {
                this.player.y = this.canvas.height - this.paddleHeight;
            }
            
            // CPU Bounds & Logic
            const cpuCenter = this.cpu.y + this.paddleHeight / 2;
            const ballCenter = this.ball.y;
            
            // AI Reaction delay simulation or just speed limit
            if (cpuCenter < ballCenter - 20) {
                this.cpu.y += this.cpu.speed;
            } else if (cpuCenter > ballCenter + 20) {
                this.cpu.y -= this.cpu.speed;
            }
            
            if (this.cpu.y < 0) this.cpu.y = 0;
            if (this.cpu.y + this.paddleHeight > this.canvas.height) {
                this.cpu.y = this.canvas.height - this.paddleHeight;
            }
            
            // Ball Physics
            this.ball.x += this.ball.dx;
            this.ball.y += this.ball.dy;
            
            // Trail update
            this.ball.trail.push({x: this.ball.x, y: this.ball.y, opacity: 1.0});
            if (this.ball.trail.length > 10) this.ball.trail.shift();
            this.ball.trail.forEach(t => t.opacity -= 0.1);
            
            // Ceiling/Floor
            if (this.ball.y <= 0 || this.ball.y >= this.canvas.height) {
                this.ball.dy *= -1;
                // Clamp
                if (this.ball.y <= 0) this.ball.y = 1;
                if (this.ball.y >= this.canvas.height) this.ball.y = this.canvas.height - 1;
            }
            
            // Paddle Collisions
            const checkCollision = (paddle) => {
                return (
                    this.ball.x < paddle.x + this.paddleWidth &&
                    this.ball.x + this.ballSize > paddle.x &&
                    this.ball.y < paddle.y + this.paddleHeight &&
                    this.ball.y + this.ballSize > paddle.y
                );
            };

            if (checkCollision(this.player)) {
                this.ball.dx = Math.abs(this.ball.speed); // Force RIGHT
                this.ball.speed = Math.min(this.ball.speed + 0.5, 15);
                this.changeBallAngle(this.player);
            }
            
            if (checkCollision(this.cpu)) {
                this.ball.dx = -Math.abs(this.ball.speed); // Force LEFT
                this.ball.speed = Math.min(this.ball.speed + 0.5, 15);
                this.changeBallAngle(this.cpu);
            }
            
            // Scoring
            if (this.ball.x < 0) {
                this.cpu.score++;
                if (this.cpu.score >= 10) this.gameOver('CPU Wins!');
                else this.resetBall('cpu');
            } else if (this.ball.x > this.canvas.width) {
                this.player.score++;
                if (this.player.score >= 10) this.gameOver('Player Wins!');
                else this.resetBall('player');
            }
        }
        
        changeBallAngle(paddle) {
             const paddleCenter = paddle.y + this.paddleHeight / 2;
             const ballCenter = this.ball.y + this.ballSize / 2;
             const impact = (ballCenter - paddleCenter) / (this.paddleHeight / 2);
             
             this.ball.dy = impact * 8; // Max vert speed
        }
        
        gameOver(msg) {
            this.isRunning = false;
            // Draw one last time to show final state
            this.draw();
            
            if (window.GameUI) {
                window.GameUI.showGameOver(
                    `${this.player.score} - ${this.cpu.score}`,
                    () => this.start(),
                    () => window.history.back(),
                    msg
                );
            } else {
                alert(msg);
                this.start();
            }
        }
    
        draw() {
            if (!this.ctx) return;

            // Background
            this.ctx.fillStyle = '#050510';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Center Line (Neon)
            this.ctx.strokeStyle = '#222';
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([20, 20]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width / 2, 0);
            this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Draw Scores (Background)
            this.ctx.font = '100px "Press Start 2P"';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.player.score, this.canvas.width / 4, this.canvas.height / 2);
            this.ctx.fillText(this.cpu.score, (this.canvas.width / 4) * 3, this.canvas.height / 2);

            // Draw Paddles (Neon)
            this.ctx.shadowBlur = 20;
            
            this.ctx.shadowColor = this.player.color;
            this.ctx.fillStyle = this.player.color;
            this.ctx.fillRect(this.player.x, this.player.y, this.paddleWidth, this.paddleHeight);
            
            this.ctx.shadowColor = this.cpu.color;
            this.ctx.fillStyle = this.cpu.color;
            this.ctx.fillRect(this.cpu.x, this.cpu.y, this.paddleWidth, this.paddleHeight);
            
            // Draw Ball Trail
            this.ctx.shadowBlur = 0;
            this.ball.trail.forEach(t => {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${t.opacity * 0.5})`;
                this.ctx.beginPath();
                this.ctx.arc(t.x + this.ballSize/2, t.y + this.ballSize/2, this.ballSize/2, 0, Math.PI*2);
                this.ctx.fill();
            });

            // Draw Ball (Bright)
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#fff';
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(this.ball.x + this.ballSize/2, this.ball.y + this.ballSize/2, this.ballSize/2, 0, Math.PI*2);
            this.ctx.fill();
            
            // CRT Scanline Overlay
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            for (let i = 0; i < this.canvas.height; i += 4) {
                this.ctx.fillRect(0, i, this.canvas.width, 2);
            }
        }
        
        loop() {
            if (!document.getElementById('gameCanvas')) {
                this.cleanup();
                return;
            }
            if (!this.isRunning || this.isPaused) return;
            
            this.update();
            this.draw();
            this.animationId = requestAnimationFrame(() => this.loop());
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new PongGame());
    } else {
        new PongGame();
    }
})();
