/*
 * NEON FLAP
 * High-precision neon bird action.
 * Features:
 * - Neon visual style
 * - Trail effects
 * - Precise hitboxes
 * - Integrated GameUI
 */

(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    // Focus for keyboard input
    canvas.setAttribute('tabindex', '0');
    canvas.focus();
    
    const ctx = canvas.getContext('2d');

    // --- Configuration ---
    const CONFIG = {
        gravity: 0.25,
        lift: -4.5,
        pipeSpeed: 2,
        pipeGap: 120,
        pipeSpawnRate: 120, // Frames
        colors: {
            bg: '#050510',
            bird: '#ffee00',
            pipe: '#00ff00',
            ground: '#00ffcc',
            trail: 'rgba(255, 238, 0, 0.5)'
        }
    };

    // --- Trail Effect ---
    let Trail = [];
    function addTrail(x, y) {
        Trail.push({x, y, age: 0, maxAge: 20});
    }
    function updateTrail() {
        for(let i=Trail.length-1; i>=0; i--) {
            Trail[i].x -= CONFIG.pipeSpeed; // Moves with world? Or static?
            // Actually trails should stay in world space.
            // But since our "world" moves left (pipes move left), the bird stays roughly X=50.
            // So trails should move left.
            Trail[i].age++;
            if(Trail[i].age > Trail[i].maxAge) Trail.splice(i, 1);
        }
    }
    function drawTrail(ctx) {
        ctx.save();
        Trail.forEach(t => {
            ctx.globalAlpha = 1 - (t.age / t.maxAge);
            ctx.fillStyle = CONFIG.colors.trail;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 5, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.restore();
    }

    class FlappyGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = ctx;

            this.score = 0;
            this.highScore = localStorage.getItem('flappyHighScore') || 0;
            this.frames = 0;
            this.isGameOver = false;
            this.isPaused = false;
            this.animationId = null;

            this.bird = {
                x: 50,
                y: 150,
                width: 24,
                height: 24,
                velocity: 0,
                rotation: 0
            };
            
            this.pipes = [];

            this.handleInput = this.handleInput.bind(this);
            this.init();
        }

        init() {
            document.addEventListener('keydown', this.handleInput);
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.flap();
            }, {passive: false});
            this.canvas.addEventListener('mousedown', (e) => {
                if(e.button === 0) this.flap();
            });
            
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
        
        startGame() {
            this.isGameOver = false;
            this.isPaused = false;
            this.score = 0;
            this.frames = 0;
            this.pipes = [];
            Trail = [];
            
            this.bird.y = 150;
            this.bird.velocity = 0;
            this.bird.rotation = 0;

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
            if (["Space", "ArrowUp"].includes(e.code)) {
                e.preventDefault();
                this.flap();
            }
            if (e.code === 'KeyP') this.togglePause();
        }
        
        flap() {
            if (this.isGameOver) {
                // Ignore input, UI handles restart
                return; 
            }
            if (this.isPaused) {
                this.togglePause();
                return;
            }
            
            this.bird.velocity = CONFIG.lift;
        }

        update() {
            // Bird Physics
            this.bird.velocity += CONFIG.gravity;
            this.bird.y += this.bird.velocity;
            
            // Rotation
            if (this.bird.velocity < 0) {
                this.bird.rotation = -0.3;
            } else {
                this.bird.rotation += 0.05;
                if (this.bird.rotation > 1.5) this.bird.rotation = 1.5; // 90 deg down max
            }

            // Floor/Ceiling collision
            if (this.bird.y + this.bird.height > this.canvas.height - 20 || this.bird.y < 0) { 
                this.die();
            }
            
            // Trail
            if (this.frames % 5 === 0) {
                addTrail(this.bird.x, this.bird.y);
            }
            updateTrail();

            // Pipes
            if (this.frames % CONFIG.pipeSpawnRate === 0) {
                let topHeight = Math.random() * (this.canvas.height - CONFIG.pipeGap - 100) + 50;
                this.pipes.push({
                    x: this.canvas.width,
                    top: topHeight,
                    bottomY: topHeight + CONFIG.pipeGap,
                    width: 50,
                    passed: false
                });
            }
            
            for (let i = 0; i < this.pipes.length; i++) {
                let p = this.pipes[i];
                p.x -= CONFIG.pipeSpeed;
                
                // Collision
                const birdLeft = this.bird.x + 4;
                const birdRight = this.bird.x + this.bird.width - 4;
                const birdTop = this.bird.y + 4;
                const birdBot = this.bird.y + this.bird.height - 4;

                const pipeLeft = p.x;
                const pipeRight = p.x + p.width;
                
                // Check X overlap
                if (birdRight > pipeLeft && birdLeft < pipeRight) {
                    // Check Y overlap (hit top pipe OR hit bottom pipe)
                    if (birdTop < p.top || birdBot > p.bottomY) {
                         this.die();
                    }
                }
                
                // Score
                if (p.x + p.width < this.bird.x && !p.passed) {
                    this.score++;
                    p.passed = true;
                    if(window.GameUI) window.GameUI.updateScore(this.score);
                }
                
                if (p.x + p.width < 0) {
                    this.pipes.shift();
                    i--;
                }
            }
        }

        die() {
            if (this.isGameOver) return;
            this.isGameOver = true;
            
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('flappyHighScore', this.highScore);
            }
            
            if (window.GameUI) window.GameUI.showGameOverScreen(this.score, this.highScore);
        }

        loop() {
            if (this.isPaused) return;

            if (!this.isGameOver) {
                this.update();
                this.frames++;
            }
            
            this.draw();
            
            if (!this.isGameOver || Trail.length > 0) { // Keep animating trail/particles on death?
                this.animationId = requestAnimationFrame(() => this.loop());
            }
        }

        draw() {
            // Background
            this.ctx.fillStyle = CONFIG.colors.bg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Grid Background (optional subtle effect)
            this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            this.ctx.lineWidth = 1;
            const gridSize = 40;
            const offset = (this.frames * CONFIG.pipeSpeed * 0.5) % gridSize;
            for(let x = -offset; x < this.canvas.width; x += gridSize) {
                this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.canvas.height); this.ctx.stroke();
            }
            
            // Draw Trail
            drawTrail(this.ctx);

            // Draw Pipes
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = CONFIG.colors.pipe;
            this.ctx.strokeStyle = CONFIG.colors.pipe;
            this.ctx.lineWidth = 2;
            
            this.pipes.forEach(p => {
                // Top Pipe
                this.ctx.strokeRect(p.x, -5, p.width, p.top + 5); 
                // Bottom Pipe
                this.ctx.strokeRect(p.x, p.bottomY, p.width, this.canvas.height - p.bottomY + 5);
                
                // Inner glow fill (low opacity)
                this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
                this.ctx.fillRect(p.x, -5, p.width, p.top + 5);
                this.ctx.fillRect(p.x, p.bottomY, p.width, this.canvas.height - p.bottomY + 5);
            });
            this.ctx.shadowBlur = 0;
            
            // Ground
            this.ctx.fillStyle = CONFIG.colors.ground;
            this.ctx.fillRect(0, this.canvas.height - 20, this.canvas.width, 20);
            // Neon Line on top of ground
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = CONFIG.colors.ground;
            this.ctx.strokeStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.canvas.height - 20);
            this.ctx.lineTo(this.canvas.width, this.canvas.height - 20);
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            // Draw Bird
            if (!this.isGameOver || Math.floor(Date.now()/100)%2) { // Blink on death?
                this.ctx.save();
                this.ctx.translate(this.bird.x + this.bird.width/2, this.bird.y + this.bird.height/2);
                this.ctx.rotate(this.bird.rotation);
                
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = CONFIG.colors.bird;
                this.ctx.fillStyle = CONFIG.colors.bird;
                
                // Geometric Bird Shape
                this.ctx.beginPath();
                this.ctx.moveTo(-10, -10);
                this.ctx.lineTo(10, 0); // Beak
                this.ctx.lineTo(-10, 10);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Eye
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(0, -2, 2, 0, Math.PI*2);
                this.ctx.fill();
                
                this.ctx.restore();
            }
        }
    }
    
    new FlappyGame();
})();
