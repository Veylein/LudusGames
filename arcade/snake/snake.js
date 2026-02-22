const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('game-score');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('final-score');

const gridSize = 20;
const tileCountX = canvas.width / gridSize;
const tileCountY = canvas.height / gridSize;

let score = 0;
let snake = [];
let food = { x: 15, y: 15 };
let dx = 0;
let dy = 0;
let gameInterval;
let isGameOver = false;
let speed = 100;

document.addEventListener('keydown', keyDownEvent);

function startGame() {
    isGameOver = false;
    score = 0;
    dx = 1;
    dy = 0;
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    scoreEl.innerText = score;
    gameOverScreen.style.display = 'none';
    
    // Difficulty Settings
    const difficulty = parseInt(localStorage.getItem("difficulty") || "0");
    if (difficulty === 0) speed = 150; // Apprentice: Slow
    else if (difficulty === 1) speed = 100; // Gambler: Normal
    else speed = 60; // Ruthless: Fast

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, speed);
}

function gameLoop() {
    if (isGameOver) return;
    
    update();
    draw();
}

function update() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Wall Collision
    if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY) {
        endGame();
        return;
    }

    // Self Collision
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            endGame();
            return;
        }
    }

    snake.unshift(head);

    // Eat Food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.innerText = score;
        spawnFood();
        // Slightly increase speed
        if (speed > 40) {
            clearInterval(gameInterval);
            speed -= 2;
            gameInterval = setInterval(gameLoop, speed);
        }
    } else {
        snake.pop();
    }
}

function draw() {
    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (faint)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 0.5;
    for(let i=0; i<tileCountX; i++) {
        ctx.beginPath();
        ctx.moveTo(i*gridSize, 0);
        ctx.lineTo(i*gridSize, canvas.height);
        ctx.stroke();
    }
    for(let j=0; j<tileCountY; j++) {
        ctx.beginPath();
        ctx.moveTo(0, j*gridSize);
        ctx.lineTo(canvas.width, j*gridSize);
        ctx.stroke();
    }

    // Snake
    for (let i = 0; i < snake.length; i++) {
        ctx.fillStyle = (i === 0) ? '#00ff9d' : '#00cc7a'; // Head vs Body
        
        // Draw rounded rects
        let x = snake[i].x * gridSize;
        let y = snake[i].y * gridSize;
        let size = gridSize - 2;
        
        ctx.beginPath();
        if (i === 0) {
            // Head specialized drawing
            ctx.arc(x + gridSize/2, y + gridSize/2, size/2, 0, Math.PI*2);
            ctx.fill();
            
            // Eyes
            ctx.fillStyle = '#000';
            // Direction based eyes
            let eyeX1 = x + gridSize/3, eyeY1 = y + gridSize/3;
            let eyeX2 = x + 2*gridSize/3, eyeY2 = y + gridSize/3;
            
            if (dx === 1) { eyeX1 += 4; eyeX2 += 4; }
            if (dx === -1) { eyeX1 -= 4; eyeX2 -= 4; }
            if (dy === 1) { eyeY1 += 4; eyeY2 += 4; }
            if (dy === -1) { eyeY1 -= 4; eyeY2 -= 4; }

            ctx.beginPath(); ctx.arc(eyeX1, eyeY1, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(eyeX2, eyeY2, 2, 0, Math.PI*2); ctx.fill();
        } else {
            // Body segments
            ctx.fillRect(x + 1, y + 1, size, size);
        }
    }

    // Food (Apple)
    let fx = food.x * gridSize + gridSize/2;
    let fy = food.y * gridSize + gridSize/2;
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(fx, fy, gridSize/2 - 2, 0, Math.PI*2);
    ctx.fill();
    // Stem
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(fx - 1, fy - gridSize/2, 2, 4);
}

function spawnFood() {
    food.x = Math.floor(Math.random() * tileCountX);
    food.y = Math.floor(Math.random() * tileCountY);
    // Check if food spawns on snake (simple check)
    for (let part of snake) {
        if (part.x === food.x && part.y === food.y) spawnFood();
    }
}

function keyDownEvent(e) {
    // Prevent reverse direction
    if (e.keyCode === 37 && dx !== 1) { dx = -1; dy = 0; } // Left
    if (e.keyCode === 38 && dy !== 1) { dx = 0; dy = -1; } // Up
    if (e.keyCode === 39 && dx !== -1) { dx = 1; dy = 0; } // Right
    if (e.keyCode === 40 && dy !== -1) { dx = 0; dy = 1; } // Down
    if (e.keyCode === 32 && isGameOver) startGame(); // Space to restart
}

function endGame() {
    isGameOver = true;
    clearInterval(gameInterval);
    finalScoreEl.innerText = score;
    gameOverScreen.style.display = 'block';
    
    // Add points to global wallet
    if (window.addPoints) {
        window.addPoints(Math.floor(score / 10));
    }
}

// Init
startGame();
