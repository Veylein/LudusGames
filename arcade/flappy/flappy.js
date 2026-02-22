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
        ctx.fillStyle = '#ff0';
        ctx.fillRect(this.x, this.y, this.width, this.height);
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
        ctx.fillStyle = '#0f0';
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            ctx.fillRect(p.x, 0, this.width, p.top);
            ctx.fillRect(p.x, canvas.height - p.bottom, this.width, p.bottom);
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
