const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
// Explicit size for consistent levels
canvas.width = 600; 
canvas.height = 600; // Taller for more floors

const scoreEl = document.getElementById('game-score');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('final-score');

let score = 0;
let isGameOver = false;
let isPaused = false;
let animationId;
let difficulty = 1;

// Pause UI
const pauseBtn = document.getElementById('pause-btn');
if(pauseBtn) {
    pauseBtn.addEventListener('click', togglePause);
}

function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    if(pauseBtn) pauseBtn.innerText = isPaused ? "RESUME" : "PAUSE";
    if (!isPaused) loop();
}

// Player
const player = {
    x: 50,
    y: canvas.height - 40,
    width: 20,
    height: 30,
    dx: 0,
    dy: 0,
    speed: 3,
    jumpForce: 7, // Reduced from 10 to prevent skipping levels

// Platforms (More levels, zig-zag)
const platforms = [
    { x: 0, y: canvas.height - 10, width: canvas.width, height: 10 }, // Floor 1
    { x: 0, y: canvas.height - 80, width: canvas.width - 60, height: 10 }, // Floor 2 (Left)
    { x: 60, y: canvas.height - 150, width: canvas.width - 60, height: 10 }, // Floor 3 (Right)
    { x: 0, y: canvas.height - 220, width: canvas.width - 60, height: 10 }, // Floor 4 (Left)
    { x: 60, y: canvas.height - 290, width: canvas.width - 60, height: 10 }, // Floor 5 (Right)
    { x: 0, y: canvas.height - 360, width: canvas.width - 60, height: 10 }, // Floor 6 (Left)
    { x: 60, y: canvas.height - 430, width: canvas.width - 60, height: 10 }, // Floor 7 (Right)
    { x: canvas.width/2 - 50, y: 50, width: 100, height: 10 } // Top Goal
];

const ladders = [
    { x: canvas.width - 80, y: canvas.height - 80, height: 70 },
    { x: 80, y: canvas.height - 150, height: 70 },
    { x: canvas.width - 80, y: canvas.height - 220, height: 70 },
    { x: 80, y: canvas.height - 290, height: 70 },
    { x: canvas.width - 80, y: canvas.height - 360, height: 70 },
    { x: 80, y: canvas.height - 430, height: 70 },
    { x: canvas.width/2, y: 50, height: canvas.height - 430 - 50 } // Long climb to top? No, just short.
];
// Fix last ladder
ladders[6] = { x: canvas.width/2, y: 50, height: (canvas.height - 430) - 50 + 10 }; 
// Actually top platform y is 50. Floor 7 y is (H-430). 
// Ladder from Floor 7 to Goal.
ladders[6] = { x: canvas.width/2, y: 50, height: (canvas.height - 430) - 50 };


let barrels = [];

function startGame() {
    score = 0;
    isGameOver = false;
    isPaused = false;
    if(pauseBtn) pauseBtn.innerText = "PAUSE";

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
    if (isPaused) return;

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
    ctx.fillStyle = '#00bcd4'; // Cyan
    ladders.forEach(l => {
        for(let yh = l.y; yh < l.y + l.height; yh += 4) {
            ctx.fillRect(l.x, yh, 4, 2); // Left rail
            ctx.fillRect(l.x + 16, yh, 4, 2); // Right rail
            if ((yh - l.y) % 8 === 0) ctx.fillRect(l.x, yh, 20, 2); // Rung
        }
    });

    // Draw Platforms (Girders)
    platforms.forEach(p => {
        ctx.fillStyle = '#d32f2f'; // Red Girder
        ctx.fillRect(p.x, p.y, p.width, p.height);
        
        ctx.fillStyle = '#000';
        // Girder Holes (Pixel pattern)
        for(let i = 2; i < p.width - 2; i+=8) {
            ctx.fillRect(p.x + i, p.y + 2, 4, p.height - 4);
        }
        
        ctx.strokeStyle = '#d32f2f';
        ctx.strokeRect(p.x, p.y, p.width, p.height);
    });

    // Draw Kong (Pixel Art)
    let kx = 50; 
    let ky = 70;
    
    // Body Brown
    ctx.fillStyle = '#5d4037'; 
    ctx.fillRect(kx, ky, 50, 50);
    // Chest
    ctx.fillStyle = '#ffa000'; 
    ctx.fillRect(kx+10, ky+10, 30, 20);
    // Face
    ctx.fillStyle = '#ffa000'; 
    ctx.fillRect(kx+15, ky-10, 20, 15); // Head
    ctx.fillStyle = '#000'; // Eyes
    ctx.fillRect(kx+18, ky-6, 4, 2);
    ctx.fillRect(kx+28, ky-6, 4, 2);
    // Mouth (Teeth)
    ctx.fillStyle = '#fff';
    ctx.fillRect(kx+18, ky-2, 14, 4);

    // Arms
    ctx.fillStyle = '#5d4037';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        // Chest Pound
        ctx.fillRect(kx-10, ky+5, 15, 30); // L
        ctx.fillRect(kx+45, ky+5, 15, 30); // R
    } else {
        // Arms Up
        ctx.fillRect(kx-10, ky-15, 15, 30); 
        ctx.fillRect(kx+45, ky-15, 15, 30);
    }
    
    // Draw Princess (Pink)
    ctx.fillStyle = '#ff80ab';
    let px = 20, py = 40; // Top platform usually
    ctx.fillRect(px, py, 10, 20); // Dress
    ctx.fillStyle = '#ffcc80'; // Skin
    ctx.fillRect(px+2, py-6, 6, 6); // Head
    ctx.fillStyle = '#ffd700'; // Hair
    ctx.fillRect(px, py-6, 10, 4);

    // Draw Player (Mario Sprite)
    // Running Animation Frames
    const runFrame = Math.floor(Date.now() / 100) % 2;
    const pxScale = 2;
    const mx = player.x;
    const my = player.y;
    
    // Jumpman Colors
    const mRed = '#d50000';
    const mBlue = '#2962ff';
    const mSkin = '#ffcc80';
    
    // Hat
    ctx.fillStyle = mRed;
    ctx.fillRect(mx + 2, my, 12, 4);
    // Head
    ctx.fillStyle = mSkin;
    ctx.fillRect(mx + 4, my + 4, 10, 6);
    // Eye/Stache
    ctx.fillStyle = '#000';
    ctx.fillRect(mx + 10, my + 5, 2, 2); // Eye
    ctx.fillRect(mx + 8, my + 8, 8, 2); // Stache
    
    // Body (Overalls Blue, Shirt Red)
    // Shirt
    ctx.fillStyle = mBlue;
    ctx.fillRect(mx + 4, my + 10, 8, 10); // Body
    // Arms (Red)
    ctx.fillStyle = mRed;
    if (runFrame === 0 || !player.dx) {
         ctx.fillRect(mx, my + 12, 4, 4); // L
         ctx.fillRect(mx + 12, my + 12, 4, 4); // R
    } else {
         ctx.fillRect(mx - 2, my + 10, 4, 4); // L Swing
         ctx.fillRect(mx + 14, my + 10, 4, 4); // R Swing
    }
    
    // Legs (Blue)
    ctx.fillStyle = mBlue;
    if (player.grounded) {
        if (runFrame === 0 || Math.abs(player.dx) < 0.1) {
            ctx.fillRect(mx + 4, my + 20, 4, 4);
            ctx.fillRect(mx + 10, my + 20, 4, 4);
        } else {
            ctx.fillRect(mx + 2, my + 18, 4, 4); // Run stride
            ctx.fillRect(mx + 12, my + 18, 4, 4);
        }
    } else {
        // Jump pose
        ctx.fillRect(mx, my + 18, 6, 4);
        ctx.fillRect(mx + 12, my + 16, 6, 4);
    }
    
    // Draw Barrels (Rolling Sprite)
    // Brown cylinder with hoops
    const bColor = '#795548';
    const hoopColor = '#000';
    
    barrels.forEach(b => {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.x / 15);
        
        ctx.fillStyle = bColor;
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.fill();
        
        // Hoops
        ctx.fillStyle = hoopColor;
        // Draw centered rects for hoops, rotated
        ctx.fillRect(-b.r, -4, b.r*2, 2);
        ctx.fillRect(-b.r, 2, b.r*2, 2);
        
        // Rolling detail "L" or skull?
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.fillText("XX", -6, 2);
        
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
