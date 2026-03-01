/*
 * NEON KONG
 * A neon-industrial platformer.
 * Features:
 * - Glowing girders and ladders
 * - Particle fire effects
 * - Integrated GameUI
 */

(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    // Focus
    canvas.setAttribute('tabindex', '0');
    canvas.focus();
    
    const ctx = canvas.getContext('2d');
    
    // Resize for consistent retro aspect-ratio logic
    // But we'll trust the CSS size essentially
    
    const CONFIG = {
        gravity: 0.5,
        jumpForce: 9, 
        moveSpeed: 3,
        colors: {
            bg: '#050510',
            girder: '#ff0055', // Neon Red/Pink
            ladder: '#00ccff', // Neon Cyan
            player: '#00ff00', // Neon Green
            barrel: '#ffaa00', // Neon Orange
            fire: '#ff5500'    // Neon Fire
        }
    };

    // --- Particle System ---
    let Particles = [];
    function createFire(x, y) {
        Particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -Math.random() * 2 - 1,
            life: Math.random() * 20 + 10,
            maxLife: 30,
            color: Math.random() > 0.5 ? '#ff5500' : '#ffff00',
            size: Math.random() * 3 + 1
        });
    }

    function updateParticles() {
        for(let i=Particles.length-1; i>=0; i--) {
            let p = Particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.size *= 0.9;
            if (p.life <= 0) Particles.splice(i, 1);
        }
    }

    function drawParticles(ctx) {
        ctx.save();
        Particles.forEach(p => {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.restore();
    }

    class KongGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = ctx;

            this.score = 0;
            this.highScore = localStorage.getItem('kongHighScore') || 0;
            this.isGameOver = false;
            this.isPaused = false;
            this.animationId = null;
            this.difficulty = 1;
            this.barrelTimer = 0;
            this.barrelInterval = 120; // frames

            this.player = {
                x: 50,
                y: this.canvas.height - 40,
                width: 20,
                height: 30,
                dx: 0,
                dy: 0,
                grounded: false,
                climbing: false,
                frame: 0,
                dir: 1
            };

            // Level Layout
            this.platforms = [];
            this.ladders = [];
            this.barrels = [];
            this.oilDrums = []; // For fire
            
            this.initLevel();

            this.handleInput = this.handleInput.bind(this);
            this.handleKeyUp = this.handleKeyUp.bind(this);
            
            this.init();
        }

        init() {
            document.addEventListener('keydown', this.handleInput);
            document.addEventListener('keyup', this.handleKeyUp);
            
             if (window.GameUI) {
                window.GameUI.init(this.canvas, {
                    onStart: () => this.startGame(),
                    onPause: () => this.togglePause(),
                    onRestart: () => this.startGame()
                });
                window.GameUI.showStartScreen();
            } else {
                this.startGame();
            }
        }
        
        initLevel() {
            const w = this.canvas.width;
            const h = this.canvas.height;
            const floorH = 15;
            
            this.platforms = [
                { x: 0, y: h - 20, w: w, h: floorH, tilt: 0 }, // Bottom
                { x: 0, y: h - 100, w: w - 50, h: floorH, tilt: 2 }, // 1 (tilted right down)
                { x: 50, y: h - 180, w: w - 50, h: floorH, tilt: -2 }, // 2
                { x: 0, y: h - 260, w: w - 50, h: floorH, tilt: 2 }, // 3
                { x: 50, y: h - 340, w: w - 50, h: floorH, tilt: -2 }, // 4
                { x: 0, y: h - 420, w: w - 50, h: floorH, tilt: 2 }, // 5
                { x: w/2 - 60, y: 80, w: 120, h: floorH, tilt: 0 } // Top Goal
            ];

            this.ladders = [
                { x: w - 80, y: h - 100, h: 80 },
                { x: 80, y: h - 180, h: 80 },
                { x: w - 80, y: h - 260, h: 80 },
                { x: 80, y: h - 340, h: 80 },
                { x: w - 80, y: h - 420, h: 80 },
                { x: 80, y: h - 420, h: 80 },
                { x: w/2 - 20, y: 80, h: h - 420 - 80 } // To Princess
            ];
            
            // Add an oil drum fire at bottom left
            this.oilDrums = [ {x: 40, y: h - 20 } ];
        }

        startGame() {
            this.isGameOver = false;
            this.isPaused = false;
            this.score = 0;
            this.barrelTimer = 0;
            this.barrels = [];
            Particles = [];
            
            // Reset Player
            this.player.x = 20;
            this.player.y = this.canvas.height - 50;
            this.player.dx = 0;
            this.player.dy = 0;
            
            if (window.GameUI) {
                window.GameUI.updateScore(0);
                window.GameUI.hideStartScreen();
                window.GameUI.hideGameOverScreen();
                window.GameUI.hidePauseScreen();
            }

            if (this.animationId) cancelAnimationFrame(this.animationId);
            this.loop();
        }

        togglePause() {
            if (this.isGameOver) return;
            this.isPaused = !this.isPaused;
            if (this.isPaused) {
                if (window.GameUI) window.GameUI.showPauseScreen();
            } else {
                if (window.GameUI) window.GameUI.hidePauseScreen();
                this.loop();
            }
        }
        
        handleInput(e) {
            if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) {
                e.preventDefault();
            }

            if(this.isGameOver) {
                if(e.code === 'Space') this.startGame();
                return; 
            }
            if(this.isPaused) {
                if(e.code === 'Space') this.togglePause();
                return;
            }

            switch(e.code) {
                case 'ArrowLeft': 
                    this.player.dx = -CONFIG.moveSpeed; 
                    this.player.dir = -1;
                    break;
                case 'ArrowRight': 
                    this.player.dx = CONFIG.moveSpeed; 
                    this.player.dir = 1;
                    break;
                case 'ArrowUp':
                    if (this.onLadder() && !this.player.climbing) {
                        this.player.climbing = true;
                        this.player.x = this.getClosestLadder().x - this.player.width/2; // Snap
                    }
                    if (this.player.climbing) this.player.dy = -2;
                    break;
                case 'ArrowDown':
                     if (this.player.climbing) this.player.dy = 2;
                     break;
                case 'Space':
                    if (this.player.grounded && !this.player.climbing) {
                        this.player.dy = -CONFIG.jumpForce;
                        this.player.grounded = false;
                    }
                    break;
                case 'KeyP': this.togglePause(); break;
            }
        }
        
        handleKeyUp(e) {
             if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') this.player.dx = 0;
             if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
                 if (this.player.climbing) this.player.dy = 0;
             }
        }
        
        onLadder() {
            // Check intersection with any ladder
            const px = this.player.x + this.player.width/2;
            const py = this.player.y + this.player.height; // Feet
            return this.ladders.some(l => 
                px > l.x - 10 && px < l.x + 10 && // X align
                py >= l.y && py <= l.y + l.h + 5 // Y Range
            );
        }
        
        getClosestLadder() {
            const px = this.player.x + this.player.width/2;
            const py = this.player.y + this.player.height;
            return this.ladders.find(l => 
                px > l.x - 10 && px < l.x + 20 && 
                py >= l.y && py <= l.y + l.h + 5
            );
        }

        update() {
            // Spawn Barrels
            this.barrelTimer++;
            if (this.barrelTimer > this.barrelInterval) {
                this.barrelTimer = 0;
                this.spawnBarrel();
            }
            
            // Fire Particles
            if (this.barrelTimer % 5 === 0) {
                 this.oilDrums.forEach(d => createFire(d.x, d.y));
            }
            updateParticles();

            // Player Physics
            if (this.player.climbing) {
                this.player.y += this.player.dy;
                this.player.dx = 0; // No horizontal move on ladder
                
                // Check if off ladder
                if (!this.onLadder()) {
                    this.player.climbing = false;
                    // Boost up slightly to land?
                }
            } else {
                this.player.dy += CONFIG.gravity;
                this.player.x += this.player.dx;
                this.player.y += this.player.dy;
            }

            // Platform Collision
            this.player.grounded = false;
            if (!this.player.climbing) {
                this.platforms.forEach(p => {
                    // Simple Box Collision for Logic
                    // Visuals are tilted, logic is flat(ish) or we adapt y?
                    // Let's adapt Y intersection based on tilt
                    
                    if (this.player.x + this.player.width > p.x && this.player.x < p.x + p.w) {
                        // Calculate platform height at player center X
                        const px = this.player.x + this.player.width/2;
                        const relX = px - p.x;
                        const tiltY = (relX / p.w) * (p.tilt * (p.w/100)); // Rough tilt calc seems complex for arcade logic
                        // Let's stick to flat physics for simplicity, draw tilted? 
                        // Actually flat is better for classic feel. 
                    
                        if (this.player.y + this.player.height > p.y && 
                            this.player.y + this.player.height < p.y + p.h + 10 && 
                            this.player.dy >= 0) {
                            
                            this.player.grounded = true;
                            this.player.dy = 0;
                            this.player.y = p.y - this.player.height;
                        }
                    }
                });
            }

            if (this.player.x < 0) this.player.x = 0;
            if (this.player.x + this.player.width > this.canvas.width) this.player.x = this.canvas.width - this.player.width;
            
            // Win condition
            if (this.player.y < 80 && this.player.x > this.canvas.width/2 - 20 && this.player.x < this.canvas.width/2 + 20) {
                this.endGame(true);
            }
            
            if (this.player.y > this.canvas.height) this.die();

            // Barrels Update
            for (let i = this.barrels.length - 1; i >= 0; i--) {
                let b = this.barrels[i];
                b.dy += CONFIG.gravity;
                b.x += b.dx;
                b.y += b.dy;
                
                // Platform Collision for barrels
                this.platforms.forEach(p => {
                     if (b.x > p.x && b.x < p.x + p.w &&
                        b.y + b.r > p.y && b.y + b.r < p.y + p.h + 10 &&
                        b.dy >= 0) {
                        
                        b.dy = 0;
                        b.y = p.y - b.r;
                    }
                });
                
                // Change direction at screen edges
                if (b.x < 0 || b.x > this.canvas.width) {
                    b.dx *= -1;
                    // Drop down a bit if floating? 
                }
                
                // Player Collision
                const dx = (this.player.x + this.player.width/2) - b.x;
                const dy = (this.player.y + this.player.height/2) - b.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < b.r + 10) {
                    this.die();
                }
                
                if (b.y > this.canvas.height) {
                    this.barrels.splice(i, 1);
                    this.score += 100;
                    if (window.GameUI) window.GameUI.updateScore(this.score);
                }
            }
        }
        
        spawnBarrel() {
            this.barrels.push({
                x: 80,
                y: 120, // Start near top left/center
                r: 10,
                dx: 2,
                dy: 0,
                angle: 0
            });
        }
        
        die() {
            this.isGameOver = true;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('kongHighScore', this.highScore);
            }
            if (window.GameUI) window.GameUI.showGameOverScreen(this.score, this.highScore);
        }
        
        endGame(win) {
             this.score += 5000;
             this.die(); // Treat as win for now
        }

        loop() {
            if (this.isPaused) return;

            this.update();
            this.draw();
            
            if (!this.isGameOver) {
                this.animationId = requestAnimationFrame(() => this.loop());
            } else {
                 if(Particles.length > 0) {
                    // Keep fire burning
                    updateParticles();
                    this.draw();
                    this.animationId = requestAnimationFrame(() => this.loop());
                 }
            }
        }

        draw() {
            // Background
            this.ctx.fillStyle = CONFIG.colors.bg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw Ladders
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = CONFIG.colors.ladder;
            this.ctx.fillStyle = CONFIG.colors.ladder;
            this.ladders.forEach(l => {
                // Rails
                this.ctx.fillRect(l.x - 10, l.y, 2, l.h);
                this.ctx.fillRect(l.x + 10, l.y, 2, l.h);
                // Rungs
                for(let y = l.y; y < l.y + l.h; y+=10) {
                    this.ctx.fillRect(l.x - 10, y, 22, 2);
                }
            });
            this.ctx.shadowBlur = 0;

            // Draw Platforms
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = CONFIG.colors.girder;
            this.ctx.strokeStyle = CONFIG.colors.girder;
            this.ctx.lineWidth = 2;
            
            this.platforms.forEach(p => {
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x + p.w, p.y + (p.tilt || 0)*2); // Visual tilt
                this.ctx.lineTo(p.x + p.w, p.y + p.h + (p.tilt || 0)*2);
                this.ctx.lineTo(p.x, p.y + p.h);
                this.ctx.closePath();
                this.ctx.stroke();
                
                // Cross trusses
                this.ctx.beginPath();
                for(let x = p.x; x < p.x + p.w; x+=20) {
                    this.ctx.moveTo(x, p.y);
                    this.ctx.lineTo(x+10, p.y + p.h);
                    this.ctx.lineTo(x+20, p.y);
                }
                this.ctx.stroke();
            });
            this.ctx.shadowBlur = 0;
            
            // Draw Oil Drum
            this.oilDrums.forEach(d => {
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(d.x - 10, d.y - 20, 20, 20);
                this.ctx.fillStyle = CONFIG.colors.fire;
                this.ctx.fillText("OIL", d.x - 8, d.y - 8);
            });
            drawParticles(this.ctx);

            // Draw Kong
            const kx = 40, ky = 60;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#fff';
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            // Abstract neon ape shape
            this.ctx.moveTo(kx, ky);
            this.ctx.lineTo(kx+20, ky-20);
            this.ctx.lineTo(kx+40, ky); // Head
            this.ctx.lineTo(kx+60, ky+40); // Arm R
            this.ctx.moveTo(kx+40, ky);
            this.ctx.lineTo(kx, ky+40); // Body
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            // Draw Player
            this.ctx.fillStyle = CONFIG.colors.player;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = CONFIG.colors.player;
            this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
            this.ctx.shadowBlur = 0;
            
            // Draw Barrels
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = CONFIG.colors.barrel;
            this.ctx.fillStyle = CONFIG.colors.barrel;
            this.barrels.forEach(b => {
                this.ctx.save();
                this.ctx.translate(b.x, b.y);
                b.angle += b.dx * 0.1;
                this.ctx.rotate(b.angle);
                
                this.ctx.beginPath();
                this.ctx.arc(0, 0, b.r, 0, Math.PI*2);
                this.ctx.fill();
                // Spoke
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(-b.r, -2, b.r*2, 4);
                this.ctx.restore();
            });
            this.ctx.shadowBlur = 0;
        }
    }
    
    new KongGame();
})();
