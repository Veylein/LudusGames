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
    x: 50,
    y: canvas.height - 40,
    width: 20,
    height: 30,
    dx: 0,
    dy: 0,
    speed: 3,
    jumpForce: 10,
    grounded: false
};

// Platforms
const platforms = [
    { x: 0, y: canvas.height - 10, width: canvas.width, height: 10 }, // Floor
    { x: 0, y: 400, width: 350, height: 10 },
    { x: 150, y: 300, width: 350, height: 10 },
    { x: 0, y: 200, width: 350, height: 10 },
    { x: 150, y: 100, width: 100, height: 10 } // Top goal
];

const ladders = [
    { x: 300, y: 400, height: 90 },
    { x: 200, y: 300, height: 90 },
    { x: 300, y: 200, height: 90 }
];

let barrels = [];

function startGame() {
    score = 0;
    isGameOver = false;
    player.x = 50;
    player.y = canvas.height - 40;
    player.dx = 0;
    player.dy = 0;
    barrels = [];
    scoreEl.innerText = score;
    gameOverScreen.style.display = 'none';

    // Difficulty
    difficulty = parseInt(localStorage.getItem("difficulty") || "0");
    
    // Spawn barrels periodically
    setInterval(spawnBarrel, difficulty === 0 ? 3000 : (difficulty === 1 ? 2000 : 1000));

    if (animationId) cancelAnimationFrame(animationId);
    loop();
}

function spawnBarrel() {
    if (isGameOver) return;
    barrels.push({
        x: 20, 
        y: 80, 
        r: 10, 
        dx: 2, 
        dy: 0
    });
}

function loop() {
    if (isGameOver) return;
    update();
    draw();
    animationId = requestAnimationFrame(loop);
}

function update() {
    // Player Physics
    player.dy += 0.5; // Gravity
    player.x += player.dx;
    player.y += player.dy;

    // Platform Collision
    player.grounded = false;
    platforms.forEach(p => {
        if (player.x + player.width > p.x && player.x < p.x + p.width &&
            player.y + player.height > p.y && player.y + player.height < p.y + p.height + 5 &&
            player.dy >= 0) {
            
            player.grounded = true;
            player.dy = 0;
            player.y = p.y - player.height;
        }
    });

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y > canvas.height) endGame(false);

    // Goal
    if (player.y < 100 && player.x > 150 && player.x < 250) {
        endGame(true);
    }

    // Barrels Update
    barrels.forEach((b, i) => {
        b.x += b.dx;
        b.dy += 0.5;
        b.y += b.dy;

        // Platform Collision for barrels
        let onPlatform = false;
        platforms.forEach(p => {
             if (b.x > p.x && b.x < p.x + p.width &&
                b.y + b.r > p.y && b.y + b.r < p.y + p.height + 5 &&
                b.dy >= 0) {
                
                b.dy = 0;
                b.y = p.y - b.r;
                onPlatform = true;
            }
        });

        // Edge turn
        if (b.x > canvas.width || b.x < 0) {
             b.dx *= -1; // Bounce off walls? Or fall off platform?
             // Simple: bounce
        }
        
        // Simple logic: if at edge of platform, fall down?
        // Let's rely on gravity. If no platform under, fails.

        // Player Collision
        const dist = Math.sqrt((player.x + player.width/2 - b.x)**2 + (player.y + player.height/2 - b.y)**2);
        if (dist < b.r + 10) {
            endGame(false);
        }

        // Clean up
        if (b.y > canvas.height) {
            barrels.splice(i, 1);
            score += 100;
            scoreEl.innerText = score;
        }
    });
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Background

    // Draw Ladders
    ctx.fillStyle = '#00BFFF'; // Deep Sky Blue
    ladders.forEach(l => {
        // Vertical Rails
        ctx.fillRect(l.x, l.y, 4, l.height);
        ctx.fillRect(l.x + 16, l.y, 4, l.height);
        // Rungs
        for(let yh = l.y; yh < l.y + l.height; yh += 10) {
            ctx.fillRect(l.x, yh, 20, 2);
        }
    });

    // Draw Platforms (Girders)
    platforms.forEach(p => {
        ctx.fillStyle = '#b22222'; // Red Girder
        ctx.fillRect(p.x, p.y, p.width, p.height);
        
        // Girder details (X pattern)
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i = 0; i < p.width - 10; i+=20) {
            ctx.moveTo(p.x + i, p.y + 1);
            ctx.lineTo(p.x + i + 10, p.y + p.height - 1);
            ctx.moveTo(p.x + i + 10, p.y + 1);
            ctx.lineTo(p.x + i, p.y + p.height - 1);
        }
        ctx.stroke();
    });

    // Draw Kong (Top Left/Center decor)
    // Assuming Kong is near the top platform
    let kongX = 50; 
    let kongY = 80;
    ctx.fillStyle = '#8B4513'; // Brown Ape
    ctx.fillRect(kongX, kongY, 40, 40); // Body
    ctx.fillRect(kongX + 10, kongY - 10, 20, 10); // Head
    ctx.fillStyle = '#ffcc99'; // Face
    ctx.fillRect(kongX + 15, kongY - 5, 10, 5);
    // Arms
    ctx.fillStyle = '#8B4513';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillRect(kongX - 10, kongY, 10, 30); // Left Arm Down
        ctx.fillRect(kongX + 40, kongY - 20, 10, 30); // Right Arm Up (Throwing)
    } else {
        ctx.fillRect(kongX - 10, kongY - 20, 10, 30); // Left Arm Up
        ctx.fillRect(kongX + 40, kongY, 10, 30); // Right Arm Down
    }

    // Draw Player (Jumpman/Mario-ish)
    ctx.fillStyle = '#f00'; // Red shirt
    ctx.fillRect(player.x + 4, player.y + 10, 12, 10);
    ctx.fillStyle = '#00f'; // Blue overalls
    ctx.fillRect(player.x + 4, player.y + 20, 12, 10);
    ctx.fillStyle = '#ffcc99'; // Skin
    ctx.fillRect(player.x + 6, player.y + 2, 8, 8); // Head
    ctx.fillStyle = '#f00'; // Hat
    ctx.fillRect(player.x + 4, player.y, 14, 4);
    
    // Draw Barrels
    ctx.fillStyle = '#8B4513'; // Wood Brown
    ctx.strokeStyle = '#000'; 
    barrels.forEach(b => {
        ctx.save();
        ctx.translate(b.x, b.y);
        // Rotate based on x position to simulate rolling
        ctx.rotate(b.x / 10); 
        
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Barrel Detail (Hoops)
        ctx.fillStyle = '#000';
        ctx.fillRect(-b.r, -2, b.r*2, 4);
        
        ctx.restore();
    });
}

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') player.dx = -player.speed;
    if (e.key === 'ArrowRight') player.dx = player.speed;
    if (e.code === 'Space' && player.grounded) {
        player.dy = -player.jumpForce;
        player.grounded = false;
    }
    if (e.code === 'Space' && isGameOver) {
        startGame();
    }
});

document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') player.dx = 0;
});

function endGame(win) {
    isGameOver = true;
    finalScoreEl.innerText = score;
    document.querySelector('#gameOver h2').innerText = win ? "REACHED TOP!" : "GAME OVER";
    gameOverScreen.style.display = 'block';
    if (window.addPoints) window.addPoints(Math.floor(score / 10));
}

startGame(); // Spawn first barrel
