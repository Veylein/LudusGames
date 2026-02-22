const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('game-score');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('final-score');

let score = 0;
let isGameOver = false;
let animationId;
let difficulty = 2;

// Player
const player = {
    x: canvas.width / 2,
    y: canvas.height - 30,
    width: 30,
    height: 20,
    dx: 0,
    speed: 5,
    bullets: []
};

// Aliens
let aliens = [];
const rows = 4;
const cols = 8;
let alienDirection = 1;
let alienSpeed = 1; 

function startGame() {
    score = 0;
    isGameOver = false;
    player.x = canvas.width / 2;
    player.bullets = [];
    aliens = [];
    scoreEl.innerText = score;
    gameOverScreen.style.display = 'none';

    // Difficulty
    difficulty = parseInt(localStorage.getItem("difficulty") || "0");
    if (difficulty === 0) alienSpeed = 0.5;
    else if (difficulty === 1) alienSpeed = 1;
    else alienSpeed = 2;

    // Create Aliens
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            aliens.push({
                x: 50 + c * 50,
                y: 30 + r * 40,
                width: 30,
                height: 20,
                active: true
            });
        }
    }

    if (animationId) cancelAnimationFrame(animationId);
    loop();
}

function loop() {
    if (isGameOver) return;
    update();
    draw();
    animationId = requestAnimationFrame(loop);
}

function update() {
    // Player Move
    player.x += player.dx;
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Bullets Move
    for (let i = 0; i < player.bullets.length; i++) {
        let b = player.bullets[i];
        b.y -= 7;
        if (b.y < 0) {
            player.bullets.splice(i, 1);
            i--;
        }
    }

    // Aliens Move
    let edgeHit = false;
    aliens.forEach(a => {
        if (!a.active) return;
        a.x += alienSpeed * alienDirection;
        if (a.x <= 0 || a.x + a.width >= canvas.width) {
            edgeHit = true;
        }
    });

    if (edgeHit) {
        alienDirection *= -1;
        aliens.forEach(a => {
            a.y += 20; // Move down
            if (a.y + a.height >= player.y) endGame(); // Hit player line
        });
    }

    // Alien Shooting (Randomly)
    if (Math.random() < 0.02 * (difficulty + 1)) {
        // Find a random active alien to shoot
        const activeAliens = aliens.filter(a => a.active);
        if (activeAliens.length > 0) {
            const shooter = activeAliens[Math.floor(Math.random() * activeAliens.length)];
            // Create alien bullet (simplified as global array or just draw immediately?)
            // For simplicity, let's not implement enemy bullets yet or add them to a list
            // Adding quickly:
            // enemyBullets.push({x: shooter.x + 15, y: shooter.y + 20});
        }
    }

    // Collisions Player Bullet -> Alien
    player.bullets.forEach((b, bIdx) => {
        aliens.forEach(a => {
            if (!a.active) return;
            if (b.x > a.x && b.x < a.x + a.width && b.y > a.y && b.y < a.y + a.height) {
                a.active = false;
                player.bullets.splice(bIdx, 1);
                score += 10;
                scoreEl.innerText = score;
                
                // Speed up as aliens die
                alienSpeed *= 1.05;
            }
        });
    });

    if (aliens.filter(a => a.active).length === 0) {
        // Respawn or Win
        endGame(true);
    }
}

function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Player
    ctx.fillStyle = '#0f0';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Aliens
    ctx.fillStyle = '#fff';
    aliens.forEach(a => {
        if (a.active) ctx.fillRect(a.x, a.y, a.width, a.height);
    });

    // Bullets
    ctx.fillStyle = '#ff0';
    player.bullets.forEach(b => {
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });
}

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') player.dx = -player.speed;
    if (e.key === 'ArrowRight') player.dx = player.speed;
    if (e.code === 'Space') {
        if (isGameOver) startGame();
        else {
            player.bullets.push({x: player.x + player.width/2 - 2, y: player.y, width: 4, height: 10});
        }
    }
});

document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') player.dx = 0;
});

function endGame(win) {
    isGameOver = true;
    finalScoreEl.innerText = score;
    document.querySelector('#gameOver h2').innerText = win ? "WAVE CLEARED!" : "GAME OVER";
    gameOverScreen.style.display = 'block';
    if (window.addPoints) window.addPoints(Math.floor(score / 5));
}

startGame();
