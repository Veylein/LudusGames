const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('game-score');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('final-score');

let score = 0;
let gameSpeed = 5;
let gravity = 0.6;
let isGameOver = false;
let animationId;

let dino = {
    x: 50,
    y: 200,
    width: 40,
    height: 40,
    dy: 0,
    jumpForce: 12,
    grounded: false,
    color: '#00ff00'
};

let obstacles = [];
let spawnTimer = 0;

function startGame() {
    isGameOver = false;
    score = 0;
    obstacles = [];
    spawnTimer = 0;
    dino.y = 200;
    dino.dy = 0;
    scoreEl.innerText = score;
    gameOverScreen.style.display = 'none';

    // Difficulty
    const difficulty = parseInt(localStorage.getItem("difficulty") || "0");
    if (difficulty === 0) gameSpeed = 5;
    else if (difficulty === 1) gameSpeed = 8;
    else gameSpeed = 12;

    requestAnimationFrame(update);
}

function update() {
    if (isGameOver) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dino Physics
    dino.dy += gravity;
    dino.y += dino.dy;

    if (dino.y > 200) {
        dino.y = 200;
        dino.dy = 0;
        dino.grounded = true;
    } else {
        dino.grounded = false;
    }

    // Draw Ground
    ctx.beginPath();
    ctx.moveTo(0, 240);
    ctx.lineTo(canvas.width, 240);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // Draw Dino
    drawDino(dino.x, dino.y, dino.width, dino.height, dino.color);

    // Obstacle Spawning
    spawnTimer++;
    if (spawnTimer > (Math.random() * 100 + 60)) { // Random spawn rate
        spawnTimer = 0;
        let obstacleHeight = Math.random() * 30 + 30; // 30-60 height
        obstacles.push({
            x: canvas.width,
            y: 240 - obstacleHeight,
            width: 20,
            height: obstacleHeight,
            color: '#ff0055' // Retro Red
        });
    }

    // Update Obstacles
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;

        // Draw Obstacle
        drawCactus(obs.x, obs.y, obs.width, obs.height, obs.color);

        // Collision Logic
        if (
            dino.x < obs.x + obs.width - 10 && // Reduced hit box
            dino.x + dino.width > obs.x + 10 && 
            dino.y < obs.y + obs.height &&
            dino.y + dino.height > obs.y + 10
        ) {
            endGame();
        }

        // Remove off-screen obstacles
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
            score++;
            scoreEl.innerText = score;
            i--;
        }
    }

    requestAnimationFrame(update);
}

function jump() {
    if (dino.grounded) {
        dino.dy = -dino.jumpForce;
        dino.grounded = false;
    }
}

function drawDino(x, y, w, h, color) {
    ctx.fillStyle = color;
    // Body
    ctx.fillRect(x + 10, y + 10, w - 20, h - 15);
    // Head
    ctx.fillRect(x + 15, y, w - 15, 15);
    // Eye
    ctx.fillStyle = 'black';
    ctx.fillRect(x + 25, y + 2, 4, 4);
    
    ctx.fillStyle = color;
    // Tail
    ctx.fillRect(x, y + 15, 10, 10);
    // Legs (animated simply)
    if (Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.fillRect(x + 10, y + h - 5, 5, 5);
        ctx.fillRect(x + w - 15, y + h - 5, 5, 5);
    } else {
        ctx.fillRect(x + 15, y + h - 5, 5, 5);
        ctx.fillRect(x + w - 10, y + h - 5, 5, 5);
    }
}

function drawCactus(x, y, w, h, color) {
    ctx.fillStyle = color;
    // Main stem
    ctx.fillRect(x + w/3, y, w/3, h);
    // Left arm
    ctx.fillRect(x, y + h/3, w/3, h/3);
    ctx.fillRect(x, y + h/3 - 5, w/3, 5);
    // Right arm
    ctx.fillRect(x + 2*w/3, y + h/4, w/3, h/3);
    ctx.fillRect(x + 2*w/3, y + h/4 - 5, w/3, 5);
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (isGameOver) startGame();
        else jump();
    }
});

function endGame() {
    isGameOver = true;
    finalScoreEl.innerText = score;
    gameOverScreen.style.display = 'block';
    if (window.addPoints) window.addPoints(Math.floor(score / 5));
}

startGame();
