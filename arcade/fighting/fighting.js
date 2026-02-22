// Fighting Game Engine - Ludus Fighter X Ultimate

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const p1HealthBar = document.querySelector("#p1-health");
const p2HealthBar = document.querySelector("#p2-health");
const messageOverlay = document.getElementById("message-overlay");
const p1NameLabel = document.getElementById("p1-name");
const p2NameLabel = document.getElementById("p2-name");
const timerDiv = document.getElementById("timer");
const charGrid = document.querySelector(".char-grid");
const startBtn = document.getElementById("start-btn");

// --- DEVICE CHECK ---
function checkDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        document.getElementById("mobile-warning").style.display = "flex";
        return false;
    }
    return true;
}

if (!checkDevice()) throw new Error("Mobile device detected. Game blocked.");

// --- CONSTANTS ---
const GRAVITY = 0.8;
const FLOOR_Y = 380;
const WIDTH = 800;
const HEIGHT = 480;

let gameRunning = false;
let roundTime = 99;
let timerInterval;

// --- CHARACTERS ---
// Detailed Data for Procedural Painter
const CHARACTERS = {};

const SF_CAST = [
    { id: "RYU", name: "RYU", color: "#ececec", detail: "#dd0000", skin: "#ffccaa", type: "GI", special: "#00bbff" },
    { id: "KEN", name: "KEN", color: "#cc0000", detail: "#ffff00", skin: "#ffccaa", type: "GI", special: "#ff4444" },
    { id: "CHUN", name: "CHUN-LI", color: "#0000ff", detail: "#ffff00", skin: "#ffccaa", type: "FEMALE", special: "#ccddee" },
    { id: "GUILE", name: "GUILE", color: "#445500", detail: "#ffff00", skin: "#ffccaa", type: "MILITARY", special: "#ffff00" },
    { id: "ZANG", name: "ZANGIEF", color: "#dd0000", detail: "#eeddaa", skin: "#ffccaa", type: "BIG", special: "#ff0000" },
    { id: "DHAL", name: "DHALSIM", color: "#eeaa00", detail: "#ff0000", skin: "#885533", type: "SKINNY", special: "#dd4400" },
    { id: "BLNK", name: "BLANKA", color: "#00dd00", detail: "#dd4400", skin: "#00dd00", type: "BEAST", special: "#ffff00" },
    { id: "HOND", name: "E.HONDA", color: "#eeffff", detail: "#0000ff", skin: "#ffccaa", type: "BIG", special: "#dddddd" },
    { id: "VEGA", name: "VEGA", color: "#eeeeee", detail: "#dd00dd", skin: "#ffccaa", type: "MASK", special: "#ff00dd" },
    { id: "BISON", name: "M.BISON", color: "#dd0000", detail: "#444444", skin: "#ffccaa", type: "MILITARY", special: "#aa00aa" }
];

const MK_CAST = [
    { id: "SCORP", name: "SCORPION", color: "#ffff00", detail: "#000000", skin: "#ffccaa", type: "NINJA", special: "#ff8800" },
    { id: "SUB-Z", name: "SUB-ZERO", color: "#00aaff", detail: "#000000", skin: "#ffccaa", type: "NINJA", special: "#00ffff" },
    { id: "RAID", name: "RAIDEN", color: "#ffffff", detail: "#0000aa", skin: "#ffccaa", type: "HAT", special: "#aaddff" },
    { id: "LIU", name: "LIU KANG", color: "#111111", detail: "#dd0000", skin: "#ffccaa", type: "SHIRTLESS", special: "#ff4400" },
    { id: "KANO", name: "KANO", color: "#ffffff", detail: "#dd0000", skin: "#ffccaa", type: "EYE", special: "#ff0000" },
    { id: "SONYA", name: "SONYA", color: "#448844", detail: "#eeeeee", skin: "#ffccaa", type: "FEMALE", special: "#ff44aa" },
    { id: "CAGE", name: "J.CAGE", color: "#444444", detail: "#6666ff", skin: "#ffccaa", type: "SHADES", special: "#22ff22" },
    { id: "REPT", name: "REPTILE", color: "#00dd00", detail: "#000000", skin: "#00dd00", type: "NINJA", special: "#00dd00" },
    { id: "KITAN", name: "KITANA", color: "#0022dd", detail: "#000000", skin: "#ffccaa", type: "FEMALE_NINJA", special: "#8888ff" },
    { id: "JAX", name: "JAX", color: "#dddddd", detail: "#444444", skin: "#885533", type: "BIG", special: "#aa00ff" }
];

const ALL_CAST = SF_CAST.concat(MK_CAST);
ALL_CAST.forEach(c => {
    CHARACTERS[c.id] = {
        name: c.name,
        color: c.color,
        detailColor: c.detail,
        skinColor: c.skin,
        renderType: c.type,
        width: c.type === "BIG" ? 70 : 50,
        height: c.type === "BIG" ? 110 : 100,
        id: c.id,
        speed: c.type === "BIG" ? 4 : (c.type === "NINJA" || c.type === "FEMALE" || c.type==="FEMALE_NINJA") ? 7 : 5,
        jump: c.type === "BIG" ? -12 : -15,
        attacks: {
            punch: { damage: c.type==="BIG" ? 12 : 8, range: 60, frame: 10, color: "#fff" },
            kick: { damage: c.type==="BIG" ? 15 : 10, range: 75, frame: 15, color: "#fff" },
            special: { 
                damage: 20, 
                range: 400, 
                frame: 30, 
                projectile: true, 
                color: c.special 
            }
        }
    };
});

class Particle {
    constructor(x, y, color, size) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.life = 20;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.size *= 0.9;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}
let particles = [];

class Fighter {
    constructor(x, y, charData, isBot = false) {
        this.x = x;
        this.y = y;
        this.width = charData.width;
        this.height = charData.height;
        this.data = charData;
        
        this.vx = 0;
        this.vy = 0;
        
        this.isBot = isBot;
        this.health = 100;
        this.maxHealth = 100;
        this.isDead = false;
        
        // State Machine
        this.state = "idle";
        this.direction = isBot ? -1 : 1; 
        
        this.attackCooldown = 0;
        this.attackFrame = 0;
        this.currentAttack = null;
        
        this.projectiles = [];
        this.hitStun = 0;

        // Animation Props
        this.animFrame = 0;
        this.idleBounce = 0;
    }
    
    update(opponent) {
        if (this.isDead || !gameRunning) return;

        this.animFrame++;
        this.idleBounce = Math.sin(this.animFrame * 0.1) * 2; // Breathing affect

        // Apply Hit Stun
        if (this.hitStun > 0) {
            this.hitStun--;
            this.state = "hit";
            // Friction
            this.vx *= 0.8;
            this.x += this.vx;
            // Gravity still applies
            if (this.y + this.height < FLOOR_Y) this.vy += GRAVITY;
            else { this.y = FLOOR_Y - this.height; this.vy = 0; }
            this.y += this.vy;
            return; // Skip normal update
        } else if (this.state === "hit") {
            this.state = "idle";
        }

        // Gravity
        if (this.y + this.height < FLOOR_Y) {
            this.vy += GRAVITY;
        } else {
            this.vy = 0;
            this.y = FLOOR_Y - this.height;
            if (this.state === "jump") this.state = "idle";
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        // Screen Bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > WIDTH) this.x = WIDTH - this.width;
        
        // Cooldowns
        if (this.attackCooldown > 0) this.attackCooldown--;
        
        // Attack Update
        if (this.state === "attack") {
            this.attackFrame--;
            if (this.attackFrame <= 0) {
                this.state = "idle";
                this.currentAttack = null;
            } else {
                // Hitbox active halfway through animation
                if (this.currentAttack && this.attackFrame === Math.floor(this.currentAttack.frame / 2)) {
                    if (this.currentAttack.projectile) {
                        this.fireProjectile();
                    } else {
                        this.checkHit(opponent);
                    }
                }
            }
        }
        
        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx;
            
            // Hit check
            if (
                p.x < opponent.x + opponent.width && p.x + p.width > opponent.x &&
                p.y < opponent.y + opponent.height && p.y + p.height > opponent.y
            ) {
                opponent.takeDamage(p.damage); // Projectile Impact
                // Create hit spark at impact location
                particles.push(new Particle(p.x, p.y, "#ffaa00", 15));
                this.projectiles.splice(i, 1);
            } else if (p.x < 0 || p.x > WIDTH) {
                this.projectiles.splice(i, 1);
            }
        }
        
        // Bot Logic
        if (this.isBot) this.botAI(opponent);
        
        // Direction facing (only if not busy doing something direction-locked)
        if (this.state !== "attack" && this.state !== "hit" && this.state !== "dead") {
             if (Math.abs(opponent.x - this.x) > 10) {
                this.direction = (opponent.x > this.x) ? 1 : -1;
             }
        }
    }
    
    botAI(opponent) {
        if (this.state === "hit" || this.state === "dead" || this.state === "attack" || this.hitStun > 0) {
            return;
        }

        const dist = Math.abs(opponent.x - this.x);
        
        // Stop moving if close enough to attack
        if (dist < 60 && this.state === "move") {
            this.vx = 0;
            this.state = "idle";
        }

        // Random Decision Tick
        if (Math.random() < 0.05) {
            // Aggro
            if (dist > 150) {
                this.vx = (opponent.x > this.x ? 1 : -1) * this.data.speed;
                this.state = "move";
            } else {
                this.vx = 0;
                this.state = "idle";
                // Attack
                const roll = Math.random();
                if (roll < 0.4) this.attack("punch");
                else if (roll < 0.7) this.attack("kick");
                else if (roll < 0.8 && dist > 200) this.attack("special");
                else if (roll > 0.9) this.block(true);
            }
        }
        
        if (this.state === "block" && Math.random() < 0.1) this.block(false);
        
        // Jump anti-projectile or random, but rarely
        if (Math.random() < 0.005 && this.y === FLOOR_Y - this.height) {
            this.jump();
        }
    }
    
    move(dir) {
        if (this.state === "block" || this.state === "attack" || this.state === "hit" || this.state === "dead" || this.hitStun > 0) return;
        this.vx = dir * this.data.speed;
        this.state = "move";
    }
    
    jump() {
        if (this.y === FLOOR_Y - this.height && this.state !== "hit" && this.state !== "dead" && this.state !== "block" && this.hitStun <= 0) {
            this.vy = this.data.jump;
            this.state = "jump";
        }
    }
    
    block(active) {
        if (this.hitStun > 0 || this.state === "attack") return;
        if (this.state === "idle" || this.state === "move" || this.state === "block") {
            this.state = active ? "block" : "idle";
            this.vx = 0;
        }
    }
    
    attack(type) {
        if (this.attackCooldown > 0 || this.state === "attack" || this.state === "hit" || this.hitStun > 0) return;
        if (this.state !== "idle" && this.state !== "move" && this.state !== "jump") return;
        
        this.vx = 0; // Stop moving to attack
        this.state = "attack";
        this.currentAttack = this.data.attacks[type];
        this.attackFrame = this.currentAttack.frame;
        this.attackCooldown = this.currentAttack.frame + 15;
    }
    
    fireProjectile() {
        this.projectiles.push({
            x: this.x + (this.direction === 1 ? this.width : -20),
            y: this.y + 30,
            width: 30, height: 30,
            vx: this.direction * 12,
            color: this.currentAttack.color,
            damage: this.currentAttack.damage,
            type: "projectile"
        });
    }
    
    checkHit(opponent) {
        const range = this.currentAttack.range;
        const attackRectX = this.direction === 1 ? this.x + this.width : this.x - range;
        
        // Simple 1D overlap check for melee
        let hit = false;
        if (this.direction === 1) {
            if (opponent.x < attackRectX + range && opponent.x + opponent.width > this.x) hit = true;
        } else {
            if (opponent.x + opponent.width > attackRectX && opponent.x < this.x + this.width) hit = true;
        }
        
        if (hit && (Math.abs(this.y - opponent.y) < 50)) {
            opponent.takeDamage(this.currentAttack.damage);
            // Create Hit Spark
            particles.push(new Particle(attackRectX, this.y + 40, "#fff", 10));
        }
    }
    
    takeDamage(amount) {
        if (this.isDead) return;
        
        if (this.state === "block") {
            amount = Math.floor(amount * 0.2); // Chip damage
            // Block spark
            particles.push(new Particle(this.x + (this.width/2), this.y + 40, "#00aaff", 5));
        } else {
            this.hitStun = 20; // Frames of stun
            this.state = "hit";
            // Blood/Hit Effect
            for(let i=0; i<5; i++) {
                particles.push(new Particle(this.x + (this.width/2), this.y + 40, "#ff0000", 8));
            }
        }
        
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        } else {
            this.vx = -this.direction * 8; // Knockback
        }
        updateHUD();
    }
    
    die() {
        this.isDead = true;
        this.state = "dead";
        this.hitStun = 0;
        setTimeout(() => endGame(this.isBot ? "player" : "bot"), 2000);
    }
    
    draw(ctx) {
        const type = this.data.renderType;
        const c1 = this.data.color;
        const c2 = this.data.detailColor;
        const skin = this.data.skinColor || "#ffccaa";
        
        ctx.save();
        
        // Flip Context
        if (this.direction === -1) {
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.scale(-1, 1);
            ctx.translate(-(this.x + this.width/2), -(this.y + this.height/2));
        }

        let bounceY = (this.state === "idle") ? this.idleBounce : 0;
        let drawY = this.y + bounceY;

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(this.x + this.width/2, FLOOR_Y, this.width/1.5, 10, 0, 0, Math.PI*2);
        ctx.fill();

        // --- DRAWING PROCEDURAL PIXEL ART ---
        
        if (this.state === "dead") {
            // Lying down: rotate canvas 90 deg around center
             ctx.translate(this.x + this.width/2, this.y + this.height/2);
             ctx.rotate(-Math.PI/2);
             ctx.translate(-(this.x + this.width/2), -(this.y + this.height/2));
             drawY += 40; // Adjust position
        }

        // LEGS
        ctx.fillStyle = (type === "SHIRTLESS" || type === "MILITARY") ? "#111" : c1;
        if (type === "FEMALE" || type === "FEMALE_NINJA") ctx.fillStyle = skin;

        // Spread legs for stance
        let legOffset = (this.state === "move") ? Math.sin(this.animFrame * 0.5) * 10 : 0;
        
        // Pants Color
        if (type === "GI" || type === "NINJA") ctx.fillStyle = c1;
        else if (type === "MILITARY") ctx.fillStyle = "#453";
        else if (type === "SHIRTLESS") ctx.fillStyle = "#111";

        // Draw Left Leg
        ctx.fillRect(this.x + 10 - legOffset, drawY + 60, 15, 40);
        // Draw Right Leg
        ctx.fillRect(this.x + 25 + legOffset, drawY + 60, 15, 40);
        
        // Boots/Feet
        ctx.fillStyle = "#111";
        ctx.fillRect(this.x + 8 - legOffset, drawY + 95, 20, 5);
        ctx.fillRect(this.x + 23 + legOffset, drawY + 95, 20, 5);

        // TORSO
        ctx.fillStyle = (type === "SHIRTLESS" || type === "BEAST") ? skin : c1;
        if (type === "MILITARY") ctx.fillStyle = skin; // Vest later
        
        ctx.fillRect(this.x + 5, drawY + 30, 40, 35);

        // Vest/Gi Top
        if (type === "GI" || type === "NINJA") {
            ctx.fillStyle = c1;
            // V-Neck shape
            ctx.beginPath();
            ctx.moveTo(this.x + 5, drawY + 30);
            ctx.lineTo(this.x + 45, drawY + 30);
            ctx.lineTo(this.x + 45, drawY + 65);
            ctx.lineTo(this.x + 5, drawY + 65);
            ctx.fill();
            
            // Belt
            ctx.fillStyle = "#111";
            ctx.fillRect(this.x + 5, drawY + 60, 40, 5);
        } else if (type === "MILITARY") {
             ctx.fillStyle = "#342"; // Green Vest
             ctx.fillRect(this.x + 5, drawY + 30, 40, 20);
        }

        // HEAD
        ctx.fillStyle = skin;
        if (type === "NINJA" || type === "FEMALE_NINJA" || type === "MASK") ctx.fillStyle = c1; // Hood/Mask base
        ctx.fillRect(this.x + 12, drawY, 26, 30);

        // Face Detail
        if (type === "NINJA" || type === "FEMALE_NINJA") {
             ctx.fillStyle = skin; // Eye slit
             ctx.fillRect(this.x + 12, drawY + 10, 26, 8);
        } else if (type === "MASK") {
             // Mask detail
             ctx.fillStyle = "#fff";
             ctx.fillRect(this.x + 16, drawY + 8, 18, 18);
        }

        // Headband / Hair / Hat
        ctx.fillStyle = c2;
        if (type === "HAT") {
            ctx.beginPath();
            ctx.moveTo(this.x, drawY + 5);
            ctx.lineTo(this.x + 50, drawY + 5);
            ctx.lineTo(this.x + 25, drawY - 10);
            ctx.fill();
        } else {
             ctx.fillRect(this.x + 12, drawY, 26, 8); // Bandana
             // Bandana knots
             if (this.state === "move") {
                let knotY = Math.sin(this.animFrame * 0.5) * 5;
                ctx.fillRect(this.x + 2, drawY + 5 + knotY, 10, 4);
             }
        }

        // ARMS
        // Changing arm position based on action
        let armX = this.x + 20; 
        
        ctx.fillStyle = skin;
        if (type === "NINJA" || type === "GI") ctx.fillStyle = skin; 
        
        if (this.state === "attack") {
            if (this.currentAttack === this.data.attacks.punch) {
                // Punch arm extended
                ctx.fillRect(this.x + 35, drawY + 35, 40, 10); // Arm out
                ctx.fillStyle = "#a83232"; // Glove/Fist
                ctx.fillRect(this.x + 75, drawY + 32, 10, 16);
            } else if (this.currentAttack === this.data.attacks.kick) {
                // Kick leg extended
                ctx.fillStyle = (type === "SHIRTLESS") ? "#111" : c1;
                ctx.fillRect(this.x + 35, drawY + 60, 50, 12); 
                // Foot
                ctx.fillStyle = "#111";
                ctx.fillRect(this.x + 85, drawY + 58, 10, 16);
                
                // Keep arms in guard
                ctx.fillStyle = skin;
                ctx.fillRect(this.x + 20, drawY + 35, 10, 25);
            } else {
                 // Special pose (Hadouken hands)
                 ctx.fillRect(this.x + 35, drawY + 40, 30, 10); 
                 ctx.fillStyle = this.currentAttack.color;
                 // Glow
                 ctx.globalAlpha = 0.5;
                 ctx.beginPath();
                 ctx.arc(this.x + 65, drawY + 45, 15, 0, Math.PI*2);
                 ctx.fill();
                 ctx.globalAlpha = 1.0;
            }
        } 
        else if (this.state === "block") {
            // Guard up
            ctx.fillRect(this.x + 25, drawY + 25, 15, 25); // Forearm vertical
            ctx.fillRect(this.x + 25, drawY + 25, 15, 25);
        } else {
            // Idle arms
            ctx.fillRect(this.x + 15, drawY + 35, 10, 25);
            ctx.fillRect(this.x + 35, drawY + 38, 10, 25);
        }
        
        // Restore context
        ctx.restore();

        // Projectiles
        this.projectiles.forEach(p => {
             // Glow
             ctx.globalAlpha = 0.6;
             ctx.fillStyle = p.color;
             ctx.beginPath();
             ctx.arc(p.x + p.width/2, p.y + p.height/2, p.width, 0, Math.PI*2);
             ctx.fill();
             
             // Core
             ctx.globalAlpha = 1.0;
             ctx.fillStyle = "#fff";
             ctx.beginPath();
             ctx.arc(p.x + p.width/2, p.y + p.height/2, p.width/2, 0, Math.PI*2);
             ctx.fill();
        });
    }
}

// --- BACKGROUND STAGE ---
// Procedural Background
function drawStage(ctx) {
    // SKY
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#000022");
    gradient.addColorStop(0.5, "#001144");
    gradient.addColorStop(1, "#220011");
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,WIDTH,HEIGHT);

    // MOON
    ctx.fillStyle = "#ffffee";
    ctx.beginPath();
    ctx.arc(700, 80, 40, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.arc(700, 80, 50, 0, Math.PI*2);
    ctx.fill();

    // CITYSCAPE (Parallax back)
    // Dark silhouette
    ctx.fillStyle = "#000511";
    for(let i=0; i<10; i++) {
        let x = i*100;
        let h = 150 + Math.sin(i*132)*50; 
        ctx.fillRect(x, 480 - h - 100, 110, h + 100);
        
        // Windows
        ctx.fillStyle = "#443300";
        if(i%2===0) {
             for(let w=0; w<4; w++) {
                 ctx.fillRect(x+10 + (w*15), 480 - h - 80, 8, 8);
                 ctx.fillRect(x+10 + (w*15), 480 - h - 60, 8, 8);
             }
        }
        ctx.fillStyle = "#000511";
    }

    // GROUND
    const groundGrad = ctx.createLinearGradient(0, FLOOR_Y, 0, HEIGHT);
    groundGrad.addColorStop(0, "#221100");
    groundGrad.addColorStop(1, "#000000");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);
    
    // Grid lines on ground (Perspective)
    ctx.strokeStyle = "#442211";
    ctx.beginPath();
    
    // Moving lines based on player position to simulate camera pan
    let panX = player1 ? (player1.x * -0.5) % 100 : 0;
    
    // Vertical-ish lines
    for(let i=-500; i<WIDTH+500; i+=100) {
        let lineX = i + panX;
        ctx.moveTo(lineX + 300, FLOOR_Y); // Converge slightly? No, straight is fine for arcade
        ctx.lineTo(lineX - 300, HEIGHT); 
    }
    // Horizontal lines
    for(let i=FLOOR_Y; i<HEIGHT; i+=20) {
         ctx.moveTo(0, i);
         ctx.lineTo(WIDTH, i);
    }
    ctx.stroke();
}

// Fixed Key Handling
const keys = {};

function gameLoop() {
    // Canvas Loop
    if (!gameRunning) {
        // Still draw background if paused/ended?
    }
    
    // Clear
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    drawStage(ctx);
    
    // Game Logic
    if (gameRunning) {
        // Reset player velocity frame-to-frame for tighter control
        if (player1.state === "move" || player1.state === "idle") {
            player1.vx = 0;
            // Input Handling
            if (keys["ArrowLeft"]) player1.move(-1);
            if (keys["ArrowRight"]) player1.move(1);
            if (keys["ArrowDown"]) player1.block(true);
            else if (player1.state === "block") player1.block(false); 
        } else if (player1.state === "block") {
            if (!keys["ArrowDown"]) player1.block(false);
        }
        
        if (keys["ArrowUp"]) player1.jump();
        if (keys["z"]) player1.attack("punch");
        if (keys["x"]) player1.attack("kick");
        if (keys["c"]) player1.attack("special");
        
        player1.update(bot);
        bot.update(player1);
    }
    
    if (player1) player1.draw(ctx);
    if (bot) bot.draw(ctx);
    
    // Particles
    for(let i=particles.length-1; i>=0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if(particles[i].life <= 0) particles.splice(i,1);
    }
    
    requestAnimationFrame(gameLoop);
}

// Global Event Listeners
window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
});
window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

// Init
function startGameLoopOnce() {
    requestAnimationFrame(gameLoop); // Start the render loop immediately for BG
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        initSelection();
        startGameLoopOnce();
    });
} else {
    initSelection();
    startGameLoopOnce();
}