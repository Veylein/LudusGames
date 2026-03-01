{
class InvadersGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        
        this.score = 0;
        this.isGameRunning = false;
        this.isPaused = false;
        this.animationId = null;
        this.difficulty = 2;

        // Player
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 40,
            width: 32,
            height: 20,
            speed: 5,
            bullets: []
        };

        // Aliens
        this.aliens = [];
        this.particles = [];
        this.rows = 4;
        this.cols = 8;
        this.alienDirection = 1;
        this.alienSpeed = 1;
        
        // Input
        this.input = { left: false, right: false };
        this.bindEvents();

        this.init();
    }

    bindEvents() {
        this.handleKeyDown = (e) => {
            if (!this.isGameRunning && !window.GameUI?.active) return;
            
            if (["ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
                e.preventDefault();
            }

            if (e.code === 'ArrowLeft') this.input.left = true;
            if (e.code === 'ArrowRight') this.input.right = true;
            
            if (e.code === 'Space') {
                if (this.isPaused) return;
                this.fireBullet();
            }
            
            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (this.isGameRunning) this.togglePause();
            }
        };
        
        this.handleKeyUp = (e) => {
             if (e.code === 'ArrowLeft') this.input.left = false;
             if (e.code === 'ArrowRight') this.input.right = false;
        };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }
    
    init() {
        if (window.GameUI) {
            window.GameUI.showStartScreen(
                "INVADERS", 
                "Defend Earth!<br>Arrows to move, Space to shoot.", 
                () => this.startGame()
            );
        } else {
            this.startGame();
        }
    }

    fireBullet() {
        if (!this.isGameRunning || this.isPaused) return;
        // Limit bullets
        if (this.player.bullets.length < 3) {
             this.player.bullets.push({
                 x: this.player.x + this.player.width/2 - 2, 
                 y: this.player.y, 
                 width: 4, 
                 height: 12, 
                 speed: 8
             });
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused && window.GameUI) {
            window.GameUI.showPause(
                () => this.togglePause(),
                () => window.history.back()
            );
        } else {
            if (window.GameUI) window.GameUI.hide();
            this.loop();
        }
    }

    startGame() {
        this.score = 0;
        this.isGameRunning = true;
        this.isPaused = false;
        
        this.player.x = this.canvas.width / 2 - this.player.width/2;
        this.player.bullets = [];
        this.aliens = [];
        this.particles = [];

        // Difficulty
        this.difficulty = 1; // Default
        this.alienSpeed = 1;

        // Create Aliens
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.aliens.push({
                    x: 60 + c * 55,
                    y: 50 + r * 45,
                    width: 32,
                    height: 24,
                    active: true,
                    type: r === 0 ? 'top' : (r < 2 ? 'mid' : 'bot'),
                    frame: 0 // Animation frame
                });
            }
        }

        if (window.GameUI) window.GameUI.hide();
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.loop();
    }

    loop() {
        if (!this.isGameRunning || this.isPaused) return;

        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    createExplosion(x, y, color) {
        for(let i=0; i<8; i++) {
            this.particles.push({
                x, y,
                dx: (Math.random() - 0.5) * 4,
                dy: (Math.random() - 0.5) * 4,
                life: 1.0,
                color
            });
        }
    }

    update() {
        // Player Move
        if (this.input.left) this.player.x -= this.player.speed;
        if (this.input.right) this.player.x += this.player.speed;
        
        // Clamp
        if (this.player.x < 10) this.player.x = 10;
        if (this.player.x + this.player.width > this.canvas.width - 10) 
            this.player.x = this.canvas.width - 10 - this.player.width;

        // Bullets Move
        for (let i = 0; i < this.player.bullets.length; i++) {
            let b = this.player.bullets[i];
            b.y -= b.speed;
            if (b.y < 0) {
                this.player.bullets.splice(i, 1);
                i--;
            }
        }
        
        // Particles
        for (let i = 0; i < this.particles.length; i++) {
            let p = this.particles[i];
            p.x += p.dx;
            p.y += p.dy;
            p.life -= 0.05;
            if(p.life <= 0) {
                this.particles.splice(i, 1);
                i--;
            }
        }

        // Alien Logic
        // Move trigger every X frames? Or smooth? Smooth is better for smooth canvas.
        
        let edgeHit = false;
        const activeAliens = this.aliens.filter(a => a.active);
        
        // Animate aliens (wiggle)
        const time = Date.now() / 500;
        
        activeAliens.forEach(a => {
            a.x += this.alienSpeed * this.alienDirection;
            if (a.x <= 10 || a.x + a.width >= this.canvas.width - 10) {
                edgeHit = true;
            }
        });

        if (edgeHit) {
            this.alienDirection *= -1;
            activeAliens.forEach(a => {
                a.y += 20; 
                if (a.y + a.height >= this.player.y) this.gameOver(false); 
            });
            // Increase speed slightly per drop
            this.alienSpeed = this.alienSpeed > 0 ? this.alienSpeed + 0.2 : this.alienSpeed - 0.2; // Keep sign? No, speed is scalar usually
            // Just scalar increase on absolute
            const sign = this.alienDirection > 0 ? 1 : -1;
            const mag = Math.abs(this.alienSpeed) + 0.1;
            this.alienSpeed = mag * sign; // Wait... current dir is flipped above. 
            // Correct logic: flip first, then move down, then increase speed magnitude? 
            // Handled mostly by flip.
        }

        // Collisions
        this.player.bullets.forEach((b, bIdx) => {
            let hit = false;
            for (let a of this.aliens) {
                if (!a.active) continue;
                if (b.x > a.x && b.x < a.x + a.width && b.y > a.y && b.y < a.y + a.height) {
                    a.active = false;
                    hit = true;
                    this.score += 10;
                    this.createExplosion(a.x + a.width/2, a.y + a.height/2, this.getAlienColor(a.type));
                    break; 
                }
            }
            if (hit) {
                this.player.bullets.splice(bIdx, 1);
            }
        });

        if (this.aliens.filter(a => a.active).length === 0) {
            this.gameOver(true);
        }
    }

    getAlienColor(type) {
        if (type === 'top') return '#ff0055';
        if (type === 'mid') return '#00ffff';
        return '#00ff00';
    }

    draw() {
        if (!this.ctx) return;
        
        // BG
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); 

        // Particles
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, 4, 4);
            this.ctx.globalAlpha = 1.0;
        });

        // Player (Neon Green Tank)
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00ff00';
        this.ctx.fillStyle = '#00ff00';
        const px = this.player.x;
        const py = this.player.y;
        
        // Neo Tank
        this.ctx.fillRect(px, py + 12, 32, 8); // Base
        this.ctx.fillRect(px + 4, py + 6, 24, 6); // Mid
        this.ctx.fillRect(px + 13, py, 6, 6); // Turret
        
        this.ctx.shadowBlur = 0;

        // Aliens
        const time = Math.floor(Date.now() / 500); // For animation toggle
        
        this.aliens.forEach(a => {
            if (!a.active) return;
            
            const color = this.getAlienColor(a.type);
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            this.ctx.fillStyle = color;
            
            // Draw Alien Shape (Abstract pixel art)
            // Just simple shapes for now
            this.ctx.fillRect(a.x + 4, a.y + 4, a.width - 8, a.height - 8);
            
            // Arms display based on time
            if (time % 2 === 0) {
                this.ctx.fillRect(a.x, a.y, 4, 8);
                this.ctx.fillRect(a.x + a.width - 4, a.y, 4, 8);
            } else {
                this.ctx.fillRect(a.x, a.y + a.height - 8, 4, 8);
                this.ctx.fillRect(a.x + a.width - 4, a.y + a.height - 8, 4, 8);
            }
            
            // Eyes
            this.ctx.fillStyle = '#050510';
            this.ctx.fillRect(a.x + 8, a.y + 8, 4, 4);
            this.ctx.fillRect(a.x + a.width - 12, a.y + 8, 4, 4);
        });

        // Bullets
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#fff';
        this.ctx.fillStyle = '#ffffff';
        this.player.bullets.forEach(b => {
             this.ctx.fillRect(b.x, b.y, b.width, b.height);
        });
        
        this.ctx.shadowBlur = 0;
        
        // HUD
        this.ctx.fillStyle = '#fff';
        this.ctx.font = "20px 'Courier New', monospace";
        this.ctx.fillText(`SCORE: ${this.score}`, 10, 30);
    }

    gameOver(win) {
        this.isGameRunning = false;
        if (window.GameUI) {
            window.GameUI.showGameOver(
                this.score, 
                () => this.startGame(), 
                () => window.history.back(),
                win ? "WAVE CLEARED!" : "INVASION SUCCESSFUL"
            );
        }
    }
}

if (document.getElementById('gameCanvas')) {
    new InvadersGame();
}
}
