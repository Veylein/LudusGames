(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    class FlappyGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = this.canvas.getContext('2d');
            this.scoreEl = document.getElementById('game-score');
            this.gameOverScreen = document.getElementById('gameOver');
            this.finalScoreEl = document.getElementById('final-score');
            this.pauseBtn = document.getElementById('pause-btn');

            this.score = 0;
            this.frames = 0;
            this.isGameOver = false;
            this.isPaused = false;
            this.animationId = null;

            this.bird = {
                x: 50,
                y: 150,
                width: 34,
                height: 24,
                gravity: 0.25,
                lift: -4.5,
                velocity: 0
            };
            
            this.pipes = [];
            this.pipeWidth = 52;
            this.pipeGap = 120;
            this.pipeDx = 2;

            this.boundKeyDown = this.handleKeyDown.bind(this);
            this.boundInput = this.handleInput.bind(this);
            this.boundTogglePause = this.togglePause.bind(this);
            
            this.init();
        }

        init() {
            document.addEventListener('keydown', this.boundKeyDown);
            this.canvas.addEventListener('mousedown', this.boundInput);
            this.canvas.addEventListener('touchstart', this.boundInput, {passive: false});
            
            if(this.pauseBtn) this.pauseBtn.addEventListener('click', this.boundTogglePause);
 
            // Also allow click on game over screen to restart?
            if(this.gameOverScreen) {
                this.gameOverScreen.addEventListener('click', () => {
                   if(this.isGameOver) this.startGame();
                });
            }

            this.startGame();
        }
        
        cleanup() {
            document.removeEventListener('keydown', this.boundKeyDown);
            this.canvas.removeEventListener('mousedown', this.boundInput);
            this.canvas.removeEventListener('touchstart', this.boundInput);
            if(this.pauseBtn) this.pauseBtn.removeEventListener('click', this.boundTogglePause);
            
            this.isGameOver = true; 
            if (this.animationId) cancelAnimationFrame(this.animationId);
        }

        startGame() {
            if (this.isPaused) { this.togglePause(); return; }
            this.isGameOver = false;
            this.isPaused = false;
            if(this.pauseBtn) this.pauseBtn.innerText = "PAUSE";
            
            this.score = 0;
            this.frames = 0;
            this.bird.y = 150;
            this.bird.velocity = 0;
            this.pipes = [];
            if(this.scoreEl) this.scoreEl.innerText = this.score;
            if(this.gameOverScreen) this.gameOverScreen.style.display = 'none';

            // Difficulty
            const diff = parseInt(localStorage.getItem("difficulty") || "0");
            if (diff === 0) { this.pipeGap = 140; this.pipeDx = 2; }
            else if (diff === 1) { this.pipeGap = 120; this.pipeDx = 3; }
            else { this.pipeGap = 100; this.pipeDx = 3.5; }

            if (this.animationId) cancelAnimationFrame(this.animationId);
            this.loop();
        }

        togglePause() {
            if (this.isGameOver) return;
            this.isPaused = !this.isPaused;
            if(this.pauseBtn) this.pauseBtn.innerText = this.isPaused ? "RESUME" : "PAUSE";
            if (!this.isPaused) this.loop();
        }
        
        handleKeyDown(e) {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isGameOver) this.startGame();
                else this.flap();
            }
            if (e.code === 'KeyP') this.togglePause();
        }
        
        handleInput(e) {
            e.preventDefault();
            if (this.isGameOver) this.startGame();
            else this.flap();
        }
        
        flap() {
            this.bird.velocity = this.bird.lift;
        }

        loop() {
            if (!document.getElementById('gameCanvas')) {
                this.cleanup();
                return;
            }

            if (this.isGameOver || this.isPaused) return;
            
            this.update();
            this.draw();
            
            this.frames++;
            this.animationId = requestAnimationFrame(() => this.loop());
        }
        
        update() {
            // Bird Update
            this.bird.velocity += this.bird.gravity;
            this.bird.y += this.bird.velocity;
            
            if (this.bird.y + this.bird.height > this.canvas.height - 20) { 
                this.bird.y = this.canvas.height - 20 - this.bird.height;
                this.bird.velocity = 0;
                this.endGame();
            }
            
            if (this.bird.y < 0) {
                this.bird.y = 0;
                this.bird.velocity = 0;
            }
            
            // Pipes Update
            if (this.frames % 120 === 0) {
                let topHeight = Math.random() * (this.canvas.height - this.pipeGap - 100) + 50;
                let bottomY = topHeight + this.pipeGap;
                this.pipes.push({
                    x: this.canvas.width,
                    top: topHeight,
                    bottomY: bottomY 
                });
            }
            
            for (let i = 0; i < this.pipes.length; i++) {
                let p = this.pipes[i];
                p.x -= this.pipeDx;
                
                // Collision
                const padding = 4;
                if (this.bird.x + padding < p.x + this.pipeWidth && 
                    this.bird.x + this.bird.width - padding > p.x && 
                    this.bird.y + padding < p.top) {
                    this.endGame();
                }

                if (this.bird.x + padding < p.x + this.pipeWidth && 
                    this.bird.x + this.bird.width - padding > p.x && 
                    this.bird.y + this.bird.height - padding > p.bottomY) {
                    this.endGame();
                }
                
                if (p.x + this.pipeWidth < 0) {
                    this.pipes.shift();
                    i--; // Adjust index since we removed one
                    this.score++;
                    if(this.scoreEl) this.scoreEl.innerText = this.score;
                }
            }
        }

        draw() {
             // Background
            this.ctx.fillStyle = '#70c5ce';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Clouds
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(50 - (this.frames*0.5 % 300), 100, 60, 20);
            this.ctx.fillRect(250 - (this.frames*0.2 % 300), 50, 40, 15);
            
            // Cityscape
            this.ctx.fillStyle = '#a3e899';
            for(let i=0; i<15; i++) {
                 let h = 30 + Math.abs(Math.sin(i*132))*50;
                this.ctx.fillRect(i * 50 - (this.frames*0.1 % 50), this.canvas.height - 20 - h, 46, h);
            }
            
            this.drawPipes();
            
            // Ground
            this.ctx.fillStyle = '#ded895';
            this.ctx.fillRect(0, this.canvas.height - 20, this.canvas.width, 20);
            this.ctx.fillStyle = '#73bf2e';
            this.ctx.fillRect(0, this.canvas.height - 22, this.canvas.width, 4);
            
            this.drawBird();
        }
        
        drawBird() {
            const w = this.bird.width;
            const h = this.bird.height;
            const x = this.bird.x;
            const y = this.bird.y;
            
            this.ctx.save();
            this.ctx.translate(x + w/2, y + h/2);
            let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.bird.velocity * 0.1)));
            this.ctx.rotate(rotation);
            
            const cx = -w/2;
            const cy = -h/2;
            
            this.ctx.fillStyle = '#f4c20d'; 
            this.ctx.fillRect(cx+2, cy+2, w-4, h-4);
            
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(cx+6, cy, w-10, 2); 
            this.ctx.fillRect(cx+6, cy+h-2, w-10, 2); 
            this.ctx.fillRect(cx, cy+6, 2, h-12); 
            this.ctx.fillRect(cx+w-2, cy+6, 2, h-12); 
            
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(cx+w-12, cy+2, 10, 10);
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(cx+w-8, cy+4, 4, 4); 
            
            this.ctx.fillStyle = '#f45531';
            this.ctx.fillRect(cx+w-10, cy+12, 12, 6);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(cx+4, cy+12, 12, 8);
            
            this.ctx.restore();
        }
        
        drawPipes() {
            const lightGreen = '#73bf2e';
            const darkGreen = '#285010'; 
            
            for (let i = 0; i < this.pipes.length; i++) {
                let p = this.pipes[i];
                
                // Top Pipe
                let h = p.top;
                this.ctx.fillStyle = lightGreen;
                this.ctx.fillRect(p.x + 4, 0, this.pipeWidth - 8, h - 24);
                this.ctx.fillStyle = '#9ce659'; 
                this.ctx.fillRect(p.x + 8, 0, 4, h - 24);
                
                // Top Cap
                this.ctx.fillStyle = lightGreen;
                this.ctx.fillRect(p.x, h - 24, this.pipeWidth, 24);
                this.ctx.strokeStyle = darkGreen;
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(p.x, h - 24, this.pipeWidth, 24);
                
                // Bottom Pipe
                let botY = p.bottomY; 
                let botH = this.canvas.height - 20 - botY; 
                
                if (botH > 0) {
                    this.ctx.fillStyle = lightGreen;
                    this.ctx.fillRect(p.x + 4, botY + 24, this.pipeWidth - 8, botH - 24);
                    this.ctx.fillStyle = '#9ce659';
                    this.ctx.fillRect(p.x + 8, botY + 24, 4, botH - 24);
                    
                    // Bot Cap
                    this.ctx.fillStyle = lightGreen;
                    this.ctx.fillRect(p.x, botY, this.pipeWidth, 24);
                    this.ctx.strokeRect(p.x, botY, this.pipeWidth, 24);
                }
            }
        }

        endGame() {
            if(this.isGameOver) return;
            this.isGameOver = true;
            if(this.finalScoreEl) this.finalScoreEl.innerText = this.score;
            if(this.gameOverScreen) this.gameOverScreen.style.display = 'block';
            if (this.animationId) cancelAnimationFrame(this.animationId);
        }
    }
    
    new FlappyGame();
})();
