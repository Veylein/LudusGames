const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('game-score');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('final-score');

let score = 0;
let frames = 0;
let isGameOver = false;

const bird = {
    x: 50,
    y: 150,
    width: 20,
    height: 20,
    gravity: 0.25,
    lift: -4.5,
    velocity: 0,
    
    draw: function() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        // Rotate based on velocity
        let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(rotation);
        
        // Body
        ctx.fillStyle = '#f8e71c'; // Yellow
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width/2 + 2, this.height/2, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#555';
        ctx.stroke();
        
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(6, -6, 5, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(7, -6, 2, 0, Math.PI*2); // Pupil
        ctx.fill();
        
        // Wing
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-6, 2, 6, 4, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();

        // Beak
        ctx.fillStyle = '#f5a623'; // Orange
        ctx.beginPath();
        ctx.moveTo(8, 2);
        ctx.lineTo(16, 6);
        ctx.lineTo(8, 10);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    },
    
    update: function() {
        this.velocity += this.gravity;
        this.y += this.velocity;
        
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
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

const pipes = {
    items: [],
    width: 40,
    dx: 2,
    gap: 120, // Reduced gap size
    
    draw: function() {
        ctx.fillStyle = '#73bf2e'; // Classic green
        ctx.strokeStyle = '#2f5a10'; // Dark green outline
        ctx.lineWidth = 2;

        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            
            // Top Pipe
            let topH = p.top;
            ctx.fillRect(p.x, 0, this.width, topH);
            ctx.strokeRect(p.x, 0, this.width, topH);
            
            // Cap (Rim) for Top Pipe
            ctx.fillRect(p.x - 2, topH - 20, this.width + 4, 20);
            ctx.strokeRect(p.x - 2, topH - 20, this.width + 4, 20);
            
            // Bottom Pipe
            let botY = canvas.height - p.bottom;
            ctx.fillRect(p.x, botY, this.width, p.bottom);
            ctx.strokeRect(p.x, botY, this.width, p.bottom);
            
            // Cap (Rim) for Bottom Pipe
            ctx.fillRect(p.x - 2, botY, this.width + 4, 20);
            ctx.strokeRect(p.x - 2, botY, this.width + 4, 20);
        }
    },
    
    update: function() {
        // Add new pipe every 100 frames
        if (frames % 100 === 0) {
            let topHeight = Math.random() * (canvas.height / 2);
            let bottomHeight = canvas.height - topHeight - this.gap;
            this.items.push({
                x: canvas.width,
                top: topHeight,
                bottom: bottomHeight
            });
        }
        
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            p.x -= this.dx;
            
            // Collision Detection
            if (bird.x < p.x + this.width && bird.x + bird.width > p.x && (bird.y < p.top || bird.y + bird.height > canvas.height - p.bottom)) {
                endGame();
            }
            
            // Remove pipe & Score
            if (p.x + this.width < 0) {
                this.items.shift();
                score++;
                scoreEl.innerText = score;
            }
        }
    }
};

function startGame() {
    isGameOver = false;
    score = 0;
    frames = 0;
    bird.y = 150;
    bird.velocity = 0;
    pipes.items = [];
    scoreEl.innerText = score;
    gameOverScreen.style.display = 'none';

    // Difficulty
    const difficulty = parseInt(localStorage.getItem("difficulty") || "0");
    if (difficulty === 0) { pipes.gap = 140; pipes.dx = 2; }
    else if (difficulty === 1) { pipes.gap = 120; pipes.dx = 3; }
    else { pipes.gap = 100; pipes.dx = 4; }

    loop();
}

function loop() {
    if (isGameOver) return;
    
    ctx.fillStyle = '#70c5ce'; // Sky blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    bird.update();
    bird.draw();
    
    pipes.update();
    pipes.draw();
    
    frames++;
    requestAnimationFrame(loop);
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (isGameOver) startGame();
        else bird.flap();
    }
});

canvas.addEventListener('click', () => {
    if (isGameOver) startGame();
    else bird.flap();
});

function endGame() {
    isGameOver = true;
    finalScoreEl.innerText = score;
    gameOverScreen.style.display = 'block';
    if (window.addPoints) window.addPoints(score);
}

startGame();
