import * as THREE from 'three';

// --- CONFIGURATION ---
window.GAME_LOADED = true; // Signal for error handler
const MAP_SIZE = 120; 
const WALL_HEIGHT = 8;

// --- CHAMPION DATA (15 Classes with Abilities) ---
const CLASSES = [
    { 
        id: 'knight', name: 'Knight', role: 'Tank', hp: 200, speed: 0.18, color: 0x3366cc, icon: '⚔️', 
        abilities: [ 'Slash', 'Shield Bash', 'Charge', 'Holy Sword' ]
    },
    { 
        id: 'rogue', name: 'Rogue', role: 'Assassin', hp: 120, speed: 0.25, color: 0xcc3333, icon: '🗡️', 
        abilities: [ 'Stab', 'Dash', 'Poison', 'Assassinate' ]
    },
    { 
        id: 'wizard', name: 'Wizard', role: 'Mage', hp: 100, speed: 0.2, color: 0x9933cc, icon: '🔮', 
        abilities: [ 'Fireball', 'Freeze', 'Blink', 'Meteor' ]
    },
    { 
        id: 'cleric', name: 'Cleric', role: 'Support', hp: 150, speed: 0.19, color: 0xffcc33, icon: '✝️', 
        abilities: [ 'Smite', 'Heal', 'Shield', 'Resurrect' ]
    },
    { 
        id: 'ranger', name: 'Ranger', role: 'Marksman', hp: 110, speed: 0.22, color: 0x33cc33, icon: '🏹', 
        abilities: [ 'Shoot', 'Trap', 'Roll', 'Volley' ]
    },
    { 
        id: 'barbarian', name: 'Barbarian', role: 'Fighter', hp: 180, speed: 0.2, color: 0x990000, icon: '🪓', 
        abilities: [ 'Chop', 'Shout', 'Spin', 'Rage' ]
    },
    { 
        id: 'necromancer', name: 'Necromancer', role: 'Mage', hp: 90, speed: 0.18, color: 0x330033, icon: '💀', 
        abilities: [ 'Bolt', 'Summon', 'Fear', 'Grave' ]
    },
    { 
        id: 'paladin', name: 'Paladin', role: 'Tank', hp: 190, speed: 0.18, color: 0xcccc00, icon: '🛡️', 
        abilities: [ 'Hammer', 'Blessing', 'Aura', 'Judgement' ]
    },
    { 
        id: 'monk', name: 'Monk', role: 'Fighter', hp: 140, speed: 0.24, color: 0xff9933, icon: '👊', 
        abilities: [ 'Punch', 'Kick', 'Meditation', 'Palm' ]
    },
    { 
        id: 'druid', name: 'Druid', role: 'Support', hp: 130, speed: 0.2, color: 0x006600, icon: '🌿', 
        abilities: [ 'Thorn', 'Regen', 'Roots', 'Bear Form' ]
    },
    { 
        id: 'bard', name: 'Bard', role: 'Support', hp: 120, speed: 0.21, color: 0xff66cc, icon: '🎵', 
        abilities: [ 'Note', 'Speed Song', 'Heal Song', 'Crescendo' ]
    },
    { 
        id: 'sorcerer', name: 'Sorcerer', role: 'Mage', hp: 95, speed: 0.2, color: 0xff3300, icon: '🔥', 
        abilities: [ 'Spark', 'Burn', 'Teleport', 'Inferno' ]
    },
    { 
        id: 'warlock', name: 'Warlock', role: 'Mage', hp: 105, speed: 0.19, color: 0x660066, icon: '👁️', 
        abilities: [ 'Blast', 'Curse', 'Drain', 'Portal' ]
    },
    { 
        id: 'fighter', name: 'Fighter', role: 'Fighter', hp: 160, speed: 0.2, color: 0x666666, icon: '⚔️', 
        abilities: [ 'Strike', 'Block', 'Parry', 'Omnislash' ]
    },
    { 
        id: 'artificer', name: 'Artificer', role: 'Specialist', hp: 130, speed: 0.2, color: 0x009999, icon: '🔧', 
        abilities: [ 'Wrench', 'Turret', 'Potion', 'Mech' ]
    }
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
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(20, 50, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -50;
dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
scene.add(dirLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
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

function createNameTag(name, color) {
    if (!name) return new THREE.Object3D();
    
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 48);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(4, 1, 1);
    sprite.position.y = 3.5;
    return sprite;
}

// --- PLAYER ---
function spawnPlayer(classId) {
    console.log("Spawning player with classId:", classId);
    const classData = CLASSES.find(c => c.id === classId);
    
    if (!classData) {
        throw new Error(`Invalid class ID: ${classId}. Available: ${CLASSES.map(c => c.id).join(', ')}`);
    }

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
    
    // Name Tag
    const nameTag = createNameTag(classData.name, '#ffffff');
    group.add(nameTag);
    
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
    
    // Store reference for animations
    group.userData = { weapon: weaponGroup };
    
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
    // Let's keep class color but add a team marker
    const bodyMat = new THREE.MeshStandardMaterial({ color: classData.color });
    const mesh = new THREE.Mesh(bodyGeo, bodyMat);
    mesh.position.y = 1.5;
    mesh.castShadow = true;
    group.add(mesh);

    // Name Tag
    const nameColor = team === 'ally' ? '#8888ff' : '#ff8888';
    const nameTag = createNameTag(classData.name, nameColor);
    group.add(nameTag);

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
        if (!bot.group || bot.hp <= 0) return;

        // Verify target is still valid
        if (bot.target) {
            // Check if target is destroyed (removed from scene or hp <= 0)
            const targetEntity = state.enemies.find(e => e.group === bot.target) 
                || (state.player.group === bot.target ? state.player : null);
            
            if (!targetEntity || targetEntity.hp <= 0) {
                bot.target = null;
            }
        }

        // Find Target if none
        if (!bot.target) {
            let closest = null;
            let minDist = Infinity;
            
            // Identify potential targets
            const potentialTargets = [];
            if (bot.team === 'enemy') {
                if (state.player.group && state.player.hp > 0) potentialTargets.push(state.player.group);
                state.enemies.forEach(e => { if (e.team === 'ally' && e.hp > 0) potentialTargets.push(e.group); });
            } else {
                state.enemies.forEach(e => { if (e.team === 'enemy' && e.hp > 0) potentialTargets.push(e.group); });
            }

            potentialTargets.forEach(t => {
                const d = bot.group.position.distanceTo(t.position);
                if (d < minDist) { minDist = d; closest = t; }
            });
            
            bot.target = closest;
        }
        
        // Action
        if (bot.target) {
            const range = bot.class.role.includes('Mage') || bot.class.role.includes('Marksman') ? 15 : 4;
            const dist = bot.group.position.distanceTo(bot.target.position);
            
            // Look at target
            bot.group.lookAt(bot.target.position);

            if (dist > range) {
                // Move
                const dir = new THREE.Vector3().subVectors(bot.target.position, bot.group.position).normalize();
                bot.group.position.add(dir.multiplyScalar(bot.class.speed * 0.6)); // Slower AI
            } else {
                // Attack (Rate Limited)
                if (!bot.lastAttack || Date.now() - bot.lastAttack > 2000) {
                    bot.lastAttack = Date.now();
                    
                    // Attack Animation
                    bot.group.rotation.x = -0.2;
                    setTimeout(() => bot.group.rotation.x = 0, 200);

                    // Deal Damage
                    if (bot.target === state.player.group) {
                         state.player.hp -= 10;
                         updateHUD();
                         // Screen red flash?
                         document.body.style.backgroundColor = '#300';
                         setTimeout(() => document.body.style.backgroundColor = '#111', 100);
                         if (state.player.hp <= 0) {
                             // Game Over Logic
                             state.player.hp = 0;
                             state.gameActive = false;
                             showGameOver();
                         }
                    } else {
                        // Find entity wrapper for target group
                        const enemyEntity = state.enemies.find(e => e.group === bot.target);
                        if (enemyEntity) {
                            damageEntity(enemyEntity, 10);
                        }
                    }

                    // Projectile check for ranged bots
                    if (range > 5) {
                        spawnProjectile(bot.group, bot.team, 10);
                    }
                }
            }
        }
    });
}

function updateProjectiles() {
    for (let i = PROJECTILES.length - 1; i >= 0; i--) {
        const proj = PROJECTILES[i];
        proj.life--;
        proj.mesh.position.add(proj.dir.clone().multiplyScalar(proj.speed));
        
        // Remove if dead
        if (proj.life <= 0) {
            scene.remove(proj.mesh);
            PROJECTILES.splice(i, 1);
            continue;
        }
        
        // Hit check
        let hit = false;
        // Check Player
        if (proj.team === 'enemy') {
            if (state.player.group && proj.mesh.position.distanceTo(state.player.group.position) < 2) {
                state.player.hp -= proj.damage;
                updateHUD();
                hit = true;
                if (state.player.hp <= 0) {
                     state.gameActive = false;
                     showGameOver();
                }
            }
        } 
        // Check bots
        if (!hit) {
            for (const bot of state.enemies) {
                if (bot.team !== proj.team && bot.hp > 0) {
                    if (proj.mesh.position.distanceTo(bot.group.position) < 2) {
                        damageEntity(bot, proj.damage);
                        hit = true;
                        break;
                    }
                }
            }
        }
        
        if (hit) {
            scene.remove(proj.mesh);
            PROJECTILES.splice(i, 1);
        }
    }
}

// --- INPUT & UI LOGIC ---
const keys = { w: false, a: false, s: false, d: false, space: false };
const cooldowns = { 1: 0, 2: 0, 3: 0, 4: 0, attack: 0 };

function handleInput(key, pressed) {
    if (key === 'w') keys.w = pressed;
    if (key === 'a') keys.a = pressed;
    if (key === 's') keys.s = pressed;
    if (key === 'd') keys.d = pressed;
    if (key === ' ' || key === 'attack') {
        if (pressed && Date.now() > cooldowns.attack) {
            performAttack(); // Trigger on press
        }
        keys.space = pressed; // Still track state
    }
    else if (['1','2','3','4'].includes(key)) {
        if (pressed && !keys[key]) useAbility(key); // Trigger once on press
        keys[key] = pressed;
    }
}

// Mouse Click Support
document.addEventListener('mousedown', () => {
    if (state.gameActive) {
        handleInput('attack', true);
    }
});
document.addEventListener('mouseup', () => {
    if (state.gameActive) {
        handleInput('attack', false);
    }
});

document.addEventListener('keydown', (e) => handleInput(e.key.toLowerCase(), true));
document.addEventListener('keyup', (e) => handleInput(e.key.toLowerCase(), false)); // Fix: Ensure keyup clears

// Mobile / On-Screen Controls
['w', 'a', 's', 'd'].forEach(k => {
    const btn = document.getElementById(`btn-${k}`);
    if (btn) {
        // Prevent default to stop scrolling/selection on mobile
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); handleInput(k, true); btn.classList.add('pressed'); });
        btn.addEventListener('pointerup', (e) => { e.preventDefault(); handleInput(k, false); btn.classList.remove('pressed'); });
        btn.addEventListener('pointerleave', (e) => { e.preventDefault(); handleInput(k, false); btn.classList.remove('pressed'); });
    }
});

['1', '2', '3', '4', 'attack'].forEach(k => {
    const btn = document.getElementById(`btn-${k}`);
    if (btn) {
        btn.addEventListener('pointerdown', (e) => { 
            e.preventDefault(); 
            if(k === 'attack') {
                handleInput(' ', true);
            } else {
                handleInput(k, true);
                if (['1','2','3','4'].includes(k)) {
                   // Ensure it triggers immediately for skills that rely on 'click' behavior
                   // handleInput for 1-4 sets keys[k] = true, and calls useAbility if !pressed before
                   // So it should work fine.
                }
            }
            btn.classList.add('pressed'); 
        });
        btn.addEventListener('pointerup', (e) => { 
            e.preventDefault(); 
            if(k === 'attack') handleInput(' ', false);
            else handleInput(k, false);
            btn.classList.remove('pressed'); 
        });
        btn.addEventListener('pointerleave', (e) => {
             e.preventDefault(); 
             if(k === 'attack') handleInput(' ', false);
             else handleInput(k, false);
             btn.classList.remove('pressed'); 
        });
    }
});

// Helper to update hotbar UI
function updateHotbarUI(classData) {
    const hotbar = document.getElementById('hotbar-container');
    if (hotbar) hotbar.style.display = 'flex';
    
    // Update individual slots if needed (e.g. tooltips)
    // For now just ensuring it's visible
}

// --- COMBAT LOGIC ---
const PROJECTILES = [];
const COOLDOWNS = { 1: 5000, 2: 8000, 3: 12000, 4: 30000 }; // Generic CD times
let lastAttackTime = 0;

function performAttack() {
    if (Date.now() - lastAttackTime < 500) return; // Global Attack CD (Wait for animation)
    lastAttackTime = Date.now();
    
    const player = state.player.group;
    if (!player) return;

    // Visual Swing Animation (Simple Rotation)
    // Assume the weapon group is the second child (after mesh)
    // Actually we stored it in userData
    const weaponGroup = player.userData.weapon;
    if (weaponGroup) {
        // Simple "Strike" animation
        const initialRot = weaponGroup.rotation.x;
        weaponGroup.rotation.x = initialRot - Math.PI / 2; 
        setTimeout(() => {
            if(weaponGroup) weaponGroup.rotation.x = initialRot;
        }, 200);
    }
    
    // Determine Attack Type based on Class Role
    const role = state.selectedClass.role;
    if (role === 'Mage' || role === 'Marksman' || role === 'Support') {
        spawnProjectile(player, 'ally', 20);
    } else {
        // Melee Hit Check
        const range = 5;
        let hit = false;
        state.enemies.forEach(enemy => {
            if (enemy.hp <= 0 || enemy.team === 'ally') return; // Don't hit allies
            
            const dist = player.position.distanceTo(enemy.group.position);
            if (dist < range) {
                // Check Angle
                const enemyPos = enemy.group.position.clone();
                const playerPos = player.position.clone();
                const dirToEnemy = enemyPos.sub(playerPos).normalize();
                
                const playerDir = new THREE.Vector3(0, 0, -1); // Forward is -Z in initial set up?
                // Wait, logic says movement is: z-1 is W. So -Z is forward.
                // We rotate the player mesh group.
                playerDir.applyEuler(player.rotation); 
                
                // Dot product 0.5 is 60 degrees cone
                if (dirToEnemy.dot(playerDir) > 0.5) {
                   damageEntity(enemy, 25);
                   hit = true;
                }
            }
        });
    }
}

function spawnProjectile(sourceEntity, team, damage, offsetAngle = 0) {
    const projGeo = new THREE.SphereGeometry(0.5);
    const projMat = new THREE.MeshBasicMaterial({ color: team === 'ally' ? 0x00ffff : 0xff0000 });
    const proj = new THREE.Mesh(projGeo, projMat);
    
    proj.position.copy(sourceEntity.position);
    proj.position.y = 2; // Chest height
    
    // Direction: Forward based on rotation
    // With atan2(x,z), 0 is +Z (Down).
    // If we want to shoot forward relative to rotation, we need to match movement.
    // Movement: +Z (0 deg). Projectile should go +Z.
    // So local forward is (0, 0, 1).
    const dir = new THREE.Vector3(0, 0, 1);
    
    // If source is player group
    if (sourceEntity.rotation) {
        const euler = new THREE.Euler(sourceEntity.rotation.x, sourceEntity.rotation.y + offsetAngle, sourceEntity.rotation.z);
        dir.applyEuler(euler);
    }
    // Start slightly in front
    proj.position.add(dir.clone().multiplyScalar(2));
    
    scene.add(proj);
    
    PROJECTILES.push({
        mesh: proj,
        dir: dir,
        speed: 0.8,
        team: team,
        damage: damage,
        life: 100 // Frames to live
    });
}


// --- ABILITIES & EFFECTS ---
function createEffect(type, position, size = 1, color = 0xffffff, duration = 500) {
    let mesh;
    if (type === 'explosion') {
        const geo = new THREE.SphereGeometry(size, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
        mesh = new THREE.Mesh(geo, mat);
        
        // simple scale up animation
        const startTime = Date.now();
        const animateEffect = () => {
            const progress = (Date.now() - startTime) / duration;
            if (progress >= 1) {
                scene.remove(mesh);
                return;
            }
            mesh.scale.setScalar(1 + progress * 2);
            mat.opacity = 1 - progress;
            requestAnimationFrame(animateEffect);
        };
        requestAnimationFrame(animateEffect);
    } else if (type === 'ring') {
        const geo = new THREE.RingGeometry(size, size + 0.5, 32);
        const mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        
        const startTime = Date.now();
        const animateEffect = () => {
            const progress = (Date.now() - startTime) / duration;
            if (progress >= 1) {
                scene.remove(mesh);
                return;
            }
            mesh.scale.setScalar(1 + progress);
            mat.opacity = 1 - progress;
            requestAnimationFrame(animateEffect);
        };
        requestAnimationFrame(animateEffect);
    } else if (type === 'beam') {
        const geo = new THREE.CylinderGeometry(0.2, 0.2, size, 8);
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = Math.PI / 2;
        // Beam needs specific orientation logic (start -> end), simplified here as just a mesh at pos
    }
    
    if (mesh) {
        mesh.position.copy(position);
        scene.add(mesh);
        if(type !== 'explosion' && type !== 'ring') setTimeout(() => scene.remove(mesh), duration);
    }
}

function spawnFloatingText(text, position, color = '#fff') {
    const div = document.createElement('div');
    div.className = 'floating-text';
    div.innerText = text;
    div.style.color = color;
    
    // Project 3D position to 2D screen
    const vec = position.clone();
    vec.project(camera);
    
    const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(vec.y * 0.5) + 0.5) * window.innerHeight;
    
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    
    document.getElementById('ui-layer').appendChild(div);
    setTimeout(() => div.remove(), 1000);
}

function useAbility(slot) {
    const cd = COOLDOWNS[slot] || 5000;
    if (Date.now() - cooldowns[slot] < cd) return;
    
    const role = state.selectedClass.role;
    const player = state.player.group;
    if (!player) return;

    console.log(`Casting ability ${slot} for ${role}`);
    let success = false;

    // --- SLOT 1: BASIC SKILL (Short CD) ---
    if (slot === '1') {
        if (role === 'Tank' || role === 'Fighter') {
            // Power Strike: Cone damage + knockback
            createEffect('ring', player.position, 3, 0xff0000, 300);
            dealAreaDamage(player.position, 6, 40, 'enemy');
            success = true;
        } else if (role === 'Mage' || role === 'Support') {
            // Magic Burst: AOE around self
            createEffect('explosion', player.position, 4, 0x00ffff, 400);
            dealAreaDamage(player.position, 8, 30, 'enemy');
            success = true;
        } else { // Assassin / Marksman / Specialist
            // Quick Shot: 3 projectiles
            spawnProjectile(player, 'ally', 15, -0.2);
            spawnProjectile(player, 'ally', 15, 0);
            spawnProjectile(player, 'ally', 15, 0.2);
            success = true;
        }
    }

    // --- SLOT 2: MOBILITY / DEFENSE ---
    if (slot === '2') {
        if (role === 'Tank' || role === 'Support') {
            // Shield / Heal: +HP and visual
            state.player.hp = Math.min(state.player.hp + 40, state.player.maxHp);
            createEffect('ring', player.position, 2, 0x00ff00, 500);
            spawnFloatingText("HEAL", player.position, '#0f0');
            success = true;
        } else {
            // Dash: Move forward instantly
            const dir = new THREE.Vector3(0, 0, -1);
            dir.applyEuler(player.rotation);
            player.position.add(dir.multiplyScalar(10));
            createEffect('ring', player.position, 1, 0xffffff, 200);
            success = true;
        }
    }

    // --- SLOT 3: CROWD CONTROL / UTILITY ---
    if (slot === '3') {
         if (role === 'Mage' || role === 'Support') {
            // Freeze / Stun Area
            createEffect('explosion', player.position, 10, 0x0000ff, 600);
            dealAreaDamage(player.position, 12, 20, 'enemy');
            // TODO: Apply slow status logic if we had status effects
            success = true;
         } else {
            // Heavy Hit
            createEffect('explosion', player.position, 5, 0xff8800, 300);
            dealAreaDamage(player.position, 8, 60, 'enemy');
            success = true;
         }
    }

    // --- SLOT 4: ULTIMATE ---
    if (slot === '4') {
        // Big AOE for everyone for now
        createEffect('explosion', player.position, 20, 0xff00ff, 1000);
        dealAreaDamage(player.position, 20, 150, 'enemy');
        spawnFloatingText("ULTIMATE!", player.position, '#f0f');
        success = true;
    }

    if (success) {
        cooldowns[slot] = Date.now();
        triggerCooldownVisual(slot, cd);
        updateHUD();
    }
}

function dealAreaDamage(position, range, damage, targetTeam) {
    state.enemies.forEach(entity => {
        if (entity.hp <= 0) return;
        if (entity.team === targetTeam || targetTeam === 'all') {
            if (entity.group.position.distanceTo(position) < range) {
                damageEntity(entity, damage);
            }
        }
    });
}

function triggerCooldownVisual(slot, duration) {
    const el = document.getElementById(`slot-${slot}`);
    if (!el) return;
    
    el.classList.add('cooldown');
    const style = document.createElement('style');
    style.innerHTML = `
        #slot-${slot}::after {
            animation: cooldownAnim ${duration}ms linear forwards;
        }
        @keyframes cooldownAnim {
            from { height: 100%; }
            to { height: 0%; }
        }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
        el.classList.remove('cooldown');
        style.remove();
    }, duration);
}

function damageEntity(entity, amount) {
    entity.hp -= amount;
    
    spawnFloatingText(amount, entity.group.position, '#ff0000');
    
    // Flash Material
    entity.group.traverse((child) => {
        if (child.isMesh) {
            // Simple visual feedback
            child.material.emissive = new THREE.Color(0xff0000);
            setTimeout(() => { child.material.emissive = new THREE.Color(0x000000); }, 100);
        }
    });

    if (entity.hp <= 0) {
        scene.remove(entity.group);
        // Remove from enemies array
        const idx = state.enemies.indexOf(entity);
        if (idx > -1) {
            state.enemies.splice(idx, 1);
            if (entity.team !== 'ally') {
                state.player.score += 100;
                updateHUD();
            }
        }
    }
}

function updateHUD() {
    const scoreEl = document.getElementById('score');
    if(scoreEl) scoreEl.innerText = `SCORE: ${state.player.score}`;
    
    const hpBar = document.getElementById('health-bar');
    if(hpBar) {
        const pct = Math.max(0, (state.player.hp / state.player.maxHp) * 100);
        hpBar.style.width = `${pct}%`;
        hpBar.style.backgroundColor = pct > 50 ? '#0f0' : pct > 20 ? '#ff0' : '#f00';
    }
}


function showGameOver() {
    const screen = document.getElementById('game-over-screen');
    const stats = document.getElementById('game-over-stats');
    if(screen) {
        screen.style.display = 'flex';
        // Force reflow for animation
        screen.classList.remove('active');
        void screen.offsetWidth; 
        
        if(stats) stats.innerText = `FINAL SCORE: ${state.player.score}`;
    }
}

function resetGame() {
    // 1. Clear Entities
    if (state.player.group) {
        scene.remove(state.player.group);
        state.player.group = null;
    }
    state.enemies.forEach(e => scene.remove(e.group));
    state.enemies = [];
    PROJECTILES.forEach(p => scene.remove(p.mesh));
    PROJECTILES.length = 0;
    
    // Clear World (Walls/Floor)
    // Actually, we can keep the world if we want, but "generateArena" adds to worldGroup
    // which is already in scene. We should clear worldGroup children.
    while(worldGroup.children.length > 0){ 
        worldGroup.remove(worldGroup.children[0]); 
    }
    
    // 2. Reset State
    state.gameActive = false;
    state.player.hp = state.player.maxHp;
    state.player.score = 0;
    
    // 3. UI Reset
    const screen = document.getElementById('game-over-screen');
    if(screen) screen.style.display = 'none';
    
    const selectScreen = document.getElementById('character-select');
    if(selectScreen) selectScreen.style.display = 'flex';
    
    const hud = document.getElementById('hud-top');
    if(hud) hud.style.display = 'none';
    
    // Camera Reset
    camera.position.set(20, 30, 20);
    camera.lookAt(0, 0, 0);
    
    updateHUD();
}

// Populate Selection Grid
const grid = document.getElementById('class-grid');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

if (restartBtn) {
    restartBtn.onclick = () => {
        resetGame();
    };
}

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
        // Fix: Use the module-scoped variable 'chosenClass'
        // If it's null, we shouldn't even be here effectively, but let's check.
        if (!chosenClass) {
            console.error("No class selected!");
            return;
        }
        
        try {
            console.log("Starting game with class:", chosenClass);
            const selectScreen = document.getElementById('character-select');
            const hud = document.getElementById('hud-top');
            if (selectScreen) selectScreen.style.display = 'none';
            if (hud) hud.style.display = 'flex'; // Show game HUD
            
            // Ensure clean slate before generating
            // Use reverse loop for safer removal or simplify
            for(let i = worldGroup.children.length - 1; i >= 0; i--) {
                const child = worldGroup.children[i];
                worldGroup.remove(child);
            }

            generateArena();
            // CRITICAL FIX: Ensure CLASSES is defined and spawnPlayer gets valid ID
            if (!CLASSES || CLASSES.length === 0) throw new Error("Class definitions failed to load.");
            
            spawnPlayer(chosenClass);
            spawnBots(); // Added Bot Spawning
            state.gameActive = true;
        } catch (e) {
            console.error("Game Start Error:", e);
            alert("Error starting game: " + e.message);
            location.reload();
        }
    };
}

if (restartBtn) {
    restartBtn.onclick = () => {
         // UI Clean up
         const screen = document.getElementById('game-over-screen');
         if(screen) screen.style.display = 'none';

         // Full Reset Logic
         resetGame();
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
    updateProjectiles();
    
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
    
    // Simple UI sync for Cooldowns (Visual overlay decay)
    for(let i=1; i<=4; i++) {
        const slotEl = document.getElementById(`slot-${i}`);
        // If I had overlay elements, I'd update height here based on cooldowns[i] vs Date.now()
    }
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
