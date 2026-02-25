class GalagaGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        // Set proper size for vertical shooter
        this.canvas.width = 600;
        this.canvas.height = 800;
        
        // UI
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.finalScoreElement = document.getElementById('final-score');
        this.restartBtn = document.getElementById('restart-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        
        // Input
        this.input = { left: false, right: false, fire: false };
        this.setupControls();
        
        // Game State
        this.isGameRunning = false;
        this.isPaused = false;
        this.level = 1;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('galagaHighScore') || 0);
        
        // Entities
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.explosions = [];
        this.stars = [];
        this.particles = [];
        
        this.waveTimer = 0;
        
        this.init();
    }
    
    init() {
        if(this.highScoreElement) this.highScoreElement.innerText = this.highScore;
        this.createStars();
        
        if(this.restartBtn) this.restartBtn.addEventListener('click', () => this.startGame());
        if(this.pauseBtn) this.pauseBtn.addEventListener('click', () => this.togglePause());
        
        requestAnimationFrame(() => this.loop());
    }
    
    setupControls() {
        window.addEventListener('keydown', (e) => {
            if(e.code === 'ArrowLeft') this.input.left = true;
            if(e.code === 'ArrowRight') this.input.right = true;
            if(e.code === 'Space') {
                this.input.fire = true;
                if(!this.isGameRunning) this.startGame();
            }
        });
        window.addEventListener('keyup', (e) => {
            if(e.code === 'ArrowLeft') this.input.left = false;
            if(e.code === 'ArrowRight') this.input.right = false;
            if(e.code === 'Space') this.input.fire = false;
        });
        
        // Click/Touch to Start
        const touchStart = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            if(!this.isGameRunning) {
                this.startGame();
            } else {
                // Optional: Tap to fire?
                this.input.fire = true;
                setTimeout(() => this.input.fire = false, 100);
            }
        };
        
        this.canvas.addEventListener('mousedown', touchStart);
        this.canvas.addEventListener('touchstart', touchStart);
        
        const startScreen = document.getElementById('start-screen');
        if(startScreen) {
             startScreen.addEventListener('click', touchStart);
             startScreen.addEventListener('touchstart', touchStart);
        }
    }
    
    createStars() {
        for(let i=0; i<80; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() < 0.8 ? 1 : 2,
                speed: Math.random() * 2 + 0.5,
                color: Math.random() > 0.8 ? '#555' : '#fff'
            });
        }
    }
    
    startGame() {
        this.isGameRunning = true;
        this.isPaused = false;
        this.score = 0;
        this.level = 1;
        this.updateScoreUI();
        if(this.startScreen) this.startScreen.style.display = 'none';
        if(this.gameOverScreen) this.gameOverScreen.style.display = 'none';
        
        this.player = {
            x: this.canvas.width / 2 - 15,
            y: this.canvas.height - 50,
            w: 30, h: 30,
            speed: 5,
            cooldown: 0,
            lives: 3,
            dead: false
        };
        
        this.startLevel();
    }
    
    startLevel() {
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.waveTimer = 0;
        
        const rows = 4;
        const cols = 8;
        const startX = (this.canvas.width - (cols * 40)) / 2 + 20;
        
        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                let type = 'bee';
                let hp = 1;
                let score = 50;
                
                if (r === 0) { type = 'boss'; hp = 2; score=150; }
                else if (r === 1) { type = 'butterfly'; score=80; hp=1; }
                
                this.enemies.push({
                    x: startX + c * 40,
                    y: 50 + r * 35,
                    homeX: startX + c * 40,
                    homeY: 50 + r * 35,
                    vx: 0, vy: 0,
                    type: type,
                    w: 24, h: 24,
                    hp: hp,
                    scoreVal: score,
                    state: 'formation',
                    diveTimer: Math.random() * 600 + 100
                });
            }
        }
    }
    
    togglePause() {
        if(!this.isGameRunning) return;
        this.isPaused = !this.isPaused;
        if(this.pauseBtn) this.pauseBtn.innerText = this.isPaused ? 'RESUME' : 'PAUSE';
    }
    
    loop() {
        if(this.isGameRunning && !this.isPaused) {
            this.update();
        } else {
            this.updateStars();
        }
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
    
    update() {
        this.updateStars();
        this.waveTimer += 0.05;
        
        // Player
        if(this.player && !this.player.dead) {
            if(this.input.left && this.player.x > 0) this.player.x -= this.player.speed;
            if(this.input.right && this.player.x < this.canvas.width - this.player.w) this.player.x += this.player.speed;
            
            if(this.input.fire && this.player.cooldown <= 0) {
                this.bullets.push({ x: this.player.x + 13, y: this.player.y, w: 4, h: 10, speed: 8 });
                this.player.cooldown = 15;
            }
            if(this.player.cooldown > 0) this.player.cooldown--;
        }
        
        // Bullets
        for(let i=this.bullets.length-1; i>=0; i--) {
            let b = this.bullets[i];
            b.y -= b.speed;
            if(b.y < -10) this.bullets.splice(i, 1);
        }
        
        // E-Bullets
        for(let i=this.enemyBullets.length-1; i>=0; i--) {
            let b = this.enemyBullets[i];
            b.y += b.speed;
            if(b.y > this.canvas.height) { this.enemyBullets.splice(i, 1); continue; }
            
            if(this.player && !this.player.dead && this.rectIntersect(b, this.player)) {
                 this.handlePlayerHit();
                 this.enemyBullets.splice(i, 1);
            }
        }
        
        // Enemies
        const formationX = Math.sin(this.waveTimer) * 20;
        const diveChance = 0.002 + (this.level * 0.001);

        for(let i=this.enemies.length-1; i>=0; i--) {
            let e = this.enemies[i];
            
            // Movement State
            if(e.state === 'formation') {
                e.x = e.homeX + formationX;
                e.y = e.homeY;
                
                if(Math.random() < diveChance && e.diveTimer <= 0) {
                    e.state = 'diving';
                    // Aim Vector
                    let tx = this.player ? this.player.x : this.canvas.width/2;
                    let ty = this.player ? this.player.y : this.canvas.height;
                    let dx = tx - e.x;
                    let dy = ty - e.y;
                    let dist = Math.sqrt(dx*dx + dy*dy);
                    e.vx = (dx/dist) * 3;
                    e.vy = 3 + (this.level * 0.2);
                }
                if(e.diveTimer > 0) e.diveTimer--;
                
            } else if(e.state === 'diving') {
                e.x += e.vx;
                e.x += Math.sin(e.y * 0.1) * 2; // Wiggle
                e.y += e.vy;
                
                // Shoot
                if(Math.random() < 0.02) {
                    this.enemyBullets.push({ x: e.x + 10, y: e.y+20, w: 4, h: 8, speed: 4 });
                }
                
                if(e.y > this.canvas.height + 20) {
                    e.state = 'returning';
                    e.y = -20;
                }
                
                // Crash into player
                if(this.player && !this.player.dead && this.rectIntersect(e, this.player)) {
                    this.handlePlayerHit();
                    this.createExplosion(e.x, e.y, e.type);
                    this.enemies.splice(i, 1);
                    continue;
                }
                
            } else if(e.state === 'returning') {
                let tx = e.homeX + formationX;
                let ty = e.homeY;
                e.x += (tx - e.x) * 0.05;
                e.y += (ty - e.y) * 0.05;
                
                if(Math.abs(e.x - tx) < 5 && Math.abs(e.y - ty) < 5) {
                    e.state = 'formation';
                    e.diveTimer = Math.random() * 600 + 200;
                }
            }
            
            // Bullet Collisions
            for(let b=this.bullets.length-1; b>=0; b--) {
                if(this.rectIntersect(this.bullets[b], e)) {
                    this.bullets.splice(b, 1);
                    e.hp--;
                    if(e.hp <= 0) {
                        this.score += e.scoreVal;
                        this.updateScoreUI();
                        this.createExplosion(e.x, e.y, e.type);
                        this.enemies.splice(i, 1);
                    } else {
                        // Flash or particle
                    }
                    break;
                }
            }
        }
        
        if(this.enemies.length === 0) {
            this.level++;
            this.startLevel();
        }
        
        // Particles
        for(let i=this.particles.length-1; i>=0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if(p.life <= 0) this.particles.splice(i, 1);
        }
    }
    
    updateStars() {
        const speed = this.isGameRunning ? (1 + this.level * 0.5) : 0.5;
        this.stars.forEach(s => {
            s.y += s.speed * speed;
            if(s.y > this.canvas.height) {
                s.y = 0;
                s.x = Math.random() * this.canvas.width;
            }
        });
    }
    
    handlePlayerHit() {
        if(!this.player || this.player.dead) return;
        this.createExplosion(this.player.x, this.player.y, 'player');
        this.player.dead = true;
        this.player.lives--;
        
        setTimeout(() => {
            if(this.player.lives > 0) {
                this.player.dead = false;
                this.player.x = this.canvas.width / 2 - 15;
                this.bullets = [];
                this.enemyBullets = [];
            } else {
                this.isGameRunning = false;
                if(this.gameOverScreen) this.gameOverScreen.style.display = 'flex';
                if(this.finalScoreElement) this.finalScoreElement.innerText = this.score;
                if(this.score > this.highScore) {
                    this.highScore = this.score;
                    localStorage.setItem('galagaHighScore', this.score);
                }
            }
        }, 1000);
    }
    
    createExplosion(x, y, type) {
        let color = '#fff';
        if(type === 'boss') color = '#0f0';
        if(type === 'butterfly') color = '#f00';
        if(type === 'bee') color = '#ff0';
        if(type === 'player') color = '#fff';
        
        for(let i=0; i<10; i++) {
            this.particles.push({
                x: x + 10, y: y + 10,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                color: color,
                life: 20
            });
        }
    }
    
    rectIntersect(r1, r2) {
        return !(r2.x > r1.x + r1.w || 
                 r2.x + r2.w < r1.x || 
                 r2.y > r1.y + r1.h || 
                 r2.y + r2.h < r1.y);
    }
    
    updateScoreUI() {
        if(this.scoreElement) this.scoreElement.innerText = this.score;
    }
    
    draw() {
        // Background
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Stars (Twinkle)
        this.stars.forEach(s => {
            this.ctx.fillStyle = s.color;
            this.ctx.globalAlpha = Math.random() * 0.5 + 0.5;
            this.ctx.fillRect(s.x, s.y, s.size, s.size);
        });
        this.ctx.globalAlpha = 1.0;
        
        if(!this.isGameRunning) return;
        
        // Player (Retro Fighter)
        if(this.player && !this.player.dead) {
            const x = this.player.x;
            const y = this.player.y;
            
            // White Body
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(x+13, y, 4, 6); // Nose
            this.ctx.fillRect(x+11, y+6, 8, 8); // Cockpit base
            this.ctx.fillRect(x+4, y+14, 22, 4); // Wings Top
            this.ctx.fillRect(x+2, y+18, 26, 8); // Wings Base

            // Red Detail
            this.ctx.fillStyle = '#f00'; 
            this.ctx.fillRect(x+0, y+16, 2, 10); // Left Tip
            this.ctx.fillRect(x+28, y+16, 2, 10); // Right Tip
            this.ctx.fillRect(x+13, y+8, 4, 4); // Center stripe

            // Blue Engine Thruster
            this.ctx.fillStyle = '#0af';
            if (Date.now() % 200 < 100) {
                 this.ctx.fillRect(x+11, y+26, 8, 4); 
            }
        }
        
        // Enemies
        this.enemies.forEach(e => {
            const x = e.x;
            const y = e.y;
            
            if(e.type === 'bee') {
                // Yellow Bee
                this.ctx.fillStyle = '#ff0'; 
                this.ctx.fillRect(x+6, y+4, 12, 12); // Body
                this.ctx.fillStyle = '#fff'; 
                this.ctx.fillRect(x+2, y+2, 4, 8); // L Wing
                this.ctx.fillRect(x+18, y+2, 4, 8); // R Wing
                this.ctx.fillStyle = '#f00';
                this.ctx.fillRect(x+8, y+8, 2, 2); // Eye
                this.ctx.fillRect(x+14, y+8, 2, 2); // Eye
            } else if(e.type === 'butterfly') {
                // Red Butterfly
                this.ctx.fillStyle = '#f00';
                this.ctx.fillRect(x+8, y+6, 8, 10); // Body
                this.ctx.fillStyle = '#0af'; 
                this.ctx.fillRect(x+2, y+2, 6, 8); // L Wing Top
                this.ctx.fillRect(x+16, y+2, 6, 8); // R Wing Top
                this.ctx.fillRect(x+4, y+12, 4, 6); // L Wing Bot
                this.ctx.fillRect(x+16, y+12, 4, 6); // R Wing Bot
            } else { // Boss (Green Capturer)
                this.ctx.fillStyle = '#0f0';
                this.ctx.fillRect(x+6, y+10, 18, 10); // Body
                this.ctx.fillRect(x+2, y+14, 4, 8); // L Claw
                this.ctx.fillRect(x+24, y+14, 4, 8); // R Claw
                this.ctx.fillStyle = '#a0a';
                this.ctx.fillRect(x+10, y+4, 10, 6); // Head crest?
            }
        });
        
        // Bullets
        this.ctx.fillStyle = '#ff4';
        this.bullets.forEach(b => {
             this.ctx.fillRect(b.x, b.y, b.w, b.h);
             this.ctx.fillStyle = '#ff0'; 
             this.ctx.fillRect(b.x+1, b.y+b.h, b.w-2, 2); // Trail
        });
        
        this.ctx.fillStyle = '#f44';
        this.enemyBullets.forEach(b => {
            this.ctx.beginPath();
            this.ctx.arc(b.x+2, b.y+4, 3, 0, Math.PI*2);
            this.ctx.fill();
        });
        
        // Particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life / 20;
            this.ctx.fillRect(p.x, p.y, 3, 3);
        });
        this.ctx.globalAlpha = 1.0;
    }
}

window.onload = () => {
    new GalagaGame();
};
