class Dino {
    constructor(startX, groundY) {
        this.startX = startX;
        this.x = startX;
        this.y = groundY;
        this.w = 40;
        this.h = 43;
        this.dy = 0;
        this.jumpForce = 12;
        this.gravity = 0.6;
        this.groundY = groundY;
        this.isGrounded = true;
        this.isDucking = false;
        this.isCheering = false;
        
        // Sprites handled by simple drawing for now
    }
    
    reset(groundY) {
        this.y = groundY;
        this.dy = 0;
        this.isGrounded = true;
        this.isDucking = false;
        this.isCheering = false;
    }
    
    update(input, groundY) {
        if (this.isCheering) return; // Cutscene freeze
        
        // Jump
        if (input.jump && this.isGrounded) {
            this.dy = -this.jumpForce;
            this.isGrounded = false;
        }
        
        // Duck
        this.isDucking = input.duck;
        if (this.isDucking) {
            this.h = 25;
            this.y = groundY + (43 - 25); // Push down
        } else {
            this.h = 43;
        }
        
        // Physics
        if (!this.isGrounded) {
             this.dy += this.gravity;
             this.y += this.dy;
        } else {
             this.dy = 0;
             this.y = groundY;
             if (this.isDucking) this.y = groundY + (43 - 25);
        }
        
        // Ground Collision
        const floor = this.isDucking ? groundY + (43-25) : groundY;
        if (this.y > floor) {
            this.y = floor;
            this.dy = 0;
            this.isGrounded = true;
        }
    }
    
    draw(ctx, isRetro) {
        ctx.fillStyle = isRetro ? '#53d769' : '#555';
        if (this.isCheering) ctx.fillStyle = '#ff0055'; // Red celebratory
        
        const y = this.y - this.h;
        
        // Simple Dino Shape
        ctx.fillRect(this.x + 10, y, 20, 20); // Head
        ctx.fillRect(this.x, y + 20, 30, 15); // Body
        ctx.fillRect(this.x + 5, y + 35, 5, 8); // Leg L
        ctx.fillRect(this.x + 20, y + 35, 5, 8); // Leg R
        // Tail
        ctx.fillRect(this.x - 5, y + 22, 5, 5);
        
        // Eye
        ctx.fillStyle = isRetro ? '#0f380f' : '#fff';
        ctx.fillRect(this.x + 20, y + 5, 4, 4);
    }
}

class ObstacleManager {
    constructor(width, groundY) {
        this.width = width;
        this.groundY = groundY;
        this.obstacles = [];
        this.timer = 0;
    }
    
    reset() {
        this.obstacles = [];
        this.timer = 0;
    }
    
    update(speed, score) {
        this.timer++;
        const spawnRate = Math.max(50, 100 - speed * 5);
        
        if (this.timer > spawnRate + Math.random() * 50) {
            this.spawn(score);
            this.timer = 0;
        }
        
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            let o = this.obstacles[i];
            o.x -= speed;
            if (o.x < -o.w) this.obstacles.splice(i, 1);
        }
    }
    
    spawn(score) {
        const type = Math.random() < 0.2 && score > 500 ? 'bird' : 'cactus';
        
        if (type === 'cactus') {
            const count = Math.floor(Math.random() * 3) + 1;
            this.obstacles.push({
                type: 'cactus',
                x: this.width,
                y: this.groundY - 30,
                w: 20 * count,
                h: 30,
                hitbox: { x:0, y:0, w: 20*count, h: 30 }
            });
        } else {
            // Bird
            const height = [20, 50, 70];
            const yOffset = height[Math.floor(Math.random() * height.length)];
            this.obstacles.push({
                type: 'bird',
                x: this.width,
                y: this.groundY - yOffset,
                w: 30,
                h: 20,
                hitbox: { x:0, y:0, w:30, h:15 }
            });
        }
    }
    
    draw(ctx, isRetro) {
        ctx.fillStyle = isRetro ? '#53d769' : '#555';
        
        this.obstacles.forEach(o => {
            if (o.type === 'cactus') {
                ctx.fillRect(o.x, o.y, o.w, o.h);
                // Detail
                ctx.clearRect(o.x + 5, o.y, 2, 10);
            } else {
                // Bird
                ctx.fillRect(o.x, o.y, o.w, o.h);
                // Wings
                if (Math.floor(Date.now() / 200) % 2 === 0) {
                     ctx.clearRect(o.x+10, o.y, 10, 5); // Flap
                }
            }
        });
    }
    
    checkCollision(dino) {
        for(let o of this.obstacles) {
            // Simple AABB
            // Dino Y is foot position. Rect is (x, y-h, w, h)
            const dx = dino.x;
            const dy = dino.y - dino.h;
            const dw = dino.w;
            const dh = dino.h;
            
            const ox = o.x;
            const oy = o.y; // Top left of obstacle for drawing
            const ow = o.w;
            const oh = o.h;
            
            if (dx < ox + ow &&
                dx + dw > ox &&
                dy < oy + oh &&
                dy + dh > oy) {
                return true;
            }
        }
        return false;
    }
}

class Environment {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.clouds = [];
        this.stars = [];
        this.asteroidX = width;
        this.asteroidY = -500; // Far up
        
        // Init stars
        for(let i=0; i<50; i++) {
             this.stars.push({x: Math.random()*width, y: Math.random()*height/2, s: Math.random()*2});
        }
    }
    
    reset() {
        this.clouds = [];
        this.asteroidX = this.width;
        this.asteroidY = -500;
    }
    
    update(speed) {
        // Clouds
        if (Math.random() < 0.01) {
             this.clouds.push({x: this.width, y: Math.random() * 100 + 20, w: 40 + Math.random()*30});
        }
        
        this.clouds.forEach(c => c.x -= speed * 0.5);
        this.clouds = this.clouds.filter(c => c.x > -100);
    }
    
    draw(ctx, timeOfDay, isRetro) {
        // Stars (Night)
        if (timeOfDay > 0.2) {
             ctx.fillStyle = `rgba(255,255,255,${timeOfDay})`;
             this.stars.forEach(s => ctx.fillRect(s.x, s.y, s.s, s.s));
        }
        
        // Clouds
        ctx.fillStyle = isRetro ? '#306230' : `rgba(240,240,240,${1 - timeOfDay * 0.5})`;
        this.clouds.forEach(c => {
             ctx.fillRect(c.x, c.y, c.w, 20);
             ctx.fillRect(c.x + 10, c.y - 10, c.w - 20, 20);
        });
        
        // Asteroid (if active, handled by game loop logic mainly, but drawn here)
        if (this.asteroidY > -400) {
             ctx.fillStyle = '#ff4400';
             ctx.beginPath();
             ctx.arc(this.asteroidX, this.asteroidY, 40, 0, Math.PI*2);
             ctx.fill();
             // Trail
             ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
             ctx.beginPath();
             ctx.moveTo(this.asteroidX + 40, this.asteroidY - 20);
             ctx.lineTo(this.asteroidX + 200, this.asteroidY - 200); // Trail tail
             ctx.lineTo(this.asteroidX + 20, this.asteroidY - 40);
             ctx.fill();
        }
    }
}

class DinoGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // UI
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
        this.btnJump = document.getElementById('jump-btn');
        this.btnDuck = document.getElementById('duck-btn');
        
        // Game Constants
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.groundY = this.height - 30; // Ground line (Dino feet level)
        this.dinoX = 50;
        
        // State
        this.score = 0;
        this.displayScore = 0; // Visual score
        this.highScore = localStorage.getItem('dinoHighScore') || 0;
        this.isGameRunning = false;
        this.isPaused = false;
        this.isGameOver = false;
        this.gameOverTimer = 0;
        this.animationId = null;
        this.speed = 5;
        this.timeOfDay = 0; // 0 = Day, 0.5 = Dusk, 1 = Night
        this.extinctionEvent = false;
        
        // Modules
        this.dino = new Dino(this.dinoX, this.groundY);
        this.obstacleManager = new ObstacleManager(this.width, this.groundY);
        this.environment = new Environment(this.width, this.height);
        
        this.input = {
            jump: false,
            duck: false
        };
        
        this.init();
    }

    init() {
        this.highScoreElement.innerText = this.padScore(this.highScore);
        
        // Listeners
        document.addEventListener('keydown', (e) => this.handleInput(e, true));
        document.addEventListener('keyup', (e) => this.handleInput(e, false));
        
        this.restartBtn.addEventListener('click', () => this.resetGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());

        // Mobile Controls
        this.btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); this.input.jump = true; });
        this.btnJump.addEventListener('touchend', (e) => { e.preventDefault(); this.input.jump = false; });
        this.btnJump.addEventListener('mousedown', () => { this.input.jump = true; });
        this.btnJump.addEventListener('mouseup', () => { this.input.jump = false; });

        this.btnDuck.addEventListener('touchstart', (e) => { e.preventDefault(); this.input.duck = true; });
        this.btnDuck.addEventListener('touchend', (e) => { e.preventDefault(); this.input.duck = false; });
        this.btnDuck.addEventListener('mousedown', () => { this.input.duck = true; });
        this.btnDuck.addEventListener('mouseup', () => { this.input.duck = false; });

        // Initial paint
        this.environment.draw(this.ctx, 0, this.themeToggle.checked);
        this.drawGround();
    }
    
    startGame() {
        if (this.isGameRunning) return;
        
        this.isGameRunning = true;
        this.isPaused = false;
        this.isGameOver = false;
        this.extinctionEvent = false;
        this.startScreen.style.display = 'none';
        this.gameOverScreen.style.display = 'none';
        this.score = 0;
        this.displayScore = 0;
        this.updateScoreUI();
        this.speed = 5;
        this.timeOfDay = 0;
        
        this.dino.reset(this.groundY);
        this.obstacleManager.reset();
        this.environment.reset();
        
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.loop();
    }
    
    resetGame() {
        this.isGameRunning = false;
        this.startGame();
    }

    togglePause() {
        if (!this.isGameRunning || this.isGameOver) return;
        this.isPaused = !this.isPaused;
        this.pauseBtn.innerText = this.isPaused ? 'RESUME' : 'PAUSE';
        if (!this.isPaused) this.loop();
    }

    loop() {
        if (!this.isGameRunning || this.isPaused) return;

        this.update();
        this.draw();
        
        if (!this.isGameOver) {
            this.animationId = requestAnimationFrame(() => this.loop());
        } else {
             // Let one more update happen for death animation? no.
             // But we might want ending cutscene loop.
             if (this.extinctionEvent) {
                  this.animationId = requestAnimationFrame(() => this.loop());
             }
        }
    }

    update() {
        if (this.extinctionEvent) {
             this.updateExtinction();
             return;
        }

        // Difficulty / Speed Increase (Slower ramp up)
        this.speed += 0.0005;
        
        // Day/Night Cycle
        // Night mode at specific intervals: 500-750, 1500-1750, 2500-2750, etc.
        const modScore = Math.floor(this.displayScore) % 1000;
        const isNightTime = modScore >= 500 && modScore < 750;
        
        // Smooth transition
        if (isNightTime) {
            this.timeOfDay = Math.min(1, this.timeOfDay + 0.02);
        } else {
            this.timeOfDay = Math.max(0, this.timeOfDay - 0.02);
        }

        // Update display score every frame for smooth counter
        // But internal score controls events
        this.displayScore += 0.2; // roughly 12 points/sec at 60fps
        this.updateScoreUI();
        
        if (this.displayScore >= 1000000) {
             this.triggerExtinction();
        }
        
        this.dino.update(this.input, this.groundY);
        this.obstacleManager.update(this.speed, this.displayScore);
        this.environment.update(this.speed);
        
        // Collisions
        if (this.obstacleManager.checkCollision(this.dino)) {
             this.gameOver(false);
        }
    }
    
    triggerExtinction() {
        this.extinctionEvent = true;
        this.dino.isCheering = true; // Look up?
        this.input.jump = false; // Disable input
        // Stop spawning obstacles
        this.obstacleManager.obstacles = []; 
        this.environment.clouds = [];
    }
    
    updateExtinction() {
        // Cutscene Logic
        // 1. Darken Sky to Red
        // 2. Asteroid enters from top right
        // 3. Impact
        this.environment.asteroidY += 3;
        this.environment.asteroidX -= 2;
        
        // Dino runs away (right side of screen)
        this.dino.x += 2;
        
        // Shake
        this.ctx.save();
        const shake = (Math.random() - 0.5) * 10;
        this.ctx.translate(shake, shake);
        
        if (this.environment.asteroidY > this.groundY) {
            // IMPACT
            this.gameOver(true); // WIN
        }
    }

    draw() {
        const isRetro = this.themeToggle.checked;
        
        // Clear & Background
        let skyColor;
        if (this.extinctionEvent) {
             skyColor = '#3a0000'; // Doom Red
        } else if (isRetro) {
             skyColor = '#0d1117'; // Always dark in retro mode? Or green tint?
        } else {
             // Interpolate Day (#87CEEB) to Night (#0b1026)
             // Using simple RGB lerp
             const r = Math.floor(135 * (1 - this.timeOfDay) + 11 * this.timeOfDay);
             const g = Math.floor(206 * (1 - this.timeOfDay) + 16 * this.timeOfDay);
             const b = Math.floor(235 * (1 - this.timeOfDay) + 38 * this.timeOfDay);
             skyColor = `rgb(${r},${g},${b})`;
        }
        
        this.ctx.fillStyle = skyColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Environment (Clouds, Stars, Moon/Sun, Asteroid)
        this.environment.draw(this.ctx, this.timeOfDay, isRetro);
        
        // Ground
        this.drawGround();
        
        // Obstacles
        this.obstacleManager.draw(this.ctx, isRetro);
        
        // Dino
        this.dino.draw(this.ctx, isRetro);
        
        // Extinction Flash
        if (this.extinctionEvent && this.environment.asteroidY > this.groundY - 50) {
             // Bright flash before end
             this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.random()})`;
             this.ctx.fillRect(0, 0, this.width, this.height);
        }
        
        if (this.extinctionEvent) this.ctx.restore(); // Restore shake
    }

    drawGround() {
        const isRetro = this.themeToggle.checked;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.lineTo(this.width, this.groundY);
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = isRetro ? '#53d769' : '#555';
        this.ctx.stroke();
        
        // Ground details (scrolling dots)
        // ... (Optional)
    }

    updateScoreUI() {
        this.scoreElement.innerText = this.padScore(Math.floor(this.displayScore));
        if (this.displayScore > this.highScore) {
            this.highScore = Math.floor(this.displayScore);
            this.highScoreElement.innerText = this.padScore(this.highScore);
            localStorage.setItem('dinoHighScore', this.highScore);
        }
    }
    
    padScore(num) {
        return num.toString().padStart(6, '0');
    }

    gameOver(won) {
        this.isGameRunning = false;
        this.isGameOver = true;
        this.extinctionEvent = false; // Stop cutscene loop
        
        this.finalScoreElement.innerText = Math.floor(this.displayScore);
        const title = document.getElementById('game-over-title');
        
        if (won) {
            title.innerText = "SURVIVED?";
            title.style.color = "#53d769";
            // Custom ending message logic could go here
        } else {
            title.innerText = "EXTINCT";
            title.style.color = "#ff0055";
        }
        
        this.gameOverScreen.style.display = 'flex';
        cancelAnimationFrame(this.animationId);
    }

    handleInput(e, isCheck) {
        if(["ArrowUp","ArrowDown","Space"].indexOf(e.code) > -1) {
            e.preventDefault();
        }

        if (e.code === 'Space' || e.code === 'ArrowUp') this.input.jump = isCheck;
        if (e.code === 'ArrowDown') this.input.duck = isCheck;
        
        if (isCheck && !this.isGameRunning) {
             if (e.code === 'Space' || e.code === 'ArrowUp') this.startGame();
        }
        
        // Pause
        if (isCheck && e.code === 'KeyP') this.togglePause();
    }
}


window.onload = () => { new DinoGame(); };
