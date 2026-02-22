// Fighting Game Engine - Ludus Fighter

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const p1HealthBar = document.getElementById("p1-health");
const p2HealthBar = document.getElementById("p2-health");
const messageOverlay = document.getElementById("message-overlay");
const p1NameLabel = document.getElementById("p1-name");
const p2NameLabel = document.getElementById("p2-name");
const timerDiv = document.getElementById("timer");

// --- DEVICE CHECK ---
function checkDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        document.getElementById("mobile-warning").style.display = "flex";
        // Lock game start
        return false;
    }
    return true;
}

if (!checkDevice()) {
    // Stop execution
    throw new Error("Mobile device detected. Game blocked.");
}

// --- GAME CONSTANTS ---
const GRAVITY = 0.8;
const FLOOR_Y = 380; // Ground level
const WIDTH = 800;
const HEIGHT = 480;

let gameRunning = false;
let gameOver = false;
let roundTime = 99;
let timerInterval;

// --- CHARACTERS ---
// Ryu-like (Blue) vs Scorpion-like (Yellow/Red)
const CHARACTERS = {
    RYU: {
        color: "#0000ff", // Blue gi
        name: "RYU",
        speed: 5,
        jump: -15,
        width: 50,
        height: 100,
        attacks: {
            punch: { damage: 10, range: 60, frame: 10 },
            kick: { damage: 15, range: 70, frame: 15 },
            special: { damage: 25, range: 400, frame: 30, projectile: true, color: "#00ffff" } // Hadouken
        }
    },
    SCORPION: {
        color: "#ffff00", // Yellow gi
        name: "SCORPION",
        speed: 6,
        jump: -14,
        width: 50,
        height: 100,
        attacks: {
            punch: { damage: 12, range: 55, frame: 8 },
            kick: { damage: 14, range: 65, frame: 12 },
            special: { damage: 20, range: 350, frame: 25, projectile: true, color: "#ff0000" } // Spear/Fire
        }
    }
};

class Fighter {
    constructor(x, y, charData, isBot = false) {
        this.x = x;
        this.y = y;
        this.width = charData.width;
        this.height = charData.height;
        this.color = charData.color;
        this.data = charData;
        
        this.vx = 0;
        this.vy = 0;
        
        this.isBot = isBot;
        this.health = 100;
        this.isDead = false;
        
        this.state = "idle"; // idle, move, jump, attack, hit, block
        this.direction = isBot ? -1 : 1; // 1 = right, -1 = left
        
        this.attackCooldown = 0;
        this.attackFrame = 0;
        this.currentAttack = null;
        
        this.projectiles = []; // Own projectiles
    }
    
    update(opponent) {
        if (this.isDead || !gameRunning) return;

        // Apply Gravity
        if (this.y + this.height < FLOOR_Y) {
            this.vy += GRAVITY;
        } else {
            this.vy = 0;
            this.y = FLOOR_Y - this.height;
            if (this.state === "jump") this.state = "idle";
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        // Bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > WIDTH) this.x = WIDTH - this.width;
        
        // Face opponent
        if (this.state !== "attack" && this.state !== "hit") {
            this.direction = (opponent.x > this.x) ? 1 : -1;
        }
        
        // Cooldowns
        if (this.attackCooldown > 0) this.attackCooldown--;
        
        // Attack Logic duration
        if (this.state === "attack") {
            this.attackFrame--;
            if (this.attackFrame <= 0) {
                this.state = "idle";
                this.currentAttack = null;
            } else {
                // Check Hit during active frames (simplified: slightly after start)
                if (this.currentAttack && this.attackFrame === Math.floor(this.currentAttack.frame / 2)) {
                    // Create hitbox
                    if (this.currentAttack.projectile) {
                        this.fireProjectile();
                    } else {
                        this.checkHit(opponent);
                    }
                }
            }
        }

        // Projectile Logic
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx;
            
            // Draw here logic handled in draw()
            
            // Hit check
            if (
                p.x < opponent.x + opponent.width &&
                p.x + p.width > opponent.x &&
                p.y < opponent.y + opponent.height &&
                p.y + p.height > opponent.y
            ) {
                opponent.takeDamage(p.damage);
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Out of bounds
            if (p.x < 0 || p.x > WIDTH) {
                this.projectiles.splice(i, 1);
            }
        }
        
        // AI Logic
        if (this.isBot) this.botAI(opponent);
    }
    
    botAI(opponent) {
        if (this.state === "hit" || this.state === "dead" || this.state === "attack") return;

        const dist = Math.abs(opponent.x - this.x);
        
        // Random behavior tick
        if (Math.random() < 0.05) {
            // Move toward player
            if (dist > 100) {
                this.vx = this.data.speed * this.direction;
                this.state = "move";
            } else {
                // Close enough? Attack logic
                const roll = Math.random();
                if (roll < 0.3) this.attack("punch");
                else if (roll < 0.6) this.attack("kick");
                else if (Math.random() < 0.1 && dist > 200) this.attack("special"); // Fireball at range
                else {
                    // Block or Idle
                    this.vx = 0;
                    this.state = "idle";
                }
            }
        }
        
        // Stop moving if close
        if (dist < 80 && this.state === "move") {
             this.vx = 0;
             this.state = "idle";
             if (Math.random() < 0.5) this.attack("punch");
        }
        
        // Jump sometimes
        if (Math.random() < 0.01 && this.y === FLOOR_Y - this.height) {
            this.jump();
        }
    }
    
    move(dir) {
        if (this.state === "attack" || this.state === "hit" || this.state === "block") return;
        this.vx = dir * this.data.speed;
        this.state = "move";
    }
    
    stop() {
        if (this.state === "move") {
            this.vx = 0;
            this.state = "idle";
        }
    }
    
    jump() {
        if (this.y === FLOOR_Y - this.height && this.state !== "hit") {
            this.vy = this.data.jump;
            this.state = "jump";
        }
    }
    
    crouch() {
        // Simple crouching visualization needed?
    }
    
    block(isBlocking) {
        if (this.state === "idle" || this.state === "move") {
            this.state = isBlocking ? "block" : "idle";
            this.vx = 0;
        }
    }
    
    attack(type) {
        if (this.attackCooldown > 0 || this.state === "attack" || this.state === "hit" || this.state === "jump") return;
        
        const atk = this.data.attacks[type];
        this.state = "attack";
        this.currentAttack = atk;
        this.attackFrame = atk.frame;
        this.attackCooldown = atk.frame + 10;
        
        // Visualize Attack text or sound
    }
    
    fireProjectile() {
        const p = {
            x: this.x + (this.direction === 1 ? this.width : -20),
            y: this.y + 30,
            width: 20,
            height: 20,
            vx: this.direction * 10,
            color: this.currentAttack.color,
            damage: this.currentAttack.damage
        };
        this.projectiles.push(p);
    }
    
    checkHit(opponent) {
        // Melee hitbox
        const range = this.currentAttack.range;
        const hitX = this.direction === 1 ? this.x + this.width : this.x - range;
        
        // Simple AABB for melee reach
        /*
          Hitbox is rect from (this.x) extending (range) in (direction)
        */
        let hit = false;
        if (this.direction === 1) {
            if (opponent.x < this.x + this.width + range && opponent.x + opponent.width > this.x) hit = true;
        } else {
            if (opponent.x + opponent.width > this.x - range && opponent.x < this.x) hit = true;
        }
        
        if (hit && opponent.state !== "dead") {
            // Check Y overlap (crouch/jump) - simplified
            if (Math.abs(this.y - opponent.y) < 50) {
                 opponent.takeDamage(this.currentAttack.damage);
            }
        }
    }
    
    takeDamage(amount) {
        if (this.state === "block") {
            amount *= 0.1; // Chip damage
        }
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        } else {
            this.state = "hit";
            this.vx = -this.direction * 5; // Knockback
            setTimeout(() => {
                if (!this.isDead) this.state = "idle"; 
                this.vx = 0;
            }, 300);
        }
        updateHUD();
    }
    
    die() {
        this.isDead = true;
        this.state = "dead";
        setTimeout(() => endGame(this.isBot ? "player" : "bot"), 1000);
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color;
        
        // Flash white if hit
        if (this.state === "hit") ctx.fillStyle = "#fff";
        
        // Draw Projectiles
        this.projectiles.forEach(p => {
             ctx.fillStyle = p.color;
             ctx.fillRect(p.x, p.y, p.width, p.height);
        });
        
        // Draw Body
        ctx.fillStyle = this.color;
        if (this.state === "dead") {
            // Lying down
            ctx.fillRect(this.x, this.y + 50, this.height, this.width / 2);
            return;
        }
        
        let drawX = this.x;
        let drawY = this.y;
        let drawW = this.width;
        let drawH = this.height;
        
        if (this.state === "block") {
            ctx.fillStyle = "#555"; // Darken
        }
        
        ctx.fillRect(drawX, drawY, drawW, drawH);
        
        // Draw Head (indicator)
        ctx.fillStyle = "#ffccaa"; // Skin
        ctx.fillRect(drawX + 10, drawY, 30, 30);
        
        // Draw Limbs (Attack Visualization)
        if (this.state === "attack") {
            ctx.fillStyle = "#ff0000";
            if (this.currentAttack === this.data.attacks.punch) {
                // Arm ext
                ctx.fillRect(this.direction === 1 ? drawX + drawW : drawX - 40, drawY + 20, 40, 10);
            }
            if (this.currentAttack === this.data.attacks.kick) {
                // Leg ext
                ctx.fillRect(this.direction === 1 ? drawX + drawW : drawX - 40, drawY + 60, 40, 10);
            }
        }
    }
}

// --- MAIN LOGIC ---
let player1, bot;
const keys = {};

function initGame(charKey) {
    document.getElementById("start-screen").style.display = "none";
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    
    player1 = new Fighter(100, FLOOR_Y - 100, CHARACTERS[charKey]);
    // Bot picks random or opposite
    const botKey = charKey === "RYU" ? "SCORPION" : "RYU";
    bot = new Fighter(600, FLOOR_Y - 100, CHARACTERS[botKey], true);
    
    p1NameLabel.innerText = CHARACTERS[charKey].name;
    p2NameLabel.innerText = CHARACTERS[botKey].name;
    
    messageOverlay.style.display = "flex";
    messageOverlay.innerText = "FIGHT!";
    setTimeout(() => { messageOverlay.style.display = "none"; }, 1000);
    
    gameRunning = true;
    roundTime = 99;
    updateHUD();
    
    // Timer
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameRunning) return;
        roundTime--;
        if (roundTime <= 0) {
            checkWinByTime();
        }
        updateHUD();
    }, 1000);
    
    gameLoop();
}

function updateHUD() {
    p1HealthBar.style.width = player1.health + "%";
    p2HealthBar.style.width = bot.health + "%";
    timerDiv.innerText = roundTime;
    
    // Style bar based on health (green -> yellow -> red logic is in CSS gradient, 
    // but we can add classes if needed or just use width)
}

function checkWinByTime() {
    gameRunning = false;
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
        messageOverlay.style.color = "#00ff00";
    } else if (winner === "bot") {
        messageOverlay.innerText = "YOU LOSE!";
        messageOverlay.style.color = "#ff0000";
    } else {
        messageOverlay.innerText = "DRAW";
        messageOverlay.style.color = "#fff";
    }
    
    setTimeout(() => {
        document.getElementById("start-screen").style.display = "flex";
        messageOverlay.style.display = "none";
    }, 3000);
}

function gameLoop() {
    if (!gameRunning) return;
    
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    // Input Handling
    player1.vx = 0; // Reset X movement per frame
    if (keys["ArrowLeft"]) player1.move(-1);
    if (keys["ArrowRight"]) player1.move(1);
    if (keys["ArrowUp"]) player1.jump();
    if (keys["ArrowDown"]) player1.block(true);
    else player1.block(false);
    
    // Attacks
    if (keys["z"]) player1.attack("punch");
    if (keys["x"]) player1.attack("kick");
    if (keys["c"]) player1.attack("special");
    
    player1.update(bot);
    bot.update(player1);
    
    player1.draw(ctx);
    bot.draw(ctx);
    
    requestAnimationFrame(gameLoop);
}

// --- EVENT LISTENERS ---
window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
});
window.addEventListener("keyup", (e) => keys[e.key] = false);

// Init
// Only show start screen
