{
class FroggerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) return; // Guard

        this.ctx = this.canvas.getContext('2d');
        
        // UI
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.finalScoreElement = document.getElementById('final-score');
        this.restartBtn = document.getElementById('restart-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.livesDisplay = document.getElementById('lives');
        
        // Mobile Controls
        this.btnUp = document.getElementById('up-btn');
        this.btnDown = document.getElementById('down-btn');
        this.btnLeft = document.getElementById('left-btn');
        this.btnRight = document.getElementById('right-btn');
        
        // Constants (Grid 32px)
        this.grid = 32;
        this.cols = 14; 
        this.rows = 15;
        this.maxX = this.canvas.width;
        this.maxY = this.canvas.height;

        // State
        this.isGameRunning = false;
        this.isPaused = false;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('froggerHighScore') || '0');
        this.lives = 3;
        this.time = 0; // Frames (60fps)
        this.homesFilled = [false, false, false, false, false];
        
        this.frog = { 
            x: 7 * 32 + 4, 
            y: 13 * 32 + 4, 
            w: 24, 
            h: 24, 
            dead: false, 
            onLog: false,
            speedOnLog: 0 
        };
        
        this.lanes = [];
        this.animationId = null;

        this.init();
    }
    
    init() {
        if(this.highScoreElement) this.highScoreElement.innerText = this.highScore;
        
        // Bind input handler
        this.inputHandler = (e) => this.handleInput(e);
        window.addEventListener('keydown', this.inputHandler);
        
        // Click to Start
        const clickStart = (e) => {
             if(e.target.closest('button')) return;
             if(!this.isGameRunning) this.startGame();
        };
        
        this.canvas.addEventListener('click', clickStart);
        this.canvas.addEventListener('touchstart', (e) => {
             e.preventDefault();
             if(!this.isGameRunning) this.startGame();
        });
        
        if(this.startScreen) this.startScreen.addEventListener('click', clickStart);
        
        if(this.restartBtn) this.restartBtn.addEventListener('click', () => this.resetGame());
        if(this.pauseBtn) this.pauseBtn.addEventListener('click', () => this.togglePause());
        
        this.setupMobileControls();
        this.resetLevel();
        this.draw(); 
    }

    setupMobileControls() {
        const move = (dx, dy) => {
            if (!this.isGameRunning) this.startGame();
            else this.moveFrog(dx, dy);
        };
        if(this.btnUp) this.btnUp.addEventListener('click', () => move(0, -1));
        if(this.btnDown) this.btnDown.addEventListener('click', () => move(0, 1));
        if(this.btnLeft) this.btnLeft.addEventListener('click', () => move(-1, 0));
        if(this.btnRight) this.btnRight.addEventListener('click', () => move(1, 0));
    }
    
    startGame() {
        if (this.isGameRunning) return;
        
        this.isGameRunning = true;
        this.isPaused = false;
        this.score = 0;
        this.lives = 3;
        this.updateScoreUI();
        if(this.startScreen) this.startScreen.style.display = 'none';
        if(this.gameOverScreen) this.gameOverScreen.style.display = 'none';
        
        this.homesFilled = [false, false, false, false, false];
        this.resetLevel();
        this.resetFrog();
        
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.loop();
    }
    
    resetLevel() {
        this.lanes = [];
        // River (Top) - Y 1-5 (Grid 32)
        // Note: Y=0 is Homes. Y=1-5 is River. Y=6 is Median. Y=7-11 is Road. Y=12 is Start. Y=13 is Start.
        
        const riverColor = '#000044';
        const roadColor = '#000000';

        // River Lanes
        this.createLane(1, 'river', 1.0, 'log-m');   // Slow Log Right
        this.createLane(2, 'river', -1.2, 'turtle'); // Turtle Left
        this.createLane(3, 'river', 1.8, 'log-l');   // Fast Log Right
        this.createLane(4, 'river', -0.8, 'log-s');  // Slower Log Left (Actually logs move right usually? Let's vary)
        this.createLane(5, 'river', 1.0, 'turtle');  // Turtle Right

        // Road Lanes
        this.createLane(7, 'road', -1.0, 'truck');      // Slow Truck Left
        this.createLane(8, 'road', 1.5, 'car-race');    // Fast Car Right
        this.createLane(9, 'road', -1.2, 'car-sedan');  // Medium Car Left
        this.createLane(10, 'road', 0.8, 'bulldozer');  // Slow Bulldozer Right
        this.createLane(11, 'road', -1.5, 'truck');     // Fast Truck Left
    }

    createLane(gridY, type, speed, pattern) {
        const lane = {
            y: gridY * this.grid,
            type: type,
            speed: speed,
            objects: [],
            h: this.grid
        };
        
        // Pattern determines size and color
        let w = this.grid;
        let color = '#fff';
        let count = 3;
        
        if (pattern === 'log-s') { w = 80; color = '#8b4513'; count=3; }
        else if (pattern === 'log-m') { w = 110; color = '#8b4513'; count=3; }
        else if (pattern === 'log-l') { w = 180; color = '#8b4513'; count=2; }
        else if (pattern === 'turtle') { w = 32; color = '#ff0000'; count=4; } // Red turtles
        else if (pattern === 'truck') { w = 60; color = '#dddddd'; count=3; }
        else if (pattern === 'car-race') { w = 32; color = '#ffff00'; count=3; }
        else if (pattern === 'car-sedan') { w = 32; color = '#ff00ff'; count=3; }
        else if (pattern === 'bulldozer') { w = 40; color = '#00ffff'; count=3; }
        
        const spacing = (this.canvas.width + 100) / count;

        for(let i=0; i<count; i++) {
             // Stagger starts
             const ox = (i * spacing) + (Math.random() * 40 - 20);
             lane.objects.push({ x: ox, y: lane.y + 4, w: w, h: 24, color: color, type: pattern });
        }
        
        this.lanes.push(lane);
    }
    
    resetFrog() {
        this.frog.x = 7 * this.grid + 4; // Center in tile (32-24)/2 = 4
        this.frog.y = 13 * this.grid + 4; 
        this.frog.dead = false;
        this.frog.onLog = false;
        this.frog.speedOnLog = 0;
        this.time = 60 * 60; // 60s
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
    
    handleInput(e) {
        // Guard check: if canvas not on screen, remove listener
        if (!document.getElementById('gameCanvas')) {
             window.removeEventListener('keydown', this.inputHandler);
             return;
        }

        if (!this.isGameRunning && e.code === 'Space') {
            this.startGame();
            return;
        }
        if (this.isPaused) return; 
        
        // Prevent default scrolling for game keys
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) {
             e.preventDefault();
        }

        switch(e.code) {
            case 'ArrowUp': this.moveFrog(0, -1); break;
            case 'ArrowDown': this.moveFrog(0, 1); break;
            case 'ArrowLeft': this.moveFrog(-1, 0); break;
            case 'ArrowRight': this.moveFrog(1, 0); break;
            case 'Space': this.togglePause(); break;
        }
    }
    
    moveFrog(dx, dy) {
        if (this.frog.dead) return;
        
        this.frog.x += dx * this.grid;
        this.frog.y += dy * this.grid;
        
        // Bounds Check
        if (this.frog.x < 0) this.frog.x = 0;
        if (this.frog.x > this.canvas.width - this.grid) this.frog.x = this.canvas.width - 28; // Keep visible
        if (this.frog.y > 13 * this.grid) this.frog.y = 13 * this.grid + 4;
        
        // Check for Home (Row 0)
        if (this.frog.y < this.grid) {
            this.checkHome();
        }
    }
    
    checkHome() {
        // Frog x center
        const cx = this.frog.x + 12;
        const col = Math.floor(cx / this.grid);
        
        // Valid Home Cols: 1, 4, 7, 10, 13 (approx)
        // With canvas width 448 (14*32), homes are at:
        // 1*32=32, 4*32=128, 7*32=224, 10*32=320, 13*32=416
        // Let's use simple distance check to home centers
        const homeCenters = [
            1*32 + 16, 
            4*32 + 16, 
            7*32 + 16, 
            10*32 + 16, 
            13*32 + 16
        ];
        
        let foundHome = -1;
        for(let i=0; i<homeCenters.length; i++) {
            if (Math.abs(cx - homeCenters[i]) < 16) {
                foundHome = i; 
                break;
            }
        }
        
        if (foundHome !== -1) {
            if (this.homesFilled[foundHome]) {
                this.die(); // Can't go to same home
            } else {
                // Success
                this.homesFilled[foundHome] = true;
                this.score += 50 + Math.floor(this.time / 60) * 10;
                this.score += 1000; // Bonus for home
                this.updateScoreUI();
                
                // Check if ALL homes filled
                if (this.homesFilled.every(h => h === true)) {
                    this.levelComplete();
                } else {
                    this.resetFrog();
                }
            }
        } else {
            // Hit the wall between homes
            this.die();
        }
    }
    
    levelComplete() {
        this.score += 1000;
        this.updateScoreUI();
        this.homesFilled = [false, false, false, false, false];
        this.resetFrog();
        // Ideally increase difficulty here (speed up lanes)
        this.lanes.forEach(l => l.speed *= 1.1);
    }
    
    die() {
        this.frog.dead = true;
        this.lives--;
        this.updateScoreUI();
        
        // Death animation delay
        setTimeout(() => {
            if (this.lives > 0) {
                this.resetFrog();
            } else {
                this.gameOver();
            }
        }, 1000);
    }
    
    gameOver() {
        this.isGameRunning = false;
        if(this.finalScoreElement) this.finalScoreElement.innerText = this.score;
        if(this.gameOverScreen) this.gameOverScreen.style.display = 'flex';
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('froggerHighScore', this.score);
        }
    }
    
    updateScoreUI() {
        if(this.scoreElement) this.scoreElement.innerText = this.score;
        if(this.livesDisplay) this.livesDisplay.innerText = this.lives;
    }

    loop() {
        if (!this.isGameRunning) return;
        if (!this.isPaused) this.update();
        this.draw();
        
        this.animationId = requestAnimationFrame(() => this.loop());
    }
    
    update() {
        if (this.frog.dead) return;
        
        this.time--;
        if (this.time <= 0) {
            this.die();
            return;
        }

        const frogRect = {
            x: this.frog.x,
            y: this.frog.y, 
            w: this.frog.w, 
            h: this.frog.h
        };
        const frogCenterY = this.frog.y + 12;
        
        let onRiver = false;
        let safeOnLog = false;
        let logSpeed = 0;

        // Move Objects & Check Collisions
        this.lanes.forEach(lane => {
            // Move objects
            lane.objects.forEach(obj => {
                obj.x += lane.speed;
                // Wrap around
                if (lane.speed > 0 && obj.x > this.canvas.width) obj.x = -obj.w;
                if (lane.speed < 0 && obj.x + obj.w < 0) obj.x = this.canvas.width;
                
                // Collision
                // AABB Intersection
                if (frogRect.x < obj.x + obj.w &&
                    frogRect.x + frogRect.w > obj.x &&
                    frogRect.y < obj.y + obj.h &&
                    frogRect.y + frogRect.h > obj.y) {
                        
                        if (lane.type === 'road') {
                            this.die();
                        } else if (lane.type === 'river') {
                            safeOnLog = true;
                            logSpeed = lane.speed;
                        }
                    }
            });
            
            // Check if frog is in this lane (y-axis overlap)
            // Lane Height is 32. objects are centered or patterned.
            // Lane Y is top of lane.
            if (frogCenterY >= lane.y && frogCenterY < lane.y + this.grid) {
                if (lane.type === 'river') {
                    onRiver = true;
                }
            }
        });
        
        // River Logic
        if (onRiver) {
            if (safeOnLog) {
                this.frog.x += logSpeed;
                this.frog.onLog = true;
            } else {
                // In river but not on log -> Splash
                this.die();
            }
        } else {
            this.frog.onLog = false;
        }
        
        // Keeping in bounds while riding log
        if (this.frog.x < 0) this.frog.x = 0;
        if (this.frog.x > this.canvas.width - 24) this.frog.x = this.canvas.width - 24;
    }

    draw() {
        if (!this.ctx) return;
        const grid = this.grid;
        // Background Fill - Water for top half, Road for bottom
        this.ctx.fillStyle = '#191970'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Water (Rows 1-5)
        this.ctx.fillStyle = '#000047'; 
        this.ctx.fillRect(0, grid, this.canvas.width, 5 * grid);
        
        // 2. Median (Row 6)
        this.ctx.fillStyle = '#800080';
        this.ctx.fillRect(0, 6 * grid, this.canvas.width, grid);
        
        // 3. Road (Rows 7-11)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 7 * grid, this.canvas.width, 5 * grid);
        
        // 4. Start Bank (Rows 12-13)
        this.ctx.fillStyle = '#800080';
        this.ctx.fillRect(0, 12 * grid, this.canvas.width, 2 * grid);
        
        // 5. Header / Homes (Row 0)
        this.ctx.fillStyle = '#006400'; // Green Hedge
        this.ctx.fillRect(0, 0, this.canvas.width, grid);

        // Draw Blue Water Bays in Header
        // Home Centers (approx): 1.5, 4.5, 7.5, 10.5, 13.5 grid units
        // 48, 144, 240, 336, 432 pixels
        const homeCenters = [48, 144, 240, 336, 432];
        
        this.ctx.fillStyle = '#000047'; 
        homeCenters.forEach((cx, i) => {
             // Bay is ~30px wide
             this.ctx.fillRect(cx - 15, 0, 30, grid);
             
             // If filled, draw frog
             if (this.homesFilled[i]) {
                 this.drawFrogSprite(cx - 12, 4, 'down'); 
             }
        });
        
        // Draw Objects (Logs, Turtles, Cars)
        this.lanes.forEach(lane => {
             lane.objects.forEach(obj => {
                 this.drawObject(obj, lane);
             });
        });

        // Draw Player Frog
        if (!this.frog.dead) { 
            this.drawFrogSprite(this.frog.x, this.frog.y, 'up'); 
        }
        
        // Draw Lives (Bottom Left Corner)
        for(let i=0; i<this.lives; i++) {
            // Draw mini frogs at bottom left
            this.drawFrogSprite(10 + (i*24), this.canvas.height - 24, 'up', 0.6); 
        }

        // Time Bar (Bottom Right)
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px "Press Start 2P"';
        this.ctx.fillText("TIME", this.canvas.width - 120, this.canvas.height - 10);
        
        this.ctx.fillStyle = '#00ff00';
        if (this.time < 600) this.ctx.fillStyle = '#ff0000';
        const barW = (this.time / 3600) * 100;
        this.ctx.fillRect(this.canvas.width - 120, this.canvas.height - 8, barW, 6); 
    }

    drawObject(obj, lane) {
        this.ctx.save();
        this.ctx.translate(obj.x, obj.y);
        
        if (obj.type.startsWith('log')) {
             // LOG: Red/Brown with wood grain
             this.ctx.fillStyle = '#8B4513'; // SaddleBrown
             this.ctx.fillRect(0, 0, obj.w, obj.h);
             // Details
             this.ctx.fillStyle = '#A0522D'; // Sienna
             this.ctx.fillRect(4, 4, obj.w-8, 4);
             this.ctx.fillRect(4, obj.h - 8, obj.w-8, 4);
             // Rounded Ends
             this.ctx.beginPath();
             this.ctx.arc(0, obj.h/2, 12, 0, Math.PI*2);
             this.ctx.arc(obj.w, obj.h/2, 12, 0, Math.PI*2);
             this.ctx.fill();
        } 
        else if (obj.type === 'turtle') {
             // TURTLE: Red circle
             this.ctx.fillStyle = '#FF4500'; // OrangeRed
             this.ctx.beginPath();
             this.ctx.arc(16, 16, 13, 0, Math.PI*2);
             this.ctx.fill();
             // Shell
             this.ctx.fillStyle = '#8B0000'; // DarkRed
             this.ctx.beginPath();
             this.ctx.arc(16, 16, 8, 0, Math.PI*2);
             this.ctx.fill();
             // Legs
             this.ctx.fillStyle = '#FF4500';
             this.ctx.fillRect(0, 4, 6, 6);
             this.ctx.fillRect(26, 4, 6, 6);
             this.ctx.fillRect(0, 22, 6, 6);
             this.ctx.fillRect(26, 22, 6, 6);
        }
        else if (obj.type === 'truck') {
             // TRUCK: Elongated
             this.ctx.fillStyle = '#CCCCCC';
             this.ctx.fillRect(0, 4, obj.w, obj.h-8);
             // Cab
             this.ctx.fillStyle = '#FFFFFF';
             if (lane.speed < 0) this.ctx.fillRect(0, 2, 20, obj.h-4);
             else this.ctx.fillRect(obj.w-20, 2, 20, obj.h-4);
             // Wheels
             this.ctx.fillStyle = '#333';
             this.ctx.fillRect(8, -2, 8, 4);
             this.ctx.fillRect(obj.w-16, -2, 8, 4);
             this.ctx.fillRect(8, obj.h-2, 8, 4);
             this.ctx.fillRect(obj.w-16, obj.h-2, 8, 4);
        }
        else if (obj.type === 'car-race') {
             // RACE CAR: sleek
             this.ctx.fillStyle = '#FFD700'; // Gold
             this.ctx.beginPath();
             this.ctx.moveTo(4, obj.h-4);
             this.ctx.lineTo(8, 4);
             this.ctx.lineTo(obj.w - 8, 4);
             this.ctx.lineTo(obj.w-4, obj.h-4);
             this.ctx.fill();
             // Stripe
             this.ctx.fillStyle = '#FF0000';
             this.ctx.fillRect(0, 10, obj.w, 8);
        }
        else if (obj.type === 'car-sedan') {
             // SEDAN: Boxy Pink
             this.ctx.fillStyle = '#FF69B4'; // HotPink
             this.ctx.fillRect(2, 6, obj.w-4, obj.h-12);
             // Roof
             this.ctx.fillStyle = '#FFC0CB';
             this.ctx.fillRect(6, 4, obj.w-12, obj.h-8);
        }
        else if (obj.type === 'bulldozer') {
             // BULLDOZER/TRACTOR
             this.ctx.fillStyle = '#00BFFF'; // DeepSkyBlue
             this.ctx.fillRect(4, 4, obj.w-8, obj.h-8);
             // Blade
             this.ctx.fillStyle = '#00008B';
             if (lane.speed > 0) this.ctx.fillRect(obj.w-6, 2, 6, obj.h-4);
             else this.ctx.fillRect(0, 2, 6, obj.h-4);
        }
        
        this.ctx.restore();
    }
    
    drawFrogSprite(x, y, dir, scale=1) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(scale, scale);

        // Rotation
        if (dir === 'down') {
            this.ctx.translate(24, 24);
            this.ctx.rotate(Math.PI);
        } else if (dir === 'left') {
            this.ctx.translate(0, 24);
            this.ctx.rotate(-Math.PI/2);
        } else if (dir === 'right') {
            this.ctx.translate(24, 0);
            this.ctx.rotate(Math.PI/2);
        }
        
        // Authentic Frog Shape (Green with Yellow/Green stripes if possible, but basic is fine)
        this.ctx.fillStyle = '#32CD32'; // LimeGreen
        
        // Body (Simple)
        this.ctx.fillRect(8, 8, 16, 14);
        
        // Head
        this.ctx.fillRect(8, 2, 16, 8);
        
        // Legs (Splayed)
        // Back L
        this.ctx.beginPath();
        this.ctx.moveTo(8, 22);
        this.ctx.lineTo(0, 26);
        this.ctx.lineTo(0, 18);
        this.ctx.fill();
        // Back R
        this.ctx.beginPath();
        this.ctx.moveTo(24, 22);
        this.ctx.lineTo(32, 26);
        this.ctx.lineTo(32, 18);
        this.ctx.fill();
        // Front L
        this.ctx.fillRect(0, 6, 8, 6);
        // Front R
        this.ctx.fillRect(24, 6, 8, 6);
        
        // Eyes
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.fillRect(8, 0, 6, 4);
        this.ctx.fillRect(18, 0, 6, 4);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(10, 0, 2, 2);
        this.ctx.fillRect(20, 0, 2, 2);
        
        // Back Pattern
        this.ctx.fillStyle = '#006400';
        this.ctx.fillRect(14, 10, 4, 8);
        
        this.ctx.restore();
    }
}

// Start Game if Canvas Exists
if (document.getElementById('gameCanvas')) {
    new FroggerGame();
}
}
