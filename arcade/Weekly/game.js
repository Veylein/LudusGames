
// --- CONSTANTS ---
const CHUNK_SIZE = 16;
const MAP_WIDTH = 200; // Larger map
const MAP_HEIGHT = 200;
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
    
    // UI/Highlights
    SELECT: 'rgba(255, 255, 0, 0.5)',
    HOVER: 'rgba(255, 255, 255, 0.2)'
};

// --- GAME STATE ---
const gameState = {
    map: [],
    chunks: {},
    entities: [],
    particles: [],
    villages: [],
    
    camera: { x: 0, y: 0, zoom: 0.5, targetZoom: 0.5 },
    currentTool: 'cursor',
    
    time: 0,
    speed: 1,
    paused: false,
    
    hover: { x: 0, y: 0, tile: null },
    selection: null,
    dragStart: null,
    keys: {}
};

// --- WORLD GENERATION: NOISE ---
// Simple implementation of 2D noise
const PERLIN_YWRAPB = 4;
const PERLIN_YWRAP = 1 << PERLIN_YWRAPB;
const PERLIN_ZWRAPB = 8;
const PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB;
const PERLIN_SIZE = 4095;
let perlin_octaves = 4; // default to medium smooth
let perlin_amp_falloff = 0.5; // 50% reduction/octave
const perlin = new Float32Array(PERLIN_SIZE + 1).map(() => Math.random());

function noise(x, y = 0, z = 0) {
    let xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let xf = x - xi, yf = y - yi, zf = z - zi;
    let rxf, ryf;
    let r = 0, ampl = 0.5, n1, n2, n3;
    for (let o = 0; o < perlin_octaves; o++) {
        let of = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB);
        rxf = 0.5 * (1.0 - Math.cos(xf * Math.PI));
        ryf = 0.5 * (1.0 - Math.cos(yf * Math.PI));
        n1 = perlin[of & PERLIN_SIZE];
        n1 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n1);
        n2 = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
        n2 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n2);
        n1 += ryf * (n2 - n1);
        of += PERLIN_ZWRAP;
        n2 = perlin[of & PERLIN_SIZE];
        n2 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n2);
        n3 = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
        n3 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n3);
        n2 += ryf * (n3 - n2);
        r += n1 * ampl;
        ampl *= perlin_amp_falloff;
        xi <<= 1; xf *= 2; yi <<= 1; yf *= 2; zi <<= 1; zf *= 2;
        if (xf >= 1.0) { xi++; xf--; }
        if (yf >= 1.0) { yi++; yf--; }
        if (zf >= 1.0) { zi++; zf--; } // fix z wrap
    }
    return r;
}

function generateWorld() {
    const map = [];
    const seed = Math.random() * 100;
    
    for (let y = 0; y < MAP_HEIGHT; y++) {
        const row = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            // Mask for island shape
            const cx = MAP_WIDTH / 2;
            const cy = MAP_HEIGHT / 2;
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (MAP_WIDTH / 2);
            const mask = Math.max(0, 1 - Math.pow(dist, 3));
            
            // Noise
            let h = noise(x * 0.05 + seed, y * 0.05 + seed);
            h = h * mask; // Apply mask
            
            let type = 'deep_ocean';
            
            if (h < 0.2) type = 'deep_ocean';
            else if (h < 0.3) type = 'ocean';
            else if (h < 0.35) type = 'shallow';
            else if (h < 0.4) type = 'sand';
            else if (h < 0.7) type = 'grass';
            else if (h < 0.85) type = 'forest'; 
            else type = 'mountain';
            
            // Objects/Resources
            let object = null;
            if (type === 'forest' || (type === 'grass' && Math.random() < 0.2)) {
                object = { type: 'tree', hp: 5, variant: Math.floor(Math.random() * 3) };
            } else if (type === 'mountain' && Math.random() < 0.1) {
                object = { type: 'stone', hp: 10 };
            } else if (type === 'grass' && Math.random() < 0.05) {
                object = { type: 'berry_bush', amount: 5 };
            }

            row.push({ x, y, h, type, object, fire: 0 });
        }
        map.push(row);
    }
    return map;
}

// --- ENTITIES ---

class Entity {
    constructor(type, x, y) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.age = 0;
        this.state = 'idle';
        this.target = null;
        this.actionTimer = 0;
        this.hp = 100;
        this.maxHp = 100;
    }
    
    update(dt) {
        this.age += dt * 0.001;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Friction
        this.vx *= 0.9;
        this.vy *= 0.9;
    }
}

class Unit extends Entity {
    constructor(type, x, y) {
        super(type, x, y);
        this.village = null;
        this.job = 'idle';
        this.inventory = {};
        
        // Appearance
        this.color = `hsl(${Math.random()*40 + 10}, 70%, 60%)`; 
        this.hair = `hsl(${Math.random()*50}, ${Math.random()*50 + 20}%, 30%)`;
    }
    
    update(dt) {
        super.update(dt);
        this.actionTimer -= dt;
        
        if (this.actionTimer <= 0) {
            this.think();
            this.actionTimer = 500 + Math.random() * 1000;
        }
        
        // Collision with map bounds
        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
        if (this.x > MAP_WIDTH) this.x = MAP_WIDTH;
        if (this.y > MAP_HEIGHT) this.y = MAP_HEIGHT;
    }
    
    think() {
        if (this.state === 'idle') {
            // Wander
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.002; 
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
        }
    }
}

class Animal extends Entity {
    constructor(type, x, y) {
        super(type, x, y);
        this.hp = 20;
    }
    update(dt) {
        super.update(dt);
        if (Math.random() < 0.02) {
            const angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(angle) * 0.003;
            this.vy = Math.sin(angle) * 0.003;
        }
    }
}

// --- VILLAGE SYSTEM ---
class Village {
    constructor(x, y) {
        this.id = Math.random().toString(36).substr(2, 5);
        this.x = x; // Center
        this.y = y;
        this.color = `hsl(${Math.random()*360}, 70%, 50%)`;
        this.name = this.generateName();
        this.population = 0;
        this.wood = 0;
        this.stone = 0;
        this.buildings = []; // {x, y, type}
        this.tiles = []; // Claimed tiles
        
        this.addBuilding(x, y, 'hall');
    }
    
    generateName() {
        const pre = ['Oka', 'Poly', 'Hana', 'Cru', 'Ston', 'River', 'High'];
        const suf = ['grad', 'heim', 'ia', 'land', 'ford', 'den', 'rock'];
        return pre[Math.floor(Math.random()*pre.length)] + suf[Math.floor(Math.random()*suf.length)];
    }
    
    addBuilding(x, y, type) {
        this.buildings.push({x, y, type});
        // Claim area around
        for(let dy=-2; dy<=2; dy++) {
            for(let dx=-2; dx<=2; dx++) {
                const tx = Math.floor(x + dx);
                const ty = Math.floor(y + dy);
                if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
                    this.tiles.push({x: tx, y: ty}); 
                }
            }
        }
    }
}

// --- ENGINE & RENDERER ---

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d', { alpha: false }); // Optimize
let lastTime = 0;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

function spawnParticles(x, y, count, type) {
    for(let i=0; i<count; i++) {
        gameState.particles.push({
            x: x, 
            y: y,
            vx: (Math.random()-0.5) * 5,
            vy: (Math.random()-0.5) * 5,
            life: 30 + Math.random() * 30,
            color: type === 'blood' ? '#ff0000' : type === 'fire' ? '#ffaa00' : '#ffffff'
        });
    }
}

function init() {
    gameState.map = generateWorld();
    
    // Initial camera center
    gameState.camera.x = (MAP_WIDTH * TILE_SIZE)/2;
    gameState.camera.y = (MAP_HEIGHT * TILE_SIZE)/2;

    requestAnimationFrame(loop);
}

// --- INPUT ---
const mouse = { x: 0, y: 0, down: false, rightDown: false };

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomSpeed = 0.05;
    gameState.camera.targetZoom -= Math.sign(e.deltaY) * zoomSpeed;
    gameState.camera.targetZoom = Math.max(0.2, Math.min(3.0, gameState.camera.targetZoom));
});

canvas.addEventListener('mousedown', e => {
    if (e.button === 0) mouse.down = true;
    if (e.button === 2) mouse.rightDown = true; // Drag camera
    gameState.dragStart = { x: e.clientX, y: e.clientY, camX: gameState.camera.x, camY: gameState.camera.y };
});

canvas.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    if (mouse.rightDown && gameState.dragStart) {
        // Panning (Inverse zoom scale)
        const dx = e.clientX - gameState.dragStart.x;
        const dy = e.clientY - gameState.dragStart.y;
        gameState.camera.x = gameState.dragStart.camX - dx / gameState.camera.zoom;
        gameState.camera.y = gameState.dragStart.camY - dy / gameState.camera.zoom;
    }
});

canvas.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.down = false;
    if (e.button === 2) mouse.rightDown = false;
});

canvas.addEventListener('contextmenu', e => e.preventDefault()); // Stop right click menu

// Tool Selection
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.currentTool = btn.dataset.tool;
        showToast(`Tool: ${btn.dataset.tool.toUpperCase()}`);
    });
});

// WASD Keys
window.addEventListener('keydown', e => gameState.keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => gameState.keys[e.key.toLowerCase()] = false);

function showToast(msg) {
    const c = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerText = msg;
    c.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// --- LOGIC LOOP ---

function applyTool(tx, ty) {
    if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return;
    const tile = gameState.map[ty][tx];
    const tool = gameState.currentTool;

    if (tool === 'mountains') tile.type = 'mountain';
    else if (tool === 'forest') { tile.type = 'forest'; tile.object = { type: 'tree' }; }
    else if (tool === 'water') { tile.type = 'ocean'; tile.object = null; }
    else if (tool === 'sand') { tile.type = 'sand'; tile.object = null; }
    else if (tool === 'fire') { 
        tile.fire = 100; 
        spawnParticles(tx*TILE_SIZE+16, ty*TILE_SIZE+16, 2, 'fire');
    }
    else if (tool === 'human') {
        const h = new Unit('human', tx, ty);
        gameState.entities.push(h);
        spawnParticles(tx*TILE_SIZE, ty*TILE_SIZE, 5, 'white');
        gameState.currentTool = 'cursor'; // Reset after single spawn? Or keep? Keep for spamming.
    }
    else if (tool === 'animal' || tool === 'chicken') {
        const type = tool === 'chicken' ? 'rabbit' : (Math.random()<0.5 ? 'wolf' : 'rabbit'); // chicken placeholder
        const a = new Animal(type, tx, ty);
        gameState.entities.push(a);
    }
    else if (tool === 'village') {
        if (tile.type !== 'ocean' && tile.type !== 'mountain') {
            const v = new Village(tx, ty);
            gameState.villages.push(v);
            gameState.currentTool = 'cursor';
            showToast(`Founded ${v.name}`);
        }
    }
    else if (tool === 'tnt') {
        // Boom
        for (let ry = -2; ry <= 2; ry++) {
            for (let rx = -2; rx <= 2; rx++) {
                if (gameState.map[ty+ry] && gameState.map[ty+ry][tx+rx]) {
                    gameState.map[ty+ry][tx+rx].type = 'sand';
                    gameState.map[ty+ry][tx+rx].object = null;
                }
            }
        }
        spawnParticles(tx*TILE_SIZE, ty*TILE_SIZE, 20, 'fire');
    }
    else if (tool === 'cursor') {
        // Inspect
        const ent = gameState.entities.find(e => Math.abs(e.x - tx) < 1 && Math.abs(e.y - ty) < 1);
        if (ent) {
            gameState.selection = ent;
            updateInspector();
        } else if (gameState.selection && !mouse.rightDown) { // Avoid deselect on pan
            gameState.selection = null;
            document.getElementById('inspector').style.display = 'none';
        }
    }
}

function updateInspector() {
    const div = document.getElementById('inspector');
    const content = document.getElementById('inspector-content');
    const title = document.getElementById('inspector-title');
    
    if (gameState.selection) {
        div.style.display = 'flex';
        const s = gameState.selection;
        title.innerText = s.type.toUpperCase();
        
        let html = `
            <div><span class="json-key">Health:</span> <span class="json-number">${Math.floor(s.hp)}</span></div>
            <div><span class="json-key">State:</span> <span class="json-string">"${s.state}"</span></div>
        `;
        
        if (s instanceof Unit) {
            html += `<div><span class="json-key">Job:</span> <span class="json-string">"${s.job}"</span></div>`;
        }
        
        content.innerHTML = html;
    } else {
        div.style.display = 'none';
    }
}

function loop(timestamp) {
    const dt = timestamp - lastTime || 16;
    lastTime = timestamp;

    // Smooth Zoom
    gameState.camera.zoom += (gameState.camera.targetZoom - gameState.camera.zoom) * 0.1;

    // Movement (WASD)
    const moveSpeed = 10 / gameState.camera.zoom;
    if (gameState.keys['w']) gameState.camera.y -= moveSpeed;
    if (gameState.keys['s']) gameState.camera.y += moveSpeed;
    if (gameState.keys['a']) gameState.camera.x -= moveSpeed;
    if (gameState.keys['d']) gameState.camera.x += moveSpeed;

    // Calc Mouse World Pos (Reversed Text logic)
    // screenX = (worldX - camX) * zoom + center
    // (screenX - center) / zoom + camX = worldX
    const worldMouseX = (mouse.x - canvas.width/2) / gameState.camera.zoom + gameState.camera.x;
    const worldMouseY = (mouse.y - canvas.height/2) / gameState.camera.zoom + gameState.camera.y;
    
    const tx = Math.floor(worldMouseX / TILE_SIZE);
    const ty = Math.floor(worldMouseY / TILE_SIZE);
    
    gameState.hover.tile = (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) ? gameState.map[ty][tx] : null;

    // Tool usage
    if (mouse.down && gameState.hover.tile && !mouse.rightDown) {
        applyTool(tx, ty);
    }

    // --- UPDATES ---
    gameState.entities.forEach(e => e.update(dt));
    
    // Update Stats
    if (timestamp % 30 < 1) { // Throttle UI updates
        document.getElementById('pop-display').innerText = `${gameState.entities.length} Beings`;
        document.getElementById('vil-display').innerText = `${gameState.villages.length} Villages`;
    }

    if (gameState.selection) updateInspector();

    draw();
    requestAnimationFrame(loop);
}

function draw() {
    // Clear
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Apply Camera Transform
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(gameState.camera.zoom, gameState.camera.zoom);
    ctx.translate(-gameState.camera.x, -gameState.camera.y);

    // Visibility Calc
    const viewW = canvas.width / gameState.camera.zoom;
    const viewH = canvas.height / gameState.camera.zoom;
    const startX = Math.floor((gameState.camera.x - viewW/2) / TILE_SIZE);
    const startY = Math.floor((gameState.camera.y - viewH/2) / TILE_SIZE);
    const endX = startX + Math.ceil(viewW / TILE_SIZE) + 2;
    const endY = startY + Math.ceil(viewH / TILE_SIZE) + 2;

    // Draw Map
    for (let y = Math.max(0, startY); y < Math.min(MAP_HEIGHT, endY); y++) {
        for (let x = Math.max(0, startX); x < Math.min(MAP_WIDTH, endX); x++) {
            const tile = gameState.map[y][x];
            
            // Draw tile
            let color = PALETTE.DEEP_OCEAN;
            switch(tile.type) {
                case 'ocean': color = PALETTE.OCEAN; break;
                case 'shallow': color = PALETTE.SHALLOW; break;
                case 'sand': color = PALETTE.SAND; break;
                case 'grass': color = PALETTE.GRASS; break;
                case 'forest': color = PALETTE.FOREST; break;
                case 'mountain': color = PALETTE.MOUNTAIN; break;
            }
            
            // Render directly
            drawRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE+0.5, TILE_SIZE+0.5, color);

            // Water edge foam
            if (tile.type === 'shallow') {
                drawRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, 4, PALETTE.FOAM);
            }

            // Object
            if (tile.object) {
                if (tile.object.type === 'tree') drawTree(x*TILE_SIZE, y*TILE_SIZE);
                else if (tile.object.type === 'stone') drawStone(x*TILE_SIZE, y*TILE_SIZE);
                else if (tile.object.type === 'berry_bush') drawBush(x*TILE_SIZE, y*TILE_SIZE);
            }

            // Fire
            if (tile.fire > 0) {
                drawRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE, `rgba(255, 100, 0, ${tile.fire/100})`);
                tile.fire -= 0.5;
                if (tile.fire <= 0 && tile.object) tile.object = null; // Burn obj
            }
        }
    }
    
    // Draw Villages (Centers)
    gameState.villages.forEach(v => {
        // Town Hall
        drawBuilding(v.x * TILE_SIZE, v.y * TILE_SIZE, v.color);
        // Name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Consolas'; 
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(v.name, v.x * TILE_SIZE + 16, v.y * TILE_SIZE - 20);
        ctx.fillText(v.name, v.x * TILE_SIZE + 16, v.y * TILE_SIZE - 20);
    });

    // Draw Entities
    gameState.entities.forEach(e => {
         // Culling
         if (e.x*TILE_SIZE < (gameState.camera.x - viewW/2 - 100) || 
             e.x*TILE_SIZE > (gameState.camera.x + viewW/2 + 100)) return;

         const screenX = e.x * TILE_SIZE;
         const screenY = e.y * TILE_SIZE;
         
         // Shadow
         ctx.fillStyle = 'rgba(0,0,0,0.3)';
         ctx.beginPath();
         ctx.ellipse(screenX + 16, screenY + 28, 6, 3, 0, 0, Math.PI*2);
         ctx.fill();

         if (e.type === 'human') drawHuman(e, screenX, screenY);
         else if (e.type === 'wolf') drawAnimal(e, screenX, screenY, '#555');
         else if (e.type === 'rabbit') drawAnimal(e, screenX, screenY, '#fff');

         // Selection
         if (gameState.selection === e) {
             ctx.strokeStyle = 'yellow';
             ctx.lineWidth = 1;
             ctx.beginPath();
             ctx.arc(screenX + 16, screenY + 16, 16, 0, Math.PI*2);
             ctx.stroke();
         }
    });

    // Particles
    gameState.particles.forEach((p, i) => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) gameState.particles.splice(i, 1);
    });

    // Hover Selection
    if (gameState.hover.tile) {
        const hx = Math.floor(gameState.hover.tile.x) * TILE_SIZE;
        const hy = Math.floor(gameState.hover.tile.y) * TILE_SIZE;
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; 
        ctx.fillRect(hx, hy, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(hx, hy, TILE_SIZE, TILE_SIZE);
        
        // Tool Preview
        if (gameState.currentTool !== 'cursor') {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(hx, hy, TILE_SIZE, TILE_SIZE);
        }
    }

    ctx.restore();
}

// Drawing Primitives helpers (batching optimization usually better but raw canvas calls fine for this scale)
function drawRect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

function drawTree(x, y) {
    const sway = Math.sin(Date.now()*0.002 + x)*2;
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x+12, y+16, 8, 16); // Trunk
    
    ctx.fillStyle = PALETTE.FOREST;
    // Layered leaves
    ctx.beginPath();
    ctx.arc(x+16+sway, y+12, 12, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#558b2f'; // Highlight
    ctx.beginPath();
    ctx.arc(x+14+sway, y+10, 8, 0, Math.PI*2);
    ctx.fill();
}

function drawStone(x, y) {
    ctx.fillStyle = '#757575';
    ctx.beginPath();
    ctx.arc(x+16, y+20, 10, 0, Math.PI*2);
    ctx.fill();
}

function drawBush(x, y) {
    ctx.fillStyle = '#33691e';
    ctx.beginPath();
    ctx.arc(x+16, y+22, 8, 0, Math.PI*2);
    ctx.fill();
    // Berries
    ctx.fillStyle = '#ad1457';
    ctx.fillRect(x+14, y+18, 2, 2);
    ctx.fillRect(x+18, y+20, 2, 2);
    ctx.fillRect(x+12, y+22, 2, 2);
}

function drawBuilding(x, y, color) {
    // Basic hut
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x+4, y+10, 24, 22); // Walls
    ctx.fillStyle = color; // Roof color based on village
    ctx.beginPath();
    ctx.moveTo(x+2, y+10);
    ctx.lineTo(x+16, y-4);
    ctx.lineTo(x+30, y+10);
    ctx.fill(); // Roof
    
    // Door
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(x+12, y+20, 8, 12);
}

function drawHuman(e, x, y) {
    const bounce = Math.abs(Math.sin(e.age * 5)) * 2;
    
    // Body
    ctx.fillStyle = e.color; 
    ctx.fillRect(x+10, y+12+bounce, 12, 14);
    
    // Head
    ctx.fillStyle = '#ffcc80'; // Skin
    ctx.fillRect(x+10, y+2+bounce, 12, 10);
    
    // Eyes
    ctx.fillStyle = 'black';
    if (e.vx > 0) { // Right
        ctx.fillRect(x+18, y+5+bounce, 2, 2);
    } else { // Left
        ctx.fillRect(x+12, y+5+bounce, 2, 2);
    }
}

function drawAnimal(e, x, y, color) {
    const bounce = Math.abs(Math.sin(e.age * 8)) * 2;
    ctx.fillStyle = color;
    // Quadruped simplified
    ctx.fillRect(x+8, y+16+bounce, 16, 10); // Body
    ctx.fillRect(x+6, y+10+bounce, 8, 8); // Head
    // Legs
    ctx.fillRect(x+8, y+26+bounce, 3, 4);
    ctx.fillRect(x+20, y+26+bounce, 3, 4);
}

init();
