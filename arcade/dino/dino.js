{
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
        // Monochrome Style
        ctx.fillStyle = '#000'; // Black Dino
        
        const y = this.y - this.h;
        
        if (this.isCheering) {
            // Jumping pose
            ctx.fillRect(this.x + 10, y - 5, 20, 20); // Head higher
            ctx.fillRect(this.x, y + 20, 30, 15); 
        } else if (this.isDucking) {
            // Ducking
            ctx.fillRect(this.x, y, 55, 25);
            // Eye (White)
            ctx.clearRect(this.x + 40, y + 5, 4, 4);
        } else {
            // Standing
            // Head
            ctx.fillRect(this.x + 20, y, 24, 25);
            // Eye
            ctx.clearRect(this.x + 30, y + 5, 5, 5);
            // Body
            ctx.fillRect(this.x, y + 20, 30, 20); 
            // Tail
            ctx.fillRect(this.x - 5, y + 22, 5, 5);

            // Legs
            if (this.isGrounded) {
                // Run anim
                if (Math.floor(Date.now() / 100) % 2 === 0) {
                     ctx.fillRect(this.x + 5, y + 40, 5, 5); // L
                     ctx.fillRect(this.x + 25, y + 38, 5, 2); // R up
                } else {
                     ctx.fillRect(this.x + 5, y + 38, 5, 2); // L up
                     ctx.fillRect(this.x + 25, y + 40, 5, 5); // R
                }
            } else {
                // Jump legs
                ctx.fillRect(this.x + 5, y + 35, 5, 5);
                ctx.fillRect(this.x + 25, y + 35, 5, 5);
            }
        }
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
        // Monochrome Obstacles
        ctx.fillStyle = '#000';
        
        this.obstacles.forEach(o => {
            if (o.type === 'cactus') {
                // Cactus Group
                const w = o.w / (o.w >= 40 ? 2 : 1); // rough guess on group size logic 
                // Just draw blocks for now
                ctx.fillRect(o.x, o.y, o.w, o.h);
                
                // Texture (White Lines)
                ctx.fillStyle = '#fff';
                ctx.fillRect(o.x + 2, o.y + 2, 2, o.h - 4);
                ctx.fillStyle = '#000';
            } else {
                // Bird
                const wingY = (Math.floor(Date.now() / 150) % 2 === 0) ? o.y : o.y + 10;
                
                ctx.fillRect(o.x, o.y + 10, o.w, 10); // Body
                ctx.fillRect(o.x + 10, wingY, 10, 10); // Wing
                
                // Beak
                ctx.fillRect(o.x - 5, o.y + 12, 5, 4);
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
        // Stars
        ctx.fillStyle = '#000'; 
        this.stars.forEach(s => ctx.fillRect(s.x, s.y, s.s, s.s));
        
        // Clouds (Outline style)
        ctx.fillStyle = '#000';
        this.clouds.forEach(c => {
             ctx.fillRect(c.x, c.y, c.w, 20);
        });
        // Inner cloud
        ctx.fillStyle = '#fff';
        this.clouds.forEach(c => {
            ctx.fillRect(c.x + 2, c.y + 2, c.w - 4, 16);
       });

        // Ground
        ctx.fillStyle = '#000';
        ctx.fillRect(0, this.height - 30, this.width, 2);
    }
}

class DinoGame {
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
        if(this.highScoreElement) this.highScoreElement.innerText = this.padScore(this.highScore);
        
        // Listeners
        document.addEventListener('keydown', (e) => this.handleInput(e, true));
        document.addEventListener('keyup', (e) => this.handleInput(e, false));
        
        // Click / Tap to start or Jump
        const tapHandler = (e) => {
             if(e.target.tagName !== 'CANVAS' && e.target.id !== 'start-screen' && !e.target.classList.contains('overlay')) return;

             if(!this.isGameRunning) {
                 this.startGame();
                 return;
             }
             
             // Tap to jump
             this.input.jump = true;
             setTimeout(() => this.input.jump = false, 200);
        };
        
        this.canvas.addEventListener('click', tapHandler);
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); tapHandler(e); });
        if(this.startScreen) this.startScreen.addEventListener('click', tapHandler);

        if(this.restartBtn) this.restartBtn.addEventListener('click', () => this.resetGame());
        if(this.pauseBtn) this.pauseBtn.addEventListener('click', () => this.togglePause());

        // Mobile Controls
        if(this.btnJump) {
            this.btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); this.input.jump = true; });
            this.btnJump.addEventListener('touchend', (e) => { e.preventDefault(); this.input.jump = false; });
            this.btnJump.addEventListener('mousedown', () => { this.input.jump = true; });
            this.btnJump.addEventListener('mouseup', () => { this.input.jump = false; });
        }
        if(this.btnDuck) {
            this.btnDuck.addEventListener('touchstart', (e) => { e.preventDefault(); this.input.duck = true; });
            this.btnDuck.addEventListener('touchend', (e) => { e.preventDefault(); this.input.duck = false; });
            this.btnDuck.addEventListener('mousedown', () => { this.input.duck = true; });
            this.btnDuck.addEventListener('mouseup', () => { this.input.duck = false; });
        }

        // Initial paint
        this.environment.draw(this.ctx, 0, this.themeToggle && this.themeToggle.checked);
        this.drawGround();
    }
    
    startGame() {
        if (this.isGameRunning) return;
        
        this.isGameRunning = true;
        this.isPaused = false;
        this.isGameOver = false;
        this.extinctionEvent = false;
        if(this.startScreen) this.startScreen.style.display = 'none';
        if(this.gameOverScreen) this.gameOverScreen.style.display = 'none';
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
        if(this.pauseBtn) this.pauseBtn.innerText = this.isPaused ? 'RESUME' : 'PAUSE';
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
        // Clear
        const bgColor = '#fff'; // Always white background for classic look
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Environment (Draws stars/clouds/ground)
        this.environment.draw(this.ctx, 0, false);
        
        // Obstacles
        this.obstacleManager.draw(this.ctx, false);
        
        // Dino
        this.dino.draw(this.ctx, false);
        
        if (this.extinctionEvent) {
             // Shake logic handled in update really
        }
    }

    drawGround() {
        const isRetro = this.themeToggle && this.themeToggle.checked;
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
        if(this.scoreElement) this.scoreElement.innerText = this.padScore(Math.floor(this.displayScore));
        if (this.displayScore > this.highScore) {
            this.highScore = Math.floor(this.displayScore);
            if(this.highScoreElement) this.highScoreElement.innerText = this.padScore(this.highScore);
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
        
        if(this.finalScoreElement) this.finalScoreElement.innerText = Math.floor(this.displayScore);
        const title = document.getElementById('game-over-title');
        
        if (won) {
            if(title) {
                title.innerText = "SURVIVED?";
                title.style.color = "#53d769";
            }
        } else {
            if(title) {
                title.innerText = "EXTINCT";
                title.style.color = "#ff0055";
            }
        }
        
        if(this.gameOverScreen) this.gameOverScreen.style.display = 'flex';
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

if (document.getElementById('gameCanvas')) {
    new DinoGame();
}
}
