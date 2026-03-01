/*
 * NEON Q
 * Isometric neon puzzle game.
 * Features:
 * - Wireframe isometric cubes
 * - Glowing player and enemies
 * - Integrated GameUI
 */

(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    canvas.setAttribute('tabindex', '0');
    canvas.focus();
    
    const ctx = canvas.getContext('2d');

    const CONFIG = {
        cubeSize: 30, // Side length logic
        colors: {
            bg: '#050510',
            cubeLines: 'rgba(0, 255, 255, 0.3)',
            topInactive: 'rgba(0, 0, 50, 0.8)',
            topActive: 'rgba(255, 200, 0, 0.9)', // Neon Orange/Yellow
            sideLeft: 'rgba(0, 50, 50, 0.5)',
            sideRight: 'rgba(0, 20, 20, 0.5)',
            player: '#ff7700',
            shadow: 'rgba(0,0,0,0.5)'
        }
    };

    class QbertGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = ctx;
            
            this.rows = 7;
            this.cubes = [];
            
            this.qbert = { r: 0, c: 0, x: 0, y: 0, targetX: 0, targetY: 0, hopping: false, hopTime: 0 };
            
            this.score = 0;
            this.level = 1;
            this.isGameOver = false;
            this.isPaused = false;
            this.animationId = null;
            
            this.mouseLocked = false;

            this.handleInput = this.handleInput.bind(this);
            this.init();
        }
        
        init() {
            document.addEventListener('keydown', this.handleInput);
            
             if (window.GameUI) {
                window.GameUI.init(this.canvas, {
                    onStart: () => this.start(),
                    onPause: () => this.togglePause(),
                    onRestart: () => this.start()
                });
                window.GameUI.showStartScreen();
            } else {
                this.start();
            }
        }
        
        start() {
            this.isGameOver = false;
            this.isPaused = false;
            this.score = 0;
            this.initLevel();
            
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

        initLevel() {
            this.cubes = [];
            // Pyramid construction
            // Center top at canvas center
            const startX = this.canvas.width / 2;
            const startY = 100;
            const size = CONFIG.cubeSize * 1.5; // Visual spacing
            
            // h = size * 0.866 (roughly isometric ratio if we were doing true iso)
            // But let's stick to the grid logic from before which was working:
            // x = startX + (c * W) - (r * W/2)
            // y = startY + (r * H)
            
            const W = 40;
            const H = 30; 
            
            for(let r=0; r<this.rows; r++) {
                for(let c=0; c<=r; c++) {
                    const x = startX + (c * W) - (r * W / 2);
                    const y = startY + (r * H); 
                    
                    this.cubes.push({
                        r: r, 
                        c: c,
                        x: x, 
                        y: y, 
                        color: 0, // 0 = Inactive, 1 = Active
                        activeAnim: 0 // Flash effect
                    });
                }
            }
            
            this.resetQbert();
        }
        
        resetQbert() {
            this.qbert.r = 0;
            this.qbert.c = 0;
            this.qbert.hopping = false;
            const cube = this.getCube(0, 0);
            this.qbert.x = cube.x;
            this.qbert.y = cube.y - 20;
        }
        
        getCube(r, c) {
            return this.cubes.find(cb => cb.r === r && cb.c === c);
        }
        
        handleInput(e) {
            if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","KeyI","KeyJ","KeyL","KeyK"].includes(e.code)) {
                e.preventDefault();
            }
            
            if (this.isGameOver) {
                if (e.code === 'Space') this.start();
                return;
            }
            if (this.isPaused) {
                if (e.code === 'Space') this.togglePause();
                return;
            }
            
            if (this.qbert.hopping) return; // Wait for hop

            let dr = 0, dc = 0;
            
            // Mapping:
            // Up/Right (Diagonal) -> r-1, c
            // Up/Left -> r-1, c-1
            // Down/Right -> r+1, c+1
            // Down/Left -> r+1, c
            
            if (e.code === 'ArrowUp' || e.code === 'KeyI' || e.code === 'KeyW') { dr = -1; dc = -1; } // Up-Left visually
            else if (e.code === 'ArrowRight' || e.code === 'KeyL' || e.code === 'KeyD') { dr = -1; dc = 0; } // Up-Right visually
            else if (e.code === 'ArrowLeft' || e.code === 'KeyJ' || e.code === 'KeyA') { dr = 1; dc = 0; } // Down-Left visually
            else if (e.code === 'ArrowDown' || e.code === 'KeyK' || e.code === 'KeyS') { dr = 1; dc = 1; } // Down-Right visually
            else if (e.code === 'Space') { this.togglePause(); return; }
            
            if (dr !== 0 || dc !== 0) {
                this.hop(dr, dc);
            }
        }
        
        hop(dr, dc) {
            this.qbert.r += dr;
            this.qbert.c += dc;
            this.qbert.hopping = true;
            this.qbert.hopTime = 10; // Frames to animate
            
            // Check landing immediately for logic, animate visual
            const cube = this.getCube(this.qbert.r, this.qbert.c);
            
            if (cube) {
                // Landed on cube
                this.qbert.targetX = cube.x;
                this.qbert.targetY = cube.y - 20;
                
                if (cube.color === 0) {
                    cube.color = 1;
                    cube.activeAnim = 10;
                    this.score += 25;
                    this.checkWin();
                }
            } else {
                // Landed in void (Fall off)
                // Use projected coords
                // We'll just animate off screen and die
                this.qbert.targetX = this.qbert.x + (dc * 40); // Rough guess
                this.qbert.targetY = this.qbert.y + (dr * 30);
                // Mark for death
                this.qbert.isFalling = true;
            }
            
            if (window.GameUI) window.GameUI.updateScore(this.score);
        }
        
        checkWin() {
            // Check if all cubes are color 1
            if (this.cubes.every(c => c.color === 1)) {
                 this.score += 1000;
                 // Reset board but keep score? 
                 // For now, Game Over Win state
                 setTimeout(() => this.die(true), 500);
            }
        }
        
        die(win = false) {
            this.isGameOver = true;
             // Save score
             const saved = localStorage.getItem('qbertHighScore') || 0;
             if (this.score > saved) localStorage.setItem('qbertHighScore', this.score);
             
             if (window.GameUI) window.GameUI.showGameOverScreen(this.score, Math.max(this.score, saved));
        }

        update() {
            // Hop Animation
            if (this.qbert.hopping) {
                // Lerp
                this.qbert.x += (this.qbert.targetX - this.qbert.x) * 0.3;
                this.qbert.y += (this.qbert.targetY - this.qbert.y) * 0.3;
                
                // Hop height (parabola)
                // Simple version: just slide for now to be safe with 2D logic
                
                if (Math.abs(this.qbert.x - this.qbert.targetX) < 2 && Math.abs(this.qbert.y - this.qbert.targetY) < 2) {
                    this.qbert.hopping = false;
                    this.qbert.x = this.qbert.targetX;
                    this.qbert.y = this.qbert.targetY;
                    
                    if (this.qbert.isFalling) {
                        this.die();
                    }
                }
            }
            
            // Update cube animations
            this.cubes.forEach(c => {
                if(c.activeAnim > 0) c.activeAnim--;
            });
        }

        draw() {
            // Background
            this.ctx.fillStyle = CONFIG.colors.bg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw Cubes
            // Draw in order of rows? Z-indexing naturally happens by draw order
            // Actually iterating row 0 to 6 works for painting painters algorithm
            
            this.cubes.forEach(c => {
                this.drawCube(c.x, c.y, c.color, c.activeAnim);
            });
            
            // Draw Qbert
            if (!this.qbert.isFalling || this.isGameOver) {
                 this.drawQbert(this.qbert.x, this.qbert.y);
            }
        }
        
        drawCube(x, y, state, anim) {
            const size = 20; 
            const h = 25; 
            
            let topColor = CONFIG.colors.topInactive;
            if (state === 1) topColor = CONFIG.colors.topActive;
            if (anim > 0) topColor = '#fff'; // Flash white
            
            // Wireframe / Neon Style
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = CONFIG.colors.cubeLines;
            
            // Top Face 
            this.ctx.fillStyle = topColor;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - size); 
            this.ctx.lineTo(x + size, y); 
            this.ctx.lineTo(x, y + size); 
            this.ctx.lineTo(x - size, y); 
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke(); 
            
            // Left Face (Darker)
            this.ctx.fillStyle = CONFIG.colors.sideLeft;
            this.ctx.beginPath();
            this.ctx.moveTo(x - size, y);
            this.ctx.lineTo(x, y + size);
            this.ctx.lineTo(x, y + size + h);
            this.ctx.lineTo(x - size, y + h);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
    
            // Right Face (Darkest)
            this.ctx.fillStyle = CONFIG.colors.sideRight;
            this.ctx.beginPath();
            this.ctx.moveTo(x + size, y);
            this.ctx.lineTo(x, y + size);
            this.ctx.lineTo(x, y + size + h);
            this.ctx.lineTo(x + size, y + h);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        }
        
        drawQbert(x, y) {
            // Shadow
            this.ctx.fillStyle = CONFIG.colors.shadow;
            this.ctx.beginPath();
            this.ctx.ellipse(x, y + 15, 12, 6, 0, 0, Math.PI*2);
            this.ctx.fill();
            
            // Glowing Sphere
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = CONFIG.colors.player;
            this.ctx.fillStyle = CONFIG.colors.player;
            
            // Hop offset
            let hopY = 0;
            if (this.qbert.hopping) hopY = -15 * Math.sin(Math.PI * ((10 - this.qbert.hopTime)/10)); // Just simple fake arc
            
            this.ctx.beginPath();
            this.ctx.arc(x, y + hopY, 12, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Face Details (Nose)
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x+5, y + hopY + 5);
            this.ctx.lineTo(x+15, y + hopY + 15);
            this.ctx.stroke();
            
            // Eyes
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(x - 5, y + hopY - 5, 4, 0, Math.PI*2);
            this.ctx.arc(x + 5, y + hopY - 5, 4, 0, Math.PI*2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(x - 5, y + hopY - 5, 1, 0, Math.PI*2);
            this.ctx.arc(x + 5, y + hopY - 5, 1, 0, Math.PI*2);
            this.ctx.fill();
        }
        
        loop() {
            if (this.isPaused) return;
            
            if (!this.isGameOver) {
                this.update();
            }
            this.draw();
            
            this.animationId = requestAnimationFrame(() => this.loop());
        }
    }
    
    new QbertGame();
})();
