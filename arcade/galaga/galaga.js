{
class GalagaGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        // Fit container logic if needed, but fixed 600x800 is fine for this
        // CSS forces it to fit screen height usually
        
        // Input
        this.input = { left: false, right: false, fire: false };
        this.bindEvents();
        
        // Game State
        this.isGameRunning = false;
        this.isPaused = false;
        this.level = 1;
        this.score = 0;
        
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
        this.createStars();
        if (window.GameUI) {
            window.GameUI.showStartScreen("GALAGA", "Defeat the insectoid fleet!<br>Arrows to move, Space to fire.", () => this.startGame());
        } else {
            this.startGame();
        }
        
        // Background loop for stars
        this.loop();
    }
    
    bindEvents() {
        this.handleKeyDown = (e) => {
            if (!this.canvas) return;
            
            // Prevent scrolling
            if(["ArrowLeft", "ArrowRight", "Space", "ArrowUp", "ArrowDown"].includes(e.code)) {
                e.preventDefault();
            }

            if(e.code === 'ArrowLeft') this.input.left = true;
            if(e.code === 'ArrowRight') this.input.right = true;
            if(e.code === 'Space') {
                this.input.fire = true;
                // If game not running / game over, space might restart handled by GameUI? 
                // Actually GameUI handles restart clicks, but we can map space to start too if we want
            }
            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (this.isGameRunning) this.togglePause();
            }
        };
        
        this.handleKeyUp = (e) => {
            if (!this.canvas) return;
            if(e.code === 'ArrowLeft') this.input.left = false;
            if(e.code === 'ArrowRight') this.input.right = false;
            if(e.code === 'Space') this.input.fire = false;
        };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }
    
    createStars() {
        this.stars = [];
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
        
        if (window.GameUI) window.GameUI.hide();
        
        this.player = {
            x: this.canvas.width / 2 - 15,
            y: this.canvas.height - 60,
            w: 32, h: 32,
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
        const startX = (this.canvas.width - (cols * 45)) / 2 + 20;
        
        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                let type = 'bee';
                let hp = 1;
                let score = 50;
                
                if (r === 0) { type = 'boss'; hp = 2; score=150; }
                else if (r === 1) { type = 'butterfly'; score=80; hp=1; }
                
                this.enemies.push({
                    x: startX + c * 45,
                    y: 60 + r * 40,
                    homeX: startX + c * 45,
                    homeY: 60 + r * 40,
                    vx: 0, vy: 0,
                    type: type,
                    w: 30, h: 30,
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
        if (this.isPaused && window.GameUI) {
            window.GameUI.showPause(() => this.togglePause(), () => window.history.back());
        } else {
            if (window.GameUI) window.GameUI.hide();
        }
    }
    
    loop() {
        if (!document.getElementById('gameCanvas')) {
             window.removeEventListener('keydown', this.handleKeyDown);
             window.removeEventListener('keyup', this.handleKeyUp);
             return;
        }

        if(this.isGameRunning && !this.isPaused) {
            this.update();
        } else {
            this.updateStars(); // Keep stars moving in BG
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
                // Dual shot powerup? Just single for now
                this.bullets.push({ x: this.player.x + 14, y: this.player.y, w: 4, h: 12, speed: 10 });
                this.player.cooldown = 15;
            }
            if(this.player.cooldown > 0) this.player.cooldown--;
        }
        
        // Bullets
        for(let i=this.bullets.length-1; i>=0; i--) {
            let b = this.bullets[i];
            b.y -= b.speed;
            if(b.y < -20) this.bullets.splice(i, 1);
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
                    this.enemyBullets.push({ x: e.x + 10, y: e.y+20, w: 6, h: 6, speed: 4 });
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
            let hit = false;
            for(let b=this.bullets.length-1; b>=0; b--) {
                if(this.rectIntersect(this.bullets[b], e)) {
                    this.bullets.splice(b, 1);
                    e.hp--;
                    hit = true;
                    if(e.hp <= 0) {
                        this.score += e.scoreVal;
                        this.createExplosion(e.x, e.y, e.type);
                        this.enemies.splice(i, 1);
                    } else {
                        // Hit flash
                        this.createParticles(e.x + e.w/2, e.y + e.h/2, '#fff', 3); 
                    }
                    break;
                }
            }
            if(hit) continue; // Enemy might be deleted
        }
        
        if(this.enemies.length === 0) {
            this.level++;
            // Bonus points?
            this.startLevel();
        }
        
        // Particles
        for(let i=this.particles.length-1; i>=0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if(p.life <= 0) this.particles.splice(i, 1);
        }
    }
    
    updateStars() {
        const speed = this.isGameRunning ? (1 + this.level * 0.2) : 0.5;
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
        
        if (this.player.lives <= 0) {
            setTimeout(() => {
                this.isGameRunning = false;
                if (window.GameUI) {
                    window.GameUI.showGameOver(this.score, () => this.startGame(), () => window.history.back(), "MISSION FAILED");
                }
            }, 1000);
        } else {
            setTimeout(() => {
                this.player.dead = false;
                this.player.x = this.canvas.width / 2 - 15;
                this.bullets = [];
                this.enemyBullets = [];
            }, 1500);
        }
    }
    
    createExplosion(x, y, type) {
        let color = '#fff';
        if(type === 'boss') color = '#0f0';
        if(type === 'butterfly') color = '#f00';
        if(type === 'bee') color = '#ff0';
        if(type === 'player') color = '#0af';
        this.createParticles(x+15, y+15, color, 15);
    }
    
    createParticles(x, y, color, count) {
        for(let i=0; i<count; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: color,
                life: 1.0
            });
        }
    }
    
    rectIntersect(r1, r2) {
        // Simple AABB
        // Entities have x,y,w,h (mapped width/height)
        let w1 = r1.w || r1.width || 4;
        let h1 = r1.h || r1.height || 4;
        let w2 = r2.w || r2.width || 30;
        let h2 = r2.h || r2.height || 30;
        
        return !(r2.x > r1.x + w1 || 
                 r2.x + w2 < r1.x || 
                 r2.y > r1.y + h1 || 
                 r2.y + h2 < r1.y);
    }
    
    draw() {
        if (!this.ctx) return;
        
        // Background
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Stars
        this.stars.forEach(s => {
            if (Math.random() > 0.95) this.ctx.fillStyle = '#fff'; // Twinkle
            else this.ctx.fillStyle = s.color;
            this.ctx.globalAlpha = Math.random() * 0.5 + 0.5;
            this.ctx.fillRect(s.x, s.y, s.size, s.size);
        });
        this.ctx.globalAlpha = 1.0;
        
        // Particles
        this.particles.forEach(p => {
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = p.color;
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.fillRect(p.x, p.y, 3, 3);
        });
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowBlur = 0;

        if(!this.isGameRunning) return;

        // Player (Neon Fighter)
        if(this.player && !this.player.dead) {
            const x = this.player.x;
            const y = this.player.y;
            
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#0af';
            this.ctx.fillStyle = '#fff'; // Body is white
            
            // Draw Fighter
            this.ctx.beginPath();
            this.ctx.moveTo(x+16, y);
            this.ctx.lineTo(x+32, y+32);
            this.ctx.lineTo(x+16, y+24);
            this.ctx.lineTo(x, y+32);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Cockpit
            this.ctx.fillStyle = '#f00';
            this.ctx.fillRect(x+14, y+10, 4, 8);
            
            // Engine
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#0af';
            this.ctx.fillStyle = '#0af';
            if (Date.now() % 200 < 100) {
                 this.ctx.fillRect(x+12, y+24, 8, 8); 
            }
        }
        
        // Enemies
        const time = Date.now();
        this.enemies.forEach(e => {
            const x = e.x;
            const y = e.y;
            
            this.ctx.shadowBlur = 10;
            
            if(e.type === 'bee') {
                this.ctx.shadowColor = '#ff0';
                this.ctx.fillStyle = '#ff0';
                // Bug Shape
                this.ctx.beginPath();
                this.ctx.ellipse(x+15, y+15, 12, 8, 0, 0, Math.PI*2);
                this.ctx.fill();
                // Wings
                if(Math.floor(time/100)%2===0) {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.fillRect(x+2, y-5, 8, 10);
                    this.ctx.fillRect(x+20, y-5, 8, 10);
                }
            } else if(e.type === 'butterfly') {
                this.ctx.shadowColor = '#f00';
                this.ctx.fillStyle = '#f00';
                // Triangle
                this.ctx.beginPath();
                this.ctx.moveTo(x+15, y+25);
                this.ctx.lineTo(x+30, y);
                this.ctx.lineTo(x, y);
                this.ctx.fill();
            } else { // Boss
                this.ctx.shadowColor = '#0f0';
                this.ctx.fillStyle = '#0f0';
                this.ctx.fillRect(x+5, y+5, 20, 20);
                this.ctx.fillStyle = '#a0a';
                 this.ctx.fillRect(x+10, y+10, 10, 10);
            }
        });
        
        // Bullets
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ff0';
        this.ctx.fillStyle = '#ffff00';
        this.bullets.forEach(b => {
             this.ctx.fillRect(b.x, b.y, b.w, b.h);
        });
        
        // Enemy Bullets
        this.ctx.shadowColor = '#f00';
        this.ctx.fillStyle = '#f00';
        this.enemyBullets.forEach(b => {
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, 4, 0, Math.PI*2);
            this.ctx.fill();
        });
        
        this.ctx.shadowBlur = 0;
        
        // HUD
        this.ctx.fillStyle = '#fff';
        this.ctx.font = "20px 'Courier New', monospace";
        this.ctx.fillText(`SCORE: ${this.score}`, 10, 30);
        this.ctx.fillText(`LIVES: ${this.player ? this.player.lives : 0}`, this.canvas.width - 120, 30);
    }
}

if (document.getElementById('gameCanvas')) {
    new GalagaGame();
}
}
