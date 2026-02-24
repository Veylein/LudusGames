// Flappy Bird Game
window.addEventListener('load', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('game-score');
    const gameOverScreen = document.getElementById('gameOver');
    const finalScoreEl = document.getElementById('final-score');
    const pauseBtn = document.getElementById('pause-btn');

    let score = 0;
    let frames = 0;
    let isGameOver = false;
    let isPaused = false;
    let animationId = null;

    // Bird Object
    const bird = {
        x: 50,
        y: 150,
        width: 34,
        height: 24,
        gravity: 0.25,
        lift: -4.5,
        velocity: 0,
        
        draw: function() {
            const w = this.width;
            const h = this.height;
            const x = this.x;
            const y = this.y;
            
            ctx.save();
            ctx.translate(x + w/2, y + h/2);
            let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
            ctx.rotate(rotation);
            
            // Pixel Art Bird (Yellow) center at 0,0
            const cx = -w/2;
            const cy = -h/2;
            
            // Body Color
            ctx.fillStyle = '#f4c20d'; 
            ctx.fillRect(cx+2, cy+2, w-4, h-4);
            
            // Outline
            ctx.fillStyle = '#000';
            ctx.fillRect(cx+6, cy, w-10, 2); // Top
            ctx.fillRect(cx+6, cy+h-2, w-10, 2); // Bottom
            ctx.fillRect(cx, cy+6, 2, h-12); // Left
            ctx.fillRect(cx+w-2, cy+6, 2, h-12); // Right
            
            // Eye
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx+w-12, cy+2, 10, 10);
            ctx.fillStyle = '#000';
            ctx.fillRect(cx+w-8, cy+4, 4, 4); // Pupil
            
            // Beak
            ctx.fillStyle = '#f45531';
            ctx.fillRect(cx+w-10, cy+12, 12, 6);
            
            // Wing
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx+4, cy+12, 12, 8);
            
            ctx.restore();
        },
        
        update: function() {
            this.velocity += this.gravity;
            this.y += this.velocity;
            
            if (this.y + this.height > canvas.height - 20) { // Ground collision
                this.y = canvas.height - 20 - this.height;
                this.velocity = 0;
                endGame();
            }
            
            if (this.y < 0) {
                this.y = 0;
                this.velocity = 0;
            }
        },
        
        flap: function() {
            this.velocity = this.lift;
        }
    };

    // Pipes Object
    const pipes = {
        items: [],
        width: 52,
        dx: 2,
        gap: 120,
        
        draw: function() {
            const lightGreen = '#73bf2e';
            const darkGreen = '#285010'; 
            
            for (let i = 0; i < this.items.length; i++) {
                let p = this.items[i];
                
                // Top Pipe
                let h = p.top;
                ctx.fillStyle = lightGreen;
                ctx.fillRect(p.x + 4, 0, this.width - 8, h - 24);
                ctx.fillStyle = '#9ce659'; 
                ctx.fillRect(p.x + 8, 0, 4, h - 24);
                
                // Top Cap
                ctx.fillStyle = lightGreen;
                ctx.fillRect(p.x, h - 24, this.width, 24);
                ctx.lineWidth = 2;
                ctx.strokeStyle = darkGreen;
                ctx.strokeRect(p.x, h - 24, this.width, 24);
                ctx.strokeRect(p.x + 4, -2, this.width - 8, h - 22);
                
                // Bottom Pipe
                let botY = p.bottomY; // pre-calculated relative to 0
                let botH = canvas.height - 20 - botY; // Height until ground
                
                // Draw only if visible
                if (botH > 0) {
                    ctx.fillStyle = lightGreen;
                    ctx.fillRect(p.x + 4, botY + 24, this.width - 8, botH - 24);
                    ctx.fillStyle = '#9ce659';
                    ctx.fillRect(p.x + 8, botY + 24, 4, botH - 24);
                    
                    // Bot Cap
                    ctx.fillStyle = lightGreen;
                    ctx.fillRect(p.x, botY, this.width, 24);
                    ctx.strokeRect(p.x, botY, this.width, 24);
                    ctx.strokeRect(p.x + 4, botY + 24, this.width - 8, botH);
                }
            }
        },
        
        update: function() {
            if (frames % 120 === 0) {
                let topHeight = Math.random() * (canvas.height - this.gap - 100) + 50;
                let bottomY = topHeight + this.gap;
                this.items.push({
                    x: canvas.width,
                    top: topHeight,
                    bottomY: bottomY 
                });
            }
            
            for (let i = 0; i < this.items.length; i++) {
                let p = this.items[i];
                p.x -= this.dx;
                
                // Collision
                const padding = 4;
                // Check Top Pipe
                if (bird.x + padding < p.x + this.width && bird.x + bird.width - padding > p.x && bird.y + padding < p.top) {
                    endGame();
                }
                // Check Bottom Pipe
                if (bird.x + padding < p.x + this.width && bird.x + bird.width - padding > p.x && bird.y + bird.height - padding > p.bottomY) {
                    endGame();
                }
                
                if (p.x + this.width < 0) {
                    this.items.shift();
                    score++;
                    scoreEl.innerText = score;
                }
            }
        }
    };

    function startGame() {
        if (isPaused) { togglePause(); return; }
        isGameOver = false;
        isPaused = false;
        if(pauseBtn) pauseBtn.innerText = "PAUSE";
        
        score = 0;
        frames = 0;
        bird.y = 150;
        bird.velocity = 0;
        pipes.items = [];
        scoreEl.innerText = score;
        gameOverScreen.style.display = 'none';

        // Difficulty
        const diff = parseInt(localStorage.getItem("difficulty") || "0");
        if (diff === 0) { pipes.gap = 140; pipes.dx = 2; }
        else if (difficulty === 1) { pipes.gap = 120; pipes.dx = 3; }
        else { pipes.gap = 100; pipes.dx = 3.5; }

        if (animationId) cancelAnimationFrame(animationId);
        loop();
    }

    function togglePause() {
        if (isGameOver) return;
        isPaused = !isPaused;
        if(pauseBtn) pauseBtn.innerText = isPaused ? "RESUME" : "PAUSE";
        if (!isPaused) loop();
    }

    function loop() {
        if (isGameOver) return;
        if (isPaused) return;
        
        // Background
        ctx.fillStyle = '#70c5ce';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Clouds
        ctx.fillStyle = '#fff';
        ctx.fillRect(50 - (frames*0.5 % 300), 300, 60, 20);
        ctx.fillRect(250 - (frames*0.2 % 300), 100, 40, 15);
        
        // Cityscape
        ctx.fillStyle = '#a3e899';
        for(let i=0; i<10; i++) {
             let h = 30 + Math.abs(Math.sin(i*132))*50;
            ctx.fillRect(i * 50 - (frames*0.1 % 50), canvas.height - 20 - h, 46, h);
        }
        
        bird.update();
        pipes.update();
        
        pipes.draw();
        
        // Ground
        ctx.fillStyle = '#ded895';
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
        // Grass top
        ctx.fillStyle = '#73bf2e';
        ctx.fillRect(0, canvas.height - 22, canvas.width, 4);
        // Moving Ground Pattern
        ctx.fillStyle = '#d0c874';
        for(let i=0; i<20; i++) {
             ctx.beginPath();
             ctx.moveTo((i*20) - (frames*2 % 20), canvas.height - 20);
             ctx.lineTo((i*20) + 10 - (frames*2 % 20), canvas.height);
             ctx.lineTo((i*20) - 5 - (frames*2 % 20), canvas.height);
             ctx.fill();
        }
        
        bird.draw();
        
        frames++;
        animationId = requestAnimationFrame(loop);
    }

    function endGame() {
        if(isGameOver) return;
        isGameOver = true;
        finalScoreEl.innerText = score;
        gameOverScreen.style.display = 'block';
        if (window.addPoints) window.addPoints(score);
    }

    // Input
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (isGameOver) startGame();
            else bird.flap();
        }
        if (e.code === 'KeyP') togglePause();
    });

    if (canvas) {
        canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (isGameOver) startGame();
            else bird.flap();
        });
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (isGameOver) startGame();
            else bird.flap();
        }, {passive: false});
    }

    if(pauseBtn) pauseBtn.addEventListener('click', togglePause);

    // Initial Start
    startGame();
});
