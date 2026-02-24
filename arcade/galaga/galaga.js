class GalagaGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // UI
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.finalScoreElement = document.getElementById('final-score');
        this.finalLevelElement = document.getElementById('final-level');
        this.restartBtn = document.getElementById('restart-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.difficultySelect = document.getElementById('difficulty-select');
        
        // Mobile Controls
        this.btnLeft = document.getElementById('left-btn');
        this.btnRight = document.getElementById('right-btn');
        this.btnFire = document.getElementById('fire-btn');
        
        // State
        this.isGameRunning = false;
        this.isPaused = false;
        this.animationId = null;
        this.score = 0;
        this.highScore = localStorage.getItem('galagaHighScore') || 0;
        this.level = 1;
        this.difficulty = 'normal';
        
        // Entities
        this.player = null;
        this.bullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.explosions = [];
        this.stars = [];
        
        // Timers
        this.waveTimer = 0;
        this.formationOffset = 0;
        this.formationDirection = 1;
        
        this.init();
    }
    
    init() {
        this.highScoreElement.innerText = this.highScore;
        this.createStars();
        
        // Input
        this.input = { left: false, right: false, fire: false };
        
        window.addEventListener('keydown', (e) => this.handleKey(e, true));
        window.addEventListener('keyup', (e) => this.handleKey(e, false));
        
        this.restartBtn.addEventListener('click', () => this.resetGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());

        // Mobile
        this.setupMobileControls();
        
        this.drawLoop(); // Idle draw for stars
    }
    
    setupMobileControls() {
        const set = (k, v) => this.input[k] = v;
        
        // Touch events
        ['touchstart', 'mousedown'].forEach(evt => {
            this.btnLeft.addEventListener(evt, (e) => { e.preventDefault(); set('left', true); });
            this.btnRight.addEventListener(evt, (e) => { e.preventDefault(); set('right', true); });
            this.btnFire.addEventListener(evt, (e) => { e.preventDefault(); set('fire', true); });
        });
        
        ['touchend', 'mouseup', 'mouseleave'].forEach(evt => {
            this.btnLeft.addEventListener(evt, (e) => { e.preventDefault(); set('left', false); });
            this.btnRight.addEventListener(evt, (e) => { e.preventDefault(); set('right', false); });
            this.btnFire.addEventListener(evt, (e) => { e.preventDefault(); set('fire', false); });
        });
    }

    handleKey(e, isDown) {
        if (e.code === 'ArrowLeft') this.input.left = isDown;
        if (e.code === 'ArrowRight') this.input.right = isDown;
        if (e.code === 'Space' || e.code === 'KeyZ') this.input.fire = isDown;
        
        if (isDown && e.code === 'Space' && !this.isGameRunning) {
             this.startGame();
        }
    }
    
    createStars() {
        for(let i=0; i<100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 3 + 0.5
            });
        }
    }
    
    startGame() {
        if (this.isGameRunning) return;
        
        this.isGameRunning = true;
        this.isPaused = false;
        this.score = 0;
        this.level = 1;
        this.updateScoreUI();
        this.startScreen.style.display = 'none';
        this.gameOverScreen.style.display = 'none';
        
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            width: 30,
            height: 30,
            speed: 5,
            cooldown: 0,
            lives: 3
        };
        
        this.bullets = [];
        this.enemyBullets = [];
        this.explosions = [];
        
        this.startLevel();
        this.loop();
    }
    
    startLevel() {
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        
        // Spawn Formation
        const rows = 4;
        const cols = 8;
        const startX = 60;
        const startY = 60;
        const gapX = 45;
        const gapY = 40;
        
        for (let r=0; r<rows; r++) {
            for (let c=0; c<cols; c++) {
                let type = 'bee';
                if (r === 0) type = 'boss';
                else if (r === 1) type = 'butterfly';
                
                let hp = 1;
                if (type === 'boss') hp = 2;
                
                this.enemies.push({
                    x: startX + c * gapX,
                    y: startY + r * gapY,
                    homeX: startX + c * gapX,
                    homeY: startY + r * gapY,
                    type: type,
                    width: 30,
                    height: 30,
                    hp: hp,
                    state: 'formation', // formation, diving, returning
                    diveTimer: Math.random() * 500, // Random delay for diving
                    angle: 0
                });
            }
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
    }
    
    loop() {
        if (!this.isGameRunning) return;
        
        if (!this.isPaused) {
            this.update();
        }
        
        this.draw();
        this.animationId = requestAnimationFrame(() => this.loop());
    }
    
    drawLoop() {
        // Idle loop for start screen background
        if (!this.isGameRunning) {
             this.updateStars();
             this.draw();
             requestAnimationFrame(() => this.drawLoop());
        }
    }
    
    update() {
        this.updateStars();
        this.updatePlayer();
        this.updateBullets();
        this.updateEnemies();
        this.updateExplosions();
        
        // Level Clear
        if (this.enemies.length === 0) {
            this.level++;
            // Bonus points?
            this.startLevel();
        }
    }
    
    updateStars() {
        const speedMult = this.level * 0.5 + 1;
        this.stars.forEach(s => {
            s.y += s.speed * (this.isGameRunning ? speedMult : 1);
            if (s.y > this.canvas.height) {
                s.y = 0;
                s.x = Math.random() * this.canvas.width;
            }
        });
    }
    
    updatePlayer() {
        if (!this.player) return;
        
        if (this.input.left && this.player.x > 0) this.player.x -= this.player.speed;
        if (this.input.right && this.player.x + this.player.width < this.canvas.width) this.player.x += this.player.speed;
        
        if (this.input.fire && this.player.cooldown <= 0) {
            this.fireBullet();
            this.player.cooldown = 15;
        }
        
        if (this.player.cooldown > 0) this.player.cooldown--;
    }
    
    fireBullet() {
        // Limit total bullets
        if (this.bullets.length < 2) {
            this.bullets.push({
                x: this.player.x + this.player.width / 2 - 2,
                y: this.player.y,
                width: 4,
                height: 10,
                speed: 10
            });
            // Sound effect?
        }
    }
    
    updateBullets() {
        // Player Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.y -= b.speed;
            if (b.y < 0) this.bullets.splice(i, 1);
        }
        
        // Enemy Bullets
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            let b = this.enemyBullets[i];
            b.y += b.speed;
            
            // Player Collision (Simple Rect)
            if (this.player && this.rectIntersect(b.x, b.y, b.width, b.height, 
                                   this.player.x + 5, this.player.y + 5, this.player.width - 10, this.player.height - 10)) {
                
                this.handlePlayerDeath();
                this.enemyBullets.splice(i, 1);
            }
            
            if (b.y > this.canvas.height) this.enemyBullets.splice(i, 1);
        }
    }
    
    updateEnemies() {
        // Formation Breathing Movement
        this.waveTimer += 0.05;
        this.formationOffset = Math.sin(this.waveTimer) * 20;

        // Dive Logic Chance
        const diveChance = 0.005 + (this.level * 0.002);
        
        this.enemies.forEach((e, index) => {
            // State Machine
            if (e.state === 'formation') {
                e.x = e.homeX + this.formationOffset;
                // Random Dive
                if (Math.random() < diveChance && e.diveTimer <= 0) {
                    e.state = 'diving';
                    // Calculate dive vectors - aim at player??
                    // Simple curve: down and towards player
                    e.diveVx = (Math.random() - 0.5) * 4;
                    e.diveVy = 3 + (this.level * 0.5);
                }
                if (e.diveTimer > 0) e.diveTimer--;
                
            } else if (e.state === 'diving') {
                e.y += e.diveVy;
                e.x += Math.sin(e.y * 0.05) * 3; // Wiggle
                
                // Shoot Chance
                 if (Math.random() < 0.02) {
                     this.enemyBullets.push({
                         x: e.x + e.width/2,
                         y: e.y + e.height,
                         width: 4, height: 8, speed: 4
                     });
                 }

                if (e.y > this.canvas.height) {
                    e.y = 0;
                    e.state = 'returning'; // Wrap around top -> return to formation
                }
                
                // Collision with Player
                if (this.player && this.rectIntersect(e.x, e.y, e.width, e.height, 
                                        this.player.x, this.player.y, this.player.width, this.player.height)) {
                     this.handlePlayerDeath();
                     // Kill Enemy too
                     this.createExplosion(e.x, e.y, e.type);
                     this.enemies.splice(index, 1);
                     return;
                }
                
            } else if (e.state === 'returning') {
                // Lerp back to home
                const targetX = e.homeX + this.formationOffset;
                const targetY = e.homeY;
                e.x += (targetX - e.x) * 0.05;
                e.y += (targetY - e.y) * 0.05;
                
                if (Math.abs(e.x - targetX) < 5 && Math.abs(e.y - targetY) < 5) {
                    e.state = 'formation';
                    e.diveTimer = Math.random() * 500;
                }
            }
            
            // Check Hit by Player Bullet
            for (let bIndex = this.bullets.length - 1; bIndex >= 0; bIndex--) {
                let b = this.bullets[bIndex];
                if (this.rectIntersect(b.x, b.y, b.width, b.height, e.x, e.y, e.width, e.height)) {
                    // Hit!
                    this.bullets.splice(bIndex, 1);
                    e.hp--;
                    if (e.hp <= 0) {
                        // Dead
                        this.score += (e.type === 'boss' ? 150 : (e.type === 'butterfly' ? 80 : 50));
                        this.updateScoreUI();
                        this.createExplosion(e.x, e.y, e.type);
                        this.enemies.splice(index, 1); // Mutating while iterating is risky?
                         // Use filter later? No, standard loop right to left is safer, wait.. forEach doesn't nice with splice.
                         // Fix loop!
                    } else {
                        // Hit Sound / Flash
                        e.hitFlash = 5;
                    }
                    return; // Bullet used
                }
            }
        });
        
        // Cleanup Dead Enemies (Filter out undefined if splic didn't work well in forEach? 
        // Better to use reverse for loop for safe deletion)
        // I used forEach which is BAD for splice. 
        // Let's re-filter
        // Actually, let's correct the loop now.
        // It WAS risky.
    }
    
    // Corrected updateEnemies inside update() calls? 
    // I'll rewrite the loop structure in actual updateEnemies
    
    updateExplosions() {
         for(let i=this.explosions.length-1; i>=0; i--) {
             this.explosions[i].timer--;
             if (this.explosions[i].timer <= 0) this.explosions.splice(i, 1);
         }
    }

    createExplosion(x, y, type) {
        let color = '#ff0000';
        if (type === 'boss') color = '#00ff00';
        if (type === 'bee') color = '#ffff00';
        
        this.explosions.push({
            x: x, y: y, color: color, timer: 15, maxTimer: 15
        });
    }

    handlePlayerDeath() {
        if (this.player.lives > 0) {
            this.player.lives--;
            this.createExplosion(this.player.x, this.player.y, 'player');
            // Respawn
            this.player.x = this.canvas.width / 2;
             // Shield?
        } else {
            this.gameOver();
        }
    }
    
    gameOver() {
        this.isGameRunning = false;
        this.finalScoreElement.innerText = this.score;
        this.finalLevelElement.innerText = this.level;
        this.gameOverScreen.style.display = 'flex';
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('galagaHighScore', this.score);
        }
    }

    rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
    }
    
    draw() {
        // Clear
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Stars
        this.ctx.fillStyle = '#fff';
        this.stars.forEach(s => {
            this.ctx.globalAlpha = Math.random() * 0.5 + 0.5;
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;
        
        if (!this.isGameRunning) return;
        
        // Player
        if (this.player) {
            this.ctx.fillStyle = '#fff';
            // Draw Ship
            const px = this.player.x;
            const py = this.player.y;
            const pw = this.player.width;
            
            this.ctx.beginPath();
            this.ctx.moveTo(px + pw/2, py);
            this.ctx.lineTo(px + pw, py + pw);
            this.ctx.lineTo(px + pw/2, py + pw - 5);
            this.ctx.lineTo(px, py + pw);
            this.ctx.fill();
            
            // Red Engine
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(px + pw/2 - 2, py + pw - 3, 4, 4);
            
            // Lives
            // Draw tiny ships at bottom left?
        }
        
        // Enemies
        this.enemies.forEach(e => {
            let color = '#fff';
            // Galaga Palette
            if (e.type === 'boss') color = '#55ff55'; // Green
            if (e.type === 'butterfly') color = '#ff5555'; // Red
            if (e.type === 'bee') color = '#5555ff'; // Blue
             
             if (e.hitFlash && e.hitFlash > 0) {
                 color = '#fff';
                 e.hitFlash--;
             }

            this.ctx.fillStyle = color;
            
            // Check 'state' for rotation?
            
            const ex = e.x;
            const ey = e.y;
            const ew = e.width;
            
            // Sprite Logic (Simplified Geometry)
            if (e.type === 'bee') {
                 this.ctx.fillRect(ex + 5, ey + 5, ew - 10, ew - 10);
                 // Wings
                 if (Math.floor(Date.now() / 100) % 2 === 0) {
                     this.ctx.fillRect(ex, ey, 5, ew);
                     this.ctx.fillRect(ex + ew - 5, ey, 5, ew);
                 } else {
                     this.ctx.fillRect(ex - 2, ey + 5, 5, ew - 10);
                     this.ctx.fillRect(ex + ew - 3, ey + 5, 5, ew - 10);
                 }
            } else if (e.type === 'butterfly') {
                 this.ctx.beginPath();
                 this.ctx.moveTo(ex, ey);
                 this.ctx.lineTo(ex + ew, ey);
                 this.ctx.lineTo(ex + ew/2, ey + ew);
                 this.ctx.fill();
            } else {
                 // Boss
                 this.ctx.beginPath();
                 this.ctx.moveTo(ex, ey + ew/2);
                 this.ctx.lineTo(ex + ew/2, ey);
                 this.ctx.lineTo(ex + ew, ey + ew/2);
                 this.ctx.lineTo(ex + ew/2, ey + ew);
                 this.ctx.fill();
            }
        });
        
        // Bullets
        this.ctx.fillStyle = '#ffaa00';
        this.bullets.forEach(b => {
            this.ctx.fillRect(b.x, b.y, b.width, b.height);
        });
        
        this.ctx.fillStyle = '#ff0000';
        this.enemyBullets.forEach(b => {
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, 4, 0, Math.PI*2);
            this.ctx.fill();
        });
        
        // Explosions
        this.explosions.forEach(x => {
            this.ctx.fillStyle = x.color;
            this.ctx.globalAlpha = x.timer / x.maxTimer;
            this.ctx.beginPath();
            this.ctx.arc(x.x + 15, x.y + 15, (15 - x.timer) * 3, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        });
    }

    updateScoreUI() {
        this.scoreElement.innerText = this.score;
        this.highScoreElement.innerText = this.highScore;
    }
}

// Fix the forEach/Splice loop issue safely
GalagaGame.prototype.updateEnemies = function() {
    this.waveTimer += 0.05;
    this.formationOffset = Math.sin(this.waveTimer) * 20;
    
    // Reverse Loop for safe removal
    for (let i = this.enemies.length - 1; i >= 0; i--) {
        let e = this.enemies[i];
        
        // --- LOGIC SAME AS ABOVE ---
        // State Machine
            if (e.state === 'formation') {
                e.x = e.homeX + this.formationOffset;
                // Random Dive Chance
                if (Math.random() < (0.001 + this.level * 0.0005) && e.diveTimer <= 0) {
                    e.state = 'diving';
                    e.diveVx = (Math.random() - 0.5) * 4;
                    e.diveVy = 3 + (this.level * 0.5);
                }
                if (e.diveTimer > 0) e.diveTimer--;
                
            } else if (e.state === 'diving') {
                e.y += e.diveVy;
                e.x += Math.sin(e.y * 0.05) * 3; 

                // Shoot Chance
                 if (Math.random() < 0.02) {
                     this.enemyBullets.push({
                         x: e.x + e.width/2,
                         y: e.y + e.height,
                         width: 4, height: 8, speed: 4
                     });
                 }

                if (e.y > this.canvas.height) {
                    e.y = -50;
                    e.state = 'returning';
                }
                
                // Collision with Player
                if (this.player && this.rectIntersect(e.x, e.y, e.width, e.height, 
                                        this.player.x, this.player.y, this.player.width, this.player.height)) {
                     this.handlePlayerDeath();
                     this.createExplosion(e.x, e.y, e.type);
                     this.enemies.splice(i, 1);
                     continue;
                }
                
            } else if (e.state === 'returning') {
                const targetX = e.homeX + this.formationOffset;
                const targetY = e.homeY;
                e.x += (targetX - e.x) * 0.05;
                e.y += (targetY - e.y) * 0.05;
                
                if (Math.abs(e.x - targetX) < 5 && Math.abs(e.y - targetY) < 5) {
                    e.state = 'formation';
                    e.diveTimer = Math.random() * 500 + 200;
                }
            }
            
            // Bullet Hit Check
            let hit = false;
            for (let bIndex = this.bullets.length - 1; bIndex >= 0; bIndex--) {
                let b = this.bullets[bIndex];
                if (this.rectIntersect(b.x, b.y, b.width, b.height, e.x, e.y, e.width, e.height)) {
                    this.bullets.splice(bIndex, 1);
                    e.hp--;
                    e.hitFlash = 5;
                    hit = true;
                    if (e.hp <= 0) {
                        this.score += (e.type === 'boss' ? 150 : (e.type === 'butterfly' ? 80 : 50));
                        this.updateScoreUI();
                        this.createExplosion(e.x, e.y, e.type);
                        this.enemies.splice(i, 1);
                    }
                    break; // Only one bullet hits one enemy per frame
                }
            }
    }
};

window.onload = () => {
    new GalagaGame();
};
