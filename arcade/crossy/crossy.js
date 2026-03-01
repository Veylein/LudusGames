/*
 * NEON CROSSY
 * A high-speed, neon-soaked frantic crossing game.
 * Features:
 * - Dynamic difficulty scaling
 * - Particle effects for movement and collisions
 * - Integrated GameUI
 * - Smooth camera tracking
 */

(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    // Ensure canvas focus for key events
    canvas.setAttribute('tabindex', '0');
    canvas.focus();
    
    const ctx = canvas.getContext('2d');

    // --- Configuration ---
    const CONFIG = {
        gridSize: 50,
        colors: {
            bg: '#050510',
            grass: { light: '#2a0a3a', dark: '#1a0525' }, // Deep purple
            road: '#111',
            water: '#0a1a2a', // Deep blue
            player: { fill: '#00ff00', glow: '#00ff00' },
            car: { body: '#ff0055', glow: '#ff0055', lights: '#ffaa00' },
            log: { fill: '#00ccff', glow: '#00ccff' },
            text: '#fff'
        }
    };

    // --- Assets / Utilities ---
    let Particles = [];
    
    function createParticle(x, y, color, speed, life) {
        Particles.push({
            x, y, color,
            vx: (Math.random() - 0.5) * speed,
            vy: (Math.random() - 0.5) * speed,
            life: life,
            maxLife: life,
            size: Math.random() * 4 + 2
        });
    }

    function updateParticles() {
        for (let i = Particles.length - 1; i >= 0; i--) {
            let p = Particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.size *= 0.95;
            if (p.life <= 0 || p.size < 0.5) Particles.splice(i, 1);
        }
    }

    function drawParticles(ctxScreen) {
        ctxScreen.save();
        Particles.forEach(p => {
            ctxScreen.globalAlpha = p.life / p.maxLife;
            ctxScreen.fillStyle = p.color;
            ctxScreen.beginPath();
            ctxScreen.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctxScreen.fill();
        });
        ctxScreen.restore();
    }

    // --- Game Class ---
    class CrossyGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = ctx;
            
            this.gridSize = CONFIG.gridSize;
            this.columns = Math.floor(this.canvas.width / this.gridSize);
            
            this.lanes = [];
            this.player = null;
            this.playerXOffset = 0; // For smooth movement on logs
            this.score = 0;
            this.highScore = localStorage.getItem('crossyHighScore') || 0;
            this.gameLoopId = null;
            this.isGameOver = false;
            this.isPaused = false;
            
            this.cameraY = 0;
            
            // Bindings
            this.handleInput = this.handleInput.bind(this);
            this.resize = this.resize.bind(this);
            
            this.init();
        }

        init() {
            window.addEventListener('resize', this.resize);
            document.addEventListener('keydown', this.handleInput);
            
            this.resize();
            
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
        
        resize() {
            this.columns = Math.floor(this.canvas.width / this.gridSize);
        }

        startGame() {
            this.isGameOver = false;
            this.isPaused = false;
            this.score = 0;
            this.lanes = [];
            Particles = [];
            
            if (window.GameUI) {
                window.GameUI.updateScore(0);
                window.GameUI.hideStartScreen();
                window.GameUI.hideGameOverScreen();
                window.GameUI.hidePauseScreen();
            }

            // Player Setup
            this.player = {
                gridX: Math.floor(this.columns / 2),
                gridY: 0, 
                width: this.gridSize * 0.6,
                height: this.gridSize * 0.6,
                isDead: false, 
                hopOffset: 0
            };
            this.playerXOffset = 0;
            
            this.cameraY = 0;
            
            // Initialize lanes
            for (let i = 5; i > -20; i--) {
                this.addLane(i);
            }
            
            if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
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

        addLane(index) {
            const y = index * this.gridSize;
            let type = 'grass';
            let speed = 0;
            let elements = [];
            
            // Safe zone at start
            if (index > -3) {
                type = 'grass';
            } else {
                const rand = Math.random();
                if (rand < 0.2) type = 'grass';
                else if (rand < 0.5) type = 'water'; 
                else type = 'road';
            }
            
            // Lane contents
            if (type === 'road') {
                speed = (Math.random() * 2 + 2) * (Math.random() > 0.5 ? 1 : -1);
                // Difficulty scaling
                const diffMult = 1 + (Math.abs(index) / 100);
                speed *= diffMult;
                
                const density = Math.floor(Math.random() * 2) + 1; 
                for (let i = 0; i < density; i++) {
                    let w = Math.random() > 0.8 ? this.gridSize * 1.5 : this.gridSize * 0.8;
                    let x = (i * (this.canvas.width / density)) + (Math.random() * 50);
                    
                    elements.push({
                        x: x,
                        y: 0, 
                        width: w,
                        height: this.gridSize * 0.5,
                        color: Math.random() > 0.5 ? CONFIG.colors.car.body : '#00aaff'
                    });
                }
            } else if (type === 'water') {
                speed = (Math.random() * 1.5 + 1.5) * (Math.random() > 0.5 ? 1 : -1);
                const density = Math.floor(Math.random() * 3) + 2; 
                 for (let i = 0; i < density; i++) {
                    let w = this.gridSize * (Math.random() * 0.5 + 1.0);
                    let x = (i * (this.canvas.width / density)) + (Math.random() * 20);
                    elements.push({
                        x: x,
                        y: 0,
                        width: w, 
                        height: this.gridSize * 0.7,
                        color: CONFIG.colors.log.fill
                    });
                }
            }
            
            this.lanes.push({
                index: index,
                y: y, 
                type: type,
                speed: speed,
                elements: elements
            });
        }
        
        updateLanes() {
            const playerGridY = this.player.gridY;
            const minIndex = this.lanes.reduce((min, l) => Math.min(min, l.index), 100);
            
            // Add new lanes ahead
            if (playerGridY - minIndex < 15) {
                this.addLane(minIndex - 1);
            }
            
            // Remove old lanes
            this.lanes = this.lanes.filter(l => l.index < playerGridY + 10);
        }

        handleInput(e) {
            if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) {
                e.preventDefault();
            }
            
            if (this.isGameOver) {
                if (e.code === 'Space') this.startGame();
                return;
            }
            
            if (this.isPaused) {
                if (e.code === 'Space') this.togglePause();
                return;
            }
            
            let dx = 0; 
            let dy = 0;
            switch(e.code) {
                case 'ArrowUp': dy = -1; break;
                case 'ArrowDown': dy = 1; break;
                case 'ArrowLeft': dx = -1; break;
                case 'ArrowRight': dx = 1; break;
                case 'Space': this.togglePause(); return;
            }
            
            if (dx !== 0 || dy !== 0) {
                this.movePlayer(dx, dy);
            }
        }
        
        movePlayer(dx, dy) {
            if (this.player.isDead) return;
            
            this.player.gridX += dx;
            this.player.gridY += dy;
            
            // Clamp horizontal
            if (this.player.gridX < 0) this.player.gridX = 0;
            if (this.player.gridX >= this.columns) this.player.gridX = this.columns - 1;
            
            // Reset player visual offset when hopping
            this.playerXOffset = 0;

            // Score update
            const dist = -this.player.gridY; 
            if (dist > this.score) {
                this.score = dist;
                if(window.GameUI) window.GameUI.updateScore(this.score);
            }
            
            this.player.hopOffset = 5; 
        }

        update() {
            if (this.isPaused || this.isGameOver) return;

            // Camera follow
            const targetY = this.player.gridY * this.gridSize; 
            this.cameraY += (targetY - this.cameraY) * 0.1;
            
            let currentLane = this.lanes.find(l => l.index === this.player.gridY);
            
            // Animate lanes
            this.lanes.forEach(lane => {
                if (lane.speed !== 0) {
                    lane.elements.forEach(el => {
                        el.x += lane.speed;
                        if (lane.speed > 0 && el.x > this.canvas.width) el.x = -el.width;
                        if (lane.speed < 0 && el.x + el.width < 0) el.x = this.canvas.width;
                    });
                }
            });
            
            // Update particles
            updateParticles();
            
            // Hop animation decay
            if (this.player.hopOffset > 0) this.player.hopOffset -= 0.5;

            // Player collision logic
            // Calculate absolute player X based on Grid + Offset
            const px = (this.player.gridX * this.gridSize) + this.playerXOffset + (this.gridSize - this.player.width)/2;
            const pRect = { l: px, r: px + this.player.width };

            if (currentLane) {
                if (currentLane.type === 'water') {
                     // Check overlap with logs
                     let onLog = false;
                     currentLane.elements.forEach(log => {
                         const logRect = { l: log.x, r: log.x + log.width };
                         // Overlap check
                         if (pRect.l < logRect.r && pRect.r > logRect.l) {
                             onLog = true;
                         }
                     });
                     
                     if (onLog) {
                         // Move player with log
                         this.playerXOffset += currentLane.speed;
                     } else {
                         this.die('drown');
                     }
                } else if (currentLane.type === 'road') {
                    // Check overlap with cars
                    currentLane.elements.forEach(car => {
                        const cRect = { l: car.x, r: car.x + car.width };
                        if (pRect.l < cRect.r && pRect.r > cRect.l) {
                            this.die('splat');
                        }
                    });
                }
            }
            
            // Bounds check (off screen horizontally due to log carry)
            const finalPx = (this.player.gridX * this.gridSize) + this.playerXOffset;
            if (finalPx < -this.gridSize || finalPx > this.canvas.width) {
                this.die('drown');
            }

            this.updateLanes();
        }
        
        die(reason) {
            if (this.player.isDead) return;
            this.player.isDead = true;
            this.isGameOver = true;
            
            const viewOffset = this.canvas.height * 0.7;
            const drawY = Math.floor(this.player.gridY * this.gridSize - this.cameraY + viewOffset) + this.gridSize/2;
            const drawX = (this.player.gridX * this.gridSize) + this.playerXOffset + this.gridSize/2;
            
            const color = reason === 'drown' ? '#00aaff' : '#00ff00';
            for(let i=0; i<20; i++) {
                createParticle(drawX, drawY, color, 5, 40);
            }
            
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('crossyHighScore', this.highScore);
            }
            
            setTimeout(() => {
                if (window.GameUI) window.GameUI.showGameOverScreen(this.score, this.highScore);
            }, 500);
        }

        loop() {
            if(this.isPaused) return;

            this.update();
            this.draw();
            
            this.gameLoopId = requestAnimationFrame(() => this.loop());
        }

        draw() {
            // Background
            this.ctx.fillStyle = CONFIG.colors.bg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            const viewOffset = this.canvas.height * 0.7; // Player is at 70% height

            // Draw Lanes
            this.lanes.forEach(lane => {
                const drawY = Math.floor(lane.y - this.cameraY + viewOffset);
                if (drawY < -this.gridSize || drawY > this.canvas.height) return;
                
                // Lane Background
                if (lane.type === 'grass') {
                    this.ctx.fillStyle = (Math.abs(lane.index) % 2 === 0) ? CONFIG.colors.grass.light : CONFIG.colors.grass.dark;
                    this.ctx.fillRect(0, drawY, this.canvas.width, this.gridSize);
                    
                    // Grid lines
                    this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                    this.ctx.strokeRect(0, drawY, this.canvas.width, this.gridSize);
                } else if (lane.type === 'road') {
                    this.ctx.fillStyle = CONFIG.colors.road;
                    this.ctx.fillRect(0, drawY, this.canvas.width, this.gridSize);
                    // Dotted lines
                    this.ctx.fillStyle = '#333';
                    this.ctx.fillRect(0, drawY, this.canvas.width, 2);
                    this.ctx.fillRect(0, drawY + this.gridSize - 2, this.canvas.width, 2);
                } else if (lane.type === 'water') {
                    this.ctx.fillStyle = CONFIG.colors.water;
                    this.ctx.fillRect(0, drawY, this.canvas.width, this.gridSize);
                }
                
                // Lane Elements
                lane.elements.forEach(el => {
                    const elX = el.x;
                    const elY = drawY + (this.gridSize - el.height)/2;
                    
                    if (lane.type === 'road') {
                        // Car
                        this.ctx.shadowBlur = 10;
                        this.ctx.shadowColor = el.color;
                        this.ctx.fillStyle = el.color;
                        this.ctx.fillRect(elX, elY, el.width, el.height);
                        this.ctx.shadowBlur = 0;
                        
                        // Headlights
                        this.ctx.fillStyle = '#fff';
                        if (lane.speed > 0) {
                            this.ctx.fillRect(elX + el.width - 4, elY + 2, 4, 4);
                            this.ctx.fillRect(elX + el.width - 4, elY + el.height - 6, 4, 4);
                        } else {
                            this.ctx.fillRect(elX, elY + 2, 4, 4);
                            this.ctx.fillRect(elX, elY + el.height - 6, 4, 4);
                        }
                    } else if (lane.type === 'water') {
                        // Log
                        this.ctx.shadowBlur = 5;
                        this.ctx.shadowColor = CONFIG.colors.log.glow;
                        this.ctx.fillStyle = el.color; 
                        this.ctx.fillRect(elX, elY, el.width, el.height);
                        this.ctx.shadowBlur = 0;
                    }
                });
            });
            
            // Draw Player
            if (this.player && !this.player.isDead) {
                const drawY = Math.floor(this.player.gridY * this.gridSize - this.cameraY + viewOffset) + (this.gridSize - this.player.height)/2 - this.player.hopOffset;
                const drawX = (this.player.gridX * this.gridSize) + this.playerXOffset + (this.gridSize - this.player.width)/2;
                
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = CONFIG.colors.player.glow;
                this.ctx.fillStyle = CONFIG.colors.player.fill;
                this.ctx.fillRect(drawX, drawY, this.player.width, this.player.height);
                // "Face"
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(drawX + 8, drawY + 8, 4, 4); 
                this.ctx.fillRect(drawX + this.player.width - 12, drawY + 8, 4, 4);
                this.ctx.shadowBlur = 0;
            }
            
            // Draw Particles
            drawParticles(this.ctx);
        }
    }
    
    // Start
    new CrossyGame();
})();
