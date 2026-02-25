{
class InvadersGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) return; // Guard

        this.ctx = this.canvas.getContext('2d');
        this.scoreEl = document.getElementById('game-score');
        this.gameOverScreen = document.getElementById('gameOver');
        this.finalScoreEl = document.getElementById('final-score');

        this.score = 0;
        this.isGameOver = false;
        this.isPaused = false;
        this.animationId = null;
        this.difficulty = 2;

        // Player
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 30,
            width: 30,
            height: 20,
            dx: 0, 
            speed: 5,
            bullets: []
        };

        // Aliens
        this.aliens = [];
        this.rows = 4;
        this.cols = 8;
        this.alienDirection = 1;
        this.alienSpeed = 1;

        // Pause Button
        this.pauseBtn = document.getElementById('pause-btn');
        if(this.pauseBtn) {
            // Remove old listener if any (cleaner to just use new bound function)
            this.pauseBtn.onclick = () => this.togglePause();
        }
        
        // Input Handling
        this.handleKeyDown = (e) => {
            if (!document.getElementById('gameCanvas')) return; // check existence
            
            if (e.key === 'ArrowLeft') this.input.left = true;
            if (e.key === 'ArrowRight') this.input.right = true;
            if (e.code === 'Space') {
                if (this.isGameOver) this.startGame();
                else if (!this.isPaused && this.player.bullets.length < 3) {
                     this.player.bullets.push({x: this.player.x + this.player.width/2 - 2, y: this.player.y, width: 4, height: 10, speed: 7});
                }
            }
        };
        
        this.handleKeyUp = (e) => {
             if (e.key === 'ArrowLeft') this.input.left = false;
             if (e.key === 'ArrowRight') this.input.right = false;
        };
        
        this.input = { left: false, right: false };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        
        this.startGame();
    }

    togglePause() {
        if (this.isGameOver) return;
        this.isPaused = !this.isPaused;
        if (this.pauseBtn) this.pauseBtn.innerText = this.isPaused ? 'RESUME' : 'PAUSE';
        if (!this.isPaused) this.loop();
    }

    startGame() {
        this.score = 0;
        this.isGameOver = false;
        this.isPaused = false;
        if(this.pauseBtn) this.pauseBtn.innerText = 'PAUSE';
        
        this.player.x = this.canvas.width / 2;
        this.player.bullets = [];
        this.aliens = [];
        if(this.scoreEl) this.scoreEl.innerText = this.score;
        if(this.gameOverScreen) this.gameOverScreen.style.display = 'none';

        // Difficulty
        this.difficulty = parseInt(localStorage.getItem("difficulty") || "0");
        if (this.difficulty === 0) this.alienSpeed = 0.5;
        else if (this.difficulty === 1) this.alienSpeed = 1;
        else this.alienSpeed = 2;

        // Create Aliens
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.aliens.push({
                    x: 50 + c * 50,
                    y: 30 + r * 40,
                    width: 30,
                    height: 20,
                    active: true,
                    type: r === 0 ? 'top' : (r < 3 ? 'mid' : 'bot')
                });
            }
        }

        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.loop();
    }

    loop() {
        if (!document.getElementById('gameCanvas')) {
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
        // Player Move
        if (this.input.left) this.player.x -= this.player.speed;
        if (this.input.right) this.player.x += this.player.speed;
        
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.canvas.width) this.player.x = this.canvas.width - this.player.width;

        // Bullets Move
        for (let i = 0; i < this.player.bullets.length; i++) {
            let b = this.player.bullets[i];
            b.y -= b.speed;
            if (b.y < 0) {
                this.player.bullets.splice(i, 1);
                i--;
            }
        }

        // Aliens Move
        let edgeHit = false;
        this.aliens.forEach(a => {
            if (!a.active) return;
            a.x += this.alienSpeed * this.alienDirection;
            if (a.x <= 0 || a.x + a.width >= this.canvas.width) {
                edgeHit = true;
            }
        });

        if (edgeHit) {
            this.alienDirection *= -1;
            this.aliens.forEach(a => {
                a.y += 20; // Move down
                if (a.y + a.height >= this.player.y) this.endGame(); // Hit player line
            });
        }

        // Alien Shooting (Randomly)
        if (Math.random() < 0.005 * (this.difficulty + 1)) {
            // Find a random active alien to shoot
            // Not implemented fully in original, keeping it minimal
        }

        // Collisions Player Bullet -> Alien
        this.player.bullets.forEach((b, bIdx) => {
            let hit = false;
            for (let a of this.aliens) {
                if (!a.active) continue;
                if (b.x > a.x && b.x < a.x + a.width && b.y > a.y && b.y < a.y + a.height) {
                    a.active = false;
                    hit = true;
                    this.score += 10;
                    if(this.scoreEl) this.scoreEl.innerText = this.score;
                    
                    // Speed up as aliens die
                    // this.alienSpeed *= 1.02; // Accumulates too fast?
                    break; 
                }
            }
            if (hit) {
                this.player.bullets.splice(bIdx, 1);
            }
        });

        if (this.aliens.filter(a => a.active).length === 0) {
            this.endGame(true);
        }
    }

    draw() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); 

        // Draw Player (Green Cannon)
        this.ctx.fillStyle = '#00ff00';
        const px = this.player.x;
        const py = this.player.y;
        // Base
        this.ctx.fillRect(px, py + 12, 30, 8);
        // Mid
        this.ctx.fillRect(px + 2, py + 8, 26, 4);
        this.ctx.fillRect(px + 12, py, 6, 8); // Turret

        // Draw Aliens (Simple Rects for now or simplified sprites from original)
        // Original had binary maps, let's keep it simple or copy them if possible.
        // For brevity in rewrite, using distinct colors/shapes.
        
        this.aliens.forEach(a => {
            if (!a.active) return;
            
            if (a.type === 'top') this.ctx.fillStyle = '#fff';
            else if (a.type === 'mid') this.ctx.fillStyle = '#0ff';
            else this.ctx.fillStyle = '#f0f';
            
            // Simple alien shape
            this.ctx.fillRect(a.x, a.y, a.width, a.height);
            
            // Eyes
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(a.x + 8, a.y + 6, 4, 4);
            this.ctx.fillRect(a.x + 18, a.y + 6, 4, 4);
        });

        // Draw Bullets
        this.ctx.fillStyle = '#ffffff';
        this.player.bullets.forEach(b => {
            this.ctx.fillRect(b.x, b.y, b.width, b.height);
        });
    }

    endGame(win) {
        this.isGameOver = true;
        
        if (this.finalScoreEl) this.finalScoreEl.innerText = this.score;
        
        const h2 = document.querySelector('#gameOver h2');
        if (h2) h2.innerText = win ? "WAVE CLEARED!" : "GAME OVER";
        
        if (this.gameOverScreen) this.gameOverScreen.style.display = 'block';
    }
}

if (document.getElementById('gameCanvas')) {
    new InvadersGame();
}
}
