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
const ambientLight = new THREE.AmbientLight(0x050510); // Very dark blue/black
scene.add(ambientLight);

// Flashlight 
const flashLight = new THREE.SpotLight(0xffffee, 5, 40, 0.4, 0.5, 1); // Brighter, tighter beam
flashLight.position.set(0, 0, 0);
flashLight.target.position.set(0, 0, -1);
camera.add(flashLight);
camera.add(flashLight.target);
scene.add(camera);

// Moon
const moonLight = new THREE.DirectionalLight(0x223355, 0.5); // Slightly brighter moon for silhouettes
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

// --- PROCEDURAL TEXTURES ---
function generateTexture(width, height, type) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Fill background
    if (type === 'grass') ctx.fillStyle = '#1a331a';
    else if (type === 'stone') ctx.fillStyle = '#555555';
    else if (type === 'bark') ctx.fillStyle = '#2d1c12';
    else if (type === 'leaves') ctx.fillStyle = '#0f210f';
    ctx.fillRect(0,0, width, height);
    
    // Simple noise
    for(let i=0; i< width*height*0.1; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        if (type === 'grass') {
            ctx.fillStyle = Math.random() < 0.5 ? '#112211' : '#224422';
            ctx.fillRect(x,y, 2, 2);
        }
        else if (type === 'stone') {
             ctx.fillStyle = Math.random() < 0.5 ? '#444444' : '#666666';
             ctx.fillRect(x,y, 2, 2);
        }
        else if (type === 'bark') {
             ctx.fillStyle = Math.random() < 0.5 ? '#1e120b' : '#3c2618';
             ctx.fillRect(x,y, 2, 6); // vertical streaks
        }
        else if (type === 'leaves') {
             ctx.fillStyle = Math.random() < 0.5 ? '#0a170a' : '#1e3e1e';
             ctx.fillRect(x,y, 3, 3);
        }
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

const grassTex = generateTexture(512, 512, 'grass');
const stoneTex = generateTexture(256, 256, 'stone');
const barkTex = generateTexture(256, 512, 'bark');
const leavesTex = generateTexture(256, 256, 'leaves');


// --- TERRAIN GENERATION ---
const noise = new Noise(Math.random());

function getNoiseHeight(x, z) {
    // Combine frequencies for hills and roughness
    let y = 0;
    // Lower frequency for broad terrain features
    const base = noise.noise2D(x * 0.005, z * 0.005); 
    
    // Create flat "floor" areas
    if (base < 0.2) {
        // Flat valley/ground
        y = base * 2; 
    } else {
        // Hills start rising
        y = (base - 0.2) * 15;
    }

    // Add small detail everywhere so flat isn't PERFECTLY flat
    y += noise.noise2D(x * 0.1, z * 0.1) * 0.5;

    // Deep pits/water
    if (y < -3) y = -3 + (y + 3) * 0.2; 
    
    return y;
}

// --- ENEMIES ---
const enemies = [];

class Enemy {
    constructor(type, x, z) {
        this.type = type;
        this.group = new THREE.Group();
        this.group.position.set(x, 0, z);
        
        // Visuals
        if (type === 'angel') {
            // Simplified Weeping Angel
            const mat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4 });
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.6, 8), mat);
            body.position.y = 0.8;
            
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), mat);
            head.position.y = 1.8;
            
            const wingGeo = new THREE.BoxGeometry(0.1, 1.2, 0.6);
            const lWing = new THREE.Mesh(wingGeo, mat);
            lWing.position.set(0.3, 1.2, 0.2); lWing.rotation.z = -0.5;
            const rWing = new THREE.Mesh(wingGeo, mat);
            rWing.position.set(-0.3, 1.2, 0.2); rWing.rotation.z = 0.5;
            
            this.group.add(body, head, lWing, rWing);
            this.group.castShadow = true;
        }
        
        scene.add(this.group);
        
        // State
        this.lastSeenPosition = new THREE.Vector3(x, 0, z);
        this.isActive = false;
        this.moveSpeed = 8.0; // Fast when not looking!
    }
    
    update(playerPos, camera, delta) {
        // Weeping Angel Logic: Move only when not observed
        
        // Check if player is looking at angel
        const toEnemy = new THREE.Vector3().subVectors(this.group.position, camera.position).normalize();
        const lookDir = new THREE.Vector3();
        camera.getWorldDirection(lookDir);
        
        // Dot product > 0 means generally in front. > 0.5 means within ~60 degrees FOV
        const isLooking = lookDir.dot(toEnemy) > 0.5;
        
        // Raycast check to see if blocked by terrain/objects (Simplified distance check for now)
        const dist = this.group.position.distanceTo(playerPos);
        
        if (!isLooking && dist < 50 && dist > 1.5) {
            // Move towards player
            const moveDir = new THREE.Vector3().subVectors(playerPos, this.group.position).normalize();
            // Ground movement
            const nextX = this.group.position.x + moveDir.x * this.moveSpeed * delta;
            const nextZ = this.group.position.z + moveDir.z * this.moveSpeed * delta;
            
            // Should also check terrain height
            const nextY = getNoiseHeight(nextX, nextZ);
            
            this.group.position.set(nextX, nextY, nextZ);
            this.group.lookAt(playerPos.x, nextY, playerPos.z);
        } else {
            // Frozen
        }
    }
    
    dispose() {
        scene.remove(this.group);
    }
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
        const segs = 64; // Increased detail (was 32)
        const geom = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segs, segs);
        geom.rotateX(-Math.PI / 2);
        
        const posAttribute = geom.attributes.position;
        const colors = [];
        const uvs = geom.attributes.uv;
        
        for (let i = 0; i < posAttribute.count; i++) {
            const lx = posAttribute.getX(i);
            const lz = posAttribute.getZ(i);
            
            // World coordinates
            const wx = lx + this.gx * CHUNK_SIZE;
            const wz = lz + this.gz * CHUNK_SIZE;
            
            const h = getNoiseHeight(wx, wz);
            posAttribute.setY(i, h);
            
            // Vertex Coloring based on height
            if (h < -4) {
                 colors.push(0.05, 0.05, 0.1); // Deep water
            } else if (h < 0) {
                 colors.push(0.15, 0.1, 0.05); // Mud
            } else {
                 // Grass variation
                 const v = 0.1 + Math.random() * 0.1;
                 colors.push(v, v+0.1, v); 
            }
        }
        
        geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geom.computeVertexNormals();
        
        const mat = new THREE.MeshStandardMaterial({ 
            vertexColors: true,
            map: grassTex, // Detail texture Overlay
            roughness: 0.9,
            metalness: 0.1,
            flatShading: false
        });
        
        const mesh = new THREE.Mesh(geom, mat);
        mesh.receiveShadow = true;
        
        this.group.add(mesh);
        this.terrainMesh = mesh; 
        
        // Grass Blades (Instanced Mesh for performance)
        this.generateGrass(mesh, 400); // 400 blades per chunk
    }

    generateGrass(terrainMesh, count) {
        // Simple Billboard Grass
        const grassGeo = new THREE.PlaneGeometry(0.5, 1.0);
        grassGeo.translate(0, 0.5, 0); // Pivot at bottom
        
        const grassMat = new THREE.MeshLambertMaterial({
            color: 0x224422,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        
        const instancedGrass = new THREE.InstancedMesh(grassGeo, grassMat, count);
        const dummy = new THREE.Object3D();
        
        for(let i=0; i<count; i++) {
            const lx = (Math.random() - 0.5) * CHUNK_SIZE;
            const lz = (Math.random() - 0.5) * CHUNK_SIZE;
            const wx = lx + this.gx * CHUNK_SIZE;
            const wz = lz + this.gz * CHUNK_SIZE;
            
            const h = getNoiseHeight(wx, wz);
            
            if (h > 0) { // Only on grass, not mud
                dummy.position.set(lx, h, lz);
                dummy.rotation.y = Math.random() * Math.PI;
                // Random scale variation
                const s = 0.8 + Math.random() * 0.5;
                dummy.scale.set(s, s, s);
                dummy.updateMatrix();
                instancedGrass.setMatrixAt(i, dummy.matrix);
            } else {
                // Hide underwater grass by scaling to 0
                dummy.scale.set(0,0,0);
                dummy.updateMatrix();
                instancedGrass.setMatrixAt(i, dummy.matrix);
            }
        }
        
        instancedGrass.instanceMatrix.needsUpdate = true;
        instancedGrass.receiveShadow = true;
        this.group.add(instancedGrass);
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
        
        // Rare: Spawn an Angel? (1 in 5 chunks)
        if (Math.random() < 0.2) {
             const lx = (Math.random() - 0.5) * CHUNK_SIZE;
             const lz = (Math.random() - 0.5) * CHUNK_SIZE;
             const wx = lx + this.gx * CHUNK_SIZE;
             const wz = lz + this.gz * CHUNK_SIZE;
             const h = getNoiseHeight(wx, wz);
             if (h > -2) {
                 const enemy = new Enemy('angel', wx, wz);
                 enemies.push(enemy);
                 // Associate enemy with this chunk to delete it later
                 this.enemies = this.enemies || [];
                 this.enemies.push(enemy); 
             }
        }
    }
    
    dispose() {
        scene.remove(this.group);
        // Remove enemies associated with this chunk
        if (this.enemies) {
            this.enemies.forEach(e => {
                e.dispose();
                const idx = enemies.indexOf(e);
                if (idx > -1) enemies.splice(idx, 1);
            });
        }
        
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
            const key = `${currentGx + x},${currentGz + z}`;
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
    const graveGroup = new THREE.Group();
    graveGroup.position.set(x, y, z); 
    
    // Rotation for the whole group
    graveGroup.rotation.y = (Math.random() - 0.5) * 1.5;

    // Stone Material with procedural texture
    const stoneMat = new THREE.MeshStandardMaterial({ 
        color: 0x555555, 
        map: stoneTex,
        roughness: 0.9,
        metalness: 0.2
    });

    // Base of the tombstone (Shared by most)
    const baseGeo = new THREE.BoxGeometry(0.8, 0.2, 0.6);
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 0.1;
    base.castShadow = true;
    base.receiveShadow = true;
    graveGroup.add(base);

    // Grave Variation Logic
    const type = Math.random();

    if (type < 0.15) {
        // --- 1. Cross ---
        const vGeo = new THREE.BoxGeometry(0.15, 1.4, 0.15);
        const hGeo = new THREE.BoxGeometry(0.8, 0.15, 0.15);
        
        const vMesh = new THREE.Mesh(vGeo, stoneMat);
        vMesh.position.y = 0.8;
        const hMesh = new THREE.Mesh(hGeo, stoneMat);
        hMesh.position.y = 1.0;
        
        vMesh.castShadow = true; hMesh.castShadow = true;
        graveGroup.add(vMesh); graveGroup.add(hMesh);

    } else if (type < 0.25) {
        // --- 2. Obelisk ---
        const obeliskGeo = new THREE.CylinderGeometry(0.1, 0.3, 1.8, 4);
        const obelisk = new THREE.Mesh(obeliskGeo, stoneMat);
        obelisk.position.y = 1.0;
        obelisk.castShadow = true;
        graveGroup.add(obelisk);

    } else if (type < 0.35) {
        // --- 3. Sarcophagus / Crypt ---
        const sarcGeo = new THREE.BoxGeometry(0.8, 0.6, 1.5);
        const sarc = new THREE.Mesh(sarcGeo, stoneMat);
        sarc.position.set(0, 0.4, 0);
        sarc.castShadow = true;
        
        // Lid detail
        const lidGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.5, 3, 1, false, 0, Math.PI);
        const lid = new THREE.Mesh(lidGeo, stoneMat);
        lid.position.set(0, 0.7, 0);
        lid.rotation.z = Math.PI / 2;
        lid.rotation.y = Math.PI / 2;
        lid.castShadow = true;
        
        graveGroup.remove(base); // Replace base
        graveGroup.add(sarc);
        graveGroup.add(lid);

    } else if (type < 0.45) {
        // --- 4. Angel Statue (Simplified) ---
        // Reuse base logic
        const bodyGeo = new THREE.CylinderGeometry(0.15, 0.25, 1.0, 8);
        const body = new THREE.Mesh(bodyGeo, stoneMat);
        body.position.y = 0.7;
        graveGroup.add(body);
        
        const headGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const head = new THREE.Mesh(headGeo, stoneMat);
        head.position.y = 1.3;
        graveGroup.add(head);
        
        // Wings
        const wingGeo = new THREE.BoxGeometry(0.05, 0.6, 0.4);
        const lWing = new THREE.Mesh(wingGeo, stoneMat);
        lWing.position.set(0.15, 1.0, 0.1); lWing.rotation.z = -0.5;
        const rWing = new THREE.Mesh(wingGeo, stoneMat);
        rWing.position.set(-0.15, 1.0, 0.1); rWing.rotation.z = 0.5;
        graveGroup.add(lWing); graveGroup.add(rWing);

    } else if (type < 0.55) {
        // --- 5. Gargoyle (Perched) ---
        const pillarGeo = new THREE.BoxGeometry(0.4, 1.2, 0.4);
        const pillar = new THREE.Mesh(pillarGeo, stoneMat);
        pillar.position.y = 0.7;
        graveGroup.add(pillar);
        
        const gargGeo = new THREE.DodecahedronGeometry(0.25);
        const garg = new THREE.Mesh(gargGeo, stoneMat);
        garg.position.y = 1.45;
        garg.castShadow = true;
        graveGroup.add(garg);

    } else if (type < 0.8) {
        // --- 6. Headstone (Classic) ---
        let headGeo;
        if (Math.random() < 0.5) {
             // Rounded Top
             headGeo = new THREE.BoxGeometry(0.6, 1.0, 0.15);
        } else {
             // Gothic Top (Pointed)
             headGeo = new THREE.BoxGeometry(0.5, 1.2, 0.15);
        }
        const head = new THREE.Mesh(headGeo, stoneMat);
        head.position.y = 0.7; 
        head.castShadow = true;
        
        // Tilt
        head.rotation.x = (Math.random() - 0.5) * 0.2;
        head.rotation.z = (Math.random() - 0.5) * 0.1;
        
        graveGroup.add(head);

    } else {
        // --- 7. Flat Marker ---
        const flatGeo = new THREE.BoxGeometry(0.6, 0.1, 0.8);
        const flat = new THREE.Mesh(flatGeo, stoneMat);
        flat.position.y = 0.05;
        flat.castShadow = true;
        
        graveGroup.remove(base); // Replace base
        graveGroup.add(flat);
    }

    parent.add(graveGroup);
}

function createTree(x, y, z, parent) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);
    
    // Trunk
    const trunkHeight = 2 + Math.random() * 2;
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.3, trunkHeight, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ 
        color: 0x2d1c12, 
        map: barkTex,
        roughness: 1.0,
        bumpScale: 0.1
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);
    
    // Foliage (Pine style cones)
    const foliageMat = new THREE.MeshStandardMaterial({ 
        color: 0x0f210f, 
        map: leavesTex,
        roughness: 0.9,
        side: THREE.DoubleSide
    });
    const layers = 3 + Math.floor(Math.random() * 3);
    
    for(let i=0; i<layers; i++) {
        const size = 1.5 - (i * 0.3);
        const fY = (trunkHeight * 0.4) + (i * 0.8);
        const cone = new THREE.Mesh(
            new THREE.ConeGeometry(size, 1.5, 9),
            foliageMat
        );
        cone.position.y = fY;
        cone.castShadow = true;
        cone.receiveShadow = true;
        treeGroup.add(cone);
    }

    // Random lean
    treeGroup.rotation.z = (Math.random() - 0.5) * 0.1;
    treeGroup.rotation.x = (Math.random() - 0.5) * 0.1;
    
    parent.add(treeGroup);
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
    healthFill.style.height = `${state.health}%`;
    sanityFill.style.height = `${state.sanity}%`;
    
    // Compass
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const angle = Math.atan2(dir.x, dir.z);
    let degrees = THREE.MathUtils.radToDeg(angle);
    if (degrees < 0) degrees += 360;
    if (state.sanity < 20) degrees += (Math.random() - 0.5) * 40;
    compassStrip.style.transform = `translateX(-${degrees * 5}px)`;
    
    // Minimap (Local to chunk)
    // Display area: +/- 100 meters
    const mapScale = 150 / 200; 
    minimapDot.style.left = `75px`; 
    minimapDot.style.top = `75px`;
    
    // Time
    const hours = Math.floor(state.time);
    const minutes = Math.floor((state.time - hours) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    timeDisplay.innerText = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

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
        
        // "Mud" physics
        let terrainSpeedMod = 1.0;
        if (currentY < -2) terrainSpeedMod = 0.6; // Mucky low ground
        if (currentY < -4) terrainSpeedMod = 0.3; // Deep water/mud

        if (moveState.forward || moveState.backward) velocity.z -= direction.z * speed * terrainSpeedMod * delta;
        if (moveState.left || moveState.right) velocity.x -= direction.x * speed * terrainSpeedMod * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        
        // Snap to ground height (+ player height)
        camera.position.y = currentY + 1.7;
        
        updateChunks();
        
        // Update Enemies
        enemies.forEach(e => e.update(camera.position, camera, delta));
        
        // Apply Screen Shake if needed
        if (state.sanityEffects.shakeIntensity > 0) {
            const s = state.sanityEffects.shakeIntensity;
            camera.rotation.x += (Math.random() - 0.5) * 0.01 * s;
            camera.rotation.z += (Math.random() - 0.5) * 0.01 * s;
            state.sanityEffects.shakeIntensity = Math.max(0, s - delta * 2);
        }

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
