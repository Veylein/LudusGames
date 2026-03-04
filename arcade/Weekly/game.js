// --- ERROR HANDLING ---
window.onerror = function(msg, url, line, col, error) {
    // Prevent showing full file paths to user
    const fileName = url ? url.split('/').pop().split('\\').pop() : 'script.js';
    const cleanMsg = msg.replace(url, fileName);
    
    // Show user-friendly error
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(255, 0, 0, 0.9)';
    toast.style.color = 'white';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '5px';
    toast.style.zIndex = '9999';
    toast.style.fontFamily = 'Arial, sans-serif';
    toast.innerText = `Game Error: ${cleanMsg} (Line ${line})`;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
    
    console.error("Game Error:", error);
    return true; // Suppress default browser error
};

// --- CONSTANTS ---
const CHUNK_SIZE = 16;
let MAP_WIDTH = 128; // Reduced for performance/storage
let MAP_HEIGHT = 128;
const TILE_SIZE = 32;

// Colors
const PALETTE = {
    // Water
    DEEP_OCEAN: '#1e3c54',
    OCEAN: '#255883',
    SHALLOW: '#3792cb',
    FOAM: '#a8d9f0',
    // Land
    SAND: '#e3c66f',
    GRASS_LIGHT: '#8ec042',
    GRASS: '#6da628',
    FOREST: '#447a1e',
    MOUNTAIN_BASE: '#706456',
    MOUNTAIN: '#91867e',
    SNOW: '#f0f5f9',
    
    // Effects
    FIRE: '#ff4d00',
    ASH: '#333333',
    PLAGUE: '#5a2e5a',
    
    // UI/Highlights
    SELECT: 'rgba(255, 255, 0, 0.5)',
    HOVER: 'rgba(255, 255, 255, 0.2)'
};

// --- CLOUD SYSTEM ---
const CLOUDS = [];
function updateClouds(dt) {
    // Spawn
    if (Math.random() < 0.005) {
        CLOUDS.push({
            x: -200, 
            y: Math.random() * (MAP_HEIGHT * TILE_SIZE), 
            scale: 2 + Math.random() * 3,
            speed: 10 + Math.random() * 20
        });
    }
    // Move
    for (let i = CLOUDS.length - 1; i >= 0; i--) {
        const c = CLOUDS[i];
        c.x += c.speed * dt * 0.01;
        if (c.x > MAP_WIDTH * TILE_SIZE + 200) CLOUDS.splice(i, 1);
    }
}
function drawClouds(ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    CLOUDS.forEach(c => {
         ctx.beginPath();
         ctx.arc(c.x, c.y, 30*c.scale, 0, Math.PI*2);
         ctx.arc(c.x + 40*c.scale, c.y - 10*c.scale, 35*c.scale, 0, Math.PI*2);
         ctx.arc(c.x + 70*c.scale, c.y + 5*c.scale, 30*c.scale, 0, Math.PI*2);
         ctx.fill();
    });
}

// --- DATA: TRAITS & THOUGHTS ---
const TRAITS = {
    'Strong': { boost: 'hp', val: 20, desc: 'Healthy and tough.' },
    'Fast': { boost: 'speed', val: 1.5, desc: 'Runs very fast.' },
    'Genius': { boost: 'int', val: 10, desc: 'More likely to invent.' },
    'Pyromaniac': { desc: 'Loves fire.' },
    'Peaceful': { desc: 'Dislikes war.' },
    'Greedy': { desc: 'Wants all resources.' },
    'Immune': { desc: 'Resistant to plague.' }
};

const THOUGHTS = [
    "I wonder what lies beyond the ocean.",
    "The gods are watching.",
    "I need more wood.",
    "A strange light appeared in the sky.",
    "My house is cozy.",
    "I am hungry.",
    "What is the meaning of life?",
    "I hate sand.",
    "I feel stronger today.",
    "The mountains look majestic."
];

// --- GAME STATE ---
let gameState = {
    meta: { name: 'World', created: 0, mode: 'creative' },
    map: [],
    entities: [],
    particles: [],
    floatingTexts: [],
    villages: [],
    camera: { x: 0, y: 0, zoom: 0.5, targetZoom: 0.5 },
    currentTool: 'cursor',
    time: 0,
    speed: 1,
    paused: true,
    selection: null,
    dragStart: null,
    keys: {},
    shake: 0
};

// --- WORLD GENERATION ---
const PERLIN_SIZE = 4095;
let seed = Math.random() * 100;

function noise(x, y) {
    return Math.sin(x/15 + seed) * Math.cos(y/15 + seed) + Math.sin((x+y)/40)*0.5; 
}

function generateWorld(width, height) {
    MAP_WIDTH = width;
    MAP_HEIGHT = height;
    seed = Math.random() * 9999;
    
    const map = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            // Radial Island Mask
            const dx = x - width/2;
            const dy = y - height/2;
            dist = Math.sqrt(dx*dx + dy*dy) / (width/2.5);
            const mask = Math.max(0, 1 - Math.pow(dist, 4));

            let nx = x * 0.04;
            let ny = y * 0.04;
            
            let h = (noise(nx, ny) + 1)/2 * 1.0 + 
                    (noise(nx*2, ny*2) + 1)/2 * 0.5 + 
                    (noise(nx*4, ny*4) + 1)/2 * 0.25;
            h = h / 1.75;
            h *= mask;

            let type = 'deep_ocean';
            if (h < 0.2) type = 'deep_ocean';
            else if (h < 0.35) type = 'ocean';
            else if (h < 0.40) type = 'shallow';
            else if (h < 0.45) type = 'sand';
            else if (h < 0.70) type = 'grass';
            else if (h < 0.85) type = 'forest'; 
            else type = 'mountain';

            let object = null;
            if (type === 'forest' && Math.random() < 0.8) object = { type: 'tree' };
            if (type === 'grass' && Math.random() < 0.02) object = { type: 'berry_bush' };
            if (type === 'mountain' && Math.random() < 0.05) object = { type: 'stone', hp: 10 };

            // Optimization: Array or smaller object
            // Currently using object for code clarity but during save we will compress
            row.push({ x, y, h, type, object, fire: 0, plague: 0 });
        }
        map.push(row);
    }
    return map;
}

// --- CLASSES ---

class Entity {
    constructor(type, x, y) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.age = 0;
        this.hp = 100;
        this.maxHp = 100;
        this.state = 'idle';
        this.memories = [];
        this.infected = false;
        this.burning = false;
    }
    
    addMemory(text) {
        this.memories.unshift({ text, time: Math.floor(gameState.time) });
        if (this.memories.length > 20) this.memories.pop();
    }
    
    update(dt) {
        this.age += dt * 0.001 * gameState.speed;
        
        // Physics
        this.x += this.vx * dt * gameState.speed;
        this.y += this.vy * dt * gameState.speed;
        this.vx *= 0.9;
        this.vy *= 0.9;

        // Status Effects
        if (this.infected && Math.random() < 0.01 * gameState.speed) {
            this.hp -= 0.5;
            if (Math.random() < 0.1) spawnParticles(this.x*TILE_SIZE, this.y*TILE_SIZE, 1, 'purple');
        }
        if (this.hp <= 0) this.die();

        // Bounds
        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
        if (this.x >= MAP_WIDTH) this.x = MAP_WIDTH-1;
        if (this.y >= MAP_HEIGHT) this.y = MAP_HEIGHT-1;
    }

    die() {
        this.dead = true;
        spawnParticles(this.x*TILE_SIZE, this.y*TILE_SIZE, 10, 'red');
        addFloatingText("☠️", this.x*TILE_SIZE, this.y*TILE_SIZE);
    }
}

class Unit extends Entity {
    constructor(type, x, y) {
        super(type, x, y);
        this.villageId = null;
        this.job = 'Wanderer';
        this.inventory = { wood: 0, food: 0 };
        this.traits = []; 
        this.currentThought = "I have been born.";
        this.actionTimer = 0;
        this.target = null; // {x, y, type}
        this.sex = Math.random() > 0.5 ? 'm' : 'f';
        
        // Randomize traits
        const possible = Object.keys(TRAITS);
        if (Math.random() < 0.3) this.traits.push(possible[Math.floor(Math.random()*possible.length)]);

        // Visuals
        this.color = `hsl(${Math.random()*40 + 10}, 70%, 60%)`; 
        this.addMemory("I awoke in this world.");
    }
    
    update(dt) {
        if (this.dead) return;
        super.update(dt);
        this.actionTimer -= dt * gameState.speed;
        
        if (this.actionTimer <= 0) {
            this.think();
            this.actionTimer = 20 + Math.random() * 50; 
        }

        // Apply Trait: Fast
        const speedMult = this.traits.includes('Fast') ? 1.5 : 1.0;
        
        // Move towards target
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 0.5) {
                this.vx += (dx/dist) * 0.005 * speedMult;
                this.vy += (dy/dist) * 0.005 * speedMult;
            } else {
                this.interactWithTarget();
            }
        }
    }
    
    think() {
        // Random thought
        if (Math.random() < 0.01) {
            this.currentThought = THOUGHTS[Math.floor(Math.random()*THOUGHTS.length)];
        }

        // Behavior State Machine
        
        // 0. WAR LOGIC
        if (this.villageId) {
            const myVillage = gameState.villages.find(v => v.id === this.villageId);
            if (myVillage && myVillage.atWarWith.length > 0) {
                 // Look for enemy units
                 const enemy = gameState.entities.find(e => 
                     !e.dead && 
                     e instanceof Unit && 
                     e.villageId && 
                     myVillage.atWarWith.includes(e.villageId) &&
                     Math.hypot(e.x - this.x, e.y - this.y) < 15
                 );
                 if (enemy) {
                     this.target = { x: enemy.x, y: enemy.y, type: 'enemy', uid: enemy };
                     this.currentThought = "Die enemy!";
                     return;
                 }
                 // Look for enemy buildings
                 if (!this.target) {
                     const enemyVillage = gameState.villages.find(v => myVillage.atWarWith.includes(v.id));
                     if (enemyVillage) {
                         this.target = { x: enemyVillage.x, y: enemyVillage.y, type: 'raid' };
                         this.currentThought = "To battle!";
                         return;
                     }
                 }
            }
        }
        
        // 1. Join Village?
        if (!this.villageId) {
            const nearby = gameState.villages.find(v => Math.abs(v.x - this.x) < 10 && Math.abs(v.y - this.y) < 10);
            if (nearby) {
                this.villageId = nearby.id;
                nearby.pop++;
                this.addMemory(`I joined ${nearby.name}.`);
                addFloatingText("Joined!", this.x*TILE_SIZE, this.y*TILE_SIZE, 'gold');
                this.job = Math.random() > 0.5 ? 'Lumberjack' : 'Forager';
            }
        }

        // 2. Do Job
        if (this.villageId) {
            if (!this.target) {
                if (this.job === 'Lumberjack' && this.inventory.wood < 5) {
                    this.findResource('tree');
                } else if (this.job === 'Forager' && this.inventory.food < 5) {
                    this.findResource('berry_bush');
                } else {
                    // Return home
                    const v = gameState.villages.find(z => z.id === this.villageId);
                    if(v) this.target = { x: v.x, y: v.y, type: 'village_dropoff' };
                }
            }
        } else {
             // Wander randomly
            const angle = Math.random() * Math.PI * 2;
            this.vx += Math.cos(angle) * 0.01;
            this.vy += Math.sin(angle) * 0.01;
        }
    }

    findResource(resType) {
        // Scan nearby tiles
        const r = 10;
        const tx = Math.floor(this.x);
        const ty = Math.floor(this.y);
        
        for(let i=0; i<20; i++) { // Random samples
            const sx = tx + Math.floor(Math.random()*r*2)-r;
            const sy = ty + Math.floor(Math.random()*r*2)-r;
            if(sx>=0 && sy>=0 && sx<MAP_WIDTH && sy<MAP_HEIGHT) {
                const t = gameState.map[sy][sx];
                if(t.object && t.object.type === resType) {
                    this.target = { x: sx, y: sy, type: 'resource' };
                    return;
                }
            }
        }
    }

    interactWithTarget() {
        if (!this.target) return;

        // COMBAT
        if (this.target.type === 'enemy') {
            const enemy = this.target.uid;
            // Check if enemy is still valid target (alive and nearby)
            if (enemy && !enemy.dead && Math.hypot(enemy.x - this.x, enemy.y - this.y) < 2.0) {
                 enemy.hp -= 5;
                 spawnParticles(enemy.x*TILE_SIZE, enemy.y*TILE_SIZE, 3, 'red');
                 enemy.vx = (enemy.x - this.x)*5;
                 enemy.vy = (enemy.y - this.y)*5;
                 addFloatingText("Hit!", enemy.x*TILE_SIZE, enemy.y*TILE_SIZE, 'red');

                 // Enemy retaliates
                 if (!enemy.target || enemy.target.type !== 'enemy') {
                    enemy.target = { type: 'enemy', uid: this, x: this.x, y: this.y };
                 }
            } else {
                 this.target = null; // Enemy dead or fled
            }
            return;
        } else if (this.target.type === 'raid') {
             // Raid village center
             const v = gameState.villages.find(vil => Math.abs(vil.x - this.target.x) < 2 && Math.abs(vil.y - this.target.y) < 2);
             if (v) {
                 if (v.wood > 0) {
                     v.wood--;
                     this.inventory.wood++;
                     addFloatingText("Stolen!", this.x*TILE_SIZE, this.y*TILE_SIZE, 'orange');
                 }
                 spawnParticles(this.target.x*TILE_SIZE, this.target.y*TILE_SIZE, 1, 'black');
             }
             // Go home after raid
             const home = gameState.villages.find(z => z.id === this.villageId);
             if(home) this.target = { x: home.x, y: home.y, type: 'village_dropoff' };
             return;
        }

        if (this.target.type === 'resource') {
             // Harvest
             const tx = Math.floor(this.target.x);
             const ty = Math.floor(this.target.y);
             if (tx>=0 && ty>=0 && tx<MAP_WIDTH && ty<MAP_HEIGHT) {
                 const t = gameState.map[ty][tx];
                 if (t.object) { // Still there?
                     if (t.object.type === 'tree') {
                         this.inventory.wood++; 
                         spawnParticles(tx*TILE_SIZE, ty*TILE_SIZE, 3, 'brown');
                         if(this.inventory.wood >= 5) t.object = null; // Chopped
                     } else if (t.object.type === 'berry_bush') {
                         this.inventory.food++;
                         t.object = null; // Eaten
                     }
                 }
             }
             this.target = null;
        } else if (this.target.type === 'village_dropoff') {
             const v = gameState.villages.find(z => z.id === this.villageId);
             if (v) {
                 v.wood += this.inventory.wood;
                 v.food += this.inventory.food;
                 this.inventory.wood = 0;
                 this.inventory.food = 0;
                 addFloatingText("+Res", this.x*TILE_SIZE, this.y*TILE_SIZE, 'lime');
             }
             this.target = null;
        }
    }
}

class Animal extends Entity {
    constructor(type, x, y) {
        super(type, x, y);
        this.hp = 20;
        this.maxHp = 20;
        this.color = type === 'chicken' ? '#ffffff' : '#8d6e63';
    }

    update(dt) {
        if (this.dead) return;
        super.update(dt);
        
        // Random movement
        if (Math.random() < 0.02 * gameState.speed) {
            const angle = Math.random() * Math.PI * 2;
            this.vx += Math.cos(angle) * 0.01;
            this.vy += Math.sin(angle) * 0.01;
        }
    }
}

class Village {
    constructor(x, y) {
        this.id = Math.random().toString(36).substr(2, 5);
        this.x = x;
        this.y = y;
        this.name = this.generateName();
        this.color = `hsl(${Math.random()*360}, 80%, 40%)`;
        this.pop = 0;
        this.wood = 0;
        this.food = 0;
        this.atWarWith = []; // Array of village IDs
        this.buildings = [{x, y, type: 'hall'}];
    }
    
    generateName() {
        const parts = ['Dor', 'Gon', 'Aze', 'Rot', 'Kin', 'Val', 'Zor', 'Ias', 'Opol', 'Bax', 'Tex'];
        return parts[Math.floor(Math.random()*parts.length)] + parts[Math.floor(Math.random()*parts.length)];
    }

    update() {
        // Expand (Houses)
        if (this.wood >= 20) {
            this.wood -= 20;
            // Build randomness
            const rx = this.x + Math.floor(Math.random()*16)-8;
            const ry = this.y + Math.floor(Math.random()*16)-8;
            
            // Check valid spot
            if (rx > 0 && rx < MAP_WIDTH && ry > 0 && ry < MAP_HEIGHT) {
                const t = gameState.map[ry][rx];
                if (t.type !== 'ocean' && t.type !== 'deep_ocean' && t.type !== 'mountain') {
                    // Check overlap
                    if (!this.buildings.some(b => b.x===rx && b.y===ry)) {
                        this.buildings.push({ x: rx, y: ry, type: 'house' });
                        spawnParticles(rx*TILE_SIZE, ry*TILE_SIZE, 20, 'white');
                        addFloatingText("Expand!", rx*TILE_SIZE, ry*TILE_SIZE);
                    }
                }
            }
        }
        
        // Reproduction (Needs House space + Food)
        const capacity = this.buildings.length * 4; // 4 per house
        if (this.pop < capacity && this.food >= 10) {
            this.food -= 10;
            // Spawn new Unit
            const baby = new Unit('human', this.x, this.y);
            baby.villageId = this.id;
            baby.job = Math.random() > 0.3 ? (Math.random()>0.5?'Lumberjack':'Forager') : 'Guard';
            baby.age = 0;
            baby.addMemory(`I was born in ${this.name}.`);
            gameState.entities.push(baby);
            this.pop++;
            spawnParticles(this.x*TILE_SIZE, this.y*TILE_SIZE, 10, 'pink');
            addFloatingText("Baby!", this.x*TILE_SIZE, this.y*TILE_SIZE, 'pink');
        }
    }
}


// --- SAVE / LOAD SYSTEM ---
function saveGame() {
    if (!gameState.meta.name) return;
    try {
        const entityDto = gameState.entities.map(e => {
            const dto = {
                type: e.type, 
                x: e.x, y: e.y, 
                hp: e.hp,
            };
            if(e instanceof Unit) {
                dto.traits = e.traits
                dto.job = e.job
                dto.villageId = e.villageId
            }
            return dto;
        });

        const saveObj = {
            meta: gameState.meta,
            seed: seed, 
            map: gameState.map, 
            entities: entityDto,
            villages: gameState.villages,
            time: gameState.time,
            camera: gameState.camera
        };
        const str = JSON.stringify(saveObj); 
        localStorage.setItem('REM_SAVE_' + gameState.meta.name, str);
        showToast("World Saved!");
        loadSaveList();
    } catch (e) {
        showToast("Save Failed: Storage Full");
        console.error(e);
    }
}

function loadGame(name) {
    const str = localStorage.getItem('REM_SAVE_' + name);
    if (!str) return;
    
    try {
        const data = JSON.parse(str);
        
        // Restore
        gameState.meta = data.meta || gameState.meta;
        gameState.map = data.map; 
        gameState.time = data.time;
        gameState.camera = data.camera;
        
        // Rehydrate Classes
        gameState.particles = [];
        gameState.floatingTexts = [];
        gameState.villages = [];
        if(data.villages) {
             gameState.villages = data.villages.map(v => Object.assign(new Village(0,0), v));
        }

        gameState.entities = [];
        if(data.entities) {
            gameState.entities = data.entities.map(e => {
                let n;
                if (e.type === 'human') n = new Unit('human', e.x, e.y);
                else if (e.type === 'chicken' || e.type === 'animal') n = new Animal(e.type, e.x, e.y);
                else n = new Entity(e.type, e.x, e.y);
                return Object.assign(n, e);
            });
        }
        
        MAP_WIDTH = data.map[0].length;
        MAP_HEIGHT = data.map.length;
        
        startGameUI();
    } catch (e) {
        showToast("Load Failed: Corrupt Data");
        console.error(e);
        // Fallback
        gameState.map = generateWorld(200, 200);
        startGameUI();
    }
}

function loadSaveList() {
    const list = document.getElementById('save-slot-list');
    if(!list) return;
    list.innerHTML = '';
    
    let found = false;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('REM_SAVE_')) {
            found = true;
            const name = key.replace('REM_SAVE_', '');
            
            const div = document.createElement('div');
            div.className = 'save-slot';
            div.innerHTML = `<span>${name}</span> <small>World</small>`;
            div.onclick = () => loadGame(name);
            list.appendChild(div);
        }
    }
    if (!found) list.innerHTML = '<div class="empty-slot">No saves found.</div>';
}

// --- UI / ENGINE INTEGRATION ---

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
let lastTime = 0;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

// MAIN MENU HANDLERS
const btnCreate = document.getElementById('btn-create-world');
if (btnCreate) btnCreate.addEventListener('click', () => {
    const name = document.getElementById('world-name-input').value || "New World";
    const size = parseInt(document.getElementById('world-size-input').value);
    const mode = document.querySelector('input[name="mode"]:checked').value;
    
    // Init New Game
    gameState.meta = { name, created: Date.now(), mode };
    gameState.map = generateWorld(size, size);
    gameState.entities = [];
    gameState.villages = [];
    gameState.time = 0;
    gameState.camera = { x: size*TILE_SIZE/2, y: size*TILE_SIZE/2, zoom: 0.5, targetZoom: 0.5 };
    
    startGameUI();
});

document.getElementById('btn-save').addEventListener('click', () => {
    saveGame();
    // Return to menu
    document.getElementById('main-menu').style.display = 'flex';
    document.getElementById('ui-layer').style.display = 'none';
    gameState.paused = true;
});

document.getElementById('btn-speed').addEventListener('click', () => {
    gameState.speed = gameState.speed === 1 ? 5 : (gameState.speed === 5 ? 20 : 1);
    showToast(`Speed: ${gameState.speed}x`);
});

document.getElementById('inspector-close').addEventListener('click', () => {
    document.getElementById('inspector').style.display = 'none';
    gameState.selection = null;
});

// Inspector Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (gameState.selection) updateInspector(btn.dataset.tab);
    });
});

function startGameUI() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('ui-layer').style.display = 'flex';
    document.getElementById('world-title-display').innerText = gameState.meta.name;
    gameState.paused = false;
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

// --- SIMULATION ---

function applyTool(tx, ty) {
    if (gameState.paused) return;
    if (ty < 0 || ty >= MAP_HEIGHT || tx < 0 || tx >= MAP_WIDTH) return;
    
    const tile = gameState.map[ty][tx];
    const tool = gameState.currentTool;

    if (tool === 'mountains') { tile.type = 'mountain'; tile.object = { type: 'stone', hp: 10 }; spawnParticles(tx*TILE_SIZE, ty*TILE_SIZE, 5, 'grey'); }
    else if (tool === 'forest') { tile.type = 'forest'; tile.object = { type: 'tree' }; spawnParticles(tx*TILE_SIZE, ty*TILE_SIZE, 5, 'green'); }
    else if (tool === 'water') { tile.type = 'ocean'; tile.object = null; spawnParticles(tx*TILE_SIZE, ty*TILE_SIZE, 5, 'blue'); }
    else if (tool === 'sand') { tile.type = 'sand'; tile.object = null; spawnParticles(tx*TILE_SIZE, ty*TILE_SIZE, 5, 'yellow'); }
    
    else if (tool === 'human') {
        const u = new Unit('human', tx, ty);
        gameState.entities.push(u);
        spawnParticles(tx*TILE_SIZE, ty*TILE_SIZE, 10, 'white');
        addFloatingText("Human!", tx*TILE_SIZE, ty*TILE_SIZE);
    }
    else if (tool === 'animal') {
        const a = new Animal('animal', tx, ty);
        gameState.entities.push(a);
        spawnParticles(tx*TILE_SIZE, ty*TILE_SIZE, 5, 'brown');
    }
    else if (tool === 'chicken') {
        const c = new Animal('chicken', tx, ty);
        gameState.entities.push(c);
        spawnParticles(tx*TILE_SIZE, ty*TILE_SIZE, 5, 'white');
    }
    
    else if (tool === 'village') {
        const v = new Village(tx, ty);
        gameState.villages.push(v);
        showToast(`Kingdom of ${v.name} founded!`);
        spawnParticles(tx*TILE_SIZE, ty*TILE_SIZE, 20, 'gold');
        addFloatingText("Kingdom!", tx*TILE_SIZE, ty*TILE_SIZE, 'gold');
    }
    
    else if (tool === 'war') {
        // Find nearest village
        const v1 = gameState.villages.find(v => Math.hypot(v.x - tx, v.y - ty) < 10);
        if (v1) {
            // Find another nearby village
            const v2 = gameState.villages.find(v => v !== v1 && Math.hypot(v.x - v1.x, v.y - v1.y) < 50);
            if (v2) {
                if (!v1.atWarWith.includes(v2.id)) v1.atWarWith.push(v2.id);
                if (!v2.atWarWith.includes(v1.id)) v2.atWarWith.push(v1.id);
                
                showToast(`${v1.name} declares WAR on ${v2.name}!`);
                gameState.shake = 10;
                addFloatingText("WAR!", v1.x*TILE_SIZE, v1.y*TILE_SIZE, 'red');
                addFloatingText("WAR!", v2.x*TILE_SIZE, v2.y*TILE_SIZE, 'red');
                spawnParticles(v1.x*TILE_SIZE, v1.y*TILE_SIZE, 30, 'red');
            } else {
                showToast("No nearby kingdom to fight!");
            }
        }
    }
    
    else if (tool === 'fire') {
        if (tile.type !== 'ocean' && tile.type !== 'deep_ocean') {
            tile.fire = 100;
            spawnParticles(tx*TILE_SIZE, ty*TILE_SIZE, 10, 'orange');
        }
    }
    else if (tool === 'plague') {
        // Infect nearby entities
        gameState.entities.forEach(e => {
            if (Math.abs(e.x - tx) < 3 && Math.abs(e.y - ty) < 3) {
                e.infected = true;
                addFloatingText("SICK", e.x*TILE_SIZE, e.y*TILE_SIZE, 'purple');
            }
        });
        spawnParticles(tx*TILE_SIZE, ty*TILE_SIZE, 20, 'purple');
    }
    else if (tool === 'tnt') {
        gameState.shake = 20; // Screen shake
        spawnParticles(tx*TILE_SIZE, ty*TILE_SIZE, 50, 'fire');
        // Destroy radius
        for(let dy=-2; dy<=2; dy++) {
            for(let dx=-2; dx<=2; dx++) {
                if(gameState.map[ty+dy] && gameState.map[ty+dy][tx+dx]) {
                    const t = gameState.map[ty+dy][tx+dx];
                    t.type = 'sand';
                    t.object = null;
                }
            }
        }
        // Damage entities
        gameState.entities.forEach(e => {
            if (Math.abs(e.x - tx) < 3 && Math.abs(e.y - ty) < 3) {
                e.hp -= 50;
                e.vx += (e.x - tx) * 0.5;
                e.vy += (e.y - ty) * 0.5;
            }
        });
    }
    else if (tool === 'cursor') {
        // Simple selection
        const ent = gameState.entities.find(e => Math.sqrt(Math.pow(e.x-tx,2) + Math.pow(e.y-ty,2)) < 1.0);
        if (ent) {
            gameState.selection = ent;
            document.getElementById('inspector').style.display = 'flex';
            updateInspector();
        }
    }
}

function updateInspector(tab = 'info') {
    if (!gameState.selection) return;
    const e = gameState.selection;
    const content = document.getElementById('inspector-content');
    
    // Find active tab if not supplied
    if (tab === 'info') {
        const activeBtn = document.querySelector('.tab-btn.active');
        if (activeBtn) tab = activeBtn.dataset.tab;
    }

    document.getElementById('inspector-title').innerText = e.type.toUpperCase() + (e.sex?` (${e.sex})`:'');

    let html = '';
    
    if (tab === 'info') {
        html += `<p><strong>Health:</strong> ${Math.floor(e.hp)} / ${e.maxHp}</p>`;
        html += `<p><strong>Age:</strong> ${Math.floor(e.age)} years</p>`;
        if (e instanceof Unit) {
            html += `<p><strong>Job:</strong> ${e.job}</p>`;
            html += `<p><strong>Inventory:</strong> Wood: ${e.inventory.wood}</p>`;
            if (e.villageId) html += `<p><strong>Citizenship:</strong> ${e.villageId}</p>`;
        }
    } 
    else if (tab === 'traits') {
        if (e instanceof Unit && e.traits.length > 0) {
            html += e.traits.map(t => `<span class="trait-badge" title="${TRAITS[t].desc}">${t}</span>`).join('');
        } else {
            html += '<p>No special traits.</p>';
        }
    }
    else if (tab === 'thoughts') {
        if (e instanceof Unit) {
            html += `<div class="thought-bubble">"${e.currentThought}"</div>`;
            html += `<div class="memory-log">`;
            e.memories.forEach(m => {
                html += `<div class="memory-item"><span class="memory-time">[Y:${Math.floor(m.time/100)}]</span> ${m.text}</div>`;
            });
            html += `</div>`;
        } else {
            html += `<p>Just a simple creature.</p>`;
        }
    }
    
    content.innerHTML = html;
}

// Loop Update
function loop(timestamp) {
    if (gameState.paused) {
        if (document.getElementById('main-menu').style.display === 'flex') return;
    }
    
    const dt = Math.min((timestamp - lastTime), 50); // Cap dt
    lastTime = timestamp;
    
    if (!gameState.paused) {
        gameState.time += dt * 0.01 * gameState.speed;
        
        // Remove dead entities
        gameState.entities = gameState.entities.filter(e => !e.dead);
        
        // Update entities
        gameState.entities.forEach(e => e.update(dt));
        

        // Update Villages
        if (Math.random() < 0.05 * gameState.speed) {
            gameState.villages.forEach(v => {
                v.update();
                // Decay war
                if (Math.random() < 0.001) {
                    if(v.atWarWith.length > 0) {
                        v.atWarWith.pop();
                        addFloatingText("Peace!", v.x*TILE_SIZE, v.y*TILE_SIZE, 'white');
                    }
                }
            });
        }
        
    updateClouds(dt * gameState.speed);

        // World Events (Fire spread, etc) - run occasionally
        if (Math.random() < 0.1 * gameState.speed) {
            const rx = Math.floor(Math.random()*MAP_WIDTH);
            const ry = Math.floor(Math.random()*MAP_HEIGHT);
            const tile = gameState.map[ry][rx];
            
            // Fire Logic
            if (tile.fire > 0) {
                tile.fire -= 0.5;
                if (tile.fire <= 0) {
                    tile.fire = 0;
                    tile.type = 'sand'; // Burnt land
                    tile.object = null;
                } else {
                    // Spread
                    const nx = rx + Math.floor(Math.random()*3)-1;
                    const ny = ry + Math.floor(Math.random()*3)-1;
                    if(gameState.map[ny] && gameState.map[ny][nx]) {
                        const target = gameState.map[ny][nx];
                        if(target.type === 'forest' || target.type === 'grass') {
                            if(Math.random() < 0.3) target.fire = 100;
                        }
                    }
                    if(Math.random() < 0.2) spawnParticles(rx*TILE_SIZE, ry*TILE_SIZE, 1, 'fire');
                }
            }
        }
    }
    
    // Smooth Camera
    gameState.camera.zoom += (gameState.camera.targetZoom - gameState.camera.zoom) * 0.1;
    gameState.shake *= 0.9;
    if (Math.abs(gameState.shake) < 0.5) gameState.shake = 0;

    // Movement (WASD)
    if (!gameState.paused) {
        const moveSpeed = (20 / gameState.camera.zoom);
        if (gameState.keys['w']) gameState.camera.y -= moveSpeed;
        if (gameState.keys['s']) gameState.camera.y += moveSpeed;
        if (gameState.keys['a']) gameState.camera.x -= moveSpeed;
        if (gameState.keys['d']) gameState.camera.x += moveSpeed;
    }
    
    // UI Updates
    if (Math.random() < 0.1) {
        document.getElementById('year-display').innerText = `Year ${Math.floor(gameState.time / 100)}`;
        document.getElementById('pop-display').innerText = `${gameState.entities.length} Beings`;
        document.getElementById('vil-display').innerText = `${gameState.villages.length} Kingdoms`;
        
        // Show status of selected
        if (gameState.selection && gameState.selection instanceof Unit) {
            const v = gameState.villages.find(z => z.id === gameState.selection.villageId);
            if(v && v.atWarWith.length > 0) {
                 addFloatingText("WARMODE", gameState.selection.x*TILE_SIZE, gameState.selection.y*TILE_SIZE, 'red');
            }
        }
        
        if (gameState.selection) updateInspector();
    }

    draw();
    requestAnimationFrame(loop);
}

// Mouse Logic
const mouse = { x: 0, y: 0, down: false, rightDown: false };
canvas.addEventListener('mousedown', e => {
    if(e.button === 0) mouse.down = true;
    if(e.button === 2) {
        mouse.rightDown = true;
        gameState.dragStart = { x: e.clientX, y: e.clientY, cx: gameState.camera.x, cy: gameState.camera.y };
    }
});
canvas.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    // Drag Camera
    if (mouse.rightDown && gameState.dragStart) {
        const dx = (e.clientX - gameState.dragStart.x) / gameState.camera.zoom;
        const dy = (e.clientY - gameState.dragStart.y) / gameState.camera.zoom;
        gameState.camera.x = gameState.dragStart.cx - dx;
        gameState.camera.y = gameState.dragStart.cy - dy;
    }
    
    // Tool Application
    if (mouse.down && !mouse.rightDown && !gameState.paused) {
        const wx = (e.clientX - canvas.width/2)/gameState.camera.zoom + gameState.camera.x;
        const wy = (e.clientY - canvas.height/2)/gameState.camera.zoom + gameState.camera.y;
        
        applyTool(Math.floor(wx/TILE_SIZE), Math.floor(wy/TILE_SIZE));
    }
});
canvas.addEventListener('mouseup', e => {
    if(e.button===0) mouse.down=false;
    if(e.button===2) mouse.rightDown=false;
});
canvas.addEventListener('wheel', e => {
    e.preventDefault();
    gameState.camera.targetZoom -= Math.sign(e.deltaY) * 0.1;
    gameState.camera.targetZoom = Math.max(0.1, Math.min(4, gameState.camera.targetZoom));
}, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => gameState.keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => gameState.keys[e.key.toLowerCase()] = false);


// Setup Tool Buttons
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.currentTool = btn.dataset.tool;
        showToast(btn.title);
    });
});

function showToast(msg) {
    const c = document.getElementById('toast-container');
    const d = document.createElement('div');
    d.className = 'toast';
    d.innerText = msg;
    c.appendChild(d);
    setTimeout(() => d.remove(), 3000);
}

function addFloatingText(text, x, y, color='white') {
    gameState.floatingTexts.push({
        text, x, y, life: 60, color, vy: -1
    });
}

function spawnParticles(x, y, n, c) {
    let color = c;
    if (c === 'fire') color = '#ff4d00';
    if (c === 'white') color = '#ffffff';
    
    for(let i=0; i<n; i++) {
        gameState.particles.push({
            x: x + Math.random()*20, 
            y: y + Math.random()*20, 
            vx: (Math.random()-0.5)*5, 
            vy: (Math.random()-0.5)*5, 
            life: 20 + Math.random()*20, 
            color: color
        });
    }
}

// DRAWING 
function draw() {
    ctx.fillStyle = '#0b1015'; // Void color
    ctx.fillRect(0,0,canvas.width, canvas.height);
    
    let shakeX = (Math.random() - 0.5) * gameState.shake;
    let shakeY = (Math.random() - 0.5) * gameState.shake;

    ctx.save();
    ctx.translate(canvas.width/2 + shakeX, canvas.height/2 + shakeY);
    ctx.scale(gameState.camera.zoom, gameState.camera.zoom);
    ctx.translate(-gameState.camera.x, -gameState.camera.y);
    
    // View Culling
    const viewW = canvas.width / gameState.camera.zoom;
    const viewH = canvas.height / gameState.camera.zoom;
    const startX = Math.floor((gameState.camera.x - viewW/2)/TILE_SIZE) - 1;
    const startY = Math.floor((gameState.camera.y - viewH/2)/TILE_SIZE) - 1;
    const endX = startX + Math.ceil(viewW/TILE_SIZE) + 2;
    const endY = startY + Math.ceil(viewH / TILE_SIZE) + 2;
    
    const timeCycle = gameState.time % 2400; // 0-2400
    const isNight = timeCycle > 1800 || timeCycle < 600;
    
    // Map
    for (let y = Math.max(0, startY); y < Math.min(MAP_HEIGHT, endY); y++) {
        for (let x = Math.max(0, startX); x < Math.min(MAP_WIDTH, endX); x++) {
            const t = gameState.map[y][x];
            let c = PALETTE.DEEP_OCEAN;
            
            // Dynamic Colors
            if (t.fire > 0) c = (Math.random() > 0.5) ? PALETTE.FIRE : '#333';
            else if (t.type === 'ocean') c = PALETTE.OCEAN;
            else if (t.type === 'shallow') c = PALETTE.SHALLOW;
            else if (t.type === 'sand') c = PALETTE.SAND;
            else if (t.type === 'grass') c = PALETTE.GRASS;
            else if (t.type === 'forest') c = PALETTE.FOREST;
            else if (t.type === 'mountain') c = PALETTE.MOUNTAIN;
            
            ctx.fillStyle = c;
            ctx.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE+1, TILE_SIZE+1);
            
            // Water Animation
            if (t.type === 'shallow' || t.type === 'ocean') {
                 if (Math.sin(gameState.time * 0.05 + x + y) > 0.8) {
                     ctx.fillStyle = 'rgba(255,255,255,0.1)';
                     ctx.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
                 }
            }

             // Water edge foam
            if (t.type === 'shallow') {
                ctx.fillStyle = PALETTE.FOAM;
                ctx.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, 4);
            }

            if (t.object && t.fire <= 0) {
                if (t.object.type === 'tree') drawTree(x, y);
                else if (t.object.type === 'berry_bush') {
                     ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(x*TILE_SIZE+16, y*TILE_SIZE+20, 10, 0, Math.PI*2); ctx.fill();
                     ctx.fillStyle = 'red'; ctx.beginPath(); ctx.arc(x*TILE_SIZE+14, y*TILE_SIZE+18, 3, 0, Math.PI*2); ctx.fill();
                     ctx.beginPath(); ctx.arc(x*TILE_SIZE+18, y*TILE_SIZE+22, 3, 0, Math.PI*2); ctx.fill();
                }
                else if (t.object.type === 'stone') {
                    ctx.fillStyle = '#777'; 
                    ctx.beginPath(); 
                    ctx.ellipse(x*TILE_SIZE+16, y*TILE_SIZE+24, 10, 6, 0, 0, Math.PI*2); 
                    ctx.fill();
                    ctx.fillStyle = '#999'; 
                    ctx.beginPath(); 
                    ctx.ellipse(x*TILE_SIZE+14, y*TILE_SIZE+22, 6, 4, 0, 0, Math.PI*2); 
                    ctx.fill();
                }
            }
        }
    }
    
    // Villages
    gameState.villages.forEach(v => {
        // Draw Buildings
        v.buildings.forEach(b => {
             drawHouse(b.x, b.y, v.color, b.type === 'hall');
        });

        // Label
        if (gameState.camera.zoom > 0.4) {
             ctx.font = "bold 14px Consolas";
             ctx.textAlign = "center";
             ctx.fillStyle = "black";
             ctx.fillText(v.name, v.x*TILE_SIZE + 16 + 1, v.y*TILE_SIZE - 20 + 1);
             
             // WAR INDICATOR
             if (v.atWarWith.length > 0) {
                 ctx.fillStyle = "red";
                 ctx.fillText("⚔️ WAR ⚔️", v.x*TILE_SIZE + 16, v.y*TILE_SIZE - 40);
             }
             
             ctx.fillStyle = "white"; 
             ctx.fillText(v.name, v.x*TILE_SIZE + 16, v.y*TILE_SIZE - 20);
             
             // Resource count (Debug/Detail)
             if (gameState.selection && gameState.selection.id === v.id) {
                 ctx.font = "10px Consolas";
                 ctx.fillStyle = "gold";
                 ctx.fillText(`Wood: ${v.wood}`, v.x*TILE_SIZE + 16, v.y*TILE_SIZE - 35);
             }
        }
    });

    // Entities
    gameState.entities.forEach(e => {
        if (e.x*TILE_SIZE < (gameState.camera.x - viewW/2 - 50) || e.x*TILE_SIZE > (gameState.camera.x + viewW/2 + 50)) return;
        
        const sx = e.x*TILE_SIZE;
        const sy = e.y*TILE_SIZE;
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(sx+16, sy+28, 6, 3, 0, 0, Math.PI*2); ctx.fill();

        if (e.type === 'human') {
            const bounce = Math.abs(Math.sin(e.age*10))*2;
            
            // Job Icon?
            if (e instanceof Unit && e.inventory.wood > 0) {
                 ctx.fillStyle = '#8d6e63';
                 ctx.fillRect(sx+4, sy+10-bounce, 4, 12); // Logs
            }

            ctx.fillStyle = e.color || 'red';
            ctx.fillRect(sx+12, sy+12-bounce, 8, 14); // Body
            
            // Gender differentiation (subtle)
            if (e.sex === 'f') {
                ctx.fillStyle = 'rgba(255,100,100,0.3)';
                ctx.fillRect(sx+12, sy+20-bounce, 8, 6); // Dress bottom
            }

            ctx.fillStyle = '#ffccaa'; // Skin
            ctx.fillRect(sx+12, sy+4-bounce, 8, 8); // Head
            
            // Eyes
            ctx.fillStyle = 'black';
            ctx.fillRect(sx+14, sy+6-bounce, 1, 1);
            ctx.fillRect(sx+17, sy+6-bounce, 1, 1);

        } else if (e.type === 'chicken') {
            const bounce = Math.abs(Math.sin(e.age*15))*2;
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(sx+16, sy+22-bounce, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'red'; ctx.fillRect(sx+16, sy+16-bounce, 2, 4); // Comb
            ctx.fillStyle = 'orange'; ctx.fillRect(sx+20, sy+20-bounce, 4, 2); // Beak
        } else if (e.type === 'animal') {
             const bounce = Math.abs(Math.sin(e.age*8))*1;
             ctx.fillStyle = '#795548';
             ctx.fillRect(sx+8, sy+18-bounce, 16, 10);
             ctx.fillRect(sx+22, sy+12-bounce, 8, 8); // Head
        } 
        
        if (e.infected) {
             ctx.fillStyle = 'rgba(100, 0, 255, 0.4)';
             ctx.beginPath(); ctx.arc(sx+16, sy+16, 12, 0, Math.PI*2); ctx.fill();
        }

        // Weapon (War Mode)
        if (e instanceof Unit && e.villageId) {
             const myV = gameState.villages.find(v => v.id === e.villageId);
             if (myV && myV.atWarWith.length > 0) {
                 // Draw Sword
                 ctx.save();
                 ctx.translate(sx+4, sy+16);
                 const swing = Math.sin(e.age*20)*0.5;
                 ctx.rotate(-0.5 + swing);
                 ctx.fillStyle = '#8899aa'; // Blade
                 ctx.fillRect(0, -10, 2, 12);
                 ctx.fillStyle = '#5d4037'; // Handle
                 ctx.fillRect(-1, 0, 4, 3);
                 ctx.restore();
             }
        }

        if (gameState.selection === e) {
            ctx.strokeStyle = 'yellow'; ctx.lineWidth=1; 
            ctx.beginPath(); ctx.arc(sx+16, sy+16, 16, 0, Math.PI*2); ctx.stroke();
            
            // Draw path line to target
            if (e.target) {
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(sx+16, sy+16);
                ctx.lineTo(e.target.x*TILE_SIZE + 16, e.target.y*TILE_SIZE + 16);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    });

    // Particles (Reverse Loop for Splice safety)
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const p = gameState.particles[i];
        ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.life > 10 ? 4 : 2, p.life > 10 ? 4 : 2);
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life<=0) gameState.particles.splice(i,1);
    }
    
    // In-World Floating Text
    for (let i = gameState.floatingTexts.length - 1; i >= 0; i--) {
        const t = gameState.floatingTexts[i];
        ctx.font = "bold 14px Arial";
        ctx.fillStyle = "black";
        ctx.fillText(t.text, t.x + 1, t.y + 1);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
        
        t.y += t.vy;
        t.life--;
        if (t.life <= 0) gameState.floatingTexts.splice(i, 1);
    }

    // Hover Box
    if (!gameState.paused) {
        const mx = Math.floor(((mouse.x - canvas.width/2)/gameState.camera.zoom + gameState.camera.x)/TILE_SIZE);
        const my = Math.floor(((mouse.y - canvas.height/2)/gameState.camera.zoom + gameState.camera.y)/TILE_SIZE);
        
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx*TILE_SIZE, my*TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    
    // Day/Night Cycle Overlay
    if (isNight) {
        ctx.fillStyle = 'rgba(0, 5, 20, 0.4)'; // Blue Night Tint
        ctx.fillRect(gameState.camera.x - viewW/2 - 100, gameState.camera.y - viewH/2 - 100, viewW+200, viewH+200);
    }
    
    drawClouds(ctx);

    ctx.restore();
}

function drawTree(x, y) {
    const sx = x*TILE_SIZE; const sy = y*TILE_SIZE;
    const sway = Math.sin(Date.now()*0.002 + x)*2;

    ctx.fillStyle = '#4e342e'; ctx.fillRect(sx+14, sy+18, 4, 10); // Trunk
    
    ctx.fillStyle = '#1b5e20'; // Dark leaves
    ctx.beginPath(); ctx.arc(sx+16+sway, sy+14, 11, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2e7d32'; // Mid
    ctx.beginPath(); ctx.arc(sx+14+sway, sy+12, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4caf50'; // Light highlight
    ctx.beginPath(); ctx.arc(sx+18+sway, sy+10, 6, 0, Math.PI*2); ctx.fill();
}

function drawHouse(x, y, color, isHall) {
    const sx = x*TILE_SIZE; const sy = y*TILE_SIZE;
    
    // Base
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(sx+4, sy+10, 24, 18);
    
    // Door
    ctx.fillStyle = 'black';
    ctx.fillRect(sx+12, sy+18, 8, 10);
    
    // Roof
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(sx+2, sy+10);
    ctx.lineTo(sx+16, sy-4);
    ctx.lineTo(sx+30, sy+10);
    ctx.fill();
    
    // Trim
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx+2, sy+10);
    ctx.lineTo(sx+16, sy-4);
    ctx.lineTo(sx+30, sy+10);
    ctx.stroke();

    if (isHall) {
         ctx.fillStyle = 'gold';
         ctx.font = "16px Arial";
         ctx.fillText("👑", sx+8, sy);
    }
}

// Init
loadSaveList();
