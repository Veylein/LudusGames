import * as THREE from 'three';

// --- CONFIGURATION ---
const MAP_SIZE = 120; 
const WALL_HEIGHT = 8;

// --- CHAMPION DATA (15 Classes) ---
const CLASSES = [
    { id: 'knight', name: 'Knight', role: 'Tank', hp: 200, speed: 0.18, color: 0x3366cc, icon: '⚔️', desc: 'High durability, melee attacks.' },
    { id: 'rogue', name: 'Rogue', role: 'Assassin', hp: 120, speed: 0.25, color: 0xcc3333, icon: '🗡️', desc: 'Fast, high burst damage.' },
    { id: 'wizard', name: 'Wizard', role: 'Mage', hp: 100, speed: 0.2, color: 0x9933cc, icon: '🔮', desc: 'Ranged magical attacks.' },
    { id: 'cleric', name: 'Cleric', role: 'Support', hp: 150, speed: 0.19, color: 0xffcc33, icon: '✝️', desc: 'Heals allies, moderate damage.' },
    { id: 'ranger', name: 'Ranger', role: 'Marksman', hp: 110, speed: 0.22, color: 0x33cc33, icon: '🏹', desc: 'Ranged physical attacks.' },
    { id: 'barbarian', name: 'Barbarian', role: 'Fighter', hp: 180, speed: 0.2, color: 0x990000, icon: '🪓', desc: 'Melee damage dealer.' },
    { id: 'necromancer', name: 'Necromancer', role: 'Mage', hp: 90, speed: 0.18, color: 0x330033, icon: '💀', desc: 'Summons minions.' },
    { id: 'paladin', name: 'Paladin', role: 'Tank', hp: 190, speed: 0.18, color: 0xcccc00, icon: '🛡️', desc: 'Holy warrior, defensive.' },
    { id: 'monk', name: 'Monk', role: 'Fighter', hp: 140, speed: 0.24, color: 0xff9933, icon: '👊', desc: 'Fast melee, martial arts.' },
    { id: 'druid', name: 'Druid', role: 'Support', hp: 130, speed: 0.2, color: 0x006600, icon: '🌿', desc: 'Nature magic, shapeshifting.' },
    { id: 'bard', name: 'Bard', role: 'Support', hp: 120, speed: 0.21, color: 0xff66cc, icon: '🎵', desc: 'Buffs allies with music.' },
    { id: 'sorcerer', name: 'Sorcerer', role: 'Mage', hp: 95, speed: 0.2, color: 0xff3300, icon: '🔥', desc: 'Raw magic power.' },
    { id: 'warlock', name: 'Warlock', role: 'Mage', hp: 105, speed: 0.19, color: 0x660066, icon: '👁️', desc: 'Eldritch blasts.' },
    { id: 'fighter', name: 'Fighter', role: 'Fighter', hp: 160, speed: 0.2, color: 0x666666, icon: '⚔️', desc: 'Versatile warrior.' },
    { id: 'artificer', name: 'Artificer', role: 'Specialist', hp: 130, speed: 0.2, color: 0x009999, icon: '🔧', desc: 'Gadgets and magic items.' }
];

// --- STATE ---
const state = {
    gameActive: false,
    selectedClass: null,
    player: {
        hp: 100,
        maxHp: 100,
        score: 0,
        group: null
    },
    enemies: [],
    projectiles: []
};

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111); // Dark void outside the room
scene.fog = new THREE.FogExp2(0x111111, 0.02);

// Camera (Fixed Isometric)
const aspect = window.innerWidth / window.innerHeight;
const d = 35;
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
camera.position.set(20, 30, 20); // Looking down from corner
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game-container').appendChild(renderer.domElement);

// --- LIGHTING ---
// Main Arena Light
const spotLight = new THREE.SpotLight(0xffffff, 1.5);
spotLight.position.set(0, 60, 0);
spotLight.angle = Math.PI / 4;
spotLight.penumbra = 0.5;
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 2048;
spotLight.shadow.mapSize.height = 2048;
scene.add(spotLight);

const ambientLight = new THREE.AmbientLight(0x404060, 0.6); // Cool ambient
scene.add(ambientLight);

// --- ARENA GENERATION ---
const worldGroup = new THREE.Group();
scene.add(worldGroup);

function generateArena() {
    // 1. Floor (Dungeon Tile feel)
    const floorGeo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x2a2a2a, 
        roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    worldGroup.add(floor);
    
    // 2. Walls (The "Room")
    const wallGeo = new THREE.BoxGeometry(MAP_SIZE, WALL_HEIGHT, 4);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d });
    
    // North
    const nWall = new THREE.Mesh(wallGeo, wallMat);
    nWall.position.set(0, WALL_HEIGHT/2, -MAP_SIZE/2);
    nWall.castShadow = true;
    nWall.receiveShadow = true;
    worldGroup.add(nWall);
    
    // South
    const sWall = new THREE.Mesh(wallGeo, wallMat);
    sWall.position.set(0, WALL_HEIGHT/2, MAP_SIZE/2);
    sWall.castShadow = true;
    sWall.receiveShadow = true;
    worldGroup.add(sWall);
    
    // East
    const eWall = new THREE.Mesh(wallGeo, wallMat);
    eWall.rotation.y = Math.PI / 2;
    eWall.position.set(MAP_SIZE/2, WALL_HEIGHT/2, 0);
    eWall.castShadow = true;
    eWall.receiveShadow = true;
    worldGroup.add(eWall);
    
    // West
    const wWall = new THREE.Mesh(wallGeo, wallMat);
    wWall.rotation.y = Math.PI / 2;
    wWall.position.set(-MAP_SIZE/2, WALL_HEIGHT/2, 0);
    wWall.castShadow = true;
    wWall.receiveShadow = true;
    worldGroup.add(wWall);

    // 3. Random Cover / Columns
    const obstacleGeo = new THREE.BoxGeometry(4, 6, 4);
    const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    
    for(let i=0; i<12; i++) {
        const obs = new THREE.Mesh(obstacleGeo, obstacleMat);
        obs.position.set(
            (Math.random() - 0.5) * (MAP_SIZE - 20),
            3,
            (Math.random() - 0.5) * (MAP_SIZE - 20)
        );
        obs.castShadow = true;
        obs.receiveShadow = true;
        worldGroup.add(obs);
    }
}

// --- PLAYER ---
function spawnPlayer(classId) {
    const classData = CLASSES.find(c => c.id === classId);
    state.selectedClass = classData;
    state.player.maxHp = classData.hp;
    state.player.hp = classData.hp;

    const playerGeo = new THREE.CapsuleGeometry(1, 3, 4, 8);
    const playerMat = new THREE.MeshStandardMaterial({ color: classData.color }); 
    const playerMesh = new THREE.Mesh(playerGeo, playerMat);
    playerMesh.position.y = 1.5;
    playerMesh.castShadow = true;
    
    // Create container for rotation separate from capsule
    const group = new THREE.Group();
    group.add(playerMesh);
    
    // Visual Marker (Ring for "Selected")
    const ringGeo = new THREE.RingGeometry(1.5, 1.7, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    group.add(ring);

    // Helper: Weapon placement
    const weaponGroup = new THREE.Group();
    weaponGroup.position.set(0, 1.5, 1); // Front
    
    // Simple weapon shape based on role
    let weaponGeo;
    if (classData.role === 'Tank' || classData.role === 'Fighter') {
        weaponGeo = new THREE.BoxGeometry(0.2, 0.2, 2.5); // Sword/Axe handle-ish
    } else if (classData.role === 'Mage' || classData.role === 'Support') {
        weaponGeo = new THREE.CylinderGeometry(0.1, 0.1, 3); // Staff
    } else {
        weaponGeo = new THREE.BoxGeometry(0.2, 0.5, 1); // Dagger/Bow-ish
    }
    
    const weapon = new THREE.Mesh(weaponGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
    weapon.rotation.x = Math.PI / 2;
    weaponGroup.add(weapon);
    group.add(weaponGroup);
    
    scene.add(group);
    state.player.group = group;
}

// --- BOTS & AI ---
function spawnBots() {
    // Spawn 4 Allies
    for(let i=0; i<4; i++) {
        const randomClass = CLASSES[Math.floor(Math.random() * CLASSES.length)];
        spawnBot(randomClass, 'ally', i);
    }
    // Spawn 5 Enemies
    for(let i=0; i<5; i++) {
        const randomClass = CLASSES[Math.floor(Math.random() * CLASSES.length)];
        spawnBot(randomClass, 'enemy', i);
    }
}

function spawnBot(classData, team, index) {
    const group = new THREE.Group();
    
    // Body
    const bodyGeo = new THREE.CapsuleGeometry(1, 3, 4, 8);
    const color = team === 'ally' ? 0x0000ff : 0xff0000; // Team Colors override for now? Or marker?
    // Let's keep class color but add a team marker
    const bodyMat = new THREE.MeshStandardMaterial({ color: classData.color });
    const mesh = new THREE.Mesh(bodyGeo, bodyMat);
    mesh.position.y = 1.5;
    mesh.castShadow = true;
    group.add(mesh);

    // Team Marker (Ring)
    const ringColor = team === 'ally' ? 0x4444ff : 0xff4444;
    const ringGeo = new THREE.RingGeometry(1.5, 1.7, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    group.add(ring);

    // Spawn Position
    const zOffset = team === 'ally' ? 40 : -40; // Allies bottom, Enemies top
    const xOffset = (index - 2) * 10;
    group.position.set(xOffset, 0, zOffset);
    
    scene.add(group);
    
    state.enemies.push({
        group: group,
        team: team,
        class: classData,
        hp: classData.hp,
        target: null
    });
}

function updateBots() {
    state.enemies.forEach(bot => {
        // Simple AI: Move towards nearest opposite team member
        // Find target if none
        if (!bot.target || Math.random() < 0.05) {
            let closest = null;
            let minDist = Infinity;
            
            // Check against Player
            if (bot.team === 'enemy' && state.player.group) {
                const d = bot.group.position.distanceTo(state.player.group.position);
                if (d < minDist) { minDist = d; closest = state.player.group; }
            }
            
            // Check against other bots
            state.enemies.forEach(other => {
                if (bot.team !== other.team) {
                    const d = bot.group.position.distanceTo(other.group.position);
                    if (d < minDist) { minDist = d; closest = other.group; }
                }
            });
            
            bot.target = closest;
        }
        
        // Move towards target
        if (bot.target) {
            const range = 5; // Attack range
            const dist = bot.group.position.distanceTo(bot.target.position);
            
            if (dist > range) {
                const dir = new THREE.Vector3().subVectors(bot.target.position, bot.group.position).normalize();
                bot.group.position.add(dir.multiplyScalar(bot.class.speed * 0.8)); // Bots slightly slower
                bot.group.lookAt(bot.target.position);
            } else {
                // In range, "attack" (wiggle for now)
                bot.group.rotation.y += Math.sin(Date.now() * 0.1) * 0.1;
            }
        }
    });
}

// --- INPUT & UI LOGIC ---
const keys = { w: false, a: false, s: false, d: false, space: false };
document.addEventListener('keydown', (e) => {
    if(e.key === 'w') keys.w = true;
    if(e.key === 'a') keys.a = true;
    if(e.key === 's') keys.s = true;
    if(e.key === 'd') keys.d = true;
    if(e.code === 'Space') keys.space = true;
});
document.addEventListener('keyup', (e) => {
    if(e.key === 'w') keys.w = false;
    if(e.key === 'a') keys.a = false;
    if(e.key === 's') keys.s = false;
    if(e.key === 'd') keys.d = false;
    if(e.code === 'Space') keys.space = false;
});

// Populate Selection Grid
const grid = document.getElementById('class-grid');
const startBtn = document.getElementById('start-btn');
let chosenClass = null;

// Clear existing items just in case
if (grid) {
    grid.innerHTML = ''; 
    CLASSES.forEach(c => {
        const card = document.createElement('div');
        card.className = 'class-card';
        card.innerHTML = `
            <div class="class-icon">${c.icon}</div>
            <div class="class-name">${c.name}</div>
            <div class="class-role">${c.role}</div>
        `;
        card.onclick = () => {
            document.querySelectorAll('.class-card').forEach(el => el.classList.remove('selected'));
            card.classList.add('selected');
            chosenClass = c.id;
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.innerHTML = `PLAY AS ${c.name.toUpperCase()}`;
            }
        };
        grid.appendChild(card);
    });
}

if (startBtn) {
    startBtn.onclick = () => {
        if (!chosenClass) return;
        const selectScreen = document.getElementById('character-select');
        const hud = document.getElementById('hud-top');
        if (selectScreen) selectScreen.style.display = 'none';
        if (hud) hud.style.display = 'flex'; // Show game HUD
        
        generateArena();
        spawnPlayer(chosenClass);
        spawnBots(); // Added Bot Spawning
        state.gameActive = true;
    };
}

// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);

    if (!state.gameActive || !state.player.group) {
        // Rotate camera slowly in idle mode (maybe later)
        renderer.render(scene, camera);
        return;
    }

    const player = state.player.group;
    const speed = state.selectedClass.speed; 
    
    // Update AI
    updateBots();
    
    // Movement
    const moveDir = new THREE.Vector3(0, 0, 0);
    if (keys.w) moveDir.z = -1;
    if (keys.s) moveDir.z = 1;
    if (keys.a) moveDir.x = -1;
    if (keys.d) moveDir.x = 1;
    
    if (moveDir.length() > 0) {
        moveDir.normalize();
        
        // Simple bounds checking (Arena walls)
        const nextX = player.position.x + moveDir.x * speed;
        const nextZ = player.position.z + moveDir.z * speed;
        const limit = (MAP_SIZE / 2) - 2;
        
        if (Math.abs(nextX) < limit) player.position.x = nextX;
        if (Math.abs(nextZ) < limit) player.position.z = nextZ;
        
        // Rotate body to face movement
        const targetRot = Math.atan2(moveDir.x, moveDir.z);
        player.rotation.y = targetRot;
    }

    // Camera Follow (Smooth Lerp)
    const targetX = player.position.x + 20;
    const targetZ = player.position.z + 20;
    
    camera.position.x += (targetX - camera.position.x) * 0.1;
    camera.position.z += (targetZ - camera.position.z) * 0.1;
    camera.lookAt(player.position.x, 0, player.position.z);

    renderer.render(scene, camera);
}

// Window Resize Handling
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    const d = 35; 
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
