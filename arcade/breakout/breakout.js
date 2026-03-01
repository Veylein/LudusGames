(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    class BreakoutGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = this.canvas.getContext('2d');
            
            // Game State
            this.paddleHeight = 12;
            this.paddleWidth = 85;
            this.paddleX = (this.canvas.width - this.paddleWidth) / 2;
            
            this.ballRadius = 6;
            this.x = this.canvas.width / 2;
            this.y = this.canvas.height - 30;
            this.dx = 4;
            this.dy = -4;
            
            this.rightPressed = false;
            this.leftPressed = false;
            
            this.brickRowCount = 5;
            this.brickColumnCount = 8; 
            this.brickWidth = 70; 
            this.brickHeight = 24;
            this.brickPadding = 15;
            this.brickOffsetTop = 45;
            this.brickOffsetLeft = 35; 
           
            this.score = 0;
            this.lives = 3;
            
            this.bricks = [];
            this.initBricks();
            
            this.isGameRunning = false;
            this.isPaused = false;
            this.animationId = null;
            
            this.boundKeyDown = this.keyDownHandler.bind(this);
            this.boundKeyUp = this.keyUpHandler.bind(this);
            this.handleResize = this.handleResize.bind(this);
            
            this.init();
        }
        
        handleResize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.paddleX = (this.canvas.width - this.paddleWidth) / 2;
            
            // Re-center bricks?
            const totalBrickW = (this.brickColumnCount * (this.brickWidth + this.brickPadding)) - this.brickPadding;
            this.brickOffsetLeft = (this.canvas.width - totalBrickW) / 2;
            
            this.draw();
        }

        init() {
            window.addEventListener("keydown", this.boundKeyDown, false);
            window.addEventListener("keyup", this.boundKeyUp, false);
            window.addEventListener("resize", this.handleResize);
            
            this.handleResize(); // Set initial size
            
            if (window.GameUI) {
            this.bricks = [];
            for(let c=0; c<this.brickColumnCount; c++) {
                this.bricks[c] = [];
                for(let r=0; r<this.brickRowCount; r++) {
                    this.bricks[c][r] = { x: 0, y: 0, status: 1, color: this.getBrickColor(r) };
                }
            }
        }
        
        getBrickColor(row) {
            const colors = ["#ff0055", "#ff7700", "#ffff00", "#00ff9d", "#00ccff"];
            return colors[row % colors.length];
        }

        init() {
            window.addEventListener("keydown", this.boundKeyDown, false);
            window.addEventListener("keyup", this.boundKeyUp, false);
            
            // Adjust canvas size logic if needed here, but keeping standard
            
            if (window.GameUI) {
                window.GameUI.showStartScreen("BREAKOUT", "Destroy all bricks!<br>Arrow keys to move.", () => this.startGame());
            } else {
                this.startGame();
            }
            
            // Initial Draw
            this.draw();
        }
        
        cleanup() {
            window.removeEventListener("keydown", this.boundKeyDown);
            window.removeEventListener("keyup", this.boundKeyUp);
            window.removeEventListener("resize", this.handleResize);
            if(this.animationId) cancelAnimationFrame(this.animationId);
            this.isGameRunning = false;
        }

        keyDownHandler(e) {
            if(["ArrowLeft","ArrowRight","Space"].includes(e.code)) {
                e.preventDefault();
            }

            if(e.code == "ArrowRight") {
                this.rightPressed = true;
            }
            else if(e.code == "ArrowLeft") {
                this.leftPressed = true;
            }
            else if(e.code == "Space") {
                if(this.isGameRunning) this.togglePause();
            }
            else if(e.code == "KeyP" || e.code == "Escape") {
                if(this.isGameRunning) this.togglePause();
            }
        }
        
        keyUpHandler(e) {
            if(e.code == "ArrowRight") {
                this.rightPressed = false;
            }
            else if(e.code == "ArrowLeft") {
                this.leftPressed = false;
            }
        }
        
        startGame() {
            this.isGameRunning = true;
            this.isPaused = false;
            this.score = 0;
            this.lives = 3;
            
            this.resetBall();
            this.initBricks();
            
            if (window.GameUI) window.GameUI.hide();
            this.animate();
        }
        
        togglePause() {
            this.isPaused = !this.isPaused;
            if (this.isPaused) {
                if (window.GameUI) window.GameUI.showPause(() => this.togglePause(), () => window.history.back());
            } else {
                if (window.GameUI) window.GameUI.hide();
                this.animate();
            }
        }
        
        resetBall() {
            this.x = this.canvas.width / 2;
            this.y = this.canvas.height - 40;
            this.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
            this.dy = -4;
            this.paddleX = (this.canvas.width - this.paddleWidth) / 2;
        }
        
        collisionDetection() {
            for(let c=0; c<this.brickColumnCount; c++) {
                for(let r=0; r<this.brickRowCount; r++) {
                    let b = this.bricks[c][r];
                    if(b.status == 1) {
                        let brickX = (c*(this.brickWidth+this.brickPadding))+this.brickOffsetLeft;
                        let brickY = (r*(this.brickHeight+this.brickPadding))+this.brickOffsetTop;
                        if(this.x > brickX && this.x < brickX+this.brickWidth && this.y > brickY && this.y < brickY+this.brickHeight) {
                            this.dy = -this.dy;
                            b.status = 0;
                            this.score++;
                            
                            // Check Win
                            let activeBricks = 0;
                            for(let c=0; c<this.brickColumnCount; c++) {
                                for(let r=0; r<this.brickRowCount; r++) {
                                    if(this.bricks[c][r].status === 1) activeBricks++;
                                }
                            }
                            if(activeBricks === 0) {
                                this.gameOver(true);
                            }
                        }
                    }
                }
            }
        }
        
        update() {
            if(!this.isGameRunning || this.isPaused) return;

            // Move Paddle
            if(this.rightPressed && this.paddleX < this.canvas.width-this.paddleWidth) {
                this.paddleX += 7;
            }
            else if(this.leftPressed && this.paddleX > 0) {
                this.paddleX -= 7;
            }

            // Move Ball
            this.x += this.dx;
            this.y += this.dy;

            // Wall Collision
            if(this.x + this.dx > this.canvas.width-this.ballRadius || this.x + this.dx < this.ballRadius) {
                this.dx = -this.dx;
            }
            if(this.y + this.dy < this.ballRadius) {
                this.dy = -this.dy;
            } 
            else if(this.y + this.dy > this.canvas.height-this.ballRadius) {
                if(this.x > this.paddleX && this.x < this.paddleX + this.paddleWidth) {
                     // Paddle hit logic
                     let hitPoint = this.x - (this.paddleX + this.paddleWidth/2);
                     this.dx = hitPoint * 0.15;
                     this.dy = -Math.abs(this.dy); // Ensure it goes up
                     
                     // Speed up slightly on paddle hit to increase difficulty
                     this.dy *= 1.02;
                     this.dx *= 1.02;
                }
                else {
                    this.lives--;
                    if(this.lives <= 0) {
                        this.gameOver(false);
                    } else {
                        this.resetBall();
                    }
                }
            }
            
            this.collisionDetection();
        }
        
        draw() {
            if (!this.ctx) return;
            
            // BG
            this.ctx.fillStyle = '#050510';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Bricks
            for(let c=0; c<this.brickColumnCount; c++) {
                for(let r=0; r<this.brickRowCount; r++) {
                    if(this.bricks[c][r].status == 1) {
                        let brickX = (c*(this.brickWidth+this.brickPadding))+this.brickOffsetLeft;
                        let brickY = (r*(this.brickHeight+this.brickPadding))+this.brickOffsetTop;
                        this.bricks[c][r].x = brickX;
                        this.bricks[c][r].y = brickY;
                        
                        this.ctx.shadowBlur = 10;
                        this.ctx.shadowColor = this.bricks[c][r].color;
                        this.ctx.fillStyle = this.bricks[c][r].color;
                        this.ctx.fillRect(brickX, brickY, this.brickWidth, this.brickHeight);
                        
                        // Shine
                        this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
                        this.ctx.fillRect(brickX, brickY, this.brickWidth, this.brickHeight/2);
                    }
                }
            }
            this.ctx.shadowBlur = 0;

            // Ball
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(this.x, this.y, this.ballRadius, 0, Math.PI*2);
            this.ctx.fillStyle = "#fff";
            this.ctx.fill();
            this.ctx.closePath();
            
            // Paddle
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.rect(this.paddleX, this.canvas.height-this.paddleHeight-5, this.paddleWidth, this.paddleHeight);
            this.ctx.fillStyle = "#00ffff";
            this.ctx.fill();
            this.ctx.closePath();
            this.ctx.shadowBlur = 0;
            
            // HUD
            this.ctx.fillStyle = '#fff';
            this.ctx.font = "20px 'Courier New', monospace";
            this.ctx.fillText("Score: " + this.score, 8, 20);
            this.ctx.fillText("Lives: " + this.lives, this.canvas.width - 110, 20);
        }

        animate() {
            if (!this.isGameRunning || this.isPaused) return;
            this.update();
            this.draw();
            this.animationId = requestAnimationFrame(() => this.animate());
        }
        
        gameOver(won) {
            this.isGameRunning = false;
            if(this.animationId) cancelAnimationFrame(this.animationId);
            
            if (window.GameUI) {
                window.GameUI.showGameOver(
                    this.score, 
                    () => this.startGame(), 
                    () => window.history.back(),
                    won ? "VICTORY!" : "GAME OVER"
                );
            }
        }
    }

    new BreakoutGame();

})();
