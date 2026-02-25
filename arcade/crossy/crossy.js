(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    class CrossyGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = this.canvas.getContext('2d');
            
            this.scoreElement = document.getElementById('score');
            this.highScoreElement = document.getElementById('high-score');
            this.startScreen = document.getElementById('start-screen');
            this.gameOverScreen = document.getElementById('game-over-screen');
            this.finalScoreElement = document.getElementById('final-score');
            this.restartBtn = document.getElementById('restart-btn');
            this.pauseBtn = document.getElementById('pause-btn');
            this.difficultySelect = document.getElementById('difficulty-select');
            
            this.btnUp = document.getElementById('up-btn');
            this.btnDown = document.getElementById('down-btn');
            this.btnLeft = document.getElementById('left-btn');
            this.btnRight = document.getElementById('right-btn');
            
            this.gridSize = 50; 
            this.columns = Math.floor(this.canvas.width / this.gridSize);
            
            this.lanes = [];
            this.player = null;
            this.score = 0;
            this.currentDistance = 0; 
            this.highScore = localStorage.getItem('crossyHighScore') || 0;
            this.isGameRunning = false;
            this.isPaused = false;
            this.animationId = null;
            
            this.cameraY = 0;
            this.cameraTargetY = 0;
            
            this.boundHandleInput = this.handleInput.bind(this);
            this.boundResetGame = this.resetGame.bind(this);
            this.boundTogglePause = this.togglePause.bind(this);
            
            this.init();
        }

        init() {
            if(this.highScoreElement) this.highScoreElement.textContent = this.highScore;
            
            document.addEventListener('keydown', this.boundHandleInput);
            if(this.restartBtn) this.restartBtn.addEventListener('click', this.boundResetGame);
            if(this.pauseBtn) this.pauseBtn.addEventListener('click', this.boundTogglePause);

            this.setupMobileControls();
            
            this.resetState();
            this.draw();
        }
        
        cleanup() {
            document.removeEventListener('keydown', this.boundHandleInput);
            if(this.restartBtn) this.restartBtn.removeEventListener('click', this.boundResetGame);
            if(this.pauseBtn) this.pauseBtn.removeEventListener('click', this.boundTogglePause);
            this.isGameRunning = false;
            if (this.animationId) cancelAnimationFrame(this.animationId);
        }
        
        setupMobileControls() {
             const move = (dx, dy) => {
                 if (!this.isGameRunning) this.startGame();
                 else this.movePlayer(dx, dy);
             };
             if(this.btnUp) this.btnUp.onclick = () => move(0, -1);
             if(this.btnDown) this.btnDown.onclick = () => move(0, 1);
             if(this.btnLeft) this.btnLeft.onclick = () => move(-1, 0);
             if(this.btnRight) this.btnRight.onclick = () => move(1, 0);
        }

        startGame() {
            if (this.isGameRunning) return;
            
            this.isGameRunning = true;
            this.isPaused = false;
            if(this.startScreen) this.startScreen.style.display = 'none';
            if(this.gameOverScreen) this.gameOverScreen.style.display = 'none';
            
            this.resetState();
            
            if (this.animationId) cancelAnimationFrame(this.animationId);
            this.loop();
        }
        
        resetState() {
            this.score = 0;
            this.currentDistance = 0;
            this.updateScore();
            
            this.lanes = [];
            this.cameraY = 0;
            this.cameraTargetY = 0;
            
            this.player = {
                gridX: Math.floor(this.columns / 2),
                gridY: 0, 
                x: Math.floor(this.columns / 2) * this.gridSize,
                y: 0,
                width: this.gridSize * 0.6,
                height: this.gridSize * 0.6,
                isDead: false,
                squish: 1
            };
            
            for (let i = 2; i > -20; i--) {
                this.addLane(i);
            }
        }
        
        resetGame() {
            this.isGameRunning = false;
            this.startGame();
        }

        togglePause() {
            if (!this.isGameRunning) return;
            this.isPaused = !this.isPaused;
            if(this.pauseBtn) this.pauseBtn.innerText = this.isPaused ? 'RESUME' : 'PAUSE';
            if (!this.isPaused) this.loop();
        }

        addLane(index) {
            const y = index * this.gridSize;
            
            let type = 'grass';
            let speed = 0;
            let elements = [];
            
            if (index > -3) {
                type = 'grass';
            } else {
                if (Math.random() < 0.2) {
                    type = 'grass';
                } else if (Math.random() < 0.3) {
                   type = 'water'; 
                } else {
                   type = 'road';
                }
            }
            
            if (type === 'road') {
                speed = (Math.random() * 2 + 2) * (Math.random() > 0.5 ? 1 : -1);
                const density = Math.floor(Math.random() * 3) + 1; 
                for (let i = 0; i < density; i++) {
                    let x = (i * (this.canvas.width / density)) + (Math.random() * 50);
                    
                    elements.push({
                        x: x,
                        y: y + 10,
                        width: Math.random() > 0.8 ? this.gridSize * 1.5 : this.gridSize * 0.8, 
                        height: this.gridSize * 0.6,
                        color: Math.random() > 0.5 ? '#ff4757' : '#ffa502' 
                    });
                }
            }
            
            if (type === 'water') {
                speed = (Math.random() * 1.5 + 1) * (Math.random() > 0.5 ? 1 : -1);
                const density = Math.floor(Math.random() * 3) + 2; 
                 for (let i = 0; i < density; i++) {
                    let x = (i * (this.canvas.width / density)) + (Math.random() * 20);
                    elements.push({
                        x: x,
                        y: y + 5,
                        width: this.gridSize * 1.2, 
                        height: this.gridSize * 0.8,
                        color: '#8B4513'
                    });
                }
            }
            
            this.lanes.push({
                index: index,
                y: y,
                type: type,
                speed: speed,
                elements: elements
            });
        }
        
        updateLanes() {
            const minIndex = this.lanes.reduce((min, l) => Math.min(min, l.index), 100);
            
            const playerIndex = this.player.gridY;
            const viewAhead = 15;
            
            if (playerIndex - minIndex < viewAhead) {
                this.addLane(minIndex - 1);
            }
            
            this.lanes = this.lanes.filter(l => l.index < playerIndex + 10);
        }

        loop() {
            if (!document.getElementById('gameCanvas')) {
                this.cleanup();
                return;
            }

            if (!this.isGameRunning || this.isPaused) return;

            this.update();
            this.draw();
            this.animationId = requestAnimationFrame(() => this.loop());
        }

        update() {
            const targetY = this.player.gridY * this.gridSize; 
            this.cameraY += (targetY - this.cameraY) * 0.1;

            this.lanes.forEach(lane => {
                if (lane.speed !== 0) {
                    lane.elements.forEach(el => {
                        el.x += lane.speed;
                        if (lane.speed > 0 && el.x > this.canvas.width) el.x = -el.width;
                        if (lane.speed < 0 && el.x + el.width < 0) el.x = this.canvas.width;
                    });
                }
            });
            
            this.updateLanes();
            this.checkCollisions();
        }

        checkCollisions() {
             const currentLane = this.lanes.find(l => l.index === this.player.gridY);
             
             if (!currentLane) return; 
             
             const px = this.player.x;
             
             if (currentLane.type === 'water') {
                 let onLog = false;
                 currentLane.elements.forEach(log => {
                     if (this.rectIntersect(px, 0, this.player.width, this.player.height, 
                                            log.x, 0, log.width, log.height)) {
                         onLog = true;
                     }
                 });
                 
                 if (!onLog) {
                     this.gameOver();
                 } else {
                     this.player.x += currentLane.speed;
                     this.player.gridX = Math.round(this.player.x / this.gridSize);
                 }
             } else if (currentLane.type === 'road') {
                 currentLane.elements.forEach(car => {
                     if (this.rectIntersect(px, 0, this.player.width, this.player.height, 
                                            car.x, 0, car.width, car.height)) {
                         this.gameOver();
                     }
                 });
             }
             
             if (this.player.x < 0 || this.player.x > this.canvas.width - this.player.width) {
                  this.gameOver(); 
             }
        }
        
        rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
            return x2 < x1 + w1 && x2 + w2 > x1; 
        }

        movePlayer(dx, dy) {
            if (this.player.isDead) return;
            
            this.player.gridX += dx;
            this.player.gridY += dy;
            
            if (this.player.gridX < 0) this.player.gridX = 0;
            if (this.player.gridX >= this.columns) this.player.gridX = this.columns - 1;
            
            this.player.x = this.player.gridX * this.gridSize;
            
            const dist = -this.player.gridY; 
            if (dist > this.score) {
                this.score = dist;
                this.updateScore();
            }
            
            this.player.squish = 0.8;
            setTimeout(() => this.player.squish = 1, 100);
        }

        gameOver() {
            this.isGameRunning = false;
            this.player.isDead = true;
            if(this.gameOverScreen) this.gameOverScreen.style.display = 'flex';
            if(this.finalScoreElement) this.finalScoreElement.innerText = this.score;
            cancelAnimationFrame(this.animationId);
        }
        
        updateScore() {
            if(this.scoreElement) this.scoreElement.innerText = this.score;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                if(this.highScoreElement) this.highScoreElement.innerText = this.highScore;
                localStorage.setItem('crossyHighScore', this.highScore);
            }
        }

        draw() {
            const bgColor = '#111'; 
            this.ctx.fillStyle = bgColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            const viewOffset = this.canvas.height * 0.7; 

            this.lanes.forEach(lane => {
                const drawY = Math.floor(lane.y - this.cameraY + viewOffset);
                
                if (drawY < -this.gridSize || drawY > this.canvas.height) return;
                
                if (lane.type === 'grass') {
                    this.ctx.fillStyle = (lane.index % 2 === 0) ? '#8d1faf' : '#9c27b0';
                    this.ctx.fillRect(0, drawY, this.canvas.width, this.gridSize);
                } else if (lane.type === 'road') {
                    this.ctx.fillStyle = '#000';
                    this.ctx.fillRect(0, drawY, this.canvas.width, this.gridSize);
                } else if (lane.type === 'water') {
                    this.ctx.fillStyle = '#000044'; 
                    this.ctx.fillRect(0, drawY, this.canvas.width, this.gridSize);
                }
                
                lane.elements.forEach(el => {
                    const isCar = lane.type === 'road';
                    const isLog = lane.type === 'water';
                    
                    if (isCar) {
                        this.drawCar(el.x, drawY + 8, el.width, el.height - 16, el.color);
                    } else if (isLog) {
                        this.drawLog(el.x, drawY + 5, el.width, el.height - 10);
                    }
                });
            });
            
            if (this.player && !this.player.isDead) {
                 const px = this.player.x + (this.gridSize - this.player.width) / 2;
                 const py = Math.floor((this.player.gridY * this.gridSize) - this.cameraY + viewOffset);
                 
                 this.drawFrog(px, py + 5, this.player.width, this.player.height - 10, this.player.gridX); 
            }
        }
        
        drawFrog(x, y, w, h, frame) {
            this.ctx.fillStyle = '#0f0'; 
            this.ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
            
            this.ctx.fillRect(x, y + h - 10, 5, 10);
            this.ctx.fillRect(x, y + h - 5, 10, 5);
            this.ctx.fillRect(x + w - 5, y + h - 10, 5, 10);
            this.ctx.fillRect(x + w - 10, y + h - 5, 10, 5);
            this.ctx.fillRect(x, y + 5, 5, 5);
            this.ctx.fillRect(x + w - 5, y + 5, 5, 5);
            
            this.ctx.fillStyle = '#ff0000'; 
            this.ctx.fillRect(x + 8, y + 2, 6, 6);
            this.ctx.fillRect(x + w - 14, y + 2, 6, 6);
            
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(x + 10, y + 4, 2, 2);
            this.ctx.fillRect(x + w - 12, y + 4, 2, 2);
            
            this.ctx.fillStyle = '#004400';
            this.ctx.fillRect(x + w/2 - 2, y + h/2 - 2, 4, 4);
        }
        
        drawCar(x, y, w, h, color) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, w, h);
            
            this.ctx.fillStyle = '#87CEEB';
            this.ctx.fillRect(x + w - 10, y + 2, 5, h - 4); 
            this.ctx.fillRect(x + 5, y + 2, 5, h - 4); 
            
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(x + 5, y - 2, 6, 2);
            this.ctx.fillRect(x + w - 11, y - 2, 6, 2);
            this.ctx.fillRect(x + 5, y + h, 6, 2);
            this.ctx.fillRect(x + w - 11, y + h, 6, 2);
        }
        
        drawLog(x, y, w, h) {
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(x, y, w, h);
            
            this.ctx.fillStyle = '#5C4033';
            this.ctx.fillRect(x + 5, y + 2, 10, h - 4);
            this.ctx.fillRect(x + 25, y + 5, 8, h - 10);
            this.ctx.fillRect(x + 50, y + 3, 12, h - 6);
            
            this.ctx.fillStyle = '#D2691E';
            this.ctx.fillRect(x, y, 5, h);
            this.ctx.fillRect(x + w - 5, y, 5, h);
        }
    
        handleInput(e) {
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
                case 'ArrowUp': this.movePlayer(0, -1); break;
                case 'ArrowDown': this.movePlayer(0, 1); break;
                case 'ArrowLeft': this.movePlayer(-1, 0); break;
                case 'ArrowRight': this.movePlayer(1, 0); break;
                case 'Space': this.togglePause(); break;
            }
        }
    }

    new CrossyGame();
})();
