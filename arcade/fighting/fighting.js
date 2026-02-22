// Fighting Game Engine - Ludus Fighter

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const p1HealthBar = document.getElementById("p1-health");
const p2HealthBar = document.getElementById("p2-health");
const messageOverlay = document.getElementById("message-overlay");
const p1NameLabel = document.getElementById("p1-name");
const p2NameLabel = document.getElementById("p2-name");
const timerDiv = document.getElementById("timer");
const charGrid = document.getElementById("char-grid");
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
// 10 Street Fighter inspired, 10 Mortal Kombat inspired
const CHARACTERS = {};

const SF_CAST = [
    { id: "RYU", name: "RYU", color: "#ececec", detail: "#dd0000", type: "GI", special: "#00bbff" },
    { id: "KEN", name: "KEN", color: "#cc0000", detail: "#ffff00", type: "GI", special: "#ff4444" },
    { id: "CHUN", name: "CHUN-LI", color: "#0000ff", detail: "#ffff00", type: "FEMALE", special: "#ccddee" },
    { id: "GUILE", name: "GUILE", color: "#445500", detail: "#ffff00", type: "MILITARY", special: "#ffff00" },
    { id: "ZANG", name: "ZANGIEF", color: "#dd0000", detail: "#eeddaa", type: "BIG", special: "#ff0000" },
    { id: "DHAL", name: "DHALSIM", color: "#eeaa00", detail: "#ff0000", type: "SKINNY", special: "#dd4400" },
    { id: "BLNK", name: "BLANKA", color: "#00dd00", detail: "#dd4400", type: "BEAST", special: "#ffff00" },
    { id: "HOND", name: "E.HONDA", color: "#eeffff", detail: "#0000ff", type: "BIG", special: "#dddddd" },
    { id: "VEGA", name: "VEGA", color: "#eeeeee", detail: "#dd00dd", type: "MASK", special: "#ff00dd" },
    { id: "BISON", name: "M.BISON", color: "#dd0000", detail: "#444444", type: "MILITARY", special: "#aa00aa" }
];

const MK_CAST = [
    { id: "SCORP", name: "SCORPION", color: "#ffff00", detail: "#000000", type: "NINJA", special: "#ff8800" },
    { id: "SUB-Z", name: "SUB-ZERO", color: "#00aaff", detail: "#000000", type: "NINJA", special: "#00ffff" },
    { id: "RAID", name: "RAIDEN", color: "#ffffff", detail: "#0000aa", type: "HAT", special: "#aaddff" },
    { id: "LIU", name: "LIU KANG", color: "#111111", detail: "#dd0000", type: "SHIRTLESS", special: "#ff4400" },
    { id: "KANO", name: "KANO", color: "#ffffff", detail: "#dd0000", type: "EYE", special: "#ff0000" },
    { id: "SONYA", name: "SONYA", color: "#448844", detail: "#eeeeee", type: "FEMALE", special: "#ff44aa" },
    { id: "CAGE", name: "J.CAGE", color: "#444444", detail: "#6666ff", type: "SHADES", special: "#22ff22" },
    { id: "REPT", name: "REPTILE", color: "#00dd00", detail: "#000000", type: "NINJA", special: "#00dd00" },
    { id: "KITAN", name: "KITANA", color: "#0022dd", detail: "#000000", type: "FEMALE_NINJA", special: "#8888ff" },
    { id: "JAX", name: "JAX", color: "#dddddd", detail: "#444444", type: "BIG", special: "#aa00ff" }
];

[...SF_CAST, ...MK_CAST].forEach(c => {
    CHARACTERS[c.id] = {
        name: c.name,
        color: c.color,
        detailColor: c.detail,
        renderType: c.type,
        width: c.type === "BIG" ? 70 : 50,
        height: c.type === "BIG" ? 110 : 100,
        id: c.id,
        speed: c.type === "BIG" ? 3 : (c.type === "NINJA" || c.type === "FEMALE" || c.type==="FEMALE_NINJA") ? 7 : 5,
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
        this.isDead = false;
        
        // State Machine
        this.state = "idle";
        this.direction = isBot ? -1 : 1; 
        
        this.attackCooldown = 0;
        this.attackFrame = 0;
        this.currentAttack = null;
        
        this.projectiles = [];
    }
    
    update(opponent) {
        if (this.isDead || !gameRunning) return;

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
                this.projectiles.splice(i, 1);
            } else if (p.x < 0 || p.x > WIDTH) {
                this.projectiles.splice(i, 1);
            }
        }
        
        // Bot Logic
        if (this.isBot) this.botAI(opponent);
        
        // Direction facing (only if not busy doing something direction-locked)
        // If attacking, stay facing the direction of attack until done
        if (this.state !== "attack" && this.state !== "hit" && this.state !== "dead") {
             // Avoid flicker if very close
             if (Math.abs(opponent.x - this.x) > 10) {
                this.direction = (opponent.x > this.x) ? 1 : -1;
             }
        }
    }
    
    botAI(opponent) {
        if (this.state === "hit" || this.state === "dead" || this.state === "attack") {
            // Cannot change velocity while hit/attacking in this simple model if locked
            if (this.state === "hit") this.vx = 0; 
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
            }
        }
        
        // Jump anti-projectile or random, but rarely
        if (Math.random() < 0.005 && this.y === FLOOR_Y - this.height) {
            this.jump();
        }
    }
    
    move(dir) {
        if (this.state === "block" || this.state === "attack" || this.state === "hit" || this.state === "dead") return;
        this.vx = dir * this.data.speed;
        this.state = "move";
    }
    
    jump() {
        if (this.y === FLOOR_Y - this.height && this.state !== "hit" && this.state !== "dead" && this.state !== "block") {
            this.vy = this.data.jump;
            this.state = "jump";
        }
    }
    
    block(active) {
        if (this.state === "idle" || this.state === "move" || this.state === "block") {
            this.state = active ? "block" : "idle";
            this.vx = 0;
        }
    }
    
    attack(type) {
        if (this.attackCooldown > 0 || this.state === "attack" || this.state === "hit" || (this.state !== "idle" && this.state !== "move" && this.state !== "jump")) return;
        
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
            width: 30, height: 20,
            vx: this.direction * 12,
            color: this.currentAttack.color,
            damage: this.currentAttack.damage
        });
    }
    
    checkHit(opponent) {
        const range = this.currentAttack.range;
        
        let inRange = false;
        // Hitbox rect check
        // Attacker: this.x, width. Range extends forward.
        let attackRectX = this.direction === 1 ? this.x + this.width : this.x - range;
        let attackRectW = range;
        
        // Opponent rect
        let oppX = opponent.x;
        let oppW = opponent.width;
        
        // Check 1D overlap on X
        if (attackRectX < oppX + oppW && attackRectX + attackRectW > oppX) {
            inRange = true;
        }
        
        if (inRange && (Math.abs(this.y - opponent.y) < 50)) {
            opponent.takeDamage(this.currentAttack.damage);
        }
    }
    
    takeDamage(amount) {
        if (this.isDead) return;
        if (this.state === "block") amount = Math.floor(amount * 0.2);
        
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        } else {
            this.state = "hit";
            this.vx = -this.direction * 5; // Knockback
            setTimeout(() => { if(!this.isDead) { this.state = "idle"; this.vx=0; } }, 250);
        }
        updateHUD();
    }
    
    die() {
        this.isDead = true;
        this.state = "dead";
        setTimeout(() => endGame(this.isBot ? "player" : "bot"), 1500);
    }
    
    draw(ctx) {
        const type = this.data.renderType;
        const c1 = this.data.color;
        const c2 = this.data.detailColor;
        
        // Save Context
        ctx.save();
        
        // Flip if facing left
        if (this.direction === -1) {
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.scale(-1, 1);
            ctx.translate(-(this.x + this.width/2), -(this.y + this.height/2));
        }

        // --- DRAWING PROCEDURAL PIXEL ART ---
        // Base Body (Skin)
        ctx.fillStyle = "#eec"; // Skin tone default
        if (type === "BIG") ctx.fillRect(this.x, this.y + 10, this.width, this.height - 10);
        else ctx.fillRect(this.x + 10, this.y, 30, this.height);
        
        // Clothes / Style
        if (type === "GI" || type === "NINJA") {
            ctx.fillStyle = c1;
            ctx.fillRect(this.x, this.y + 30, this.width, 45); // Top
            ctx.fillRect(this.x, this.y + 75, this.width, 25); // Pants
            
            ctx.fillStyle = c2; 
            ctx.fillRect(this.x + 10, this.y + 20, this.width - 20, 5); // Headband
            ctx.fillRect(this.x, this.y + 55, this.width, 8); // Belt
        }
        else if (type === "SHIRTLESS") {
            ctx.fillStyle = "#111"; // Pants
            ctx.fillRect(this.x, this.y + 60, this.width, 40);
            ctx.fillStyle = c2; // Headband
            ctx.fillRect(this.x + 5, this.y + 15, 40, 5);
        } 
        else if (type === "MILITARY") {
            ctx.fillStyle = "#453"; // Camo pants
            ctx.fillRect(this.x, this.y + 50, this.width, 50);
            ctx.fillStyle = c1; // Shirt
            ctx.fillRect(this.x + 5, this.y + 30, this.width - 10, 20);
        }
        else if (type === "FEMALE" || type === "FEMALE_NINJA") {
            ctx.fillStyle = c1;
            ctx.fillRect(this.x + 5, this.y + 30, 40, 40); // Leotard
            ctx.fillStyle = c2; // Boots / Detail
            ctx.fillRect(this.x + 10, this.y + 80, 10, 20);
            ctx.fillRect(this.x + 30, this.y + 80, 10, 20);
            
            // Mask for ninja female
            if (type === "FEMALE_NINJA") {
                ctx.fillStyle = c1;
                ctx.fillRect(this.x + 15, this.y + 10, 20, 10);
            }
        }
        else if (type === "BEAST") {
             ctx.fillStyle = c1; // Skin is green/orange
             ctx.fillRect(this.x + 5, this.y + 20, 40, 80);
             ctx.fillStyle = c2; // Shorts
             ctx.fillRect(this.x + 5, this.y + 70, 40, 20);
        }
        else if (type === "MASK" || type === "SHADES") {
             // Suit for Vega/Cage
            ctx.fillStyle = c1; // Suit or bare chest
             ctx.fillRect(this.x + 10, this.y + 30, 30, 70);
             ctx.fillStyle = "#000"; // Pants
             ctx.fillRect(this.x + 10, this.y + 70, 30, 30);
        }

        // Feature: Head
        // For non-masked, draw face details?
        if (type !== "NINJA" && type !== "MASK") {
             ctx.fillStyle = "#000"; // Eyes
             ctx.fillRect(this.x + 30, this.y + 10, 4, 2);
        }

        // Animations (Limbs - Procedural)
        const armX = this.x + 20;
        const armY = this.y + 40;
        
        ctx.fillStyle = "#eec"; // Skin or glove
        if (type === "NINJA" || type === "GI") ctx.fillStyle = "#eec"; 
        
        if (this.state === "attack") {
            if (this.currentAttack === this.data.attacks.punch) {
                // Punch arm extended
                ctx.fillRect(this.x + 40, this.y + 35, 40, 12); 
            } else if (this.currentAttack === this.data.attacks.kick) {
                // Kick leg extended
                ctx.fillRect(this.x + 40, this.y + 70, 50, 15); 
            } else {
                 // Special pose (Hands forward)
                 ctx.fillStyle = this.currentAttack.color;
                 ctx.fillRect(this.x + 45, this.y + 40, 20, 20); 
            }
        } 
        else if (this.state === "block") {
            ctx.fillStyle = "#555"; // Shadow block visual
            ctx.fillRect(this.x + 20, this.y + 20, 20, 40); // Arms up
        } 
        else {
            // Idle arms hanging
            ctx.fillRect(this.x + 15, this.y + 40, 10, 30);
            ctx.fillRect(this.x + 35, this.y + 40, 10, 30);
        }
        
        // Restore context
        ctx.restore();

        // Projectiles
        this.projectiles.forEach(p => {
             ctx.fillStyle = p.color;
             ctx.beginPath();
             ctx.arc(p.x + p.width/2, p.y + p.height/2, p.width/2, 0, Math.PI*2);
             ctx.fill();
        });
    }
}

// --- GAME LOGIC ---
let player1, bot;
let selectedCharKey = null;

// Initial Grid Pop
function initSelection() {
    if(!charGrid) return;
    charGrid.innerHTML = "";
    Object.keys(CHARACTERS).forEach(key => {
        const char = CHARACTERS[key];
        const cell = document.createElement("div");
        cell.className = "char-cell";
        
        // Mini preview block
        const mini = document.createElement("div");
        mini.style.backgroundColor = char.color;
        mini.style.borderTop = `5px solid ${char.detailColor}`;
        cell.appendChild(mini);
        
        // Label
        const label = document.createElement("span");
        label.innerText = char.name.substring(0,3);
        label.style.position="absolute";
        label.style.top="2px";
        label.style.fontSize="6px";
        label.style.color="#fff";
        cell.appendChild(label);

        cell.onclick = () => selectChar(key, cell);
        charGrid.appendChild(cell);
    });
}

function selectChar(key, cell) {
    document.querySelectorAll(".char-cell").forEach(c => c.classList.remove("selected"));
    cell.classList.add("selected");
    
    selectedCharKey = key;
    document.getElementById("p1-select-name").innerText = CHARACTERS[key].name;
    
    // Preview Box
    const p = document.getElementById("p1-select-preview");
    p.style.backgroundColor = CHARACTERS[key].color;
    p.style.borderColor = CHARACTERS[key].detailColor;
    p.style.boxShadow = `0 0 10px ${CHARACTERS[key].detailColor}`;
    
    startBtn.disabled = false;
}

window.confirmSelection = function() {
    if (!selectedCharKey) return;
    initGame(selectedCharKey);
}

function initGame(charKey) {
    document.getElementById("start-screen").style.display = "none";
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    
    player1 = new Fighter(100, FLOOR_Y - 100, CHARACTERS[charKey]);
    
    // Pick Bot (Random)
    const keys = Object.keys(CHARACTERS);
    const botKey = keys[Math.floor(Math.random() * keys.length)];
    bot = new Fighter(600, FLOOR_Y - 100, CHARACTERS[botKey], true);
    
    p1NameLabel.innerText = CHARACTERS[charKey].name;
    p2NameLabel.innerText = CHARACTERS[botKey].name;
    
    gameRunning = true;
    roundTime = 99;
    updateHUD();
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameRunning) return;
        roundTime--;
        if (roundTime <= 0) checkWinByTime();
        updateHUD();
    }, 1000);
    
    messageOverlay.style.display = "flex";
    messageOverlay.innerText = "FIGHT!";
    setTimeout(() => { messageOverlay.style.display = "none"; }, 1000);
    
    gameLoop();
}

function updateHUD() {
    p1HealthBar.style.width = player1.health + "%";
    p2HealthBar.style.width = bot.health + "%";
    timerDiv.innerText = roundTime;
}

function checkWinByTime() {
    if (player1.health > bot.health) endGame("player");
    else if (bot.health > player1.health) endGame("bot");
    else endGame("draw");
}

function endGame(winner) {
    gameRunning = false;
    clearInterval(timerInterval);
    messageOverlay.style.display = "flex";
    
    if (winner === "player") {
        messageOverlay.innerText = "YOU WIN!";
        messageOverlay.style.color = "#0f0";
    } else if (winner === "bot") {
        messageOverlay.innerText = "YOU LOSE!";
        messageOverlay.style.color = "#f00";
    } else {
        messageOverlay.innerText = "DRAW";
        messageOverlay.style.color = "#fff";
    }
    
    setTimeout(() => {
        document.getElementById("start-screen").style.display = "flex";
        messageOverlay.style.display = "none";
        initSelection();
    }, 3000);
}

function gameLoop() {
    if (!gameRunning) return;
    
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    // Reset player velocity frame-to-frame for arcadey controls
    // except when in states that lock movement (like being hit)
    if (player1.state === "move" || player1.state === "idle") {
        player1.vx = 0;
        // Input Handling
        if (Object.keys(keys).length > 0) {
            if (keys["ArrowLeft"]) player1.move(-1);
            if (keys["ArrowRight"]) player1.move(1);
            if (keys["ArrowDown"]) player1.block(true);
            else if (player1.state === "block") player1.block(false); // Unblock
        }
    } else if (player1.state === "block") {
        // Allow unblocking even if blocked
        if (!keys["ArrowDown"]) player1.block(false);
    }
    
    if (keys["ArrowUp"]) player1.jump();
    if (keys["z"]) player1.attack("punch");
    if (keys["x"]) player1.attack("kick");
    if (keys["c"]) player1.attack("special");
    
    player1.update(bot);
    bot.update(player1);
    
    player1.draw(ctx);
    bot.draw(ctx);
    
    requestAnimationFrame(gameLoop);
}

// Global Event Listeners
const keyss = {}; // Local scope variable name conflict avoid
window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
});
window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

// Init
// Wait for DOM
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSelection);
} else {
    initSelection();
}