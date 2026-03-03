
// --- CONFIGURATION & STATE ---
const TILE_SIZE = 32;
const MAP_WIDTH = 100;
const MAP_HEIGHT = 100;

// Colors for pixel art look
const COLORS = {
    GRASS: '#4caf50',
    WATER: '#2196f3',
    SAND: '#ffeb3b',
    DIRT: '#795548',
    TREE: '#2e7d32',
    STONE: '#9e9e9e',
    PLAYER: '#ffffff',
    NPC: '#ff9800',
    HOUSE: '#5d4037'
};

const gameState = {
    mode: 'survival', 
    time: 0, 
    year: 1,
    camera: { x: 0, y: 0 },
    map: [],
    entities: [],
    player: null,
    selectedEntity: null,
    dayTime: 0 // 0 to 24
};

// --- DATA STRUCTURES ---

class Brain {
    constructor(id) {
        this.name = `NPC_${id}`;
        this.beliefs = []; // e.g. ["The sky is blue", "[User] is watching"]
        this.trust = 0.5;
        this.trauma = [];
        this.memory = []; // e.g. { event: "fireball", emotional_weight: 0.9, time: 100 }
        // Adding needs for simulation
        this.needs = {
            hunger: 0,
            social: 0,
            energy: 100
        };
    }

    addMemory(event, weight) {
        this.memory.push({
            event: event,
            emotional_weight: weight,
            time: gameState.time
        });
        // Limit memory size
        if (this.memory.length > 20) this.memory.shift();
    }
}

class Entity {
    constructor(type, x, y, id) {
        this.type = type; // 'player', 'npc', 'animal'
        this.id = id;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.speed = type === 'player' ? 3 : 1 + Math.random();
        this.width = 20;
        this.height = 20;
        this.color = type === 'player' ? COLORS.PLAYER : COLORS.NPC;
        
        if (type === 'npc') {
            this.brain = new Brain(id);
            this.state = 'idle';
            this.stateTimer = 0;
        } else if (type === 'player') {
            this.inventory = { wood: 0, stone: 0, food: 0 };
        }
    }

    update(dt) {
        if (this.type === 'npc') {
            this.updateAI(dt);
        }

        // Physics
        let nextX = this.x + this.vx;
        let nextY = this.y + this.vy;

        // Map Bounds Collision
        if (nextX < 0) nextX = 0;
        if (nextX > MAP_WIDTH * TILE_SIZE) nextX = MAP_WIDTH * TILE_SIZE;
        if (nextY < 0) nextY = 0;
        if (nextY > MAP_HEIGHT * TILE_SIZE) nextY = MAP_HEIGHT * TILE_SIZE;

        // Tile Collision (Simple check)
        // Ensure we don't walk into water (unless boat?)
        const tileX = Math.floor(nextX / TILE_SIZE);
        const tileY = Math.floor(nextY / TILE_SIZE);
        
        // This is a simplified check, ideally check all corners
        if (gameState.map[tileY] && gameState.map[tileY][tileX] && gameState.map[tileY][tileX].type !== 'water') {
             this.x = nextX;
             this.y = nextY;
        } else if (this.type === 'player' && gameState.mode === 'god') {
             // God can walk on water
             this.x = nextX;
             this.y = nextY;
        }
    }

    updateAI(dt) {
        this.stateTimer -= dt;
        
        if (this.stateTimer <= 0) {
            // Pick new state
            const r = Math.random();
            if (r < 0.2) {
                this.state = 'idle';
                this.vx = 0;
                this.vy = 0;
                this.stateTimer = 1000 + Math.random() * 2000;
            } else if (r < 0.8) {
                this.state = 'wander';
                const angle = Math.random() * Math.PI * 2;
                this.vx = Math.cos(angle) * this.speed;
                this.vy = Math.sin(angle) * this.speed;
                this.stateTimer = 2000 + Math.random() * 3000;
            } else {
                // Socialize or check needs (placeholder)
                this.state = 'thinking';
                this.vx = 0;
                this.vy = 0;
                this.stateTimer = 500;
            }
        }
    }
}

// --- WORLD GENERATION ---

function generateMap() {
    const map = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        const row = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            // Simple noise
            const noise = Math.sin(x * 0.1) + Math.cos(y * 0.15);
            let type = 'grass';
            if (noise < -0.8) type = 'water';
            else if (noise < -0.6) type = 'sand';
            else if (noise > 1.2) type = 'stone';

            // Add resource/object
            let object = null;
            if (type === 'grass' && Math.random() < 0.05) object = { type: 'tree' };
            if (type === 'stone' && Math.random() < 0.1) object = { type: 'ore' };

            row.push({ x, y, type, object });
        }
        map.push(row);
    }
    return map;
}

// --- ENGINE ---

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let lastTime = 0;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function init() {
    gameState.map = generateMap();
    gameState.player = new Entity('player', (MAP_WIDTH * TILE_SIZE) / 2, (MAP_HEIGHT * TILE_SIZE) / 2, 'player');
    
    // Create NPCs
    for (let i = 0; i < 20; i++) {
        const x = (MAP_WIDTH * TILE_SIZE) / 2 + (Math.random() - 0.5) * 1000;
        const y = (MAP_HEIGHT * TILE_SIZE) / 2 + (Math.random() - 0.5) * 1000;
        gameState.entities.push(new Entity('npc', x, y, i));
    }
    
    requestAnimationFrame(loop);
}

// --- INPUT ---
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left + gameState.camera.x;
    const my = e.clientY - rect.top + gameState.camera.y;

    // Check entity click
    const clicked = gameState.entities.find(ent => {
        return mx >= ent.x && mx <= ent.x + ent.width &&
               my >= ent.y && my <= ent.y + ent.height;
    });

    if (clicked && clicked.type === 'npc') {
        gameState.selectedEntity = clicked;
        updateInspector();
    } else {
        gameState.selectedEntity = null;
        updateInspector();
        
        // If survival 2/god mode, maybe do something
        if (gameState.mode === 'god' || gameState.mode === 'creative') {
            // e.g. create fireball
            // Not implemented yet but logic goes here
        } else if (gameState.mode === 'survival') {
            // Survival: Interact/Mine
            const tileX = Math.floor(mx / TILE_SIZE);
            const tileY = Math.floor(my / TILE_SIZE);
            // Check distance to player
            const dx = (gameState.player.x + gameState.player.width/2) - mx;
            const dy = (gameState.player.y + gameState.player.height/2) - my;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 100) { // Interaction range
                if (tileY >= 0 && tileY < MAP_HEIGHT && tileX >= 0 && tileX < MAP_WIDTH) {
                    const tile = gameState.map[tileY][tileX];
                    if (tile.object) {
                        if (tile.object.type === 'tree') {
                            gameState.player.inventory.wood++;
                            logInteraction(`Gathered wood (Total: ${gameState.player.inventory.wood})`);
                            tile.object = null; // Remove tree
                        } else if (tile.object.type === 'ore') {
                            gameState.player.inventory.stone++;
                            logInteraction(`Mined stone (Total: ${gameState.player.inventory.stone})`);
                            tile.object = null;
                        }
                    }
                }
            }
        }
    }
});

function logInteraction(msg) {
    const log = document.getElementById('interaction-log');
    const entry = document.createElement('div');
    entry.textContent = msg;
    log.prepend(entry);
    if (log.children.length > 5) log.lastChild.remove();
}

function handleInput() {
    const p = gameState.player;
    p.vx = 0; 
    p.vy = 0;
    if (keys['w']) p.vy = -p.speed;
    if (keys['s']) p.vy = p.speed;
    if (keys['a']) p.vx = -p.speed;
    if (keys['d']) p.vx = p.speed;
}

function updateInspector() {
    const div = document.getElementById('inspector');
    const pre = document.getElementById('inspector-content');
    if (gameState.selectedEntity) {
        div.style.display = 'block';
        pre.textContent = JSON.stringify(gameState.selectedEntity.brain, null, 2);
    } else {
        div.style.display = 'none';
    }
}

// --- LOOP ---

function loop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    // Update
    handleInput();
    gameState.player.update(dt);
    gameState.entities.forEach(ent => ent.update(dt));

    // Time scaling: "Every let's say hour is a new year"
    // 1 hour = 3600 seconds. 
    // If running at 60fps, 1 second = 1 second.
    // game.speed? 
    // User said "first year everything go by years... Every let's say hour is a new year".
    // This implies 1 real hour = 1 game year.
    // 1 game year = 365 days. 
    // So 3600 real seconds = 365 game days. ~10 seconds per day.
    gameState.time += dt / 1000; // Real seconds elapsed
    const yearLengthInSeconds = 3600; 
    gameState.year = 1 + Math.floor(gameState.time / yearLengthInSeconds);
    
    // Camera
    gameState.camera.x = gameState.player.x - canvas.width / 2;
    gameState.camera.y = gameState.player.y - canvas.height / 2;
    // Clamp camera
    gameState.camera.x = Math.max(0, Math.min(gameState.camera.x, MAP_WIDTH*TILE_SIZE - canvas.width));
    gameState.camera.y = Math.max(0, Math.min(gameState.camera.y, MAP_HEIGHT*TILE_SIZE - canvas.height));

    // Draw
    draw();

    // UI
    document.getElementById('time-display').innerText = `Year ${gameState.year} (Day ${Math.floor((gameState.time % 3600) / 10)})`;

    requestAnimationFrame(loop);
}

function draw() {
    // Clear
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.floor(gameState.camera.x), -Math.floor(gameState.camera.y));

    // Draw Map (Optimization: only draw visible)
    const startX = Math.floor(gameState.camera.x / TILE_SIZE);
    const startY = Math.floor(gameState.camera.y / TILE_SIZE);
    const endX = startX + Math.ceil(canvas.width / TILE_SIZE) + 1;
    const endY = startY + Math.ceil(canvas.height / TILE_SIZE) + 1;

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
                const tile = gameState.map[y][x];
                
                // Ground
                if (tile.type === 'grass') ctx.fillStyle = COLORS.GRASS;
                else if (tile.type === 'water') ctx.fillStyle = COLORS.WATER;
                else if (tile.type === 'sand') ctx.fillStyle = COLORS.SAND;
                else if (tile.type === 'stone') ctx.fillStyle = COLORS.STONE;
                
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

                // Objects
                if (tile.object) {
                    if (tile.object.type === 'tree') {
                        ctx.fillStyle = COLORS.TREE;
                        // Simple Triangle/Tree
                        ctx.fillRect(x * TILE_SIZE + 8, y * TILE_SIZE + 4, 16, 24);
                    } else if (tile.object.type === 'ore') {
                        ctx.fillStyle = '#444';
                        ctx.fillRect(x * TILE_SIZE + 10, y * TILE_SIZE + 10, 12, 12);
                    }
                }
            }
        }
    }

    // Draw Entities
    // NPCs
    gameState.entities.forEach(ent => {
        ctx.fillStyle = ent.color;
        ctx.fillRect(Math.floor(ent.x), Math.floor(ent.y), ent.width, ent.height);
        
        // Name
        ctx.fillStyle = 'white';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ent.brain.name, ent.x + ent.width/2, ent.y - 5);
    });

    // Player
    ctx.fillStyle = gameState.player.color;
    ctx.fillRect(Math.floor(gameState.player.x), Math.floor(gameState.player.y), gameState.player.width, gameState.player.height);
    // Indicator for player
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.floor(gameState.player.x), Math.floor(gameState.player.y), gameState.player.width, gameState.player.height);

    ctx.restore();
}
// --- PERSISTENCE ---

function saveGame() {
    const data = {
        time: gameState.time,
        year: gameState.year,
        map: gameState.map,
        // Serialize entities specifically to keep class structure if needed, or just plain objects
        entities: gameState.entities.map(e => ({
            type: e.type,
            x: e.x,
            y: e.y,
            id: e.id,
            brain: e.brain,
            inventory: e.inventory
        })),
        player: {
            x: gameState.player.x,
            y: gameState.player.y,
            inventory: gameState.player.inventory
        }
    };
    localStorage.setItem('remembrance_save', JSON.stringify(data));
    console.log("Game Saved");
    logInteraction("Game Saved");
}

function loadGame() {
    const json = localStorage.getItem('remembrance_save');
    if (json) {
        const data = JSON.parse(json);
        gameState.time = data.time;
        gameState.year = data.year;
        gameState.map = data.map;
        
        // Reconstruct entities
        gameState.entities = data.entities.map(d => {
            const e = new Entity(d.type, d.x, d.y, d.id);
            if (d.brain) e.brain = Object.assign(new Brain(d.id), d.brain);
            return e;
        });

        gameState.player.x = data.player.x;
        gameState.player.y = data.player.y;
        gameState.player.inventory = data.player.inventory;
        
        console.log("Game Loaded");
        logInteraction("Game Loaded");
    }
}

// Auto-save every 30 seconds
setInterval(saveGame, 30000);

// Keybinds for Manual Save/Load
window.addEventListener('keydown', e => {
    if (e.key === 'F5') { e.preventDefault(); saveGame(); }
    if (e.key === 'F9') { e.preventDefault(); loadGame(); }
});
init();
