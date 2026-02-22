const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('game-score');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('final-score');

let score = 0;
let isGameOver = false;
let animationId;
let difficulty = 1;

// Player
const player = {
    x: canvas.width / 2,
    y: canvas.height - 30,
    width: 20,
    height: 20,
    speed: 5,
    bullets: []
};

// Centipede
let centipede = [];
const SEGMENT_SIZE = 20;
let centipedeSpeed = 2;

// Mushrooms
let mushrooms = [];

function startGame() {
    score = 0;
    isGameOver = false;
    player.x = canvas.width / 2;
    player.y = canvas.height - 30;
    player.bullets = [];
    centipede = [];
    mushrooms = [];
    scoreEl.innerText = score;
    gameOverScreen.style.display = 'none';

    // Difficulty
    difficulty = parseInt(localStorage.getItem("difficulty") || "0");
    if (difficulty === 0) centipedeSpeed = 2;
    else if (difficulty === 1) centipedeSpeed = 4;
    else centipedeSpeed = 6;

    // Create Centipede
    for (let i = 0; i < 10; i++) {
        centipede.push({
            x: i * SEGMENT_SIZE,
            y: 0,
            dx: centipedeSpeed,
            dy: 0,
            width: SEGMENT_SIZE,
            height: SEGMENT_SIZE
        });
    }

    // Create Random Mushrooms
    for (let i = 0; i < 30; i++) {
        mushrooms.push({
            x: Math.floor(Math.random() * (canvas.width / SEGMENT_SIZE)) * SEGMENT_SIZE,
            y: Math.floor(Math.random() * (canvas.height / SEGMENT_SIZE - 2)) * SEGMENT_SIZE + SEGMENT_SIZE,
            width: SEGMENT_SIZE,
            height: SEGMENT_SIZE,
            health: 3
        });
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
    // Player - only move x for simplicity in this version, or full movement?
    // Original allowed full movement in bottom area. Let's keep it simple: X only.
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Bullets
    for (let i = 0; i < player.bullets.length; i++) {
        let b = player.bullets[i];
        b.y -= 10;
        if (b.y < 0) {
            player.bullets.splice(i, 1);
            i--;
            continue;
        }

        // Mushroom Collision
        for (let j = 0; j < mushrooms.length; j++) {
            let m = mushrooms[j];
            if (rectIntersect(b, m)) {
                player.bullets.splice(i, 1);
                i--;
                m.health--;
                if (m.health <= 0) {
                    mushrooms.splice(j, 1);
                    score += 1;
                }
                break; // Bullet hits one thing
            }
        }
    }

    // Centipede Logic
    centipede.forEach(seg => {
        seg.x += seg.dx;

        // Wall or Mushroom Collision
        let hit = false;
        if (seg.x < 0 || seg.x + seg.width > canvas.width) hit = true;
        
        // Mushroom check
        mushrooms.forEach(m => {
            if (rectIntersect(seg, m)) hit = true;
        });

        if (hit) {
            seg.dx *= -1;
            seg.y += SEGMENT_SIZE;
            // Move it out of collision if stuck?
            if (seg.x < 0) seg.x = 0;
            if (seg.x + seg.width > canvas.width) seg.x = canvas.width - seg.width;
        }

        // Player Collision
        if (rectIntersect(seg, player)) {
            endGame(false);
        }
        
        // Bottom Collision
        if (seg.y + seg.height > canvas.height) {
             // Loop to top? Or Game Over?
             // Usually it moves back up but stays in player area.
             // Simpler: loop to top
             seg.y = 0;
        }
    });

    // Bullet Hit Centipede
    player.bullets.forEach((b, bIdx) => {
        centipede.forEach((seg, sIdx) => {
            if (rectIntersect(b, seg)) {
                // Kill segment
                centipede.splice(sIdx, 1);
                player.bullets.splice(bIdx, 1);
                score += 10;
                scoreEl.innerText = score;
                
                // Spawn mushroom at dead segment location
                mushrooms.push({
                    x: Math.round(seg.x / SEGMENT_SIZE) * SEGMENT_SIZE,
                    y: Math.round(seg.y / SEGMENT_SIZE) * SEGMENT_SIZE,
                    width: SEGMENT_SIZE,
                    height: SEGMENT_SIZE,
                    health: 3
                });
            }
        });
    });

    if (centipede.length === 0) {
        // Respawn new wave
        endGame(true);
    }
}

function rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.width || 
             r2.x + r2.width < r1.x || 
             r2.y > r1.y + r1.height || 
             r2.y + r2.height < r1.y);
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Player
    ctx.fillStyle = '#0f0';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Centipede
    ctx.fillStyle = '#f0f';
    centipede.forEach(seg => {
        ctx.beginPath();
        ctx.arc(seg.x + SEGMENT_SIZE/2, seg.y + SEGMENT_SIZE/2, SEGMENT_SIZE/2, 0, Math.PI*2);
        ctx.fill();
    });

    // Mushrooms
    mushrooms.forEach(m => {
        ctx.fillStyle = `rgba(255, 0, 0, ${m.health / 3})`;
        ctx.fillRect(m.x, m.y, m.width, m.height);
    });

    // Bullets
    ctx.fillStyle = '#ff0';
    player.bullets.forEach(b => {
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });
}

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') player.x -= 20;
    if (e.key === 'ArrowRight') player.x += 20;
    if (e.code === 'Space') {
        if (isGameOver) startGame();
        else {
            player.bullets.push({
                x: player.x + player.width/2 - 2, 
                y: player.y, 
                width: 4, 
                height: 10
            });
        }
    }
});

function endGame(win) {
    isGameOver = true;
    finalScoreEl.innerText = score;
    document.querySelector('#gameOver h2').innerText = win ? "WAVE CLEARED!" : "GAME OVER";
    gameOverScreen.style.display = 'block';
    if (window.addPoints) window.addPoints(Math.floor(score / 5));
}

startGame();
