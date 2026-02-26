import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Noise } from './noise.js';

// --- CONFIGURATION ---
const CHUNK_SIZE = 100; // Size of one map chunk
const RENDER_DISTANCE = 2; // Radius of chunks to load around player (2 = 5x5 grid)
const FOG_DENSITY = 0.02; 
const GRAVES_PER_CHUNK = 8; 
const TREES_PER_CHUNK = 12;

// --- GAME STATE ---
const state = {
    health: 100,
    sanity: 100,
    maxSanity: 100,
    inventory: {
        leftHand: null,
        rightHand: null,
        backpack: []
    },
    isGameActive: false,
    time: 18, // Start at 6 PM
    sanityEffects: {
        hallucinationActive: false,
        shakeIntensity: 0
    },
    playerGrid: { x: 0, z: 0 }
};

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.FogExp2(0x050505, FOG_DENSITY);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Initial position, will be corrected by terrain
camera.position.set(0, 10, 0); 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game-container').appendChild(renderer.domElement);

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0x111111); // Very dark
scene.add(ambientLight);

// Flashlight 
const flashLight = new THREE.SpotLight(0xffffff, 2, 60, 0.5, 0.5, 1);
flashLight.position.set(0, 0, 0);
flashLight.target.position.set(0, 0, -1);
camera.add(flashLight);
camera.add(flashLight.target);
scene.add(camera);

// Moon
const moonLight = new THREE.DirectionalLight(0x334466, 0.3);
moonLight.position.set(50, 100, 50);
moonLight.castShadow = true;
// Optimize shadows for open world
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 500;
moonLight.shadow.camera.left = -100;
moonLight.shadow.camera.right = 100;
moonLight.shadow.camera.top = 100;
moonLight.shadow.camera.bottom = -100;
scene.add(moonLight);

// --- TERRAIN GENERATION ---
const noise = new Noise(Math.random());

function getNoiseHeight(x, z) {
    // Combine frequencies for hills and roughness
    let y = 0;
    y += noise.noise2D(x * 0.01, z * 0.01) * 10;   // Large hills
    y += noise.noise2D(x * 0.05, z * 0.05) * 2;    // Small roughness
    y += noise.noise2D(x * 0.002, z * 0.002) * 20; // Mountains/Valleys
    
    // Flatten valleys for 'mud' / water level
    if (y < -5) y = -5 + (y + 5) * 0.1; 
    
    return y;
}

// Chunks
const chunks = new Map(); // Key: 'x,z', Value: THREE.Group

class Chunk {
    constructor(gx, gz) {
        this.gx = gx;
        this.gz = gz;
        this.group = new THREE.Group();
        this.group.position.set(gx * CHUNK_SIZE, 0, gz * CHUNK_SIZE);
        
        this.generateTerrain();
        this.generateFeatures();
        
        scene.add(this.group);
    }
    
    generateTerrain() {
        const segs = 32;
        const geom = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segs, segs);
        geom.rotateX(-Math.PI / 2);
        
        const posAttribute = geom.attributes.position;
        const colors = [];
        
        for (let i = 0; i < posAttribute.count; i++) {
            const lx = posAttribute.getX(i);
            const lz = posAttribute.getZ(i);
            
            // World coordinates
            const wx = lx + this.gx * CHUNK_SIZE;
            const wz = lz + this.gz * CHUNK_SIZE;
            
            const h = getNoiseHeight(wx, wz);
            posAttribute.setY(i, h);
            
            // Vertex Coloring based on height
            // Low = Mud/Water (Dark Brown/Blue-ish), High = Grass (Dark Green/Grey)
            if (h < -4) {
                 colors.push(0.1, 0.1, 0.15); // Watery mud
            } else if (h < 0) {
                 colors.push(0.25, 0.15, 0.1); // Mud
            } else {
                 // Noisy grass color
                 const start = 0.1;
                 const varG = Math.random() * 0.1;
                 colors.push(start, start + 0.1 + varG, start); 
            }
        }
        
        geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geom.computeVertexNormals();
        
        const mat = new THREE.MeshStandardMaterial({ 
            vertexColors: true,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const mesh = new THREE.Mesh(geom, mat);
        mesh.receiveShadow = true;
        
        // Add water plane if low part exists?
        // Simple uniform water plane logic:
        // If this chunk has low points, add a water plane at y=-4.5
        
        this.group.add(mesh);
        this.terrainMesh = mesh; // Keep ref for raycasting
    }
    
    generateFeatures() {
        // Scatter Graves
        for (let i = 0; i < GRAVES_PER_CHUNK; i++) {
            const lx = (Math.random() - 0.5) * CHUNK_SIZE;
            const lz = (Math.random() - 0.5) * CHUNK_SIZE;
            const wx = lx + this.gx * CHUNK_SIZE;
            const wz = lz + this.gz * CHUNK_SIZE;
            const h = getNoiseHeight(wx, wz);
            
            // Don't spawn underwater
            if (h > -3) {
                createGrave(lx, h, lz, this.group);
            }
        }
        
        // Scatter Trees
        for (let i = 0; i < TREES_PER_CHUNK; i++) {
            const lx = (Math.random() - 0.5) * CHUNK_SIZE;
            const lz = (Math.random() - 0.5) * CHUNK_SIZE;
            const wx = lx + this.gx * CHUNK_SIZE;
            const wz = lz + this.gz * CHUNK_SIZE;
            const h = getNoiseHeight(wx, wz);
            
            if (h > -3) {
                createTree(lx, h, lz, this.group);
            }
        }
    }
    
    dispose() {
        scene.remove(this.group);
        // Clean up geometries/materials if needed to prevent leaks
        this.group.traverse(obj => {
            if(obj.geometry) obj.geometry.dispose();
            if(obj.material) {
                if(Array.isArray(obj.material)) obj.material.forEach(m=>m.dispose());
                else obj.material.dispose();
            }
        });
    }
}

function updateChunks() {
    const px = camera.position.x;
    const pz = camera.position.z;
    
    const currentGx = Math.round(px / CHUNK_SIZE);
    const currentGz = Math.round(pz / CHUNK_SIZE);
    
    state.playerGrid.x = currentGx;
    state.playerGrid.z = currentGz;
    
    // Identify needed chunks
    const nearbyKeys = new Set();
    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            const key = ${currentGx + x},;
            nearbyKeys.add(key);
            if (!chunks.has(key)) {
                chunks.set(key, new Chunk(currentGx + x, currentGz + z));
            }
        }
    }
    
    // Remove far chunks
    for (const [key, chunk] of chunks) {
        if (!nearbyKeys.has(key)) {
            chunk.dispose();
            chunks.delete(key);
        }
    }
}

// Procedural Objects Helper
function createGrave(x, y, z, parent) {
    const graveGeo = new THREE.BoxGeometry(0.6, 1.2, 0.2);
    const graveMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const grave = new THREE.Mesh(graveGeo, graveMat);
    grave.position.set(x, y + 0.6, z);
    grave.castShadow = true;
    grave.receiveShadow = true;
    grave.rotation.y = (Math.random() - 0.5) * 0.5;
    // Tilted graves
    grave.rotation.z = (Math.random() - 0.5) * 0.3;
    grave.rotation.x = (Math.random() - 0.5) * 0.3;
    parent.add(grave);
}

function createTree(x, y, z, parent) {
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.5, 4, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x1a1109 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, y + 2, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    // Random lean
    trunk.rotation.z = (Math.random() - 0.5) * 0.2;
    trunk.rotation.x = (Math.random() - 0.5) * 0.2;
    parent.add(trunk);
    
    // Branches?
    // KEEP IT SIMPLE for now
}


// --- SCENERY (Global) ---
const mansionGeo = new THREE.BoxGeometry(30, 20, 30);
const mansionMat = new THREE.MeshStandardMaterial({ color: 0x221100 });
const mansion = new THREE.Mesh(mansionGeo, mansionMat);
// Place mansion on a hill?
const mX = 0;
const mZ = -400;
const mY = getNoiseHeight(mX, mZ);
mansion.position.set(mX, mY + 10, mZ);
scene.add(mansion);

// Add a light at the mansion
const mansionLight = new THREE.PointLight(0xffaa00, 1, 100);
mansionLight.position.set(mX, mY + 15, mZ + 16);
scene.add(mansionLight);


// --- ENEMIES --- (Empty for now to prioritize map)
const enemies = [];
class Enemy {
    constructor(type, x, z) {
        // ... (Re-add later)
    }
    update(playerPos, camera, delta, frustum) {}
}


// --- PRE-LOAD ---
updateChunks();

// --- CONTROLS ---
const controls = new PointerLockControls(camera, document.body);
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');

startBtn.addEventListener('click', () => {
    controls.lock();
});
controls.addEventListener('lock', () => {
    startScreen.style.display = 'none';
    state.isGameActive = true;
});
controls.addEventListener('unlock', () => {
    startScreen.style.display = 'flex';
    state.isGameActive = false;
});

// Movement Logic
const moveState = { forward: false, backward: false, left: false, right: false, sprint: false };
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyW': moveState.forward = true; break;
        case 'KeyA': moveState.left = true; break;
        case 'KeyS': moveState.backward = true; break;
        case 'KeyD': moveState.right = true; break;
        case 'ShiftLeft': moveState.sprint = true; break;
        case 'KeyF': 
            flashLight.visible = !flashLight.visible; 
            break;
    }
});
document.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyW': moveState.forward = false; break;
        case 'KeyA': moveState.left = false; break;
        case 'KeyS': moveState.backward = false; break;
        case 'KeyD': moveState.right = false; break;
        case 'ShiftLeft': moveState.sprint = false; break;
    }
});

// --- UI UPDATES ---
const healthFill = document.getElementById('health-bar-fill');
const sanityFill = document.getElementById('sanity-bar-fill');
const compassStrip = document.getElementById('compass-strip');
const minimapDot = document.getElementById('player-dot');
const timeDisplay = document.getElementById('time-display');

function updateUI() {
    healthFill.style.height = ${state.health}%;
    sanityFill.style.height = ${state.sanity}%;
    
    // Compass
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const angle = Math.atan2(dir.x, dir.z);
    let degrees = THREE.MathUtils.radToDeg(angle);
    if (degrees < 0) degrees += 360;
    if (state.sanity < 20) degrees += (Math.random() - 0.5) * 40;
    compassStrip.style.transform = 	ranslateX(-px);
    
    // Minimap (Local to chunk)
    // 5km map is too big for one minimap. Make it relative.
    // Display area: +/- 100 meters
    const mapScale = 150 / 200; // 200m view in 150px
    minimapDot.style.left = 75px; 
    minimapDot.style.top = 75px;
    // We should move the map background instead of the dot for infinite world?
    // For now, keep the dot fixed center and maybe hints move around it? 
    // Or just let it be a static 'you are here'
    
    // Time
    const hours = Math.floor(state.time);
    const minutes = Math.floor((state.time - hours) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    timeDisplay.innerText = ${displayHours.toString().padStart(2, '0')}: ;
}

// --- INTERACTION ---
const raycaster = new THREE.Raycaster();
const interactables = [];

// --- MAIN LOOP ---
function animate() {
    requestAnimationFrame(animate);

    if (state.isGameActive) {
        const delta = clock.getDelta();
        
        // Physics / Movement
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        
        direction.z = Number(moveState.forward) - Number(moveState.backward);
        direction.x = Number(moveState.right) - Number(moveState.left);
        direction.normalize();

        const speed = moveState.sprint ? 120.0 : 60.0; // Slower, heavier feel
        
        // Terrain Height & Slope Check
        const currentY = getNoiseHeight(camera.position.x, camera.position.z);
        
        // 'Mud' physics
        let terrainSpeedMod = 1.0;
        if (currentY < -2) terrainSpeedMod = 0.6; // Mucky low ground
        if (currentY < -4) terrainSpeedMod = 0.3; // Deep water/mud

        if (moveState.forward || moveState.backward) velocity.z -= direction.z * speed * terrainSpeedMod * delta;
        if (moveState.left || moveState.right) velocity.x -= direction.x * speed * terrainSpeedMod * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        
        // Snap to ground height (+ player height)
        // Lerp for smoothness?
        camera.position.y = currentY + 1.7;
        
        updateChunks();
        updateUI();
    }

    renderer.render(scene, camera);
}

// Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
