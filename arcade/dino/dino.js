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
    if (dino.y < 200) {
        dino.dy += gravity;
        dino.grounded = false;
    } else {
        dino.y = 200;
        dino.dy = 0;
        dino.grounded = true;
    }
    
    dino.y += dino.dy;

    // Draw Ground
    ctx.beginPath();
    ctx.moveTo(0, 240);
    ctx.lineTo(canvas.width, 240);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // Draw Dino
    ctx.fillStyle = dino.color;
    ctx.fillRect(dino.x, dino.y, dino.width, dino.height);

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
            color: '#ff0000'
        });
    }

    // Update Obstacles
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;

        // Draw Obstacle
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Collision Logic
        if (
            dino.x < obs.x + obs.width &&
            dino.x + dino.width > obs.x &&
            dino.y < obs.y + obs.height &&
            dino.y + dino.height > obs.y
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
    }
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
