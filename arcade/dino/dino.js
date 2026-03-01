/*
 * NEON RUNNER
 * A cyberpunk infinite runner.
 * Features:
 * - Neon vector graphics
 * - Day/Night cycle visualized by background gradients
 * - Integrated GameUI
 */

(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    // Accessibility & Focus
    canvas.setAttribute('tabindex', '0');
    canvas.focus();
    
    const ctx = canvas.getContext('2d');

    // --- Configuration ---
    const CONFIG = {
        gravity: 0.6,
        jumpForce: 12,
        speedStart: 6,
        speedMax: 20,
        colors: {
            bg: '#050510',
            ground: '#00ffcc',
            dino: '#00ff00',
            cactus: '#ff0055',
            bird: '#ffee00',
            star: '#ffffff'
        }
    };

    // --- Asset Managers ---
    class Starfield {
        constructor(width, height) {
            this.stars = [];
            this.width = width;
            this.height = height;
            for(let i=0; i<50; i++) {
                this.stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: Math.random() * 2,
                    speed: Math.random() * 0.5 + 0.1
                });
            }
        }
        
        update(gameSpeed) {
            this.stars.forEach(s => {
                s.x -= s.speed + (gameSpeed * 0.1); 
                if (s.x < 0) s.x = this.width;
            });
        }
        
        draw(ctx) {
            ctx.fillStyle = CONFIG.colors.star;
            this.stars.forEach(s => {
                ctx.globalAlpha = Math.random() * 0.5 + 0.5;
                ctx.fillRect(s.x, s.y, s.size, s.size);
            });
            ctx.globalAlpha = 1;
        }
    }

    // --- Game Entities ---
    class Dino {
        constructor(groundY) {
            this.w = 40;
            this.h = 44;
            this.x = 50;
            this.y = groundY;
            this.groundY = groundY;
            this.dy = 0;
            this.isGrounded = true;
            this.isDucking = false;
        }
        
        reset() {
            this.y = this.groundY;
            this.dy = 0;
            this.isGrounded = true;
            this.isDucking = false;
        }
        
        jump() {
            if (this.isGrounded) {
                this.dy = -CONFIG.jumpForce;
                this.isGrounded = false;
            }
        }
        
        update(input) {
            // Ducking
            this.isDucking = input.duck;
            if (this.isDucking) {
                this.h = 26;
                if(this.isGrounded) this.y = this.groundY + (44 - 26);
            } else {
                this.h = 44;
            }
            
            // Physics
            if (!this.isGrounded) {
                this.dy += CONFIG.gravity;
                this.y += this.dy;
                
                // Fast fall if ducking in air
                if (this.isDucking) this.dy += 0.5; 
            } else {
                this.dy = 0;
                this.y = this.groundY + (this.isDucking ? (44 - 26) : 0);
            }
            
            // Ground Collision
            const floor = this.groundY + (this.isDucking ? (44-26) : 0);
            if (this.y > floor) {
                 this.y = floor;
                 this.dy = 0;
                 this.isGrounded = true;
            }
        }
        
        draw(ctx) {
            ctx.strokeStyle = CONFIG.colors.dino;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = CONFIG.colors.dino;
            
            const x = this.x;
            const y = this.y - this.h;
            
            ctx.beginPath();
            if (this.isDucking) {
                // Duck shape
                ctx.rect(x, y, 55, 26);
                // Eye
                ctx.moveTo(x + 40, y + 8);
                ctx.lineTo(x + 42, y + 8);
            } else {
                // Stand shape
                // Head
                ctx.rect(x + 20, y, 20, 20);
                // Body
                ctx.rect(x, y + 20, 30, 24);
                // Eye
                ctx.moveTo(x + 30, y + 5);
                ctx.lineTo(x + 32, y + 5);
                
                // Legs animation
                if (this.isGrounded) {
                    const runFrame = Math.floor(Date.now() / 100) % 2;
                    if (runFrame === 0) {
                        ctx.moveTo(x + 10, y + 44); ctx.lineTo(x + 5, y + 54);
                        ctx.moveTo(x + 25, y + 44); ctx.lineTo(x + 25, y + 50);
                    } else {
                        ctx.moveTo(x + 10, y + 44); ctx.lineTo(x + 10, y + 50);
                        ctx.moveTo(x + 25, y + 44); ctx.lineTo(x + 30, y + 54);
                    }
                } else {
                     // Jump legs
                     ctx.moveTo(x + 10, y + 44); ctx.lineTo(x + 5, y + 50);
                     ctx.moveTo(x + 25, y + 44); ctx.lineTo(x + 30, y + 50);
                }
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    class ObstacleManager {
        constructor(groundY) {
            this.obstacles = [];
            this.groundY = groundY;
            this.timer = 0;
        }
        
        reset() {
            this.obstacles = [];
            this.timer = 0;
        }
        
        update(speed, score) {
            this.timer++;
            // Spawn rate decreases as speed increases
            const spawnRate = Math.max(40, 100 - speed * 3);
            
            if (this.timer > spawnRate + Math.random() * 60) {
                this.spawn(score);
                this.timer = 0;
            }
            
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                let o = this.obstacles[i];
                o.x -= speed;
                if (o.x < -100) this.obstacles.splice(i, 1);
            }
        }
        
        spawn(score) {
            const isBird = Math.random() < 0.2 && score > 500;
            
            if (isBird) {
                const height = [20, 50, 70];
                const yOffset = height[Math.floor(Math.random() * height.length)];
                this.obstacles.push({
                    type: 'bird',
                    x: canvas.width,
                    y: this.groundY - yOffset,
                    w: 40,
                    h: 30
                });
            } else {
                const count = Math.floor(Math.random() * 3) + 1;
                this.obstacles.push({
                    type: 'cactus',
                    x: canvas.width,
                    y: this.groundY - 50, // Cactus height usually ~50
                    w: 25 * count,
                    h: 50
                });
            }
        }
        
        draw(ctx) {
            this.obstacles.forEach(o => {
                if (o.type === 'cactus') {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = CONFIG.colors.cactus;
                    ctx.strokeStyle = CONFIG.colors.cactus;
                    ctx.lineWidth = 2;
                    
                    // Draw cactus as triangles/rects
                    for(let i=0; i<o.w/25; i++) {
                        const ox = o.x + (i*25);
                        ctx.strokeRect(ox, o.y, 20, 50);
                        // Detail
                        ctx.beginPath();
                        ctx.moveTo(ox, o.y + 10); ctx.lineTo(ox - 5, o.y + 5); ctx.lineTo(ox - 5, o.y + 20); ctx.lineTo(ox, o.y + 25);
                        ctx.moveTo(ox + 20, o.y + 15); ctx.lineTo(ox + 25, o.y + 10); ctx.lineTo(ox + 25, o.y + 25); ctx.lineTo(ox + 20, o.y + 30);
                        ctx.stroke();
                    }
                } else {
                    // Bird
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = CONFIG.colors.bird;
                    ctx.strokeStyle = CONFIG.colors.bird;
                    ctx.lineWidth = 2;
                    
                    const wingY = (Math.floor(Date.now() / 150) % 2 === 0) ? -10 : 10;
                    ctx.beginPath();
                    ctx.rect(o.x, o.y + 10, 40, 10); // Body
                    ctx.moveTo(o.x + 15, o.y + 10); ctx.lineTo(o.x + 25, o.y + 10 + wingY); // Wing
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            });
        }
        
        checkCollision(dino) {
            const dx = dino.x + 10; // Hitbox adjustment
            const dy = dino.y - dino.h + 5;
            const dw = dino.w - 20;
            const dh = dino.h - 10;
            
            for(let o of this.obstacles) {
                const ox = o.x + 5;
                const oy = o.y + 5;
                const ow = o.w - 10;
                const oh = o.h - 10;
                
                if (dx < ox + ow && dx + dw > ox &&
                    dy < oy + oh && dy + dh > oy) {
                    return true;
                }
            }
            return false;
        }
    }

    // --- Main Game Class ---
    class DinoGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = ctx;
            
            this.groundY = this.canvas.height - 50;
            this.dino = new Dino(this.groundY);
            this.obstacles = new ObstacleManager(this.groundY);
            this.stars = new Starfield(this.canvas.width, this.canvas.height);
            
            this.score = 0;
            this.highScore = localStorage.getItem('dinoHighScore') || 0;
            this.speed = CONFIG.speedStart;
            
            this.isRunning = false;
            this.isPaused = false;
            this.gameLoopId = null;
            
            this.input = { jump: false, duck: false };
            
            this.bindEvents();
            this.init();
        }
        
        bindEvents() {
            document.addEventListener('keydown', (e) => this.handleInput(e, true));
            document.addEventListener('keyup', (e) => this.handleInput(e, false));
            
            // Mobile
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.input.jump = true;
            });
            this.canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.input.jump = false;
            });
        }
        
        init() {
            if (window.GameUI) {
                window.GameUI.init(this.canvas, {
                    onStart: () => this.startGame(),
                    onPause: () => this.togglePause(),
                    onRestart: () => this.startGame(),
                });
                window.GameUI.showStartScreen();
            } else {
                this.draw(); // Idle screen
            }
        }
        
        startGame() {
            this.isRunning = true;
            this.isPaused = false;
            this.score = 0;
            this.speed = CONFIG.speedStart;
            
            this.dino.reset();
            this.obstacles.reset();
            
            if (window.GameUI) {
                window.GameUI.updateScore(0);
                window.GameUI.hideStartScreen();
                window.GameUI.hideGameOverScreen();
                window.GameUI.hidePauseScreen();
            }
            
            if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
            this.loop();
        }
        
        togglePause() {
            if (!this.isRunning) return;
            this.isPaused = !this.isPaused;
            if (this.isPaused) {
                if (window.GameUI) window.GameUI.showPauseScreen();
            } else {
                if (window.GameUI) window.GameUI.hidePauseScreen();
                this.loop();
            }
        }
        
        handleInput(e, isDown) {
            if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) {
                e.preventDefault();
            }
            
            if (!this.isRunning) {
                if(isDown && e.code === 'Space') this.startGame();
                return;
            }
            
            if (this.isPaused) {
                if(isDown && e.code === 'Space') this.togglePause();
                return;
            }
            
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                this.input.jump = isDown;
                if (isDown) this.dino.jump();
            }
            if (e.code === 'ArrowDown') {
                this.input.duck = isDown;
            }
        }
        
        update() {
            this.speed = Math.min(CONFIG.speedMax, this.speed + 0.001);
            this.score += this.speed * 0.1;
            
            if (window.GameUI && Math.floor(this.score) % 10 === 0) {
                 window.GameUI.updateScore(Math.floor(this.score));
            }
            
            this.stars.update(this.speed);
            this.dino.update(this.input);
            this.obstacles.update(this.speed, this.score);
            
            if (this.obstacles.checkCollision(this.dino)) {
                this.die();
            }
        }
        
        die() {
            this.isRunning = false;
            
            // Death effect or flash?
            
            if (this.score > this.highScore) {
                this.highScore = Math.floor(this.score);
                localStorage.setItem('dinoHighScore', this.highScore);
            }
            
            if (window.GameUI) window.GameUI.showGameOverScreen(Math.floor(this.score), this.highScore);
        }
        
        loop() {
            if (this.isPaused || !this.isRunning) return;
            
            this.update();
            this.draw();
            
            this.gameLoopId = requestAnimationFrame(() => this.loop());
        }
        
        draw() {
            // Background
            this.ctx.fillStyle = CONFIG.colors.bg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.stars.draw(this.ctx);
            
            // Ground Line
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = CONFIG.colors.ground;
            this.ctx.strokeStyle = CONFIG.colors.ground;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.groundY);
            this.ctx.lineTo(this.canvas.width, this.groundY);
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
            
            this.obstacles.draw(this.ctx);
            this.dino.draw(this.ctx);
        }
    }

    new DinoGame();
})();
        
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
