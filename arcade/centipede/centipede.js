(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    class CentipedeGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = this.canvas.getContext('2d');
            this.scoreEl = document.getElementById('game-score');
            this.gameOverScreen = document.getElementById('gameOver');
            this.finalScoreEl = document.getElementById('final-score');
            this.pauseBtn = document.getElementById('pause-btn');

            this.score = 0;
            this.isGameOver = false;
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
            this.SEGMENT_SIZE = 20;
            this.centipedeSpeed = 2;

            this.boundKeyDown = this.handleKeyDown.bind(this);
            this.boundTogglePause = this.togglePause.bind(this);
            this.boundStartGame = this.startGame.bind(this);
            
            this.init();
        }

        init() {
            document.addEventListener('keydown', this.boundKeyDown);
            if(this.pauseBtn) this.pauseBtn.addEventListener('click', this.boundTogglePause);
            
            // Allow restarting from game over screen click if needed
            if(this.gameOverScreen) {
                // Check if there is a restart button or just click anywhere
                const restartBtn = this.gameOverScreen.querySelector('button');
                if(restartBtn) restartBtn.addEventListener('click', this.boundStartGame);
                else this.gameOverScreen.addEventListener('click', this.boundStartGame);
            }
            
            this.startGame();
        }

        cleanup() {
            document.removeEventListener('keydown', this.boundKeyDown);
            if(this.pauseBtn) this.pauseBtn.removeEventListener('click', this.boundTogglePause);
            
            if(this.gameOverScreen) {
                const restartBtn = this.gameOverScreen.querySelector('button');
                if(restartBtn) restartBtn.removeEventListener('click', this.boundStartGame);
                else this.gameOverScreen.removeEventListener('click', this.boundStartGame);
            }
            
            if (this.animationId) cancelAnimationFrame(this.animationId);
            this.isGameOver = true; // Stop loop logic
        }

        togglePause() {
            if (this.isGameOver) return;
            this.isPaused = !this.isPaused;
            if(this.pauseBtn) this.pauseBtn.innerText = this.isPaused ? "RESUME" : "PAUSE";
        }

        startGame() {
            this.score = 0;
            this.isGameOver = false;
            this.isPaused = false;
            if(this.pauseBtn) this.pauseBtn.innerText = "PAUSE";

            this.player.x = this.canvas.width / 2;
            this.player.y = this.canvas.height - 30;
            this.player.bullets = [];
            this.centipede = [];
            this.mushrooms = [];
            if(this.scoreEl) this.scoreEl.innerText = this.score;
            if(this.gameOverScreen) this.gameOverScreen.style.display = 'none';

            // Difficulty
            this.difficulty = parseInt(localStorage.getItem("difficulty") || "0");
            if (this.difficulty === 0) this.centipedeSpeed = 2;
            else if (this.difficulty === 1) this.centipedeSpeed = 4;
            else this.centipedeSpeed = 6;

            // Create Centipede
            for (let i = 0; i < 10; i++) {
                this.centipede.push({
                    x: i * this.SEGMENT_SIZE,
                    y: 0,
                    dx: this.centipedeSpeed,
                    dy: 0,
                    width: this.SEGMENT_SIZE,
                    height: this.SEGMENT_SIZE
                });
            }

            // Create Random Mushrooms
            for (let i = 0; i < 30; i++) {
                this.mushrooms.push({
                    x: Math.floor(Math.random() * (this.canvas.width / this.SEGMENT_SIZE)) * this.SEGMENT_SIZE,
                    y: Math.floor(Math.random() * (this.canvas.height / this.SEGMENT_SIZE - 2)) * this.SEGMENT_SIZE + this.SEGMENT_SIZE,
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
                this.cleanup();
                return;
            }

            if (!this.isGameOver && !this.isPaused) {
                this.update();
                this.draw();
            }
            
            this.animationId = requestAnimationFrame(() => this.loop());
        }

        update() {
             // ... Logic matching original ...
             // Bullets
            for (let i = 0; i < this.player.bullets.length; i++) {
                let b = this.player.bullets[i];
                b.y -= 10;
                if (b.y < 0) {
                    this.player.bullets.splice(i, 1);
                    i--;
                    continue;
                }

                // Mushroom Collision
                for (let j = 0; j < this.mushrooms.length; j++) {
                    let m = this.mushrooms[j];
                    if (this.rectIntersect(b, m)) {
                        this.player.bullets.splice(i, 1);
                        i--;
                        m.health--;
                        if (m.health <= 0) {
                            this.mushrooms.splice(j, 1);
                            this.score += 1;
                        }
                        break; 
                    }
                }
            }
            
            // Centipede check
            // Need copies of bullets? No, splice modifies in place.
            
             // Centipede Logic
            this.centipede.forEach(seg => {
                seg.x += seg.dx;

                // Wall or Mushroom Collision
                let hit = false;
                if (seg.x < 0 || seg.x + seg.width > this.canvas.width) hit = true;
                
                this.mushrooms.forEach(m => {
                    if (this.rectIntersect(seg, m)) hit = true;
                });

                if (hit) {
                    seg.dx *= -1;
                    seg.y += this.SEGMENT_SIZE;
                    if (seg.x < 0) seg.x = 0;
                    if (seg.x + seg.width > this.canvas.width) seg.x = this.canvas.width - seg.width;
                }

                if (this.rectIntersect(seg, this.player)) {
                    this.endGame(false);
                }
                
                if (seg.y + seg.height > this.canvas.height) {
                     seg.y = 0; // Loop to top
                }
            });

            // Bullet Hit Centipede
            // Iterate backwards for safe removal? Or filter.
            // Using standard loops
            for(let bIdx = this.player.bullets.length - 1; bIdx >= 0; bIdx--) {
                let b = this.player.bullets[bIdx];
                let hitCentipede = false;
                for(let sIdx = this.centipede.length - 1; sIdx >= 0; sIdx--) {
                    let seg = this.centipede[sIdx];
                    if (this.rectIntersect(b, seg)) {
                        this.centipede.splice(sIdx, 1);
                        this.player.bullets.splice(bIdx, 1);
                        this.score += 10;
                        if(this.scoreEl) this.scoreEl.innerText = this.score;
                        
                        this.mushrooms.push({
                            x: Math.round(seg.x / this.SEGMENT_SIZE) * this.SEGMENT_SIZE,
                            y: Math.round(seg.y / this.SEGMENT_SIZE) * this.SEGMENT_SIZE,
                            width: this.SEGMENT_SIZE,
                            height: this.SEGMENT_SIZE,
                            health: 3
                        });
                        hitCentipede = true;
                        break; 
                    }
                }
                if(hitCentipede) continue; 
            }

            if (this.centipede.length === 0) {
                this.endGame(true); 
            }
        }
        
        rectIntersect(r1, r2) {
            return !(r2.x > r1.x + r1.width || 
                     r2.x + r2.width < r1.x || 
                     r2.y > r1.y + r1.height || 
                     r2.y + r2.height < r1.y);
        }

        draw() {
             // ... Drawing logic ... (Copied / Adapted)
            this.ctx.fillStyle = '#000'; 
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.mushrooms.forEach(m => {
                let x = m.x;
                let y = m.y;
                let mainColor = '#ff0000'; 
                let spotColor = '#ffffff'; 
                let stemColor = '#ff69b4'; 
                
                if (m.health === 2) {
                     mainColor = '#b22222'; 
                     stemColor = '#c71585';
                } else if (m.health === 1) {
                     mainColor = '#800000'; 
                     stemColor = '#8b008b';
                }

                this.ctx.fillStyle = stemColor;
                this.ctx.fillRect(x + 6, y + 10, 8, 10);
                
                this.ctx.fillStyle = mainColor;
                this.ctx.fillRect(x + 2, y + 4, 16, 12); 
                this.ctx.fillRect(x + 4, y + 2, 12, 2);  
                this.ctx.fillRect(x, y + 6, 2, 8);       
                this.ctx.fillRect(x + 18, y + 6, 2, 8);  
                
                this.ctx.fillStyle = spotColor;
                if (m.health === 3) {
                    this.ctx.fillRect(x + 6, y + 6, 2, 2);
                    this.ctx.fillRect(x + 12, y + 6, 2, 2);
                    this.ctx.fillRect(x + 9, y + 10, 2, 2);
                }
            });

            this.centipede.forEach((seg, index) => {
                let x = seg.x;
                let y = seg.y;
                let isHead = (index === 0); 
                this.ctx.fillStyle = isHead ? '#32cd32' : '#00fa9a'; 
                
                this.ctx.fillRect(x + 4, y, 12, 20); 
                this.ctx.fillRect(x, y + 4, 20, 12); 
                this.ctx.fillRect(x + 2, y + 2, 16, 16); 
                
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fillRect(x + 6, y + 6, 2, 2);
                this.ctx.fillRect(x + 12, y + 6, 2, 2);
                
                const time = Date.now();
                const legFrame = Math.floor(time / 100) % 2;
                this.ctx.fillStyle = '#ffffff';
                if (legFrame === 0) {
                    this.ctx.fillRect(x - 2, y + 14, 4, 2); 
                    this.ctx.fillRect(x + 18, y + 14, 4, 2); 
                } else {
                    this.ctx.fillRect(x - 2, y + 4, 4, 2); 
                    this.ctx.fillRect(x + 18, y + 4, 4, 2); 
                }
            });

            this.ctx.fillStyle = '#ffffff';
            let px = this.player.x;
            let py = this.player.y;
            this.ctx.fillRect(px + 8, py, 4, 16);
            this.ctx.fillRect(px + 4, py + 8, 12, 8);
            this.ctx.fillRect(px, py + 12, 20, 4);
            
            this.ctx.fillStyle = '#00ffff';
            this.ctx.fillRect(px + 8, py + 12, 4, 2); 
            
            this.ctx.fillStyle = '#ff00ff'; 
            this.player.bullets.forEach(b => {
                this.ctx.fillRect(b.x, b.y, 4, 10);
            });
        }
        
        handleKeyDown(e) {
            if (e.key === 'ArrowLeft') this.player.x -= 20;
            if (e.key === 'ArrowRight') this.player.x += 20;
            if (e.code === 'Space') {
                if (this.isGameOver) this.startGame();
                else {
                    this.player.bullets.push({
                        x: this.player.x + this.player.width/2 - 2, 
                        y: this.player.y, 
                        width: 4, 
                        height: 10
                    });
                }
            }
        }
        
        endGame(win) {
            this.isGameOver = true;
            if(this.finalScoreEl) this.finalScoreEl.innerText = this.score;
            if(this.gameOverScreen) {
                 const h2 = this.gameOverScreen.querySelector('h2');
                 if(h2) h2.innerText = win ? "WAVE CLEARED!" : "GAME OVER";
                 this.gameOverScreen.style.display = 'block';
            }
        }
    }
    
    new CentipedeGame();
})();
