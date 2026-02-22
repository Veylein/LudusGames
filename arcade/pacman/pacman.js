const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('game-score');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('final-score');

const TILE_SIZE = 20;
let score = 0;
let isGameOver = false;
let animationId;
let difficulty = 0;

// 1 = Wall, 0 = Dot, 2 = Empty, 3 = Power Pellet
const mapLayout = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,3,0,0,0,0,0,0,0,0,0,3,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,0,1,1,1,2,1,2,1,1,1,0,1,1,1,1,1],
    [2,2,2,1,0,1,2,2,2,2,2,2,2,1,0,1,2,2,2,2],
    [1,1,1,1,0,1,2,1,1,2,1,1,2,1,0,1,1,1,1,1],
    [1,0,0,0,0,0,0,1,2,2,2,1,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,1,0,1,0,0,0,1,0,0,0,1,0,1,0,0,0,1],
    [1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1],
    [1,0,0,0,3,0,0,0,0,0,0,0,0,0,3,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Determine canvas size from map
canvas.width = mapLayout[0].length * TILE_SIZE;
canvas.height = mapLayout.length * TILE_SIZE;

let walls = [];
let dots = [];
let player = { x: 1, y: 1, dx: 0, dy: 0, nextDx: 0, nextDy: 0, speed: 0.1 }; // Speed in tiles per frame
let ghosts = [];

function startGame() {
    score = 0;
    isGameOver = false;
    walls = [];
    dots = [];
    ghosts = [];
    scoreEl.innerText = score;
    gameOverScreen.style.display = 'none';
    
    // Parse Map
    for (let r = 0; r < mapLayout.length; r++) {
        for (let c = 0; c < mapLayout[r].length; c++) {
            if (mapLayout[r][c] === 1) {
                walls.push({ x: c, y: r });
            } else if (mapLayout[r][c] === 0 || mapLayout[r][c] === 3) {
                dots.push({ x: c, y: r, type: mapLayout[r][c] });
            }
        }
    }

    // Reset Player
    player = { x: 1, y: 1, dx: 0, dy: 0, nextDx: 0, nextDy: 0, speed: 0.15 }; // Grid coordinates (float)

    // Setup Difficulty
    difficulty = parseInt(localStorage.getItem("difficulty") || "0");
    let ghostCount = 2; // Apprentice
    let ghostSpeed = 0.05;

    if (difficulty === 1) { ghostCount = 3; ghostSpeed = 0.08; } // Gambler
    if (difficulty === 2) { ghostCount = 4; ghostSpeed = 0.1; } // Ruthless

    // Ghost Spawn Points (center of map roughly)
    for (let i = 0; i < ghostCount; i++) {
        ghosts.push({
            x: 9 + i, 
            y: 9, 
            dx: Math.random() > 0.5 ? 1 : -1, 
            dy: 0, 
            speed: ghostSpeed,
            color: ['red', 'pink', 'cyan', 'orange'][i % 4]
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
    movePlayer();
    moveGhosts();
    checkCollisions();
}

function movePlayer() {
    // Attempt turn
    if (player.nextDx !== 0 || player.nextDy !== 0) {
        if (canMove(player.x, player.y, player.nextDx, player.nextDy)) {
             // Snap to grid if changing axis
             if (player.dx !== 0 && player.nextDy !== 0) player.x = Math.round(player.x);
             if (player.dy !== 0 && player.nextDx !== 0) player.y = Math.round(player.y);
             
             player.dx = player.nextDx;
             player.dy = player.nextDy;
             player.nextDx = 0;
             player.nextDy = 0;
        }
    }

    if (canMove(player.x, player.y, player.dx, player.dy)) {
        player.x += player.dx * player.speed;
        player.y += player.dy * player.speed;
    } else {
        // Snap to grid
        player.x = Math.round(player.x);
        player.y = Math.round(player.y);
    }

    // Eat Dots
    for (let i = 0; i < dots.length; i++) {
        let d = dots[i];
        // Simple distance check
        if (Math.abs(player.x - d.x) < 0.5 && Math.abs(player.y - d.y) < 0.5) {
            score += (d.type === 3) ? 50 : 10;
            dots.splice(i, 1);
            scoreEl.innerText = score;
            // Power pellet logic could go here (scared ghosts)
        }
    }
    
    if (dots.length === 0) {
        // Win condition - respawn dots? Or end level?
        endGame(true);
    }
}

function moveGhosts() {
    ghosts.forEach(g => {
        // Move
        if (canMove(g.x, g.y, g.dx, g.dy)) {
            g.x += g.dx * g.speed;
            g.y += g.dy * g.speed;
        } else {
            // Hit wall, pick new random direction
            g.x = Math.round(g.x);
            g.y = Math.round(g.y);
            
            // Try random directions
            const dirs = [{dx:1, dy:0}, {dx:-1, dy:0}, {dx:0, dy:1}, {dx:0, dy:-1}];
            const validDirs = dirs.filter(d => canMove(g.x, g.y, d.dx, d.dy));
            
            if (validDirs.length > 0) {
                const choice = validDirs[Math.floor(Math.random() * validDirs.length)];
                g.dx = choice.dx;
                g.dy = choice.dy;
            } else {
                g.dx = -g.dx;
                g.dy = -g.dy;
            }
        }
        
        // Randomly change direction at intersections
        if (Math.abs(g.x - Math.round(g.x)) < 0.1 && Math.abs(g.y - Math.round(g.y)) < 0.1) {
             if (Math.random() < 0.05) { // 5% chance to change direction at intersection
                const dirs = [{dx:1, dy:0}, {dx:-1, dy:0}, {dx:0, dy:1}, {dx:0, dy:-1}];
                const validDirs = dirs.filter(d => canMove(g.x, g.y, d.dx, d.dy));
                if (validDirs.length > 0) {
                    const choice = validDirs[Math.floor(Math.random() * validDirs.length)];
                    g.dx = choice.dx;
                    g.dy = choice.dy;
                }
             }
        }
    });
}

function canMove(x, y, dx, dy) {
    // Check next tile center roughly
    const nextX = x + dx * 0.6; // Look ahead slightly
    const nextY = y + dy * 0.6;
    
    const tileX = Math.round(nextX);
    const tileY = Math.round(nextY);
    
    // Check map bounds
    if (tileY < 0 || tileY >= mapLayout.length || tileX < 0 || tileX >= mapLayout[0].length) {
        return false;
    }
    
    if (mapLayout[tileY][tileX] === 1) return false;
    
    return true;
}

function checkCollisions() {
    ghosts.forEach(g => {
        const dist = Math.sqrt((player.x - g.x)**2 + (player.y - g.y)**2);
        if (dist < 0.8) {
            endGame(false);
        }
    });
}

function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Walls
    ctx.fillStyle = '#1111aa';
    walls.forEach(w => {
        ctx.fillRect(w.x * TILE_SIZE, w.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
    
    // Dots
    ctx.fillStyle = 'white';
    dots.forEach(d => {
        if (d.type === 3) {
            ctx.beginPath();
            ctx.arc(d.x * TILE_SIZE + TILE_SIZE/2, d.y * TILE_SIZE + TILE_SIZE/2, 6, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(d.x * TILE_SIZE + TILE_SIZE/2 - 2, d.y * TILE_SIZE + TILE_SIZE/2 - 2, 4, 4);
        }
    });
    
    // Player
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    // Simple Pacman mouth animation could go here
    ctx.arc(player.x * TILE_SIZE + TILE_SIZE/2, player.y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE/2 - 2, 0.2 * Math.PI, 1.8 * Math.PI);
    ctx.lineTo(player.x * TILE_SIZE + TILE_SIZE/2, player.y * TILE_SIZE + TILE_SIZE/2);
    ctx.fill();
    
    // Ghosts
    ghosts.forEach(g => {
        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.arc(g.x * TILE_SIZE + TILE_SIZE/2, g.y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE/2 - 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

document.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }
    
    if (e.key === 'ArrowUp') { player.nextDx = 0; player.nextDy = -1; }
    if (e.key === 'ArrowDown') { player.nextDx = 0; player.nextDy = 1; }
    if (e.key === 'ArrowLeft') { player.nextDx = -1; player.nextDy = 0; }
    if (e.key === 'ArrowRight') { player.nextDx = 1; player.nextDy = 0; }
    if (e.code === 'Space' && isGameOver) {
        startGame();
    }
});

function endGame(win) {
    isGameOver = true;
    finalScoreEl.innerText = score;
    document.querySelector('#gameOver h2').innerText = win ? "VICTORY!" : "GAME OVER";
    gameOverScreen.style.display = 'block';
    if (window.addPoints) window.addPoints(Math.floor(score / 10));
}

startGame();
