const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('game-score');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('final-score');

let score = 0;
let isGameOver = false;
let animationId;
let difficulty = 1;

const GRID = 40;
const player = {
    x: 5 * GRID,
    y: 13 * GRID,
    width: 30,
    height: 30,
    color: 'white'
};

const lanes = [];

function startGame() {
    score = 0;
    isGameOver = false;
    player.x = 5 * GRID;
    player.y = 13 * GRID;
    lanes.length = 0;
    
    // Create Lanes
    // 0 = Safe (Grass), 1 = Road (Cars), 2 = Water (Logs - skipped for now, keep simple road)
    for (let i = 0; i < 14; i++) {
        lanes.push(generateLane(i));
    }
    
    scoreEl.innerText = score;
    gameOverScreen.style.display = 'none';

    // Difficulty
    difficulty = parseInt(localStorage.getItem("difficulty") || "0");
    
    if (animationId) cancelAnimationFrame(animationId);
    loop();
}

function generateLane(row) {
    let type = (row === 0 || row === 13) ? 0 : (Math.random() > 0.5 ? 1 : 0);
    // Ensure some safe lanes
    if (row % 3 === 0) type = 0; 
    
    return {
        y: row * GRID,
        type: type, // 0 = safe, 1 = road, 2 = water
        speed: type === 0 ? 0 : (Math.random() * 2 + 1) * (Math.random() > 0.5 ? 1 : -1),
        obstacles: []
    };
}

function spawnObstacle() {
    lanes.forEach(lane => {
        if (lane.type === 1) { // Road
            if (Math.random() < 0.02 * (Math.abs(lane.speed))) {
                lane.obstacles.push({
                    x: lane.speed > 0 ? -60 : canvas.width,
                    y: lane.y + 5,
                    width: 50,
                    height: 30,
                    color: 'red'
                });
            }
        }
    });
}

function loop() {
    if (isGameOver) return;
    update();
    draw();
    animationId = requestAnimationFrame(loop);
}

function update() {
    spawnObstacle();
    
    lanes.forEach(lane => {
        lane.obstacles.forEach((obs, i) => {
            obs.x += lane.speed;
            
            // Collision
            if (rectIntersect(player, obs)) {
                endGame();
            }
            
            // Remove off-screen
            if ((lane.speed > 0 && obs.x > canvas.width) || (lane.speed < 0 && obs.x + obs.width < 0)) {
                lane.obstacles.splice(i, 1);
            }
        });
    });
    
    // Win Condition (Reach Top)
    if (player.y < 0) {
        player.y = 13 * GRID;
        score += 50;
        scoreEl.innerText = score;
        // Increase difficulty?
        lanes.forEach(l => { if(l.type === 1) l.speed *= 1.1; });
    }
}

function rectIntersect(p, obs) {
    return !(obs.x > p.x + p.width || 
             obs.x + obs.width < p.x || 
             obs.y > p.y + p.height || 
             obs.y + obs.height < p.y);
}

function draw() {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    lanes.forEach(lane => {
        if (lane.type === 0) {
            ctx.fillStyle = '#228B22'; // Grass
            ctx.fillRect(0, lane.y, canvas.width, GRID);
        } else if (lane.type === 1) {
            ctx.fillStyle = '#555'; // Road
            ctx.fillRect(0, lane.y, canvas.width, GRID);
            // Dashed line
            ctx.strokeStyle = '#fff';
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(0, lane.y + GRID/2);
            ctx.lineTo(canvas.width, lane.y + GRID/2);
            ctx.stroke();
            
            // Obstacles
            ctx.fillStyle = 'blue';
            lane.obstacles.forEach(obs => {
                ctx.fillStyle = obs.color;
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            });
        }
    });

    // Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

document.addEventListener('keydown', e => {
    if (e.isComposing || e.keyCode === 229) return;
    
    const oldX = player.x;
    const oldY = player.y;

    if (e.key === 'ArrowUp') player.y -= GRID;
    if (e.key === 'ArrowDown') player.y += GRID;
    if (e.key === 'ArrowLeft') player.x -= GRID;
    if (e.key === 'ArrowRight') player.x += GRID;
    
    // Bounds check
    if (player.y > canvas.height - GRID) player.y = canvas.height - GRID;
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - GRID) player.x = canvas.width - GRID;
    
    // Score for moving forward?
    if (player.y < oldY) {
        score++;
        scoreEl.innerText = score;
    }
});

function endGame() {
    isGameOver = true;
    finalScoreEl.innerText = score;
    gameOverScreen.style.display = 'block';
    if (window.addPoints) window.addPoints(Math.floor(score / 5));
}

startGame();
