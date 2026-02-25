{
class PacmanGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) return; // Guard
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
        
        // Spawn Point Safety Check: Reverting to a known open row
        // Row 5 is fully open [1,0,0...0,1]
        this.player = {
            x: 10, y: 5, 
            pixelX: 200, pixelY: 100, // 10*20, 5*20
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
        if(this.highScoreEl) this.highScoreEl.innerText = this.highScore;
        this.parseMap();
        this.draw(); // Initial draw 

        // Listeners
        this.inputHandler = (e) => this.handleInput(e);
        document.addEventListener('keydown', this.inputHandler);
        
        // CLICK TO START
        const clickStart = (e) => {
             // Do not start if clicking UI elements
             if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) return;
             if(!this.isGameRunning) this.startGame();
        };
        
        this.canvas.addEventListener('click', clickStart);
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); clickStart(e); });
        
        if(this.startScreen) {
             this.startScreen.addEventListener('click', clickStart);
             this.startScreen.addEventListener('touchstart', (e) => { e.preventDefault(); clickStart(e); });
        }
        
        if(this.restartBtn) this.restartBtn.addEventListener('click', () => this.resetGame());
        if(this.pauseBtn) this.pauseBtn.addEventListener('click', () => this.togglePause());
        if(this.difficultySelect) this.difficultySelect.addEventListener('change', () => {/* Difficulty updates on next game */});
        
        // Touch
        this.setupMobileControls();
    }

    setupMobileControls() {
        const handleTouch = (dx, dy) => {
            if (!this.isGameRunning) this.startGame();
            this.player.nextDx = dx;
            this.player.nextDy = dy;
        };
        if(this.btnUp) this.btnUp.addEventListener('click', () => handleTouch(0, -1));
        if(this.btnDown) this.btnDown.addEventListener('click', () => handleTouch(0, 1));
        if(this.btnLeft) this.btnLeft.addEventListener('click', () => handleTouch(-1, 0));
        if(this.btnRight) this.btnRight.addEventListener('click', () => handleTouch(1, 0));
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
        if(this.startScreen) this.startScreen.style.display = 'none';
        if(this.gameOverScreen) this.gameOverScreen.style.display = 'none';
        
        // Reset Map
        this.dots.forEach(d => d.active = true);
        this.powerPellets.forEach(p => p.active = true);
        
        // Reset Player
        // Start in standard Pacman safe spot (Row 15, Col 10 - below Ghost House)
        // Row 15: [1,0,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,0,1]
        // This index 10 is '1' (Wall). Index 6 is '0' (Dot).
        // Let's use Top Left (1,1) to be absolutely safe
        
        this.player.x = 1; 
        this.player.y = 1; 
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
        let level = 'easy';
        if(this.difficultySelect) level = this.difficultySelect.value;
        
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
        if(this.pauseBtn) this.pauseBtn.innerText = this.isPaused ? 'RESUME' : 'PAUSE';
        
        if (this.isPaused) {
            if (this.animationId) cancelAnimationFrame(this.animationId);
            this.animationId = null;
        } else {
            this.loop();
        }
    }

    loop() {
        // DOM Check
        if (!document.getElementById('gameCanvas')) {
             if (this.inputHandler) window.removeEventListener('keydown', this.inputHandler);
             return;
        }

        if (!this.isGameRunning) return;
        if (this.isPaused) return;

        try {
            this.update();
            this.draw();
        } catch (e) {
            console.error("Game Loop Error:", e);
            this.isGameRunning = false;
            return;
        }
        
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
                     
                     // Prevent stuck
                     if (g.dx === 0 && g.dy === 0) {
                         g.dx = 1; // Force move
                     }
                 }
            }
            
            let speed = g.scared ? g.speed * 0.5 : g.speed;
            g.pixelX += g.dx * speed * this.tileSize;
            g.pixelY += g.dy * speed * this.tileSize;
            
            if (isNaN(g.pixelX) || isNaN(g.pixelY)) {
                // Reset ghost if corrupt
                g.x = 10;
                g.y = 10;
                g.pixelX = 200;
                g.pixelY = 200;
                g.dx = 1;
                g.dy = 0;
            }
            
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
            if (g.dead) return; // Dead ghosts don't kill you

            const gCx = g.pixelX + this.tileSize / 2;
            const gCy = g.pixelY + this.tileSize / 2;
            
            // Simple distance
            const dist = Math.sqrt((pCx - gCx)**2 + (pCy - gCy)**2);
            
            if (dist < this.tileSize * 0.8) {
                if (g.scared) {
                    // Eat Ghost
                    g.dead = true;
                    // Respawn logic or point logic
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
        if (!this.ctx) return;
        const isRetro = this.themeToggle && this.themeToggle.checked;
        
        // Clear & Background
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Wall Color
        this.ctx.strokeStyle = '#2121ff'; // Classic Arcade Blue
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';

        // Draw Walls (Double Line style)
        // For simplicity in this engine, we draw hollow rounded rects
        this.walls.forEach(w => {
            const x = w.x * this.tileSize;
            const y = w.y * this.tileSize;
            const s = this.tileSize;
            
            // Outer box
            this.ctx.strokeRect(x + 4, y + 4, s - 8, s - 8);
            
            // Connection logic would be better but expensive to calc every frame
            // Minimalist retro look: small blue squares
            // this.ctx.strokeRect(x + 6, y + 6, s - 12, s - 12);
        });

        // Draw Dots (Square Pixels)
        this.ctx.fillStyle = '#ffb8ae'; // Salmon-ish dot color
        this.dots.forEach(d => {
            if (d.active) {
                this.ctx.fillRect(d.x * this.tileSize + 8, d.y * this.tileSize + 8, 4, 4);
            }
        });

        // Power Pellets (Bliinking Circle)
        if (Math.floor(Date.now() / 200) % 2 === 0) { 
            this.ctx.fillStyle = '#ffb8ae';
            this.powerPellets.forEach(p => {
                if (p.active) {
                    this.ctx.beginPath();
                    this.ctx.arc(p.x * this.tileSize + 10, p.y * this.tileSize + 10, 8, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });
        }
        
        // Draw Ghosts (Pixel Art)
        this.ghosts.forEach(g => {
            let color = g.color;
            if (g.scared) color = '#0000ff'; // Blue
            if (g.dead) color = null; // Eyes only
            
            this.drawGhostSprite(g.pixelX + 1, g.pixelY + 1, color, g.dx, g.dy, g.scared);
        });

        // Draw Pacman
        this.drawPacmanSprite(this.player.pixelX + 1, this.player.pixelY + 1, this.player.angle, this.player.mouthOpen);
    }
    
    drawGhostSprite(x, y, color, dx, dy, scared) {
        const ctx = this.ctx;
        const s = 1.3; // Scale
        
        if (color) {
            ctx.fillStyle = color;
            // Head
            ctx.fillRect(x + 4*s, y, 6*s, 1*s);
            ctx.fillRect(x + 2*s, y + 1*s, 10*s, 1*s);
            ctx.fillRect(x + 1*s, y + 6*s, 12*s, 1*s); // Body Width
            ctx.fillRect(x, y + 7*s, 14*s, 7*s); // Body
            
            // Feet (Wiggle)
            if (Math.floor(Date.now() / 200) % 2 === 0) {
                 ctx.clearRect(x, y + 13*s, 2*s, 1*s);
                 ctx.clearRect(x + 4*s, y + 13*s, 2*s, 1*s);
                 ctx.clearRect(x + 12*s, y + 13*s, 2*s, 1*s);
            } else {
                 ctx.clearRect(x + 2*s, y + 13*s, 2*s, 1*s);
                 ctx.clearRect(x + 6*s, y + 13*s, 2*s, 1*s);
                 ctx.clearRect(x + 10*s, y + 13*s, 2*s, 1*s);
            }
        }
        
        // Eyes
        if (!scared || !color) {
            ctx.fillStyle = '#fff';
            // Look direction
            let ox = dx * 2;
            let oy = dy * 2;
            
            ctx.fillRect(x + 3*s + ox, y + 4*s + oy, 4*s, 4*s); // Left Eye White
            ctx.fillRect(x + 9*s + ox, y + 4*s + oy, 4*s, 4*s); // Right Eye White
            
            ctx.fillStyle = '#00f'; // Pupil
            ctx.fillRect(x + 5*s + ox, y + 6*s + oy, 2*s, 2*s);
            ctx.fillRect(x + 11*s + ox, y + 6*s + oy, 2*s, 2*s);
        } else {
            // Scared Face
            ctx.fillStyle = '#ffb8ae'; // Buff color mouth/eyes
            ctx.fillRect(x + 4*s, y + 6*s, 2*s, 2*s); // Eye L
            ctx.fillRect(x + 10*s, y + 6*s, 2*s, 2*s); // Eye R
            
            // Wavy Mouth
            ctx.fillRect(x + 2*s, y + 10*s, 2*s, 1*s);
            ctx.fillRect(x + 6*s, y + 10*s, 2*s, 1*s);
            ctx.fillRect(x + 10*s, y + 10*s, 2*s, 1*s);
            ctx.fillRect(x + 4*s, y + 9*s, 2*s, 1*s);
            ctx.fillRect(x + 8*s, y + 9*s, 2*s, 1*s);
        }
    }
    
    drawPacmanSprite(x, y, angle, mouthOpen) {
        // Pixel Art imitation is hard for rotation without canvas rotate
        // So we use standard arc but with no anti-aliasing color
        this.ctx.fillStyle = '#ffff00';
        
        const cx = x + 9;
        const cy = y + 9;
        const radius = 9;
        
        // Mouth
        const mouthWidth = 0.25 * Math.PI * (0.5 + 0.5 * Math.sin(mouthOpen * Math.PI));
        
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.arc(cx, cy, radius, angle + mouthWidth, angle + 2*Math.PI - mouthWidth);
        this.ctx.fill();
    }

    updateScore() {
        if(this.scoreEl) this.scoreEl.innerText = this.score;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            if(this.highScoreEl) this.highScoreEl.innerText = this.highScore;
            localStorage.setItem('pacmanHighScore', this.highScore);
        }
    }

    gameOver(won = false) {
        this.isGameRunning = false;
        if(this.animationId) cancelAnimationFrame(this.animationId);
        
        if(this.finalScoreEl) this.finalScoreEl.innerText = this.score;
        const title = this.gameOverScreen ? this.gameOverScreen.querySelector('h2') : null;
        if (title) {
            if (won) {
                title.innerText = "YOU WIN!";
                title.style.color = "#00ff9d";
            } else {
                title.innerText = "GAME OVER";
                title.style.color = "#ff0055";
            }
        }
        if(this.gameOverScreen) this.gameOverScreen.style.display = 'flex';
    }

    handleInput(e) {
        // Remove listener if not on page
        if (!document.getElementById('gameCanvas')) {
             window.removeEventListener('keydown', this.inputHandler);
             return;
        }

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
            case 'ArrowUp': 
                this.player.nextDx = 0; 
                this.player.nextDy = -1; 
                break;
            case 'ArrowDown': 
                this.player.nextDx = 0; 
                this.player.nextDy = 1; 
                break;
            case 'ArrowLeft': 
                this.player.nextDx = -1; 
                this.player.nextDy = 0; 
                break;
            case 'ArrowRight': 
                this.player.nextDx = 1; 
                this.player.nextDy = 0; 
                break;
            case 'Space': this.togglePause(); break;
        }
        
        // Instant turn attempt for better feel even if not aligned yet
        // (Handled in loop)
    }
}

// Start
if (document.getElementById('gameCanvas')) {
    new PacmanGame();
}
}
