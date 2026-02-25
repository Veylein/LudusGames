(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    class QbertGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = this.canvas.getContext('2d');
            
            this.scoreEl = document.getElementById('score');
            this.livesEl = document.getElementById('lives');
            this.startScreen = document.getElementById('start-screen');
            
            this.cubeW = 40;
            this.cubeH = 40; 
            
            this.rows = 7;
            this.cubes = []; 
            
            this.qbert = { r: 0, c: 0, x: 0, y: 0, targetX: 0, targetY: 0, jumping: false, jumpTime: 0 };
            
            this.score = 0;
            this.lives = 3;
            this.level = 1;
            
            this.isRunning = false;
            
            this.boundInput = this.input.bind(this);
            this.boundStart = this.start.bind(this);
            
            this.init();
        }
        
        init() {
            window.addEventListener('keydown', this.boundInput);
            
            if (this.startScreen) {
                this.startScreen.addEventListener('click', this.boundStart);
            }
            this.canvas.addEventListener('click', () => {
                if (!this.isRunning) this.start();
            });

            this.initLevel();
            this.draw();
        }
        
        cleanup() {
            window.removeEventListener('keydown', this.boundInput);
            if (this.startScreen) {
                this.startScreen.removeEventListener('click', this.boundStart);
            }
            this.isRunning = false;
        }

        initLevel() {
            this.cubes = [];
            const startX = this.canvas.width / 2;
            const startY = 80;
            
            for(let r=0; r<this.rows; r++) {
                for(let c=0; c<=r; c++) {
                    const x = startX + (c * this.cubeW) - (r * this.cubeW / 2);
                    const y = startY + (r * 30); 
                    
                    this.cubes.push({
                        r: r, 
                        c: c,
                        x: x, 
                        y: y, 
                        color: 0
                    });
                }
            }
            
            this.resetQbert();
        }
        
        resetQbert() {
            this.qbert.r = 0;
            this.qbert.c = 0;
            this.updateQbertPos();
        }
        
        updateQbertPos() {
            const cube = this.getCube(this.qbert.r, this.qbert.c);
            if(cube) {
                this.qbert.x = cube.x;
                this.qbert.y = cube.y - 15; // Stand on top
            } else {
                // Fall off
                this.lives--;
                if(this.livesEl) this.livesEl.innerText = this.lives;
                if (this.lives > 0) {
                     this.resetQbert();
                } else {
                    this.isRunning = false;
                    alert("Game Over! Score: " + this.score);
                    this.score = 0;
                    this.lives = 3;
                    this.livesEl.innerText = 3;
                    this.scoreEl.innerText = 0;
                    this.initLevel();
                    if(this.startScreen) this.startScreen.style.display = 'flex';
                }
            }
        }
        
        getCube(r, c) {
            return this.cubes.find(cb => cb.r === r && cb.c === c);
        }
        
        start() {
            if(this.isRunning) return;
            this.isRunning = true;
            if (this.startScreen) this.startScreen.style.display = 'none';
            this.loop();
        }
        
        input(e) {
            if (!this.isRunning) {
                if(e.code === 'Space') this.start();
                return;
            }
            
            let dr = 0, dc = 0;
            
            if (e.code === 'ArrowUp' || e.code === 'KeyI') { dr = -1; dc = -1; }
            else if (e.code === 'ArrowRight' || e.code === 'KeyL') { dr = -1; dc = 0; }
            else if (e.code === 'ArrowLeft' || e.code === 'KeyJ') { dr = 1; dc = 0; }
            else if (e.code === 'ArrowDown' || e.code === 'KeyK') { dr = 1; dc = 1; }
            
            else if (e.code === 'KeyQ') { dr = -1; dc = -1; }
            else if (e.code === 'KeyW') { dr = -1; dc = 0; }
            else if (e.code === 'KeyA') { dr = 1; dc = 0; }
            else if (e.code === 'KeyS') { dr = 1; dc = 1; }
            
            if (dr !== 0 || dc !== 0) {
                e.preventDefault();
                this.jump(dr, dc);
                this.draw(); // Redraw on move
            }
        }
        
        jump(dr, dc) {
            this.qbert.r += dr;
            this.qbert.c += dc;
            
            const cube = this.getCube(this.qbert.r, this.qbert.c);
            if (cube) {
                if (cube.color === 0) {
                    cube.color = 1;
                    this.score += 25;
                    if(this.scoreEl) this.scoreEl.innerText = this.score;
                }
            }
            
            this.updateQbertPos();
        }
        
        draw() {
            // Check canvas context
            if (!this.ctx) return;

            this.ctx.fillStyle = '#111';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.cubes.forEach(c => {
                this.drawCube(c.x, c.y, c.color);
            });
            
            if (this.isRunning || this.lives > 0) {
                this.drawQbert(this.qbert.x, this.qbert.y);
            }
        }
        
        drawCube(x, y, colorState) {
            const size = 20; 
            const h = 25; 
            
            let topColor = '#888';
            if (colorState === 0) topColor = '#55a'; // Blueish
            else if (colorState === 1) topColor = '#fd0'; // Yellow
            else if (colorState === 2) topColor = '#0f0'; // Green
    
            const leftColor = '#555'; 
            const rightColor = '#333'; 
            
            // Top Face 
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - size); 
            this.ctx.lineTo(x + size, y); 
            this.ctx.lineTo(x, y + size); 
            this.ctx.lineTo(x - size, y); 
            this.ctx.closePath();
            this.ctx.fillStyle = topColor;
            this.ctx.fill();
            this.ctx.stroke(); 
            
            // Left Face
            this.ctx.beginPath();
            this.ctx.moveTo(x - size, y);
            this.ctx.lineTo(x, y + size);
            this.ctx.lineTo(x, y + size + h);
            this.ctx.lineTo(x - size, y + h);
            this.ctx.closePath();
            this.ctx.fillStyle = leftColor;
            this.ctx.fill();
            this.ctx.stroke();
    
            // Right Face
            this.ctx.beginPath();
            this.ctx.moveTo(x + size, y);
            this.ctx.lineTo(x, y + size);
            this.ctx.lineTo(x, y + size + h);
            this.ctx.lineTo(x + size, y + h);
            this.ctx.closePath();
            this.ctx.fillStyle = rightColor;
            this.ctx.fill();
            this.ctx.stroke();
        }
        
        drawQbert(x, y) {
            // Q*bert Sprite
            this.ctx.fillStyle = '#ff7b00'; 
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 12, 0, Math.PI*2);
            this.ctx.fill();
            
            // Snoot
            this.ctx.beginPath();
            this.ctx.moveTo(x + 5, y + 5);
            this.ctx.lineTo(x + 15, y + 15);
            this.ctx.lineWidth = 6;
            this.ctx.strokeStyle = '#ff7b00';
            this.ctx.stroke();
            this.ctx.lineWidth = 1;
            
            // Eyes
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(x - 4, y - 4, 4, 0, Math.PI*2); 
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(x + 6, y - 4, 4, 0, Math.PI*2); 
            this.ctx.fill();
            
            // Pupils
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(x - 4, y - 4, 1.5, 0, Math.PI*2);
            this.ctx.arc(x + 6, y - 4, 1.5, 0, Math.PI*2);
            this.ctx.fill();
        }
        
        loop() {
            if(!this.isRunning) return;
            if (!document.getElementById('gameCanvas')) {
                this.cleanup();
                return;
            }
            // this.draw(); // Draw is called on input and start, animation loop for idle animation?
            // Qbert doesn't have continuous movement in this version, it's step based.
            // But let's keep loop for future animation or blinking.
            
            requestAnimationFrame(() => this.loop());
        }
    }
    
    new QbertGame();
})();
