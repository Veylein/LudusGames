{
class KongGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) return; // Guard

        this.ctx = this.canvas.getContext('2d');
        // Explicit size for consistent levels
        this.canvas.width = 600; 
        this.canvas.height = 600; // Taller for more floors

        this.scoreEl = document.getElementById('game-score');
        this.gameOverScreen = document.getElementById('gameOver');
        this.finalScoreEl = document.getElementById('final-score');
        
        // Pause UI
        this.pauseBtn = document.getElementById('pause-btn');
        if(this.pauseBtn) {
            this.pauseBtn.onclick = () => this.togglePause();
        }

        this.score = 0;
        this.isGameOver = false;
        this.isPaused = false;
        this.animationId = null;
        this.difficulty = 1;
        this.barrelInterval = null;

        // Player
        this.player = {
            x: 50,
            y: this.canvas.height - 40,
            width: 20,
            height: 30,
            dx: 0,
            dy: 0,
            speed: 3,
            jumpForce: 7, 
            grounded: false
        };

        // Platforms (More levels, zig-zag)
        this.platforms = [
            { x: 0, y: this.canvas.height - 10, width: this.canvas.width, height: 10 }, // Floor 1
            { x: 0, y: this.canvas.height - 80, width: this.canvas.width - 60, height: 10 }, // Floor 2 (Left)
            { x: 60, y: this.canvas.height - 150, width: this.canvas.width - 60, height: 10 }, // Floor 3 (Right)
            { x: 0, y: this.canvas.height - 220, width: this.canvas.width - 60, height: 10 }, // Floor 4 (Left)
            { x: 60, y: this.canvas.height - 290, width: this.canvas.width - 60, height: 10 }, // Floor 5 (Right)
            { x: 0, y: this.canvas.height - 360, width: this.canvas.width - 60, height: 10 }, // Floor 6 (Left)
            { x: 60, y: this.canvas.height - 430, width: this.canvas.width - 60, height: 10 }, // Floor 7 (Right)
            { x: this.canvas.width/2 - 50, y: 50, width: 100, height: 10 } // Top Goal
        ];

        this.ladders = [
            { x: this.canvas.width - 80, y: this.canvas.height - 80, height: 70 },
            { x: 80, y: this.canvas.height - 150, height: 70 },
            { x: this.canvas.width - 80, y: this.canvas.height - 220, height: 70 },
            { x: 80, y: this.canvas.height - 290, height: 70 },
            { x: this.canvas.width - 80, y: this.canvas.height - 360, height: 70 },
            { x: 80, y: this.canvas.height - 430, height: 70 },
            { x: this.canvas.width/2, y: 50, height: (this.canvas.height - 430) - 50 } // Top ladder
        ];

        this.barrels = [];

        // Input Bindings
        this.handleKeyDown = (e) => {
            if (!this.canvas) return;
            if (e.key === 'ArrowLeft') this.player.dx = -this.player.speed;
            if (e.key === 'ArrowRight') this.player.dx = this.player.speed;
            if (e.code === 'Space' && this.player.grounded) {
                this.player.dy = -this.player.jumpForce;
                this.player.grounded = false;
            }
            if (e.code === 'Space' && this.isGameOver) {
                this.startGame();
            }
        };

        this.handleKeyUp = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.player.dx = 0;
        };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        
        this.startGame();
    }

    togglePause() {
        if (this.isGameOver) return;
        this.isPaused = !this.isPaused;
        if(this.pauseBtn) this.pauseBtn.innerText = this.isPaused ? "RESUME" : "PAUSE";
        if (!this.isPaused) this.loop();
    }

    startGame() {
        this.score = 0;
        this.isGameOver = false;
        this.isPaused = false;
        if(this.pauseBtn) this.pauseBtn.innerText = "PAUSE";

        this.player.x = 50;
        this.player.y = this.canvas.height - 40;
        this.player.dx = 0;
        this.player.dy = 0;
        this.barrels = [];
        if(this.scoreEl) this.scoreEl.innerText = this.score;
        if(this.gameOverScreen) this.gameOverScreen.style.display = 'none';

        // Difficulty
        this.difficulty = parseInt(localStorage.getItem("difficulty") || "0");
        
        // Spawn barrels periodically
        if (this.barrelInterval) clearInterval(this.barrelInterval);
        this.barrelInterval = setInterval(() => this.spawnBarrel(), this.difficulty === 0 ? 3000 : (this.difficulty === 1 ? 2000 : 1000));

        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.loop();
    }

    spawnBarrel() {
        if (this.isGameOver || this.isPaused) return;
        // Don't spawn if not on page
        if (!document.getElementById('gameCanvas')) return;

        this.barrels.push({
            x: 20, 
            y: 80, 
            r: 10, 
            dx: 2, 
            dy: 0
        });
    }

    loop() {
        // DOM Check
        if (!document.getElementById('gameCanvas')) {
             if (this.barrelInterval) clearInterval(this.barrelInterval);
             window.removeEventListener('keydown', this.handleKeyDown);
             window.removeEventListener('keyup', this.handleKeyUp);
             return;
        }

        if (this.isGameOver) return;
        if (this.isPaused) return;

        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    update() {
        // Player Physics
        this.player.dy += 0.5; // Gravity
        this.player.x += this.player.dx;
        this.player.y += this.player.dy;

        // Platform Collision
        this.player.grounded = false;
        this.platforms.forEach(p => {
            if (this.player.x + this.player.width > p.x && this.player.x < p.x + p.width &&
                this.player.y + this.player.height > p.y && this.player.y + this.player.height < p.y + p.height + 5 &&
                this.player.dy >= 0) {
                
                this.player.grounded = true;
                this.player.dy = 0;
                this.player.y = p.y - this.player.height;
            }
        });

        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.canvas.width) this.player.x = this.canvas.width - this.player.width;
        if (this.player.y > this.canvas.height) this.endGame(false);

        // Goal
        if (this.player.y < 100 && this.player.x > 150 && this.player.x < 250) {
            this.endGame(true);
        }

        // Barrels Update
        this.barrels.forEach((b, i) => {
            b.x += b.dx;
            b.dy += 0.5;
            b.y += b.dy;

            // Platform Collision for barrels
            let onPlatform = false;
            this.platforms.forEach(p => {
                 if (b.x > p.x && b.x < p.x + p.width &&
                    b.y + b.r > p.y && b.y + b.r < p.y + p.height + 5 &&
                    b.dy >= 0) {
                    
                    b.dy = 0;
                    b.y = p.y - b.r;
                    onPlatform = true;
                }
            });

            // Edge turn
            if (b.x > this.canvas.width || b.x < 0) {
                 b.dx *= -1; // Bounce off walls? Or fall off platform?
                 // Simple: bounce
            }
            
            // Player Collision
            // AABB with Circle aprox
            // Check center distance
            const px = this.player.x + this.player.width/2;
            const py = this.player.y + this.player.height/2;
            const dist = Math.sqrt((px - b.x)**2 + (py - b.y)**2);
            
            if (dist < b.r + 10) { // 10 is approx half player width
                this.endGame(false);
            }

            // Clean up
            if (b.y > this.canvas.height) {
                this.barrels.splice(i, 1);
                this.score += 100;
                if(this.scoreEl) this.scoreEl.innerText = this.score;
            }
        });
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); // Background

        // Draw Ladders
        this.ctx.fillStyle = '#00bcd4'; // Cyan
        this.ladders.forEach(l => {
            for(let yh = l.y; yh < l.y + l.height; yh += 4) {
                this.ctx.fillRect(l.x, yh, 4, 2); // Left rail
                this.ctx.fillRect(l.x + 16, yh, 4, 2); // Right rail
                if ((yh - l.y) % 8 === 0) this.ctx.fillRect(l.x, yh, 20, 2); // Rung
            }
        });

        // Draw Platforms (Girders)
        this.platforms.forEach(p => {
            this.ctx.fillStyle = '#d32f2f'; // Red Girder
            this.ctx.fillRect(p.x, p.y, p.width, p.height);
            
            this.ctx.fillStyle = '#000';
            // Girder Holes (Pixel pattern)
            for(let i = 2; i < p.width - 2; i+=8) {
                this.ctx.fillRect(p.x + i, p.y + 2, 4, p.height - 4);
            }
            
            // Outline
            // this.ctx.strokeStyle = '#d32f2f';
            // this.ctx.strokeRect(p.x, p.y, p.width, p.height);
        });

        // Draw Kong (Pixel Art) - Fixed position at top left
        let kx = 50; 
        let ky = 70;
        
        // Body Brown
        this.ctx.fillStyle = '#5d4037'; 
        this.ctx.fillRect(kx, ky, 50, 50);
        // Chest
        this.ctx.fillStyle = '#ffa000'; 
        this.ctx.fillRect(kx+10, ky+10, 30, 20);
        // Face
        this.ctx.fillStyle = '#ffa000'; 
        this.ctx.fillRect(kx+15, ky-10, 20, 15); // Head
        this.ctx.fillStyle = '#000'; // Eyes
        this.ctx.fillRect(kx+18, ky-6, 4, 2);
        this.ctx.fillRect(kx+28, ky-6, 4, 2);
        // Mouth (Teeth)
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(kx+18, ky-2, 14, 4);

        // Arms
        this.ctx.fillStyle = '#5d4037';
        if (Math.floor(Date.now() / 500) % 2 === 0) {
            // Chest Pound
            this.ctx.fillRect(kx-10, ky+5, 15, 30); // L
            this.ctx.fillRect(kx+45, ky+5, 15, 30); // R
        } else {
            // Arms Up
            this.ctx.fillRect(kx-10, ky-15, 15, 30); 
            this.ctx.fillRect(kx+45, ky-15, 15, 30);
        }
        
        // Draw Princess (Pink)
        this.ctx.fillStyle = '#ff80ab';
        let px = 20, py = 40; // Top platform usually
        this.ctx.fillRect(px, py, 10, 20); // Dress
        this.ctx.fillStyle = '#ffcc80'; // Skin
        this.ctx.fillRect(px+2, py-6, 6, 6); // Head
        this.ctx.fillStyle = '#ffd700'; // Hair
        this.ctx.fillRect(px, py-6, 10, 4);

        // Draw Player (Mario Sprite)
        // Running Animation Frames
        const runFrame = Math.floor(Date.now() / 100) % 2;
        const mx = this.player.x;
        const my = this.player.y;
        
        // Jumpman Colors
        const mRed = '#d50000';
        const mBlue = '#2962ff';
        const mSkin = '#ffcc80';
        
        // Hat
        this.ctx.fillStyle = mRed;
        this.ctx.fillRect(mx + 2, my, 12, 4);
        // Head
        this.ctx.fillStyle = mSkin;
        this.ctx.fillRect(mx + 4, my + 4, 10, 6);
        // Eye/Stache
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(mx + 10, my + 5, 2, 2); // Eye
        this.ctx.fillRect(mx + 8, my + 8, 8, 2); // Stache
        
        // Body (Overalls Blue, Shirt Red)
        // Shirt
        this.ctx.fillStyle = mBlue;
        this.ctx.fillRect(mx + 4, my + 10, 8, 10); // Body
        // Arms (Red)
        this.ctx.fillStyle = mRed;
        if (runFrame === 0 || !this.player.dx) {
             this.ctx.fillRect(mx, my + 12, 4, 4); // L
             this.ctx.fillRect(mx + 12, my + 12, 4, 4); // R
        } else {
             this.ctx.fillRect(mx - 2, my + 10, 4, 4); // L Swing
             this.ctx.fillRect(mx + 14, my + 10, 4, 4); // R Swing
        }
        
        // Legs (Blue)
        this.ctx.fillStyle = mBlue;
        if (this.player.grounded) {
            if (runFrame === 0 || Math.abs(this.player.dx) < 0.1) {
                this.ctx.fillRect(mx + 4, my + 20, 4, 4);
                this.ctx.fillRect(mx + 10, my + 20, 4, 4);
            } else {
                this.ctx.fillRect(mx + 2, my + 18, 4, 4); // Run stride
                this.ctx.fillRect(mx + 12, my + 18, 4, 4);
            }
        } else {
            // Jump pose
            this.ctx.fillRect(mx, my + 18, 6, 4);
            this.ctx.fillRect(mx + 12, my + 16, 6, 4);
        }
        
        // Draw Barrels (Rolling Sprite)
        // Brown cylinder with hoops
        const bColor = '#795548';
        const hoopColor = '#000';
        
        this.barrels.forEach(b => {
            this.ctx.save();
            this.ctx.translate(b.x, b.y);
            this.ctx.rotate(b.x / 15);
            
            this.ctx.fillStyle = bColor;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, b.r, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Hoops
            this.ctx.fillStyle = hoopColor;
            // Draw centered rects for hoops, rotated
            this.ctx.fillRect(-b.r, -4, b.r*2, 2);
            this.ctx.fillRect(-b.r, 2, b.r*2, 2);
            
            // Rolling detail "L" or skull?
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px Arial';
            this.ctx.fillText("XX", -6, 2);
            
            this.ctx.restore();
        });
    }

    endGame(win) {
        this.isGameOver = true;
        if (this.barrelInterval) clearInterval(this.barrelInterval);
        
        if (this.finalScoreEl) this.finalScoreEl.innerText = this.score;
        
        const h2 = document.querySelector('#gameOver h2');
        if (h2) h2.innerText = win ? "REACHED TOP!" : "GAME OVER";
        
        if (this.gameOverScreen) this.gameOverScreen.style.display = 'block';
    }
}

if (document.getElementById('gameCanvas')) {
    new KongGame();
}
}
