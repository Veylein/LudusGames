class PacmanGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Map Configuration 
        // 1 = Wall, 0 = Dot, 2 = Empty, 3 = Power Pellet
        this.mapLayout = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,0,1,1,0,1,1,0,1,1,0,1,1,1,1,0,1],
            [1,3,1,1,1,1,0,1,1,0,1,1,0,1,1,0,1,1,1,1,3,1],
            [1,0,1,1,1,1,0,1,1,0,1,1,0,1,1,0,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,0,1],
            [1,0,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,0,1,1,2,2,2,2,1,1,0,1,1,1,1,1,1],
            [2,2,2,2,2,1,0,1,2,2,2,2,2,2,1,0,1,2,2,2,2,2], // Ghost House Entrance
            [1,1,1,1,1,1,0,1,2,1,1,1,1,2,1,0,1,1,1,1,1,1],
            [1,2,2,2,2,2,0,2,2,1,2,2,1,2,2,0,2,2,2,2,2,1],
            [1,1,1,1,1,1,0,1,2,1,1,1,1,2,1,0,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,0,1],
            [1,3,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,3,1],
            [1,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,1],
            [1,0,0,0,0,0,0,1,1,0,1,1,0,1,1,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];

        this.tileSize = 20;
        this.canvas.width = this.mapLayout[0].length * this.tileSize;
        this.canvas.height = this.mapLayout.length * this.tileSize;

        // UI
        this.scoreEl = document.getElementById('score');
        this.highScoreEl = document.getElementById('high-score');
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.finalScoreEl = document.getElementById('final-score');
        this.restartBtn = document.getElementById('restart-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.difficultySelect = document.getElementById('difficulty-select');
        this.themeToggle = document.getElementById('checkbox');
        
        this.btnUp = document.getElementById('up-btn');
        this.btnDown = document.getElementById('down-btn');
        this.btnLeft = document.getElementById('left-btn');
        this.btnRight = document.getElementById('right-btn');

        // State
        this.score = 0;
        this.highScore = localStorage.getItem('pacmanHighScore') || 0;
        this.isGameRunning = false;
        this.isPaused = false;
        this.animationId = null;
        
        // Objects
        this.walls = [];
        this.dots = [];
        this.powerPellets = [];
        this.ghosts = [];
        this.player = {
            x: 1, y: 1, // Grid coords
            pixelX: 20, pixelY: 20, // Pixel coords (for smooth movement)
            dx: 0, dy: 0, 
            nextDx: 0, nextDy: 0, 
            speed: 0.1, // Base Speed
            angle: 0,
            mouthOpen: 0,
            animationSpeed: 0.2
        };
        
        this.powerModeTime = 0;
        
        this.init();
    }

    init() {
        this.highScoreEl.innerText = this.highScore;
        this.parseMap();
        this.draw(); // Initial draw 

        // Listeners
        document.addEventListener('keydown', (e) => this.handleInput(e));
        this.restartBtn.addEventListener('click', () => this.resetGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.difficultySelect.addEventListener('change', () => {/* Difficulty updates on next game */});
        
        // Touch
        this.setupMobileControls();
    }

    setupMobileControls() {
        const handleTouch = (dx, dy) => {
            if (!this.isGameRunning) this.startGame();
            this.player.nextDx = dx;
            this.player.nextDy = dy;
        };
        this.btnUp.addEventListener('click', () => handleTouch(0, -1));
        this.btnDown.addEventListener('click', () => handleTouch(0, 1));
        this.btnLeft.addEventListener('click', () => handleTouch(-1, 0));
        this.btnRight.addEventListener('click', () => handleTouch(1, 0));
    }

    parseMap() {
        this.walls = [];
        this.dots = [];
        this.powerPellets = [];
        
        for (let r = 0; r < this.mapLayout.length; r++) {
            for (let c = 0; c < this.mapLayout[r].length; c++) {
                const type = this.mapLayout[r][c];
                if (type === 1) {
                    this.walls.push({ x: c, y: r });
                } else if (type === 0) {
                    this.dots.push({ x: c, y: r, active: true });
                } else if (type === 3) {
                    this.powerPellets.push({ x: c, y: r, active: true });
                }
            }
        }
    }

    startGame() {
        if (this.isGameRunning) return;

        this.isGameRunning = true;
        this.isPaused = false;
        this.score = 0;
        this.updateScore();
        this.startScreen.style.display = 'none';
        this.gameOverScreen.style.display = 'none';
        
        // Reset Map
        this.dots.forEach(d => d.active = true);
        this.powerPellets.forEach(p => p.active = true);
        
        // Reset Player
        this.player.x = 10; 
        this.player.y = 15;
        this.player.pixelX = this.player.x * this.tileSize;
        this.player.pixelY = this.player.y * this.tileSize;
        this.player.dx = 0;
        this.player.dy = 0;
        this.player.nextDx = 0;
        this.player.nextDy = 0;
        
        // Difficulty & Ghosts
        this.setupGhosts();
        
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.loop();
    }
    
    setupGhosts() {
        this.ghosts = [];
        const level = this.difficultySelect.value;
        let count = 2; // Easy
        let speed = 0.05;
        
        if (level === 'medium') { count = 3; speed = 0.08; }
        if (level === 'hard') { count = 4; speed = 0.09; }
        if (level === 'expert') { count = 4; speed = 0.11; }
        
        const colors = ['#FF0000', '#FFB8FF', '#00FFFF', '#FFB852'];
        
        for(let i=0; i<count; i++) {
            this.ghosts.push({
                x: 10 + (i%2 === 0 ? -1 : 1), 
                y: 10,
                pixelX: (10 + (i%2 === 0 ? -1 : 1)) * this.tileSize,
                pixelY: 10 * this.tileSize,
                dx: Math.random() > 0.5 ? 1 : -1,
                dy: 0,
                speed: speed,
                color: colors[i % 4],
                scared: false,
                dead: false
            });
        }
    }

    resetGame() {
        this.isGameRunning = false;
        this.startGame();
    }

    togglePause() {
        if (!this.isGameRunning) return;
        this.isPaused = !this.isPaused;
        this.pauseBtn.innerText = this.isPaused ? 'RESUME' : 'PAUSE';
        
        if (this.isPaused) {
            if (this.animationId) cancelAnimationFrame(this.animationId);
            this.animationId = null;
        } else {
            this.loop();
        }
    }

    loop() {
        if (!this.isGameRunning) return;
        if (this.isPaused) return;

        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    update() {
        this.movePlayer();
        this.updateGhosts();
        this.checkCollisions();
        
        if (this.powerModeTime > 0) {
            this.powerModeTime--;
            if (this.powerModeTime <= 0) {
                this.ghosts.forEach(g => g.scared = false);
            }
        }
        
        // Win Condition
        const remainingDots = this.dots.filter(d => d.active).length + this.powerPellets.filter(p => p.active).length;
        if (remainingDots === 0) {
            this.gameOver(true); // You Win
        }
    }

    movePlayer() {
        const p = this.player;
        
        // Try to change direction if aligned to grid
        // We use a small epsilon for float comparison
        const centeredX = Math.abs(p.pixelX % this.tileSize) < 2;
        const centeredY = Math.abs(p.pixelY % this.tileSize) < 2;
        
        if (centeredX && centeredY) {
            // Check if next direction is valid
             const currentGridX = Math.round(p.pixelX / this.tileSize);
             const currentGridY = Math.round(p.pixelY / this.tileSize);

             // Only Apply Next Dir if Valid
             if (this.isValidMove(currentGridX + p.nextDx, currentGridY + p.nextDy)) {
                 p.dx = p.nextDx;
                 p.dy = p.nextDy;
                 
                 // Snap to grid
                 p.pixelX = currentGridX * this.tileSize;
                 p.pixelY = currentGridY * this.tileSize;
             } else if (!this.isValidMove(currentGridX + p.dx, currentGridY + p.dy)) {
                 // Stop if current direction hits wall
                 p.dx = 0;
                 p.dy = 0;
             }
        }
        
        p.pixelX += p.dx * p.speed * this.tileSize;
        p.pixelY += p.dy * p.speed * this.tileSize;

        // Wrap Around (Tunnel)
        if (p.pixelX < -this.tileSize) p.pixelX = this.canvas.width;
        if (p.pixelX > this.canvas.width) p.pixelX = -this.tileSize;
        
        // Animation
        if (p.dx !== 0 || p.dy !== 0) {
             p.mouthOpen += p.animationSpeed;
             if (p.mouthOpen > 1 || p.mouthOpen < 0) p.animationSpeed *= -1;
             
             if (p.dx === 1) p.angle = 0;
             if (p.dx === -1) p.angle = Math.PI;
             if (p.dy === 1) p.angle = Math.PI / 2;
             if (p.dy === -1) p.angle = -Math.PI / 2;
        }

        // Eat Dots
        const centerGx = Math.round(p.pixelX / this.tileSize);
        const centerGy = Math.round(p.pixelY / this.tileSize);
        
        const dot = this.dots.find(d => d.x === centerGx && d.y === centerGy && d.active);
        if (dot) {
            dot.active = false;
            this.score += 10;
            this.updateScore();
        }

        const pellet = this.powerPellets.find(pp => pp.x === centerGx && pp.y === centerGy && pp.active);
        if (pellet) {
            pellet.active = false;
            this.score += 50;
            this.updateScore();
            this.activatePowerMode();
        }
    }
    
    activatePowerMode() {
        this.powerModeTime = 600; // Frames (~10 seconds)
        this.ghosts.forEach(g => {
            if (!g.dead) g.scared = true; 
        });
    }

    updateGhosts() {
        this.ghosts.forEach(g => {
            if (g.dead) {
                 // Try to return to home (simplified: just wander or stay)
                 // Or revive after timer? Simplest: revive immediately but move slow
                 g.dead = false;
                 g.scared = false;
                 g.x = 10; g.y = 10;
                 g.pixelX = 10 * this.tileSize;
                 g.pixelY = 10 * this.tileSize;
            }

            // Move logic
            const centeredX = Math.abs(g.pixelX % this.tileSize) < 2;
            const centeredY = Math.abs(g.pixelY % this.tileSize) < 2;

            if (centeredX && centeredY) {
                 const gx = Math.round(g.pixelX / this.tileSize);
                 const gy = Math.round(g.pixelY / this.tileSize);
                 
                 // Get valid moves
                 const moves = [];
                 if (this.isValidMove(gx + 1, gy) && g.dx !== -1) moves.push({dx:1, dy:0});
                 if (this.isValidMove(gx - 1, gy) && g.dx !== 1) moves.push({dx:-1, dy:0});
                 if (this.isValidMove(gx, gy + 1) && g.dy !== -1) moves.push({dx:0, dy:1});
                 if (this.isValidMove(gx, gy - 1) && g.dy !== 1) moves.push({dx:0, dy:-1});
                 
                 if (moves.length > 0) {
                     // Random choice of valid move (can be improved to chase player)
                     const choice = moves[Math.floor(Math.random() * moves.length)];
                     g.dx = choice.dx;
                     g.dy = choice.dy;
                     
                     // Snap
                     g.pixelX = gx * this.tileSize;
                     g.pixelY = gy * this.tileSize;
                 } else {
                     // Dead end (shouldn't happen often in this map), reverse
                     g.dx *= -1;
                     g.dy *= -1;
                 }
            }
            
            let speed = g.scared ? g.speed * 0.5 : g.speed;
            g.pixelX += g.dx * speed * this.tileSize;
            g.pixelY += g.dy * speed * this.tileSize;
            
            // Tunnel
            if (g.pixelX < -this.tileSize) g.pixelX = this.canvas.width;
            if (g.pixelX > this.canvas.width) g.pixelX = -this.tileSize;
            
        });
    }

    checkCollisions() {
        const pRadius = this.tileSize / 2;
        const pCx = this.player.pixelX + pRadius;
        const pCy = this.player.pixelY + pRadius;

        this.ghosts.forEach(g => {
            const gCx = g.pixelX + this.tileSize / 2;
            const gCy = g.pixelY + this.tileSize / 2;
            
            // Simple distance
            const dist = Math.sqrt((pCx - gCx)**2 + (pCy - gCy)**2);
            
            if (dist < this.tileSize * 0.8) {
                if (g.scared) {
                    // Eat Ghost
                    g.dead = true;
                    this.score += 200;
                    this.updateScore();
                } else {
                    // Die
                    this.gameOver();
                }
            }
        });
    }

    isValidMove(x, y) {
        // Tunnel handling
        if (x < 0 || x >= this.mapLayout[0].length) return true;
        
        if (y < 0 || y >= this.mapLayout.length) return false;
        
        const tile = this.mapLayout[y][x];
        return tile !== 1; // 1 is wall
    }

    draw() {
        const isRetro = this.themeToggle.checked;
        
        // Clear
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw Walls
        this.ctx.fillStyle = isRetro ? '#1f6feb' : '#1f6feb33'; // Solid blue vs transparent blue
        this.ctx.strokeStyle = '#1f6feb';
        this.ctx.lineWidth = 2;
        
        if (!isRetro) {
             this.ctx.shadowBlur = 10;
             this.ctx.shadowColor = '#1f6feb';
        } else {
             this.ctx.shadowBlur = 0;
        }

        // Draw Walls from map
        // Optimization: Draw static image or batch? For now, redraw rects (fast enough for simple collision)
        this.walls.forEach(w => {
            this.ctx.fillRect(w.x * this.tileSize, w.y * this.tileSize, this.tileSize, this.tileSize);
            this.ctx.strokeRect(w.x * this.tileSize, w.y * this.tileSize, this.tileSize, this.tileSize);
        });
        this.ctx.shadowBlur = 0;

        // Draw Dots
        this.ctx.fillStyle = isRetro ? '#f1e05a' : '#fff';
        this.dots.forEach(d => {
            if (d.active) {
                this.ctx.fillRect(d.x * this.tileSize + 8, d.y * this.tileSize + 8, 4, 4);
            }
        });

        // Power Pellets
        if (Math.floor(Date.now() / 200) % 2 === 0) { // Blink
            this.ctx.fillStyle = isRetro ? '#f1e05a' : '#ff0055';
            this.powerPellets.forEach(p => {
                if (p.active) {
                    this.ctx.beginPath();
                    this.ctx.arc(p.x * this.tileSize + 10, p.y * this.tileSize + 10, 8, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });
        }
        
        // Draw Ghosts
        this.ghosts.forEach(g => {
            if (g.scared) {
                 this.ctx.fillStyle = '#2ea043'; // Green (Scared) - GH Style
            } else {
                 this.ctx.fillStyle = g.color;
            }
            
            // Draw Ghost Body (Dome + Skirt)
            const gx = g.pixelX + 10;
            const gy = g.pixelY + 10;
            const radius = 9;
            
            this.ctx.beginPath();
            this.ctx.arc(gx, gy - 2, radius, Math.PI, 2 * Math.PI); // Top Dome (Left to Right)
            this.ctx.lineTo(gx + radius, gy + radius); // Right bottom
            // Little feet
            this.ctx.lineTo(gx + radius/3, gy + radius - 3);
            this.ctx.lineTo(gx - radius/3, gy + radius);
            this.ctx.lineTo(gx - radius, gy + radius - 3);
            this.ctx.lineTo(gx - radius, gy - 2);
            this.ctx.fill();
            
            // Eyes
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(gx - 4, gy - 4, 3, 0, Math.PI * 2);
            this.ctx.arc(gx + 4, gy - 4, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#000';
             this.ctx.beginPath();
            this.ctx.arc(gx - 4 + g.dx*2, gy - 4 + g.dy*2, 1.5, 0, Math.PI * 2);
            this.ctx.arc(gx + 4 + g.dx*2, gy - 4 + g.dy*2, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw Pacman
        this.ctx.fillStyle = isRetro ? '#f1e05a' : '#ffea7f';
        if (!isRetro) {
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#f1e05a';
        }
        
        const px = this.player.pixelX + 10;
        const py = this.player.pixelY + 10;
        
        this.ctx.beginPath();
        // Packman mouth logic
        const mouthWidth = 0.2 * Math.PI * (0.5 + 0.5 * Math.sin(this.player.mouthOpen * Math.PI));
        
        this.ctx.arc(px, py, 9, this.player.angle + mouthWidth, this.player.angle + 2 * Math.PI - mouthWidth);
        this.ctx.lineTo(px, py);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    updateScore() {
        this.scoreEl.innerText = this.score;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.highScoreElement.innerText = this.highScore;
            localStorage.setItem('pacmanHighScore', this.highScore);
        }
    }

    gameOver(won = false) {
        this.isGameRunning = false;
        if(this.animationId) cancelAnimationFrame(this.animationId);
        
        this.finalScoreElement.innerText = this.score;
        const title = this.gameOverScreen.querySelector('h2');
        if (won) {
            title.innerText = "YOU WIN!";
            title.style.color = "#00ff9d";
        } else {
            title.innerText = "GAME OVER";
            title.style.color = "#ff0055";
        }
        this.gameOverScreen.style.display = 'flex';
    }

    handleInput(e) {
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].indexOf(e.code) > -1) {
            e.preventDefault();
        }

        if (!this.isGameRunning) {
            if (e.code === 'Space' || e.code.startsWith('Arrow')) {
                this.startGame();
            }
            return;
        }

        if (this.isPaused) {
            if (e.code === 'Space') this.togglePause();
            return;
        }

        switch(e.code) {
            case 'ArrowUp': this.player.nextDx = 0; this.player.nextDy = -1; break;
            case 'ArrowDown': this.player.nextDx = 0; this.player.nextDy = 1; break;
            case 'ArrowLeft': this.player.nextDx = -1; this.player.nextDy = 0; break;
            case 'ArrowRight': this.player.nextDx = 1; this.player.nextDy = 0; break;
            case 'Space': this.togglePause(); break;
        }
    }
}

// Start
window.onload = () => {
    new PacmanGame();
};
