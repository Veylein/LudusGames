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

        // Difficulty / Speed Increase
        this.speed += 0.001;
        
        // Day/Night Cycle
        // Night mode at specific intervals: 500-750, 1500-1750, 2500-2750, etc.
        const modScore = this.displayScore % 1000;
        const isNightTime = modScore >= 500 && modScore < 750;
        
        // Smooth transition
        if (isNightTime) {
            this.timeOfDay = Math.min(1, this.timeOfDay + 0.05);
        } else {
            this.timeOfDay = Math.max(0, this.timeOfDay - 0.05);
        }

        // Update Score
        this.score++;
        if (this.score % 5 === 0) { // Update visual score slower for "feel"
             this.displayScore++;
             this.updateScoreUI();
        }
        
        // Win Condition: 1 Million (Simulated by 10,000 internal steps? Or cheat code)
        // User asked for 1 million. Let's make display score go up 100x faster to make it reachable in demo?
        // Or just let it play out. 
        // Let's stick to true: regular play ~10 points/sec. 1M is impossible without cheats.
        // Cheat: If user types 'meteor' (not implemented).
        // Let's set win threshold to 5000 for realistic "Long run" demo, but display it multiplied if needed.
        // Or just check raw display score 1,000,000.
        // I'll make the points tick up fast: +10 per frame.
        this.displayScore += 5; 
        
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

class Dino {
    constructor(x, groundY) {
        this.x = x;
        this.groundY = groundY;
        this.y = groundY;
        this.baseWidth = 44;
        this.baseHeight = 47;
        this.width = 44;
        this.height = 47;
        
        // Physics
        this.dy = 0;
        this.jumpForce = 12; // Initial impulse
        this.gravity = 0.6;
        this.grounded = true;
        this.isDucking = false;
        
        // Animation
        this.timer = 0;
        this.frame = 0; // 0 or 1 (running legs)
    }
    
    reset(groundY) {
        this.y = groundY;
        this.dy = 0;
        this.grounded = true;
        this.isDucking = false;
        this.width = this.baseWidth;
        this.height = this.baseHeight;
    }
    
    update(input, groundY) {
        this.timer++;
        if (this.timer > 10) {
            this.frame = (this.frame + 1) % 2;
            this.timer = 0;
        }

        // Jump
        if (input.jump && this.grounded) {
            this.dy = -this.jumpForce;
            this.grounded = false;
        }
        
        // Duck
        if (input.duck) {
            this.isDucking = true;
            this.width = 55; // Wider
            this.height = 25; // Shorter
            if (!this.grounded) this.dy += 0.5; // Fast fall
        } else {
            this.isDucking = false;
            this.width = this.baseWidth;
            this.height = this.baseHeight;
        }

        // Physics
        this.dy += this.gravity;
        this.y += this.dy;

        // Ground Collision
        if (this.y > groundY) {
            this.y = groundY;
            this.dy = 0;
            this.grounded = true;
        } else {
            this.grounded = false;
        }
    }
    
    draw(ctx, isRetro) {
        ctx.fillStyle = isRetro ? '#53d769' : '#e6edf3';
        
        // Simple procedural pixel art logic
        const x = this.x;
        const y = this.y - this.height; // Bottom-left origin adjust
        
        if (this.isDucking) {
            ctx.fillRect(x, y, this.width, this.height);
            // Duck Eye
            ctx.fillStyle = '#000';
            ctx.fillRect(x + 40, y + 5, 4, 4);
        } else {
            ctx.fillRect(x, y, this.width, this.height);
            // Standing Eye
            ctx.fillStyle = '#000';
            ctx.fillRect(x + 30, y + 5, 4, 4);
            
            // Legs
            ctx.fillStyle = isRetro ? '#53d769' : '#e6edf3';
            if (this.grounded) {
                if (this.frame === 0) {
                     ctx.clearRect(x + 5, y + this.height - 5, 10, 5); // Lift left leg
                } else {
                     ctx.clearRect(x + 25, y + this.height - 5, 10, 5); // Lift right leg
                }
            }
        }
    }
}

class ObstacleManager {
    constructor(width, groundY) {
        this.gameWidth = width;
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
        // Spawn rate depends on speed
        const spawnRate = Math.max(60, 150 - speed * 5); // Gets faster
        
        if (this.timer > spawnRate + Math.random() * 50) {
            this.timer = 0;
            this.spawnObstacle(score);
        }
        
        // Move & Cull
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            let obs = this.obstacles[i];
            obs.x -= speed;
            
            // Animation for bird
            if (obs.type === 'bird') {
                 obs.frameTimer++;
                 if (obs.frameTimer > 15) {
                     obs.frame = (obs.frame + 1) % 2;
                     obs.frameTimer = 0;
                 }
            }
            
            if (obs.x + obs.width < 0) {
                this.obstacles.splice(i, 1);
            }
        }
    }
    
    spawnObstacle(score) {
        const typeRoll = Math.random();
        // Cacti are standard. Birds appear after 500 score.
        
        if (score > 500 && typeRoll > 0.7) {
            // Bird
            const heightLevel = Math.floor(Math.random() * 3); // 0 = low, 1 = mid, 2 = high
            let yOffset = 20;
            if (heightLevel === 1) yOffset = 50;
            if (heightLevel === 2) yOffset = 80;
            
            this.obstacles.push({
                type: 'bird',
                x: this.gameWidth,
                y: this.groundY - yOffset,
                width: 40,
                height: 30,
                frame: 0,
                frameTimer: 0
            });
        } else {
            // Cactus
            const large = Math.random() > 0.5;
            this.obstacles.push({
                type: 'cactus',
                x: this.gameWidth,
                y: this.groundY,
                width: large ? 30 : 20,
                height: large ? 50 : 35,
                groupSize: Math.floor(Math.random() * 3) + 1
            });
        }
    }
    
    draw(ctx, isRetro) {
        this.obstacles.forEach(obs => {
            const y = obs.y - obs.height; // Bottom Origin
            
            if (obs.type === 'cactus') {
                ctx.fillStyle = isRetro ? '#53d769' : '#53d769';
                // Draw group
                for(let i=0; i<obs.groupSize; i++) {
                    const ox = obs.x + i * (obs.width + 5);
                    this.drawCactus(ctx, ox, y, obs.width, obs.height);
                }
            } else if (obs.type === 'bird') {
                ctx.fillStyle = isRetro ? '#53d769' : '#000'; // Silhouette logic for bird? Or standard
                if (!isRetro) ctx.fillStyle = '#ff7b72'; // Reddish bird
                
                // Wing flap logic (Swap Y pos of wings)
                const wy = obs.frame === 0 ? y : y + 10;
                ctx.fillRect(obs.x, y + 10, obs.width, 10); // Body
                ctx.fillRect(obs.x + 10, wy, 10, 20); // Wings
                ctx.fillRect(obs.x - 5, y + 12, 10, 5); // Head
            }
        });
    }
    
    drawCactus(ctx, x, y, w, h) {
        ctx.fillRect(x + w/3, y, w/3, h); // Trunk
        ctx.fillRect(x, y + h/3, w, h/5); // Arms
        ctx.fillRect(x, y + h/6, w/3, h/3); // Left Up
        ctx.fillRect(x + w*2/3, y + h/4, w/3, h/4); // Right Up
    }

    checkCollision(dino) {
        // Simple AABB
        for (let obs of this.obstacles) {
            let width = obs.width;
            if (obs.type === 'cactus') width = obs.width + (obs.groupSize-1)*(obs.width+5);
            
            // Hitbox adjustment (make slightly smaller than sprite)
            const padding = 5;
            
            // Obstacle Y is Bottom-Left origin in logic, but top-left in drawing?
            // Wait, spawn logic uses: obs.y = groundY (bottom)
            // Drawing uses: y = obs.y - obs.height (top-left)
            // Collision logic needs Top-Left
            
            const obsTop = obs.y - obs.height;
            const obsBottom = obs.y;
            const obsLeft = obs.x;
            const obsRight = obs.x + width;
            
            const dinoTop = dino.y - dino.height;
            const dinoBottom = dino.y;
            const dinoLeft = dino.x;
            const dinoRight = dino.x + dino.width;
            
            if (
                dinoRight > obsLeft + padding &&
                dinoLeft < obsRight - padding &&
                dinoBottom > obsTop + padding && // Feet below top of cactus
                dinoTop < obsBottom - padding   // Head above bottom of cactus
            ) {
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
        this.timer = 0;
        
        // Extinction Assets
        this.asteroidX = width;
        this.asteroidY = -100;
        
        // Generate stars
        for(let i=0; i<50; i++) {
             this.stars.push({
                 x: Math.random() * width,
                 y: Math.random() * (height/2),
                 size: Math.random() * 2
             });
        }
    }
    
    reset() {
        this.clouds = [];
        this.timer = 0;
        this.asteroidX = this.width;
        this.asteroidY = -100;
    }
    
    update(speed) {
        // Clouds
        this.timer++;
        if (this.timer > 200) {
            this.timer = 0;
            this.clouds.push({
                x: this.width,
                y: Math.random() * 100 + 20,
                width: Math.random() * 40 + 40,
                speed: Math.random() * 0.5 + 0.1
            });
        }
        
        this.clouds.forEach(c => c.x -= c.speed);
        this.clouds = this.clouds.filter(c => c.x + c.width > 0);
    }
    
    draw(ctx, timeOfDay, isRetro) {
        // Stars (Only at night: timeOfDay > 0.3)
        if (!isRetro && timeOfDay > 0.3) {
             ctx.fillStyle = `rgba(255, 255, 255, ${(timeOfDay-0.3)*2})`; // Fade in
             this.stars.forEach(s => {
                 ctx.fillRect(s.x, s.y, s.size, s.size);
             });
        }
        
        // Celestial Bodies (Sun / Moon)
        if (!isRetro) {
             // Sun (Day)
             if (timeOfDay < 0.6) {
                 const sunX = this.width * 0.8;
                 const sunY = 50 + timeOfDay * 100; // Sets as day progresses
                 ctx.fillStyle = '#FFD700'; 
                 ctx.beginPath();
                 ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
                 ctx.fill();
             }
             
             // Moon (Night)
             if (timeOfDay > 0.4) {
                  const moonX = this.width * 0.2;
                  const moonY = 150 - (timeOfDay-0.4) * 100; // Rises
                  ctx.fillStyle = '#FEFCD7';
                  ctx.beginPath();
                  ctx.arc(moonX, moonY, 20, 0, Math.PI * 2);
                  ctx.fill();
                  // Crater
                  ctx.fillStyle = '#E0DCC5';
                  ctx.beginPath();
                  ctx.arc(moonX + 5, moonY - 2, 5, 0, Math.PI*2);
                  ctx.fill();
             }
        }
        
        // Clouds
        ctx.fillStyle = isRetro ? '#53d769' : (timeOfDay > 0.5 ? '#444' : '#fff'); // Dark clouds at night
        this.clouds.forEach(c => {
            ctx.fillRect(c.x, c.y, c.width, 10);
            ctx.fillRect(c.x + 10, c.y - 10, c.width - 20, 10);
        });
        
        // Draw Asteroid (if near active)
        if (this.asteroidY > -50) {
             // Trail
             ctx.fillStyle = '#FFA500';
             ctx.beginPath();
             ctx.moveTo(this.asteroidX + 20, this.asteroidY + 20);
             ctx.lineTo(this.asteroidX + 100, this.asteroidY - 100);
             ctx.lineTo(this.asteroidX + 120, this.asteroidY - 80);
             ctx.fill();
             
             // Rock
             ctx.fillStyle = '#8B0000';
             ctx.beginPath();
             ctx.arc(this.asteroidX, this.asteroidY, 40, 0, Math.PI * 2);
             ctx.fill();
        }
    }
}

// Start
window.onload = () => {
    new DinoGame();
};
