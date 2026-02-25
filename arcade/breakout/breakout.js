class BreakoutGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.scoreEl = document.getElementById('score');
        this.livesEl = document.getElementById('lives');
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.restartBtn = document.getElementById('restart-btn');
        
        this.leftBtn = document.getElementById('left-btn');
        this.rightBtn = document.getElementById('right-btn');
        
        this.paddleHeight = 10;
        this.paddleWidth = 75;
        this.paddleX = (this.canvas.width - this.paddleWidth) / 2;
        
        this.ballRadius = 10;
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height - 30;
        this.dx = 2;
        this.dy = -2;
        
        this.rightPressed = false;
        this.leftPressed = false;
        
        this.brickRowCount = 5;
        this.brickColumnCount = 8; // 60 * 8 = 480
        this.brickWidth = 50; 
        this.brickHeight = 20;
        this.brickPadding = 10;
        this.brickOffsetTop = 30;
        this.brickOffsetLeft = 30; // (480 - (8*50 + 7*10)) / 2 approx?
        // 8*60 = 480. So if padding is included in width logic...
        // Let's adjust sizes. 480 width. 8 cols. 60px per col.
        // Brick w=50, pad=10 => 60. 8*60 = 480. Offset left = (480-480)/2 = 0?
        this.brickOffsetLeft = 5;
        this.brickWidth = 50;
        this.brickPadding = 8;
        
        this.score = 0;
        this.lives = 3;
        
        this.bricks = [];
        this.initBricks();
        
        this.isRunning = false;
        this.init();
    }
    
    initBricks() {
        this.bricks = [];
        for(let c=0; c<this.brickColumnCount; c++) {
            this.bricks[c] = [];
            for(let r=0; r<this.brickRowCount; r++) {
                this.bricks[c][r] = { x: 0, y: 0, status: 1 };
            }
        }
    }
    
    init() {
        document.addEventListener("keydown", (e) => this.keyDownHandler(e), false);
        document.addEventListener("keyup", (e) => this.keyUpHandler(e), false);
        
        // Add click to start
        if(this.canvas) {
            this.canvas.addEventListener("click", () => {
                if(!this.isRunning) this.startGame();
            });
            this.canvas.addEventListener("touchstart", (e) => {
                e.preventDefault(); 
                if(!this.isRunning) this.startGame();
            });
        }
        
        if(this.restartBtn) this.restartBtn.addEventListener("click", () => this.resetGame());
        
        // Mobile
        if(this.leftBtn) {
            this.leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.leftPressed = true; });
            this.leftBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.leftPressed = false; });
            this.leftBtn.addEventListener('mousedown', () => { this.leftPressed = true; });
            this.leftBtn.addEventListener('mouseup', () => { this.leftPressed = false; });
        }
        if(this.rightBtn) {
            this.rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.rightPressed = true; });
            this.rightBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.rightPressed = false; });
            this.rightBtn.addEventListener('mousedown', () => { this.rightPressed = true; });
            this.rightBtn.addEventListener('mouseup', () => { this.rightPressed = false; });
        }
        
        this.draw();
    }
    
    keyDownHandler(e) {
        if(e.key == "Right" || e.key == "ArrowRight") {
            this.rightPressed = true;
        }
        else if(e.key == "Left" || e.key == "ArrowLeft") {
            this.leftPressed = true;
        }
        else if(e.key == " " || e.code == "Space") {
            if(!this.isRunning) {
                this.startGame();
            }
        }
    }
    
    keyUpHandler(e) {
        if(e.key == "Right" || e.key == "ArrowRight") {
            this.rightPressed = false;
        }
        else if(e.key == "Left" || e.key == "ArrowLeft") {
            this.leftPressed = false;
        }
    }
    
    startGame() {
        this.isRunning = true;
        this.startScreen.style.display = 'none';
        this.gameOverScreen.style.display = 'none';
        this.score = 0;
        this.lives = 3;
        this.updateScore();
        this.resetBall();
        this.initBricks();
        this.loop();
    }
    
    resetGame() {
        this.startGame();
    }
    
    resetBall() {
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height - 30;
        this.dx = 3 * (Math.random() > 0.5 ? 1 : -1);
        this.dy = -3;
        this.paddleX = (this.canvas.width - this.paddleWidth) / 2;
    }
    
    collisionDetection() {
        for(let c=0; c<this.brickColumnCount; c++) {
            for(let r=0; r<this.brickRowCount; r++) {
                let b = this.bricks[c][r];
                if(b.status == 1) {
                    if(this.x > b.x && this.x < b.x+this.brickWidth && this.y > b.y && this.y < b.y+this.brickHeight) {
                        this.dy = -this.dy;
                        b.status = 0;
                        this.score++;
                        this.updateScore();
                        if(this.score == this.brickRowCount*this.brickColumnCount) {
                            alert("You Win, Congratulations!"); // Or better UI
                            this.resetGame(); 
                        }
                    }
                }
            }
        }
    }
    
    updateScore() {
        this.scoreEl.innerText = this.score;
        this.livesEl.innerText = this.lives;
    }
    
    drawBall() {
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.ballRadius, 0, Math.PI*2);
        this.ctx.fillStyle = "#0095DD";
        this.ctx.fill();
        this.ctx.closePath();
    }
    
    drawPaddle() {
        this.ctx.beginPath();
        this.ctx.rect(this.paddleX, this.canvas.height-this.paddleHeight, this.paddleWidth, this.paddleHeight);
        this.ctx.fillStyle = "#0095DD";
        this.ctx.fill();
        this.ctx.closePath();
    }
    
    drawBricks() {
        for(let c=0; c<this.brickColumnCount; c++) {
            for(let r=0; r<this.brickRowCount; r++) {
                if(this.bricks[c][r].status == 1) {
                    let brickX = (c*(this.brickWidth+this.brickPadding))+this.brickOffsetLeft;
                    let brickY = (r*(this.brickHeight+this.brickPadding))+this.brickOffsetTop;
                    this.bricks[c][r].x = brickX;
                    this.bricks[c][r].y = brickY;
                    this.ctx.beginPath();
                    this.ctx.rect(brickX, brickY, this.brickWidth, this.brickHeight);
                    this.ctx.fillStyle = this.getBrickColor(r);
                    this.ctx.fill();
                    this.ctx.closePath();
                }
            }
        }
    }
    
    getBrickColor(row) {
        const colors = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF"];
        return colors[row % colors.length];
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBricks();
        this.drawBall();
        this.drawPaddle();
        
        if(this.isRunning) {
            this.collisionDetection();
            
            if(this.x + this.dx > this.canvas.width-this.ballRadius || this.x + this.dx < this.ballRadius) {
                this.dx = -this.dx;
            }
            if(this.y + this.dy < this.ballRadius) {
                this.dy = -this.dy;
            }
            else if(this.y + this.dy > this.canvas.height-this.ballRadius) {
                if(this.x > this.paddleX && this.x < this.paddleX + this.paddleWidth) {
                     this.dy = -this.dy;
                     // Enhance angle
                     let hitPoint = this.x - (this.paddleX + this.paddleWidth/2);
                     this.dx = hitPoint * 0.15;
                }
                else {
                    this.lives--;
                    this.updateScore();
                    if(!this.lives) {
                        this.isRunning = false;
                        this.gameOverScreen.style.display = 'flex';
                    }
                    else {
                        this.x = this.canvas.width/2;
                        this.y = this.canvas.height-30;
                        this.dx = 3;
                        this.dy = -3;
                        this.paddleX = (this.canvas.width-this.paddleWidth)/2;
                    }
                }
            }
            
            if(this.rightPressed && this.paddleX < this.canvas.width-this.paddleWidth) {
                this.paddleX += 7;
            }
            else if(this.leftPressed && this.paddleX > 0) {
                this.paddleX -= 7;
            }
            
            this.x += this.dx;
            this.y += this.dy;
            
            requestAnimationFrame(() => this.draw());
        }
    }
    
    loop() {
        this.draw();
    }
}

new BreakoutGame();
