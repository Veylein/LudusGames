
// --- CONSTANTS & CONFIG ---
const TILE_SIZE = 32;
const MAP_WIDTH = 100; // Original request was around this size
const MAP_HEIGHT = 100;

// Expanded Palette (WorldBox styled)
const PALETTE = {
    DEEP_OCEAN: '#1e3c54',
    OCEAN: '#255883',
    SHALLOW_WATER: '#3792cb',
    SAND: '#e3c66f',
    GRASS_LIGHT: '#8ec042',
    GRASS_MID: '#6da628',
    GRASS_DARK: '#42740e',
    FOREST: '#2a5116',
    MOUNTAIN_BASE: '#706456',
    MOUNTAIN_PEAK: '#b0a79d',
    SNOW: '#f0f5f9',
    
    // Entity Colors
    SKIN_TONES: ['#f5d0b0', '#e0ac69', '#8d5524', '#c68642', '#ffdbac'],
    CLOTHES: ['#a52929', '#2966a5', '#388c2e', '#cfad23', '#6b23cf'],
    HAIR: ['#000000', '#4a3000', '#b08d00', '#9c3400', '#dcd0ba'],
    PLAYER: '#ffffff', // Fallback
    
    // Objects
    WOOD_TRUNK: '#58402a',
    LEAVES: '#387818',
    STONE: '#888888',
    HOUSE_ROOF: '#963c29',
    HOUSE_WALL: '#cfb997'
};

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

// --- STATE MANAGER ---
const gameState = {
    mode: 'survival', // 'survival', 'god'
    time: 0, 
    year: 1,
    season: 0,
    camera: { x: 0, y: 0, zoom: 1 },
    map: [],
    entities: [],
    particles: [], // For juice
    player: null,
    selectedEntity: null,
    hoveredTile: null,
    dragStart: null,
    keys: {}
};

// --- SOPHISTICATED GENERATION ---

// Simple Pseudo-Random Number Generator for deterministic seeds (optional, using Math.random for now)
function noise(x, y) {
    const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
    return s - Math.floor(s);
}

function smoothNoise(x, y) {
    // Bilinear interpolation would be better, but let's do simple value noise smoothing
    const corners = (noise(x-1, y-1)+noise(x+1, y-1)+noise(x-1, y+1)+noise(x+1, y+1)) / 16;
    const sides   = (noise(x-1, y)  +noise(x+1, y)  +noise(x, y-1)  +noise(x, y+1)) / 8;
    const center  =  noise(x, y) / 4;
    return corners + sides + center;
}

function getTerrainHeight(x, y) {
    // Layered noise (Octaves)
    let e = 1 * smoothNoise(x/8, y/8) 
          + 0.5 * smoothNoise(x/4, y/4) 
          + 0.25 * smoothNoise(x/2, y/2);
    // Normalize roughly 0-2 (since smoothNoise is 0-1ish but stacked)
    // We want output 0-1 (approx)
    return Math.min(1, Math.max(0, e / 1.75));
}

function generateMap() {
    const map = [];
    console.time("Generate Map");
    
    for (let y = 0; y < MAP_HEIGHT; y++) {
        const row = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            // Generate Height
            let height = getTerrainHeight(x, y);
            
            // Island Mask (Distance from center)
            const cx = MAP_WIDTH/2;
            const cy = MAP_HEIGHT/2;
            const dist = Math.sqrt((x-cx)*(x-cx) + (y-cy)*(y-cy)) / (MAP_WIDTH/2);
            height = height * (1.2 - Math.pow(dist, 1.5)); // Falloff edges

            let type = 'ocean';
            let color = PALETTE.DEEP_OCEAN;
            let object = null;
            let variation = Math.random(); // For visual texture

            if (height < 0.2) {
                type = 'deep_ocean';
                color = PALETTE.DEEP_OCEAN;
            } else if (height < 0.35) {
                type = 'ocean';
                color = PALETTE.OCEAN;
            } else if (height < 0.4) {
                type = 'shallow_water';
                color = PALETTE.SHALLOW_WATER;
            } else if (height < 0.45) {
                type = 'sand';
                color = PALETTE.SAND;
                if (Math.random() < 0.01) object = { type: 'cactus' };
            } else if (height < 0.7) {
                type = 'grass';
                // Variation logic
                if (variation < 0.3) color = PALETTE.GRASS_LIGHT;
                else if (variation < 0.7) color = PALETTE.GRASS_MID;
                else color = PALETTE.GRASS_DARK;
                
                // Trees
                if (noise(x*5, y*5) > 0.6) {
                    object = { type: 'tree', age: Math.floor(Math.random()*5) };
                }
                // Berry Bushes
                else if (Math.random() < 0.02) {
                    object = { type: 'bush' };
                }
            } else if (height < 0.85) {
                type = 'mountain_base';
                color = PALETTE.MOUNTAIN_BASE;
                if (Math.random() < 0.05) object = { type: 'ore' };
            } else {
                type = 'mountain_peak';
                color = PALETTE.MOUNTAIN_PEAK;
            }

            row.push({ x, y, type, height, color, baseColor: color, object, variation });
        }
        map.push(row);
    }
    console.timeEnd("Generate Map");
    return map;
}

// --- ENTITY SYSTEM ---

class Brain {
    constructor(name) {
        this.name = name;
        this.thoughts = [];
        this.memories = [];
        this.relations = {}; // { otherEntityId: { trust: 0-1, known: bool } }
        this.state = 'idle';
        this.target = null;
        this.home = null;
    }
}

class Entity {
    constructor(type, x, y) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        
        // Appearance
        this.skinColor = PALETTE.SKIN_TONES[Math.floor(Math.random() * PALETTE.SKIN_TONES.length)];
        this.clothesColor = PALETTE.CLOTHES[Math.floor(Math.random() * PALETTE.CLOTHES.length)];
        this.hairColor = PALETTE.HAIR[Math.floor(Math.random() * PALETTE.HAIR.length)];
        this.scale = 1;

        if (type === 'player') {
             this.skinColor = '#ffe0bd';
             this.clothesColor = '#3366cc';
             this.hairColor = '#4a3000';
             this.brain = new Brain("Player");
             this.inventory = { wood: 0, stone: 0, food: 0 };
        }
        
        // Stats
        this.age = 18 + Math.floor(Math.random() * 40);
        this.hp = 100;
        
        if (type === 'human') {
            const names = ["Adan", "Bela", "Cael", "Dara", "Elian", "Fae", "Gora", "Hila", "Iven", "Joro", "Kael", "Lina"];
            this.brain = new Brain(names[Math.floor(Math.random() * names.length)]);
            this.inventory = { wood: 0, stone: 0, food: 0 };
        }
        
        // Animation
        this.animFrame = 0;
        this.facing = 1; // 1 right, -1 left
        this.speed = 1.5;
    }

    update(dt) {
        // AI Logic
        if (this.type === 'human') this.updateHumanAI(dt);
        if (this.type === 'player') {
            // Player input handled in main loop mostly, but apply physics here
        }
        
        // Physics
        let nextX = this.x + this.vx;
        let nextY = this.y + this.vy;

        // Collision with map bounds
        if (nextX < 0) nextX = 0;
        if (nextX > MAP_WIDTH * TILE_SIZE) nextX = MAP_WIDTH * TILE_SIZE;
        if (nextY < 0) nextY = 0;
        if (nextY > MAP_HEIGHT * TILE_SIZE) nextY = MAP_HEIGHT * TILE_SIZE;

        this.x = nextX;
        this.y = nextY;

        // Facing direction
        if (this.vx > 0) this.facing = 1;
        if (this.vx < 0) this.facing = -1;

        // Animation bob
        if (Math.abs(this.vx) > 0 || Math.abs(this.vy) > 0) {
            this.animFrame += dt * 0.01;
        } else {
            this.animFrame = 0;
        }
    }

    updateHumanAI(dt) {
        // Simple State Machine
        if (this.brain.state === 'idle') {
            const r = Math.random();
            if (r < 0.01) {
                this.brain.state = 'wander';
                const angle = Math.random() * Math.PI * 2;
                this.vx = Math.cos(angle) * 0.5;
                this.vy = Math.sin(angle) * 0.5;
                setTimeout(() => { 
                    this.brain.state = 'idle';
                    this.vx = 0; 
                    this.vy = 0; 
                }, 2000 + Math.random() * 2000);
            }
        }
    }
}

// --- RENDERER (The Graphics Upgrade) ---

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function initRenderer() {
    window.addEventListener('resize', resize);
    resize();
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false; // Pixel art look
}

// Low-level drawing helpers
function drawPixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

function drawCircle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();
}

function drawHuman(entity, screenX, screenY) {
    const s = 32; // Base size reference (not TILE_SIZE necessarily, but player size)
    const bob = Math.sin(entity.animFrame) * 2; // Walking bounce
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(screenX + s/2, screenY + s - 2, 6, 3, 0, 0, Math.PI*2);
    ctx.fill();

    const cx = screenX + s/2;
    const cy = screenY + s/2 + bob;

    // Body/Clothes
    ctx.fillStyle = entity.clothesColor;
    ctx.fillRect(cx - 4, cy - 2, 8, 10);
    
    // Head
    ctx.fillStyle = entity.skinColor;
    ctx.fillRect(cx - 4, cy - 10, 8, 8);
    
    // Hair
    ctx.fillStyle = entity.hairColor;
    ctx.fillRect(cx - 5, cy - 11, 10, 4); // Top
    if (entity.facing === 1) {
        ctx.fillRect(cx - 5, cy - 11, 2, 8); // Back of head hair
    } else {
        ctx.fillRect(cx + 3, cy - 11, 2, 8);
    }

    // Legs
    ctx.fillStyle = '#333'; // Pants
    // Simple leg animation
    const lLeg = Math.sin(entity.animFrame) * 3;
    const rLeg = Math.sin(entity.animFrame + Math.PI) * 3;
    
    ctx.fillRect(cx - 3, cy + 8, 2, 6 + lLeg); // Left
    ctx.fillRect(cx + 1, cy + 8, 2, 6 + rLeg); // Right

    // Arms
    ctx.fillStyle = entity.skinColor;
    ctx.fillRect(cx - 6, cy - 1, 2, 6 - lLeg);
    ctx.fillRect(cx + 4, cy - 1, 2, 6 - rLeg);
}

function drawTree(tx, ty, scale=1) {
    const x = tx * TILE_SIZE;
    const y = ty * TILE_SIZE;
    
    // Sway
    const sway = Math.sin(gameState.time * 0.002 + x) * 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 28, 10, 5, 0, 0, Math.PI*2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = PALETTE.WOOD_TRUNK;
    ctx.fillRect(x + 13, y + 16, 6, 12);

    // Leaves (Circle clusters)
    ctx.fillStyle = PALETTE.LEAVES;
    drawCircle(x + 16 + sway, y + 10, 10 * scale, PALETTE.LEAVES);
    drawCircle(x + 10 + sway, y + 14, 8 * scale, PALETTE.LEAVES);
    drawCircle(x + 22 + sway, y + 14, 8 * scale, PALETTE.LEAVES);
    
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.arc(x + 16 + sway - 2, y + 8, 4, 0, Math.PI*2);
    ctx.fill();
}

function drawGrid() {
    // Determine Visible Range (Culling)
    const camera = gameState.camera;
    const startX = Math.floor(camera.x / TILE_SIZE) - 1;
    const startY = Math.floor(camera.y / TILE_SIZE) - 1;
    const endX = startX + Math.ceil(canvas.width / TILE_SIZE) + 2;
    const endY = startY + Math.ceil(canvas.height / TILE_SIZE) + 2;

    ctx.save();
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
                const tile = gameState.map[y][x];
                
                // Draw Base Tile
                let color = tile.baseColor;
                
                // Seasonal tint
                if (gameState.season === 3) { // Winter
                     if (tile.type === 'grass' || tile.type === 'mountain_base') {
                         color = PALETTE.SNOW;
                     }
                }

                ctx.fillStyle = color;
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

                // Water Edge Effect (Foam) - Simplified
                if (tile.type === 'sand') {
                    // Could check neighbors here
                }
                
                // Water Sparkle
                if (tile.type.includes('ocean')) {
                    if (Math.random() < 0.0005) {
                        gameState.particles.push({
                            x: x * TILE_SIZE + Math.random()*TILE_SIZE,
                            y: y * TILE_SIZE + Math.random()*TILE_SIZE,
                            life: 20,
                            type: 'sparkle'
                        });
                    }
                }

                // Draw Object
                if (tile.object) {
                    if (tile.object.type === 'tree') drawTree(x, y);
                    else if (tile.object.type === 'cactus') {
                        // Draw Cactus
                        ctx.fillStyle = '#2e7d32';
                        ctx.fillRect(x * TILE_SIZE + 14, y * TILE_SIZE + 10, 4, 18);
                        ctx.fillRect(x * TILE_SIZE + 10, y * TILE_SIZE + 16, 12, 4);
                        ctx.fillRect(x * TILE_SIZE + 10, y * TILE_SIZE + 12, 4, 4);
                        ctx.fillRect(x * TILE_SIZE + 18, y * TILE_SIZE + 12, 4, 4);
                    }
                    else if (tile.object.type === 'ore') {
                        ctx.fillStyle = '#444';
                        drawCircle(x * TILE_SIZE + 16, y * TILE_SIZE + 16, 6, '#444');
                        ctx.fillStyle = '#ddd'; // Sparkle ore
                        drawCircle(x * TILE_SIZE + 15, y * TILE_SIZE + 15, 2, '#ddd');
                    }
                }

                // Hover Highlight
                if (gameState.hoveredTile && gameState.hoveredTile.x === x && gameState.hoveredTile.y === y) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = 'white';
                    ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    // Draw Entities (Sorted by Y for depth)
    const visibleEntities = gameState.entities.filter(e => 
        e.x > camera.x - 50 && e.x < camera.x + canvas.width + 50 &&
        e.y > camera.y - 50 && e.y < camera.y + canvas.height + 50
    ).sort((a,b) => a.y - b.y);

    visibleEntities.forEach(ent => {
        if (ent.type === 'human' || ent.type === 'player') drawHuman(ent, ent.x, ent.y);
        
        // Selection Ring
        if (gameState.selectedEntity === ent) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(ent.x + TILE_SIZE/2, ent.y + TILE_SIZE/2, 12, 0, Math.PI*2);
            ctx.stroke();
        }
    });

    // Draw Particles
    gameState.particles.forEach((p, i) => {
        if (p.type === 'sparkle') {
            ctx.fillStyle = 'white';
            ctx.fillRect(p.x, p.y, 2, 2);
        }
        p.life--;
        if (p.life <= 0) gameState.particles.splice(i, 1);
    });

    ctx.restore();
}

// --- INPUT & INTERACTION ---

function handleMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left + gameState.camera.x;
    const my = e.clientY - rect.top + gameState.camera.y;
    
    // UI Tooltip update
    const toolTip = document.getElementById('cursor-tooltip');
    
    // Tile Coords
    const tx = Math.floor(mx / TILE_SIZE);
    const ty = Math.floor(my / TILE_SIZE);

    if (ty >= 0 && ty < MAP_HEIGHT && tx >= 0 && tx < MAP_WIDTH) {
        gameState.hoveredTile = gameState.map[ty][tx];
        toolTip.style.display = 'block';
        toolTip.style.left = (e.clientX + 15) + 'px';
        toolTip.style.top = (e.clientY + 15) + 'px';
        toolTip.innerText = `${gameState.hoveredTile.type}\nHeight: ${gameState.hoveredTile.height.toFixed(2)}`;
    } else {
        gameState.hoveredTile = null;
        toolTip.style.display = 'none';
    }

    if (e.type === 'mousedown') {
        let clickedEnt = null;

        // Check for entity click (simple distance check)
        // Check player
        const pdx = (gameState.player.x + 16) - mx;
        const pdy = (gameState.player.y + 16) - my;
        if (Math.sqrt(pdx*pdx + pdy*pdy) < 20) {
            clickedEnt = gameState.player;
        }

        if (!clickedEnt) {
            clickedEnt = gameState.entities.find(ent => {
                 const dx = (ent.x + 16) - mx;
                 const dy = (ent.y + 16) - my;
                 return Math.sqrt(dx*dx + dy*dy) < 20;
            });
        }

        if (clickedEnt) {
            gameState.selectedEntity = clickedEnt;
            const insp = document.getElementById('inspector');
            insp.style.display = 'block';
            document.getElementById('inspector-content').innerText = JSON.stringify(clickedEnt.brain || {}, null, 2);
        } else {
            // If dragging map in God Mode? Or interacting
            if (gameState.mode === 'god') {
               // God powers
            }
        }
    }
}

// --- INITIALIZATION ---

function init() {
    initRenderer();
    gameState.map = generateMap();
    
    // Create Player
    // Find safe spawn
    let spawnX = 0, spawnY = 0;
    for(let i=0; i<100; i++) {
        let ty = Math.floor(MAP_HEIGHT/2) + Math.floor((Math.random()-0.5)*20);
        let tx = Math.floor(MAP_WIDTH/2) + Math.floor((Math.random()-0.5)*20);
        if (gameState.map[ty][tx].type === 'grass') {
            spawnX = tx * TILE_SIZE;
            spawnY = ty * TILE_SIZE;
            break;
        }
    }

    gameState.player = new Entity('player', spawnX, spawnY);
    gameState.entities.push(gameState.player);

    // Create Civilization
    for (let i = 0; i < 20; i++) {
        let valid = false;
        let attempt = 0;
        while(!valid && attempt < 100) {
            const rx = Math.floor(Math.random() * MAP_WIDTH);
            const ry = Math.floor(Math.random() * MAP_HEIGHT);
            if (gameState.map[ry][rx].type === 'grass') {
                gameState.entities.push(new Entity('human', rx * TILE_SIZE, ry * TILE_SIZE));
                valid = true;
            }
            attempt++;
        }
    }

    // Input Listeners
    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('mousedown', handleMouse);
    
    // WASD Camera Move
    window.addEventListener('keydown', e => {
        gameState.keys[e.key.toLowerCase()] = true;
        // Toggle camera mode?
        if (e.key === 'm') {
            gameState.mode = gameState.mode === 'survival' ? 'god' : 'survival';
        }
    });
    window.addEventListener('keyup', e => gameState.keys[e.key.toLowerCase()] = false);
    
    // Loop
    let lastTime = 0;
    function loop(timestamp) {
        const dt = timestamp - lastTime || 16;
        lastTime = timestamp;

        // Player Movement
        if (gameState.mode === 'survival') {
            gameState.player.vx = 0; 
            gameState.player.vy = 0;
            const s = gameState.player.speed || 3;
            if (gameState.keys['w']) gameState.player.vy = -s;
            if (gameState.keys['s']) gameState.player.vy = s;
            if (gameState.keys['a']) gameState.player.vx = -s;
            if (gameState.keys['d']) gameState.player.vx = s;
            
            // Camera follows player
            const targetX = gameState.player.x - canvas.width/2;
            const targetY = gameState.player.y - canvas.height/2;
            // Smooth Camera
            gameState.camera.x += (targetX - gameState.camera.x) * 0.1;
            gameState.camera.y += (targetY - gameState.camera.y) * 0.1;
        } else {
            // God Mode Free Camera
            const s = 10;
            if (gameState.keys['w']) gameState.camera.y -= s;
            if (gameState.keys['s']) gameState.camera.y += s;
            if (gameState.keys['a']) gameState.camera.x -= s;
            if (gameState.keys['d']) gameState.camera.x += s;
        }

        gameState.time += dt;
        
        // Game Logic
        gameState.entities.forEach(e => e.update(dt));

        // Update UI
        document.getElementById('pop-display').innerText = `Pop: ${gameState.entities.length}`;
        document.getElementById('mode-display').innerText = `Mode: ${gameState.mode} (Press M)`;
        document.getElementById('stats-display').style.width = '300px'; 

        drawGrid();

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

init();
