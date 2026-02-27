import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Noise } from './noise.js';

// --- CONFIGURATION ---
const CHUNK_SIZE = 100; // Size of one map chunk
const RENDER_DISTANCE = 2; // Radius of chunks to load around player (2 = 5x5 grid)
const FOG_DENSITY = 0.02; 
const GRAVES_PER_CHUNK = 25; // Dense cemetery
const TREES_PER_CHUNK = 12;

// --- GAME STATE ---
const state = {
    health: 100,
    sanity: 100,
    maxSanity: 100,
    inventory: {
        weight: 0,
        maxWeight: 20, // lbs
        backpack: [
            { name: "Old Photo", id: "photo", weight: 0.1, desc: "A blurry photo of a family.", type: "item" },
            { name: "Battery", id: "battery", weight: 0.3, desc: "Standard AA battery.", type: "resource" } 
        ]
    },
    discoveries: {
        hasBook: false,
        monsters: [],
        graves: [],
        items: []
    },
    isGameActive: false,
    inventoryOpen: false,
    time: 18, 
    sanityEffects: {
        hallucinationActive: false,
        shakeIntensity: 0
    },
    playerGrid: { x: 0, z: 0 },
    distanceFromManor: 5.0 // km
};

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205); // Almost Pitch Black
scene.fog = new THREE.FogExp2(0x020205, FOG_DENSITY * 1.5); // Thicker fog

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Initial position, will be corrected by terrain
camera.position.set(0, 10, 0); 

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
renderer.shadowMap.bias = -0.0001; 
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8; // Darker mood
document.getElementById('game-container').appendChild(renderer.domElement);

// --- POST-PROCESSING ---
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Bloom (Glow) for moon/flashlight/eyes
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 
    0.4, 0.4, 0.9 // strength, radius, threshold
);
composer.addPass(bloomPass);

// Output Pass (Color Grading)
const outputPass = new OutputPass();
composer.addPass(outputPass);


// --- PARTICLES (Atmosphere) ---
const particleCount = 2000;
const particleGeo = new THREE.BufferGeometry();
const particlePos = [];
for (let i = 0; i < particleCount; i++) {
    const x = (Math.random() - 0.5) * 40;
    const y = (Math.random() - 0.5) * 10 + 2;
    const z = (Math.random() - 0.5) * 40;
    particlePos.push(x, y, z);
}
particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(particlePos, 3));
const particleMat = new THREE.PointsMaterial({
    color: 0x8899aa,
    size: 0.05,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);


// --- LIGHTING ---
// Hemisphere Light: Sky vs Ground colors
const hemiLight = new THREE.HemisphereLight(0x0d0d1a, 0x050510, 0.6); 
scene.add(hemiLight);

// Flashlight (Warmer, tighter)
const flashLight = new THREE.SpotLight(0xfff0aa, 10, 50, 0.5, 0.5, 2); 
flashLight.position.set(0, 0, 0);
flashLight.target.position.set(0, 0, -1);
flashLight.castShadow = true; 
// Flashlight shadows are expensive, but look cool. Remove if slow.
flashLight.shadow.mapSize.width = 512;
flashLight.shadow.mapSize.height = 512;
flashLight.shadow.camera.near = 0.1;
flashLight.shadow.camera.far = 50;

camera.add(flashLight);
camera.add(flashLight.target);
scene.add(camera);

// Moon (Cold, distant)
const moonLight = new THREE.DirectionalLight(0x445577, 0.4); 
moonLight.position.set(50, 100, 50);
moonLight.castShadow = true;
// Optimize shadows for open world
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 500;
moonLight.shadow.normalBias = 0.05; // Helps with self-shadowing artifacts
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

    // Add small detail everywhere
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
            // Detailed Weeping Angel (Procedural Statue)
            const stoneMat = new THREE.MeshStandardMaterial({ 
                color: 0x999999, // Lighter stone
                roughness: 0.8,
                metalness: 0.2,
                map: stoneTex
            });

            const darkStoneMat = new THREE.MeshStandardMaterial({ // For contrast
                color: 0x555555,
                roughness: 0.9,
                map: stoneTex
            });

            // 1. Skirt/Robes (Fluid shape using multiple cones)
            const skirtBase = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 12, 1, true), stoneMat);
            skirtBase.position.y = 0.7;
            this.group.add(skirtBase);

            // 2. Torso (Slimmer fitting)
            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.7, 8), stoneMat);
            torso.position.y = 1.6;
            this.group.add(torso);

            // 3. Head & Hood
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), stoneMat);
            head.position.y = 2.1;
            this.group.add(head);

            // Hood/Hair (Half sphere larger than head)
            const hoodGeo = new THREE.SphereGeometry(0.26, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.4);
            const hood = new THREE.Mesh(hoodGeo, darkStoneMat); // Darker hood
            hood.position.y = 2.15;
            hood.rotation.x = Math.PI; 
            this.group.add(hood);

            // 4. Wings (Feathered Look - Layers of scaled cubes/planes)
            const wingGroup = new THREE.Group();
            wingGroup.position.set(0, 1.8, 0.2); 
            
            const createWing = (mirror) => {
                const w = new THREE.Group();
                const featherMat = stoneMat; 
                
                // Main bone structure
                const bone = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.05), featherMat);
                bone.position.y = 0.4;
                bone.rotation.z = mirror ? -0.5 : 0.5;
                w.add(bone);

                // Feathers (Loop to create layers)
                for(let i=0; i<5; i++) {
                     const fGeo = new THREE.BoxGeometry(0.6 - i*0.05, 0.15, 0.02);
                     const f = new THREE.Mesh(fGeo, featherMat);
                     
                     // Position along the "bone"
                     f.position.x = mirror ? (0.3 - i*0.02) : (-0.3 + i*0.02);
                     f.position.y = 0.8 - i * 0.15; 
                     f.rotation.z = mirror ? 0.2 : -0.2;
                     w.add(f);
                }
                return w;
            };

            const lWing = createWing(false);
            lWing.position.x = 0.1;
            const rWing = createWing(true);
            rWing.position.x = -0.1;

            wingGroup.add(lWing);
            wingGroup.add(rWing);
            this.group.add(wingGroup);

            // 5. Arms (Reaching out aggressively)
            const armGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.8);
            
            const lArm = new THREE.Mesh(armGeo, stoneMat);
            lArm.position.set(0.25, 1.75, -0.4);
            lArm.rotation.x = Math.PI / 2 - 0.2; // Point slightly down towards player neck?
            lArm.rotation.z = -0.3;
            
            const rArm = new THREE.Mesh(armGeo, stoneMat);
            rArm.position.set(-0.25, 1.75, -0.4);
            rArm.rotation.x = Math.PI / 2 - 0.2;
            rArm.rotation.z = 0.3;

            // Hands (Claws?)
            const handGeo = new THREE.BoxGeometry(0.1, 0.15, 0.05);
            const lHand = new THREE.Mesh(handGeo, stoneMat);
            lHand.position.y = -0.4; // Local to arm
            lArm.add(lHand);
            
            const rHand = new THREE.Mesh(handGeo, stoneMat);
            rHand.position.y = -0.4;
            rArm.add(rHand);

            this.group.add(lArm);
            this.group.add(rArm);
            
            this.group.castShadow = true;
            this.group.traverse(o => { if(o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        }
        
        scene.add(this.group);
        
        // State
        this.lastSeenPosition = new THREE.Vector3(x, 0, z);
        this.isActive = false;
        this.moveSpeed = 9.0; // Fast!
        this.attackCooldown = 0;
    }
    
    update(playerPos, camera, delta) {
        if (this.attackCooldown > 0) this.attackCooldown -= delta;

        // Weeping Angel Logic: Move only when not observed
        
        // Check if player is looking at angel
        const toEnemy = new THREE.Vector3().subVectors(this.group.position, camera.position).normalize();
        
        // Direction player is facing
        const lookDir = new THREE.Vector3();
        camera.getWorldDirection(lookDir);
        
        // Dot product > 0.55 means within ~55 degrees HALF-FOV (approx 110 total)
        // If angle is behind walls, we still count as "looking" for now (hard mode)
        // We really should check for raycast visibility eventually
        const isLooking = lookDir.dot(toEnemy) > 0.6; 
        
        const dist = this.group.position.distanceTo(playerPos);
        
        // --- SANITY AURA ---
        // If close (within 15m), drain sanity rapidly
        if (dist < 15) {
            // Closer = Faster drain
            // at 15m: almost 0
            // at 0m: max drain
            const intensity = 1.0 - (dist / 15.0);
            state.sanity -= intensity * 15.0 * delta; // Up to 15 sanity per second if touching
            
            // Visual/Audio cue for sanity drain?
            // Maybe slight shake or FOV warp?
            if (intensity > 0.5) state.sanityEffects.shakeIntensity = Math.max(state.sanityEffects.shakeIntensity, intensity * 0.1);
        }

        // ATTACK LOGIC
        // Increased damage (25) for faster death, but not instant (4 hits = death)
        if (dist < 1.5 && this.attackCooldown <= 0) {
            // Jumpscare
            state.health -= 25; 
            state.sanity -= 20; // Big sanity hit on catch
            state.sanityEffects.shakeIntensity = 2.0; // Violent shake
            this.attackCooldown = 1.5; // Slightly faster cooldown
            
            // "Teleport" slightly back or to side to confuse player
            const offset = (Math.random() - 0.5) * 6;
            this.group.position.x += offset;
            this.group.position.z += offset;
            
            console.log("Angel Attack!");
            updateUI();
            
            if (state.health <= 0) {
                 document.exitPointerLock();
                 alert("You have been claimed by the stone.");
                 location.reload(); 
            }
            return; 
        }

        // MOVEMENT LOGIC
        // Move if NOT looking, AND within range (spawn radius), AND not too close
        if (!isLooking && dist < 60 && dist > 1.0) {
            // Move towards player
            const moveDir = new THREE.Vector3().subVectors(playerPos, this.group.position).normalize();
            
            // Ground movement
            const nextX = this.group.position.x + moveDir.x * this.moveSpeed * delta;
            const nextZ = this.group.position.z + moveDir.z * this.moveSpeed * delta;
            
            // Snap to terrain height
            const nextY = getNoiseHeight(nextX, nextZ);
            
            this.group.position.set(nextX, nextY, nextZ);
            this.group.lookAt(playerPos.x, playerPos.y, playerPos.z);
            this.group.rotation.x = 0; // Keep upright
            this.group.rotation.z = 0;
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
        // Fix z-fighting by nudging random rotation
        obelisk.rotation.y = Math.random();
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
        // Ensure no z-fighting with ground
        sarc.position.y = 0.35;
        lid.position.y = 0.65;
        
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

// --- ITEMS & INTERACTION ---
const worldItems = [];
const itemGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);

class WorldItem {
    constructor(type, x, z) {
        this.type = type;
        this.mesh = new THREE.Mesh(itemGeometry, new THREE.MeshStandardMaterial({ color: 0xffff00 }));
        
        // Define properties based on type
        if (type === 'battery') {
            this.data = { name: "Battery", weight: 0.3, icon: "Battery.png", desc: "A standard 9V battery. Useful for electronics." };
            this.mesh.material.color.setHex(0x5555ff);
            this.mesh.scale.set(0.4, 0.6, 0.4);
        } else if (type === 'shovel') {
            this.data = { name: "Shovel", weight: 3.0, icon: "Shovel.png", desc: "Sturdy shovel for digging." };
            this.mesh.material.color.setHex(0x8b4513);
            this.mesh.scale.set(0.3, 2.0, 0.3);
        } else if (type === 'book') {
            this.data = { name: "Old Book", weight: 1.5, icon: "Book.png", desc: "Contains strange symbols and maps." };
            this.mesh.material.color.setHex(0x880000);
            this.mesh.scale.set(0.8, 0.2, 1.0);
        }

        const y = getNoiseHeight(x, z) + 0.5;
        this.mesh.position.set(x, y, z);
        this.mesh.castShadow = true;
        
        scene.add(this.mesh);
        worldItems.push(this);
    }
    
    pickup() {
        if (state.inventory.weight + this.data.weight > state.inventory.maxWeight) {
            showNotification("Too heavy!", "red");
            return;
        }

        state.inventory.backpack.push(this.data);
        scene.remove(this.mesh);
        worldItems.splice(worldItems.indexOf(this), 1);
        
        showNotification(`Picked up ${this.data.name}`);
        
        // Special logic for Book
        if (this.type === 'book') {
            state.discoveries.hasBook = true;
            document.getElementById('tab-btn-discoveries').classList.remove('hidden'); // Show tab button
            showNotification("New Discovery Unlocked!", "gold");
        }
        
        updateInventoryUI();
    }
}

// Spawn some items
function spawnItems() {
    // Book near start
    new WorldItem('book', 5, 5); 
    
    // Random batteries
    for(let i=0; i<5; i++) {
        new WorldItem('battery', (Math.random()-0.5)*100, (Math.random()-0.5)*100);
    }
    // A shovel
    new WorldItem('shovel', -10, -20);
}
spawnItems();

// Interaction Raycaster
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
let interactableItem = null;

function checkInteraction() {
    raycaster.setFromCamera(center, camera);
    const intersects = raycaster.intersectObjects(worldItems.map(i => i.mesh));
    
    const prompt = document.getElementById('interaction-prompt');
    
    if (intersects.length > 0 && intersects[0].distance < 5) {
        interactableItem = worldItems.find(i => i.mesh === intersects[0].object);
        prompt.style.opacity = 1;
        prompt.innerText = `[E] Pick up ${interactableItem.data.name}`;
    } else {
        interactableItem = null;
        prompt.style.opacity = 0;
    }
}

function showNotification(text, color='#fff') {
    const notify = document.getElementById('interaction-prompt');
    notify.innerText = text;
    notify.style.color = color;
    notify.style.opacity = 1;
    setTimeout(() => { notify.style.opacity = 0; notify.style.color = '#fff'; }, 2000);
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
    state.inventoryOpen = false;
    document.getElementById('inventory-modal').style.display = 'none';
});

controls.addEventListener('unlock', () => {
    // If not opening inventory, show pause/start
    if (!state.inventoryOpen) {
        startScreen.style.display = 'flex';
        state.isGameActive = false;
    }
});

function toggleInventory() {
    state.inventoryOpen = !state.inventoryOpen;
    const modal = document.getElementById('inventory-modal');
    
    if (state.inventoryOpen) {
        controls.unlock(); // Unlock pointer to use mouse
        modal.style.display = 'flex';
        updateInventoryUI();
    } else {
        modal.style.display = 'none';
        controls.lock(); // Back to game
    }
}

// Map Rendering (Simple)
function updateMap() {
    const mapContainer = document.getElementById('world-map');
    // Clear old markers (except player)
    const oldMarkers = mapContainer.querySelectorAll('.map-marker');
    oldMarkers.forEach(m => m.remove());

    // Scale world coords to map pixels (example scale)
    const scale = 0.5; // pixel per meter
    const centerX = mapContainer.clientWidth / 2;
    const centerY = mapContainer.clientHeight / 2;

    // Draw known graves (relative to player to center map on player?)
    // Or center map on 0,0 and move player... lets Center Map on Player
    state.discoveries.graves.forEach(grave => {
        const dx = (grave.x - camera.position.x) * scale;
        const dy = (grave.z - camera.position.z) * scale;
        
        // Only draw if within map bounds
        if (Math.abs(dx) < centerX && Math.abs(dy) < centerY) {
            const marker = document.createElement('div');
            marker.className = 'map-marker grave-marker';
            marker.style.left = `${centerX + dx}px`;
            marker.style.top = `${centerY + dy}px`;
            mapContainer.appendChild(marker);
        }
    });
}
    
// Helper to update Inventory HTML
function updateInventoryUI() {
    const grid = document.getElementById('backpack-grid');
    grid.innerHTML = '';
    
    let currentWeight = 0;
    
    state.inventory.backpack.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        slot.title = item.name;
        slot.onclick = () => selectItem(index);

        if (item.icon) {
            const img = document.createElement('img');
            img.src = `../../assets/items/${item.icon}`;
            img.className = 'item-icon-img';
            slot.appendChild(img);
        } else {
            slot.innerText = item.name.substring(0, 2).toUpperCase();
        }

        grid.appendChild(slot);
        currentWeight += item.weight;
    });
    
    state.inventory.weight = currentWeight;
    document.getElementById('current-weight').innerText = currentWeight.toFixed(1);
    
    // Select first item by default if exists
    if (state.inventory.backpack.length > 0) selectItem(0);

    // Update Tabs visibility
    if (state.discoveries.hasBook) {
        document.getElementById('tab-discoveries').classList.remove('hidden');
    }
}

function selectItem(index) {
    const item = state.inventory.backpack[index];
    document.getElementById('selected-item-name').innerText = item.name;
    document.getElementById('selected-item-desc').innerText = item.desc;
    document.getElementById('selected-item-weight').innerText = `${item.weight} lbs`;
    
    // Highlight slot
    const slots = document.querySelectorAll('.inv-slot');
    slots.forEach(s => s.classList.remove('selected'));
    if (slots[index]) slots[index].classList.add('selected');
}


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
        case 'KeyB':
            toggleInventory();
            break;
        case 'KeyE':
            if (interactableItem) {
                interactableItem.pickup();
            }
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
const healthVal = document.getElementById('health-val');
const sanityFill = document.getElementById('sanity-bar-fill');
const sanityVal = document.getElementById('sanity-val');
const compassStrip = document.getElementById('compass-strip');
const minimapDot = document.getElementById('player-dot');
const timeDisplay = document.getElementById('time-display');
const distanceDisplay = document.getElementById('distance-km');

function updateUI() {
    healthFill.style.height = `${state.health}%`;
    healthVal.innerText = `${Math.ceil(state.health)}%`;
    
    sanityFill.style.height = `${state.sanity}%`;
    sanityVal.innerText = `${Math.ceil(state.sanity)}%`;
    
    // Compass
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const angle = Math.atan2(dir.x, dir.z);
    let degrees = THREE.MathUtils.radToDeg(angle);
    if (degrees < 0) degrees += 360;
    if (state.sanity < 20) degrees += (Math.random() - 0.5) * 40;
    compassStrip.style.transform = `translateX(-${degrees * 5}px)`;
    
    // Distance from start (Manor?)
    // Assuming start is 0,0 and Manor is 0, -4000
    // Actually user said KM from Manor. Let's assume start is 5KM away (5000 units)
    const manorZ = -5000;
    const dist = Math.abs(camera.position.z - manorZ) / 1000;
    state.distanceFromManor = dist;
    distanceDisplay.innerText = dist.toFixed(2);
    
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

// --- UI TABS --- (Add listeners)
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Toggle tabs
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`content-${e.target.dataset.tab}`).classList.remove('hidden');
        
        if (e.target.dataset.tab === 'map') updateMap();
        if (e.target.dataset.tab === 'discoveries') updateDiscoveries();
    });
});
document.getElementById('close-inventory').addEventListener('click', toggleInventory);
document.getElementById('slot-backpack').addEventListener('click', toggleInventory);

function updateDiscoveries() {
    const list = document.getElementById('discovery-list');
    list.innerHTML = '';

    // If we have the book, show default entries
    if (state.discoveries.hasBook) {
        let entry = document.createElement('div');
        entry.className = 'discovery-entry';
        entry.innerHTML = `<h4>Journal Start</h4><p>Current Time: ${state.time.toFixed(1)} hours. The manor is distant. Strange noises...</p>`;
        list.appendChild(entry);
    }
    
    // List graves found
    if (state.discoveries.graves.length > 0) {
        let entry = document.createElement('div');
        entry.className = 'discovery-entry';
        entry.innerHTML = `<h4>Graves Located</h4><p>Found ${state.discoveries.graves.length} significant graves.</p>`;
        list.appendChild(entry);
    }
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
        
        // Snap to ground height (Smoothly)
        const targetY = currentY + 1.7;
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 10 * delta);
        
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

        // Center ambient particles on player
        particles.position.set(camera.position.x, camera.position.y, camera.position.z);
        
        checkInteraction(); // Check for items to pickup
        updateUI();
    }

    composer.render();
}

// Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();
