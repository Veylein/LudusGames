(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    class CentipedeGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = this.canvas.getContext('2d');
            
            this.score = 0;
            this.isGameRunning = false;
            this.isPaused = false;
            this.animationId = null;
            this.difficulty = 1;

            this.player = {
                x: this.canvas.width / 2,
                y: this.canvas.height - 30,
                width: 20,
                height: 20,
                speed: 5,
                bullets: []
            };

            this.centipede = [];
            this.mushrooms = [];
            this.particles = [];
            this.SEGMENT_SIZE = 20;
            this.centipedeSpeed = 2;

            this.boundKeyDown = this.handleKeyDown.bind(this);
            this.boundKeyUp = this.handleKeyUp.bind(this);
            
            // Input State
            this.input = { left: false, right: false, up: false, down: false, fire: false };
            
            this.init();
        }

        init() {
            window.addEventListener('keydown', this.boundKeyDown);
            window.addEventListener('keyup', this.boundKeyUp);
            
            if (window.GameUI) {
                window.GameUI.showStartScreen("CENTIPEDE", "Shoot the centipede!<br>Spiders and Fleas will attack.", () => this.startGame());
            } else {
                this.startGame();
            }
        }

        handleKeyDown(e) {
            if (!this.canvas) return;
            // Prevent Scroll
            if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) {
                e.preventDefault();
            }
            
            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (this.isGameRunning) this.togglePause();
                return;
            }

            if (!this.isGameRunning) return;
            if (this.isPaused) return;

            switch(e.code) {
                case 'ArrowUp': this.input.up = true; break;
                case 'ArrowDown': this.input.down = true; break;
                case 'ArrowLeft': this.input.left = true; break;
                case 'ArrowRight': this.input.right = true; break;
                case 'Space': 
                    if (!this.input.fire) {
                        this.input.fire = true;
                        this.fireBullet();
                    }
                    break;
            }
        }
        
        handleKeyUp(e) {
            switch(e.code) {
                case 'ArrowUp': this.input.up = false; break;
                case 'ArrowDown': this.input.down = false; break;
                case 'ArrowLeft': this.input.left = false; break;
                case 'ArrowRight': this.input.right = false; break;
                case 'Space': this.input.fire = false; break;
            }
        }

        togglePause() {
            this.isPaused = !this.isPaused;
            if (this.isPaused && window.GameUI) {
                window.GameUI.showPause(() => this.togglePause(), () => window.history.back());
            } else {
                if (window.GameUI) window.GameUI.hide();
                this.loop();
            }
        }

        startGame() {
            this.score = 0;
            this.isGameRunning = true;
            this.isPaused = false;
            
            if (window.GameUI) window.GameUI.hide();

            this.player.x = this.canvas.width / 2;
            this.player.y = this.canvas.height - 30;
            this.player.bullets = [];
            this.centipede = [];
            this.mushrooms = [];
            this.particles = [];

            // Difficulty
            this.difficulty = 1;
            this.centipedeSpeed = 3;

            // Create Centipede (12 segments)
            for (let i = 0; i < 12; i++) {
                this.centipede.push({
                    x: this.canvas.width / 2, // Start middle top
                    y: -i * this.SEGMENT_SIZE, 
                    dx: this.centipedeSpeed,
                    dy: 0,
                    width: this.SEGMENT_SIZE,
                    height: this.SEGMENT_SIZE,
                    active: true
                });
            }

            // Create Random Mushrooms
            for (let i = 0; i < 40; i++) {
                // Ensure aligned to grid
                let mx = Math.floor(Math.random() * (this.canvas.width / this.SEGMENT_SIZE)) * this.SEGMENT_SIZE;
                let my = Math.floor(Math.random() * ((this.canvas.height - 100) / this.SEGMENT_SIZE)) * this.SEGMENT_SIZE + this.SEGMENT_SIZE * 2;
                
                // Don't spawn on player
                if (my > this.canvas.height - 100 && Math.abs(mx - this.canvas.width/2) < 50) continue;
                
                this.mushrooms.push({
                    x: mx,
                    y: my,
                    width: this.SEGMENT_SIZE,
                    height: this.SEGMENT_SIZE,
                    health: 3
                });
            }

            if (this.animationId) cancelAnimationFrame(this.animationId);
            this.loop();
        }

        loop() {
            if (!document.getElementById('gameCanvas')) {
                window.removeEventListener('keydown', this.boundKeyDown);
                window.removeEventListener('keyup', this.boundKeyUp);
                return;
            }

            if (this.isGameRunning && !this.isPaused) {
                this.update();
                this.draw();
                this.animationId = requestAnimationFrame(() => this.loop());
            }
        }
        
        fireBullet() {
            // Limit on screen bullets
            if (this.player.bullets.length < 10) {
                 this.player.bullets.push({ 
                     x: this.player.x + this.player.width/2 - 2, 
                     y: this.player.y, 
                     width: 4, 
                     height: 8 
                 });
            }
        }
        
        createParticles(x, y, color) {
            for(let i=0; i<6; i++) {
                this.particles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 1.0,
                    color
                });
            }
        }

        update() {
             // Player Movement (Classic Centipede allows moving in a bottom box)
            const speed = 4;
            if (this.input.left) this.player.x -= speed;
            if (this.input.right) this.player.x += speed;
            if (this.input.up) this.player.y -= speed;
            if (this.input.down) this.player.y += speed;
            
            // Clamp Player to bottom area
            const playerZoneY = this.canvas.height - 150;
            if (this.player.y < playerZoneY) this.player.y = playerZoneY;
            if (this.player.y > this.canvas.height - this.player.height) this.player.y = this.canvas.height - this.player.height;
            if (this.player.x < 0) this.player.x = 0;
            if (this.player.x > this.canvas.width - this.player.width) this.player.x = this.canvas.width - this.player.width;

            // Bullets
            for (let i = 0; i < this.player.bullets.length; i++) {
                let b = this.player.bullets[i];
                b.y -= 12; // Fast bullets
                if (b.y < 0) {
                    this.player.bullets.splice(i, 1);
                    i--;
                    continue;
                }

                // Bullet vs Mushroom
                for (let j = 0; j < this.mushrooms.length; j++) {
                    let m = this.mushrooms[j];
                    if (this.rectIntersect(b, m)) {
                        this.player.bullets.splice(i, 1);
                        i--;
                        m.health--;
                        this.createParticles(m.x + 10, m.y + 10, '#f0f');
                        if (m.health <= 0) {
                            this.mushrooms.splice(j, 1);
                            this.score += 1;
                        }
                        break; 
                    }
                }
            }
            
            // Centipede Logic
            let activeSegments = 0;
            this.centipede.forEach(seg => {
                if (!seg.active) return;
                activeSegments++;
                
                // Move
                seg.x += seg.dx;
                
                // Collision with Walls/Mushrooms triggers dropping down and reversing
                let hit = false;
                if (seg.x < 0 || seg.x + seg.width > this.canvas.width) hit = true;
                else {
                    for (let m of this.mushrooms) {
                        if (this.rectIntersect(seg, m)) { hit = true; break; }
                    }
                }

                if (hit) {
                    seg.dx *= -1;
                    seg.y += this.SEGMENT_SIZE;
                    // Move out of collision to prevent sticking
                    seg.x += seg.dx; 
                    
                    // Kill player if it reaches bottom? Or looping?
                    // Classic: looping or staying at bottom.
                    if (seg.y > this.canvas.height - this.SEGMENT_SIZE) {
                        seg.y = this.canvas.height - this.SEGMENT_SIZE; // Stay at bottom
                        // Create new head here implies special logic
                    }
                }

                // Collision with Player
                if (this.rectIntersect(seg, this.player)) {
                    if(window.GameUI) window.GameUI.showGameOverScreen(this.score);
                    else this.gameOver(false); // Fallback
                }
            });

            // Bullet vs Centipede
            for(let bIdx = this.player.bullets.length - 1; bIdx >= 0; bIdx--) {
                let b = this.player.bullets[bIdx];
                let hitCentipede = false;
                
                for(let sIdx = this.centipede.length - 1; sIdx >= 0; sIdx--) {
                    let seg = this.centipede[sIdx];
                    if (!seg.active) continue;
                    
                    if (this.rectIntersect(b, seg)) {
                        seg.active = false; // "Split" logic is complex, deleting for now
                        this.createParticles(seg.x + 10, seg.y + 10, '#0f0');
                        
                        // Turn into mushroom
                        this.mushrooms.push({
                            x: Math.round(seg.x / this.SEGMENT_SIZE) * this.SEGMENT_SIZE,
                            y: Math.round(seg.y / this.SEGMENT_SIZE) * this.SEGMENT_SIZE,
                            width: this.SEGMENT_SIZE,
                            height: this.SEGMENT_SIZE,
                            health: 3 // Full health obstacle
                        });
                        
                        this.player.bullets.splice(bIdx, 1);
                        this.score += 10;
                        hitCentipede = true;
                        break; 
                    }
                }
                if(hitCentipede) continue; 
            }
            
            // Particles
            for(let i=this.particles.length-1; i>=0; i--) {
                let p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.05;
                if(p.life <= 0) this.particles.splice(i, 1);
            }

            if (activeSegments === 0) {
                // Respawn Centipede
                this.score += 100;
                this.difficulty++;
                this.centipedeSpeed += 0.5;
                
                // Heal mushrooms
                this.mushrooms.forEach(m => m.health = 3);
                
                // Add new centipede
                for (let i = 0; i < 12; i++) {
                    this.centipede.push({
                        x: this.canvas.width / 2, 
                        y: -i * this.SEGMENT_SIZE - 20, // Start above screen
                        dx: this.centipedeSpeed,
                        dy: 0,
                        width: this.SEGMENT_SIZE,
                        height: this.SEGMENT_SIZE,
                        active: true
                    });
                }
            }
        }
        
        rectIntersect(r1, r2) {
            return !(r2.x > r1.x + r1.width || 
                     r2.x + r2.width < r1.x || 
                     r2.y > r1.y + r1.height || 
                     r2.y + r2.height < r1.y);
        }

        draw() {
            if (!this.ctx) return;
            
            // BG
            this.ctx.fillStyle = '#050510'; 
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Mushrooms (Neon Purple/Pink)
            this.mushrooms.forEach(m => {
                let color = '#ff00ff';
                if (m.health === 2) color = '#cc00cc';
                else if (m.health === 1) color = '#990099';
                
                this.ctx.shadowBlur = 5;
                this.ctx.shadowColor = color;
                this.ctx.fillStyle = color;
                
                // Mushroom Shape
                this.ctx.beginPath();
                this.ctx.arc(m.x + 10, m.y + 8, 8, Math.PI, 0); // Top cap
                this.ctx.fillRect(m.x + 2, m.y + 8, 16, 4); // Rim
                this.ctx.fillRect(m.x + 8, m.y + 8, 4, 10); // Stem
                this.ctx.fill();
            });

            // Centipede (Neon Green)
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#00ff00';
            this.centipede.forEach((seg, index) => {
                if(!seg.active) return;
                
                this.ctx.fillStyle = '#00ff00';
                // Head is brighter
                // this.ctx.fillStyle = (index === 0) ? '#55ff55' : '#00cc00'; 
                // Segments index is misleading as they die, but that's fine for visceral look
                
                this.ctx.beginPath();
                this.ctx.arc(seg.x + 10, seg.y + 10, 9, 0, Math.PI*2);
                this.ctx.fill();
                
                // Legs
                const time = Date.now();
                if (Math.floor(time/100)%2===0) {
                     this.ctx.fillRect(seg.x, seg.y+14, 4, 4);
                     this.ctx.fillRect(seg.x+16, seg.y+14, 4, 4);
                } else {
                     this.ctx.fillRect(seg.x-2, seg.y+8, 4, 4);
                     this.ctx.fillRect(seg.x+18, seg.y+8, 4, 4);
                }
            });

            // Player (Neon Cyan)
            this.ctx.shadowColor = '#00ffff';
            this.ctx.fillStyle = '#00ffff';
            let px = this.player.x;
            let py = this.player.y;
            
            this.ctx.beginPath();
            this.ctx.moveTo(px + 10, py);
            this.ctx.lineTo(px + 20, py + 20);
            this.ctx.lineTo(px + 10, py + 15);
            this.ctx.lineTo(px, py + 20);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.shadowBlur = 0;
            
            // Particles
            this.particles.forEach(p => {
                this.ctx.globalAlpha = p.life;
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(p.x, p.y, 3, 3);
            });
            this.ctx.globalAlpha = 1.0;

            // Bullets
            this.ctx.fillStyle = '#fff';
            this.player.bullets.forEach(b => {
                this.ctx.fillRect(b.x, b.y, b.width, b.height);
            });
            
            // HUD
            this.ctx.fillStyle = '#fff';
            this.ctx.font = "20px 'Courier New', monospace";
            this.ctx.fillText(`SCORE: ${this.score}`, 10, 25);
        }
        
        gameOver(win) {
             this.isGameRunning = false;
             if(this.animationId) cancelAnimationFrame(this.animationId);
             
             if (window.GameUI) {
                 window.GameUI.showGameOver(this.score, () => this.startGame(), () => window.history.back(), "GAME OVER");
             }
        }
    }

    new CentipedeGame();

})();
