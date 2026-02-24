class CrossyGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
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
        this.gridSize = 50; 
        this.columns = Math.floor(this.canvas.width / this.gridSize);
        
        // State
        this.lanes = [];
        this.player = null;
        this.score = 0;
        this.currentDistance = 0; // Steps forward
        this.highScore = localStorage.getItem('crossyHighScore') || 0;
        this.isGameRunning = false;
        this.isPaused = false;
        this.animationId = null;
        
        // Scrolling
        this.cameraY = 0;
        this.cameraTargetY = 0;
        
        this.init();
    }

    init() {
        this.highScoreElement.textContent = this.highScore;
        
        // Event Listeners
        document.addEventListener('keydown', (e) => this.handleInput(e));
        this.restartBtn.addEventListener('click', () => this.resetGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());

        this.setupMobileControls();
        
        // Initial Draw (Empty Field)
        this.resetState();
        this.draw();
    }
    
    setupMobileControls() {
         const move = (dx, dy) => {
             if (!this.isGameRunning) this.startGame();
             else this.movePlayer(dx, dy);
         };
         this.btnUp.addEventListener('click', () => move(0, -1));
         this.btnDown.addEventListener('click', () => move(0, 1));
         this.btnLeft.addEventListener('click', () => move(-1, 0));
         this.btnRight.addEventListener('click', () => move(1, 0));
    }

    startGame() {
        if (this.isGameRunning) return;
        
        this.isGameRunning = true;
        this.isPaused = false;
        this.startScreen.style.display = 'none';
        this.gameOverScreen.style.display = 'none';
        
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
        
        // Initial Player Position (Center, near bottom)
        this.player = {
            gridX: Math.floor(this.columns / 2),
            gridY: 0, // 0 is starting row. Negative is forward.
            x: Math.floor(this.columns / 2) * this.gridSize,
            y: 0,
            width: this.gridSize * 0.6,
            height: this.gridSize * 0.6,
            isDead: false,
            squish: 1
        };
        
        // Generate initial safe lanes (Rows 0 to 5 backwards)
        // Note: Canvas Y goes down. Player moves UP (Negative Y).
        // Let's say Player row 0 is at Canvas Y = 400.
        // Row -1 is at Canvas Y = 350.
        
        // We will generate lanes from Index +2 (behind player) to -20 (ahead).
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
        this.pauseBtn.innerText = this.isPaused ? 'RESUME' : 'PAUSE';
        if (!this.isPaused) this.loop();
    }

    addLane(index) {
        // index 0 is start. Negative indices are forward.
        const y = index * this.gridSize;
        
        // Determine type based on index
        let type = 'grass';
        let speed = 0;
        let elements = [];
        
        // First few lanes are safe
        if (index > -3) {
            type = 'grass';
        } else {
            const rand = Math.random();
            // Safe Lane every 3-5 lanes logic or random weighted
            if (Math.random() < 0.2) {
                type = 'grass';
            } else if (Math.random() < 0.3) {
               type = 'water'; // Simple logs
            } else {
               type = 'road';
            }
        }
        
        // Populate Elements
        if (type === 'road') {
            speed = (Math.random() * 2 + 2) * (Math.random() > 0.5 ? 1 : -1);
            // Add cars
            const density = Math.floor(Math.random() * 3) + 1; 
            for (let i = 0; i < density; i++) {
                // Determine random x
                let x = Math.random() * this.canvas.width;
                // Avoid overlap logic simplified: just spaced out
                x = (i * (this.canvas.width / density)) + (Math.random() * 50);
                
                elements.push({
                    x: x,
                    y: y + 10,
                    width: Math.random() > 0.8 ? this.gridSize * 1.5 : this.gridSize * 0.8, // Truck vs Car
                    height: this.gridSize * 0.6,
                    color: Math.random() > 0.5 ? '#ff4757' : '#ffa502' // Red or Orange cars
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
                    width: this.gridSize * 1.2, // Log width
                    height: this.gridSize * 0.8,
                    color: '#8B4513'
                });
            }
        }
        
        // Prepend (since we are adding smaller indices, i.e., further up)
        // Actually, we want to maintain order. 
        // We always add lanes "ahead" (smaller Y index), so we push to end? 
        // No, let's keep array sorted by index. Newest (smallest index) at end?
        // Let's just push and handle sorting or simple distance check.
        this.lanes.push({
            index: index,
            y: y,
            type: type,
            speed: speed,
            elements: elements
        });
    }
    
    // Maintain lanes
    updateLanes() {
        // Find min index (furthest ahead)
        const minIndex = this.lanes.reduce((min, l) => Math.min(min, l.index), 100);
        
        // If player is getting close to the end of generated path
        const playerIndex = this.player.gridY;
        const viewAhead = 15;
        
        if (playerIndex - minIndex < viewAhead) {
            this.addLane(minIndex - 1);
        }
        
        // Remove old lanes (behind player)
        this.lanes = this.lanes.filter(l => l.index < playerIndex + 10);
    }

    loop() {
        if (!this.isGameRunning || this.isPaused) return;

        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    update() {
        // Camera smooth follow
        // Player is at player.y (relative to 0).
        // We want player to be at ~80% down the screen.
        // Screen Height = 500. 80% = 400.
        // Target Camera Offset: player.y + 100?
        // Actually, let's say Camera starts at 0.
        // Player at 0 gets drawn at (0 + CameraY + Offset).
        // Let OffsetY = 300. 
        // Draw Y = lane.y - cameraY + OffsetY.
        
        const targetY = this.player.gridY * this.gridSize; // e.g. -5 * 50 = -250
        // We want cameraY to be close to targetY.
        // Smooth lerp
        this.cameraY += (targetY - this.cameraY) * 0.1;

        // Animate elements
        this.lanes.forEach(lane => {
            if (lane.speed !== 0) {
                lane.elements.forEach(el => {
                    el.x += lane.speed;
                    // Wrap around
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
         
         // Player Rect (Use floating X if on water to allow drift, else Snap to grid for road safety?)
         // Actually, let's use the visual X for collision vs Logic X for grid.
         // Floating X is stored in this.player.x.
         
         const px = this.player.x;
         const py = 0; // Relative to lane Y (since we only check X overlap in that lane)
         
         if (currentLane.type === 'water') {
             // MUST be on a log
             let onLog = false;
             currentLane.elements.forEach(log => {
                 // Check detailed rect intersection
                 if (this.rectIntersect(px, 0, this.player.width, this.player.height, 
                                        log.x, 0, log.width, log.height)) {
                     onLog = true;
                 }
             });
             
             if (!onLog) {
                 this.gameOver();
             } else {
                 // Drift Player
                 this.player.x += currentLane.speed;
                 // Update GridX mainly for reference, but movement logic needs to know we drifted
                 // If we drift too far, we might snap to next column?
                 // For now, let's just let x float.
                 this.player.gridX = Math.round(this.player.x / this.gridSize);
             }
         } else if (currentLane.type === 'road') {
             // MUST NOT hit car
             currentLane.elements.forEach(car => {
                 if (this.rectIntersect(px, 0, this.player.width, this.player.height, 
                                        car.x, 0, car.width, car.height)) {
                     this.gameOver();
                 }
             });
         }
         
         // Bounds Check
         if (this.player.x < 0 || this.player.x > this.canvas.width - this.player.width) {
              this.gameOver(); // Die if drift off screen
         }
    }
    
    rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
        // Simple 1D overlap check for X axis since Y is implicitly aligned on lanes
        return x2 < x1 + w1 && x2 + w2 > x1; 
    }

    movePlayer(dx, dy) {
        if (this.player.isDead) return;
        
        // Update Grid
        this.player.gridX += dx;
        this.player.gridY += dy;
        
        // Clamp X
        if (this.player.gridX < 0) this.player.gridX = 0;
        if (this.player.gridX >= this.columns) this.player.gridX = this.columns - 1;
        
        // Update Position
        this.player.x = this.player.gridX * this.gridSize;
        // Y follows gridY purely
        
        // Update Score
        const dist = -this.player.gridY; // GridY goes negative as we go UP
        if (dist > this.score) {
            this.score = dist;
            this.updateScore();
        }
        
        // Reset Squish animation
        this.player.squish = 0.8;
        setTimeout(() => this.player.squish = 1, 100);
    }

    gameOver() {
        this.isGameRunning = false;
        this.player.isDead = true;
        this.gameOverScreen.style.display = 'flex';
        this.finalScoreElement.innerText = this.score;
        cancelAnimationFrame(this.animationId);
    }
    
    updateScore() {
        this.scoreElement.innerText = this.score;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.highScoreElement.innerText = this.highScore;
            localStorage.setItem('crossyHighScore', this.highScore);
        }
    }

    draw() {
        const isRetro = this.themeToggle.checked;
        const bgColor = '#111'; 
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // View Offset: Player is visually at specific Y
        // We want the player to be centered or slightly lower.
        // Let's keep the logic: visualY = worldY - cameraY + offset
        const viewOffset = this.canvas.height * 0.7; // 70% down

        this.lanes.forEach(lane => {
            const drawY = Math.floor(lane.y - this.cameraY + viewOffset);
            
            // Optimization: cull offscreen
            if (drawY < -this.gridSize || drawY > this.canvas.height) return;
            
            // 1. Draw Lane Background
            if (lane.type === 'grass') {
                this.ctx.fillStyle = '#9c27b0'; // Classic Arcade Purple/Black/Green? 
                // Classic Frogger has purple Safe Zones
                this.ctx.fillStyle = (lane.index % 2 === 0) ? '#8d1faf' : '#9c27b0';
                this.ctx.fillRect(0, drawY, this.canvas.width, this.gridSize);
            } else if (lane.type === 'road') {
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(0, drawY, this.canvas.width, this.gridSize);
            } else if (lane.type === 'water') {
                this.ctx.fillStyle = '#000044'; // Dark Blue
                this.ctx.fillRect(0, drawY, this.canvas.width, this.gridSize);
            }
            
            // 2. Draw Lane Elements
            lane.elements.forEach(el => {
                // Determine Element Type based on color/width if not explicit
                // Cars: Red/Orange. Logs: Brown.
                
                const isCar = lane.type === 'road';
                const isLog = lane.type === 'water';
                
                if (isCar) {
                    this.drawCar(el.x, drawY + 8, el.width, el.height - 16, el.color);
                } else if (isLog) {
                    this.drawLog(el.x, drawY + 5, el.width, el.height - 10);
                }
            });
        });
        
        // Draw Player (Frog)
        if (this.player && !this.player.isDead) {
             const px = this.player.x + (this.gridSize - this.player.width) / 2;
             // Y position relative to Camera
             // Player y in world = player.gridY * 50
             const py = Math.floor((this.player.gridY * this.gridSize) - this.cameraY + viewOffset);
             
             this.drawFrog(px, py + 5, this.player.width, this.player.height - 10, this.player.gridX); // Pass gridX for animation frame?
        }
        
        // UI Overlay if needed
    }
    
    drawFrog(x, y, w, h, frame) {
        this.ctx.fillStyle = '#0f0'; // Bright Green
        
        // Simple 8-bit Frog shape
        // Body
        this.ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
        
        // Legs
        // Left Back
        this.ctx.fillRect(x, y + h - 10, 5, 10);
        this.ctx.fillRect(x, y + h - 5, 10, 5);
        // Right Back
        this.ctx.fillRect(x + w - 5, y + h - 10, 5, 10);
        this.ctx.fillRect(x + w - 10, y + h - 5, 10, 5);
        // Front Legs
        this.ctx.fillRect(x, y + 5, 5, 5);
        this.ctx.fillRect(x + w - 5, y + 5, 5, 5);
        
        // Eyes
        this.ctx.fillStyle = '#ff0000'; // Red eyes? Or yellow with black pupil
        this.ctx.fillRect(x + 8, y + 2, 6, 6);
        this.ctx.fillRect(x + w - 14, y + 2, 6, 6);
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x + 10, y + 4, 2, 2);
        this.ctx.fillRect(x + w - 12, y + 4, 2, 2);
        
        // Back pattern
        this.ctx.fillStyle = '#004400';
        this.ctx.fillRect(x + w/2 - 2, y + h/2 - 2, 4, 4);
    }
    
    drawCar(x, y, w, h, color) {
        // Body
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
        
        // Windows
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(x + w - 10, y + 2, 5, h - 4); // Windshield
        this.ctx.fillRect(x + 5, y + 2, 5, h - 4); // Rear window
        
        // Wheels
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x + 5, y - 2, 6, 2);
        this.ctx.fillRect(x + w - 11, y - 2, 6, 2);
        this.ctx.fillRect(x + 5, y + h, 6, 2);
        this.ctx.fillRect(x + w - 11, y + h, 6, 2);
    }
    
    drawLog(x, y, w, h) {
        // Main Log
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(x, y, w, h);
        
        // Bark texture
        this.ctx.fillStyle = '#5C4033';
        this.ctx.fillRect(x + 5, y + 2, 10, h - 4);
        this.ctx.fillRect(x + 25, y + 5, 8, h - 10);
        this.ctx.fillRect(x + 50, y + 3, 12, h - 6);
        
        // Ends
        this.ctx.fillStyle = '#D2691E';
        this.ctx.fillRect(x, y, 5, h);
        this.ctx.fillRect(x + w - 5, y, 5, h);
    }

    handleInput(e) {
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].indexOf(e.code) > -1) {
            e.preventDefault();
        }

        if (!this.isGameRunning) {
            if (e.code === 'Space' || e.code.startsWith('Arrow')) {
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

window.onload = () => {
    new CrossyGame();
};
