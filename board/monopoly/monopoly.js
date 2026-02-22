// Monopoly - Full JS Logic
// 11x11 Grid implementation

const BOARD_SIZE = 40;
const START_MONEY = 1500;

// Groups/Colors:
// Brown -> LightBlue -> Pink -> Orange -> Red -> Yellow -> Green -> Blue
const GROUPS = {
    BROWN: 'brown',
    LBLUE: 'lightblue',
    PINK: 'pink',
    ORANGE: 'orange',
    RED: 'red',
    YELLOW: 'yellow',
    GREEN: 'green',
    BLUE: 'blue',
    RAIL: 'railroad',
    UTIL: 'utility'
};

/* 
  Spaces Data Structure
  Rent is simplified for this demo: base rent only.
*/
const spaces = [
    { index: 0, name: "GO", type: "go" },
    { index: 1, name: "Mediterranean", price: 60, rent: 2, group: GROUPS.BROWN, type: "property" },
    { index: 2, name: "Community Chest", type: "chest" },
    { index: 3, name: "Baltic Ave", price: 60, rent: 4, group: GROUPS.BROWN, type: "property" },
    { index: 4, name: "Income Tax", type: "tax", amount: 200 },
    { index: 5, name: "Reading RR", price: 200, rent: 25, group: GROUPS.RAIL, type: "railroad" },
    { index: 6, name: "Oriental Ave", price: 100, rent: 6, group: GROUPS.LBLUE, type: "property" },
    { index: 7, name: "Chance", type: "chance" },
    { index: 8, name: "Vermont Ave", price: 100, rent: 6, group: GROUPS.LBLUE, type: "property" },
    { index: 9, name: "Connecticut", price: 120, rent: 8, group: GROUPS.LBLUE, type: "property" },
    { index: 10, name: "Jail", type: "jail" },
    { index: 11, name: "St. Charles", price: 140, rent: 10, group: GROUPS.PINK, type: "property" },
    { index: 12, name: "Electric Co", price: 150, rent: 0, group: GROUPS.UTIL, type: "utility" }, // Dice multiplier logic omitted for brevity, fixed rent
    { index: 13, name: "States Ave", price: 140, rent: 10, group: GROUPS.PINK, type: "property" },
    { index: 14, name: "Virginia Ave", price: 160, rent: 12, group: GROUPS.PINK, type: "property" },
    { index: 15, name: "Penn RR", price: 200, rent: 25, group: GROUPS.RAIL, type: "railroad" },
    { index: 16, name: "St. James", price: 180, rent: 14, group: GROUPS.ORANGE, type: "property" },
    { index: 17, name: "Com. Chest", type: "chest" },
    { index: 18, name: "Tennessee", price: 180, rent: 14, group: GROUPS.ORANGE, type: "property" },
    { index: 19, name: "New York", price: 200, rent: 16, group: GROUPS.ORANGE, type: "property" },
    { index: 20, name: "Free Parking", type: "parking" },
    { index: 21, name: "Kentucky", price: 220, rent: 18, group: GROUPS.RED, type: "property" },
    { index: 22, name: "Chance", type: "chance" },
    { index: 23, name: "Indiana", price: 220, rent: 18, group: GROUPS.RED, type: "property" },
    { index: 24, name: "Illinois", price: 240, rent: 20, group: GROUPS.RED, type: "property" },
    { index: 25, name: "B. & O. RR", price: 200, rent: 25, group: GROUPS.RAIL, type: "railroad" },
    { index: 26, name: "Atlantic", price: 260, rent: 22, group: GROUPS.YELLOW, type: "property" },
    { index: 27, name: "Ventnor", price: 260, rent: 22, group: GROUPS.YELLOW, type: "property" },
    { index: 28, name: "Water Works", price: 150, rent: 0, group: GROUPS.UTIL, type: "utility" },
    { index: 29, name: "Marvin Gdns", price: 280, rent: 24, group: GROUPS.YELLOW, type: "property" },
    { index: 30, name: "Go To Jail", type: "gotojail" },
    { index: 31, name: "Pacific", price: 300, rent: 26, group: GROUPS.GREEN, type: "property" },
    { index: 32, name: "N. Carolina", price: 300, rent: 26, group: GROUPS.GREEN, type: "property" },
    { index: 33, name: "Com. Chest", type: "chest" },
    { index: 34, name: "Penn Ave", price: 320, rent: 28, group: GROUPS.GREEN, type: "property" },
    { index: 35, name: "Short Line", price: 200, rent: 25, group: GROUPS.RAIL, type: "railroad" },
    { index: 36, name: "Chance", type: "chance" },
    { index: 37, name: "Park Place", price: 350, rent: 35, group: GROUPS.BLUE, type: "property" },
    { index: 38, name: "Luxury Tax", type: "tax", amount: 100 },
    { index: 39, name: "Boardwalk", price: 400, rent: 50, group: GROUPS.BLUE, type: "property" }
];

// Utility: coordinate mapper
function getGridPosition(index) {
    // 0 -> (11,11)
    // 10 -> (11,1)
    // 20 -> (1,1)
    // 30 -> (1,11)
    
    // Bottom: 11, 10->2
    // Left: 10->2, 1
    // Top: 1, 2->10
    // Right: 2->10, 11
    
    if (index === 0) return { r: 11, c: 11 };
    if (index < 10) return { r: 11, c: 11 - index };
    if (index === 10) return { r: 11, c: 1 };
    if (index < 20) return { r: 11 - (index - 10), c: 1 };
    if (index === 20) return { r: 1, c: 1 };
    if (index < 30) return { r: 1, c: 1 + (index - 20) };
    if (index === 30) return { r: 1, c: 11 };
    if (index < 40) return { r: 1 + (index - 30), c: 11 };
    return { r: 1, c: 1 };
}

// Game State
let players = [];
let currentPlayerIndex = 0;
let turnPhase = 'roll'; // roll, action, end
let diceValue = [0,0];

class Player {
    constructor(id, name, color, isHuman=false) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.isHuman = isHuman;
        this.money = START_MONEY;
        this.position = 0;
        this.properties = []; // indices of owned properties
        this.inJail = false;
        this.jailTurns = 0;
    }
}

// Setup
const playerConfigs = [
    { name: "You", color: "#00ffcc", isHuman: true, icon: "👤" }, // Neon cyan
    { name: "Bot 1", color: "#ff0099", isHuman: false, icon: "🤖" }, // Neon pink
    { name: "Bot 2", color: "#ffff00", isHuman: false, icon: "👽" }, // Neon yellow
    { name: "Bot 3", color: "#9900ff", isHuman: false, icon: "💀" }  // Neon purple
];

function initGame() {
    players = playerConfigs.map((cfg, idx) => {
        const p = new Player(idx, cfg.name, cfg.color, cfg.isHuman);
        p.icon = cfg.icon;
        return p;
    });
    renderBoard();
    updateUI();
    log("<b>Welcome to Neon Monopoly!</b>");
    log("You start with $" + START_MONEY);
}

function renderBoard() {
    const boardEl = document.getElementById('board');
    // Clear old spaces (keep center?) Actually re-render all spaces but keep center structure
    // We will append spaces to board
    // First, remove existing .space elements if any, or just rely on IDs not clashing
    // But let's build them fresh
    
    spaces.forEach(sp => {
        const div = document.createElement('div');
        div.className = 'space';
        // Add data-id for CSS hooks if needed
        div.setAttribute('data-id', sp.index);

        const pos = getGridPosition(sp.index);
        div.style.gridRow = pos.r;
        div.style.gridColumn = pos.c;
        div.id = `space-${sp.index}`;
        
        // Content
        let content = `<div class="sp-name">${sp.name}</div>`;
        if (sp.price) {
            content += `<div class="sp-price">$${sp.price}</div>`;
        }
        
        // Color bar for properties
        if (sp.group) {
            // Note: No longer adding class to container to avoid full background color
            // div.classList.add(`group-${sp.group}`);
            
            // Add color bar visual
            const bar = document.createElement('div');
            bar.className = 'color-bar';
            bar.style.backgroundColor = getGroupColor(sp.group);
            bar.style.height = '15px';
            bar.style.width = '100%';
            div.prepend(bar);
        }
        
        div.innerHTML += content;
        boardEl.appendChild(div);
    });

    // Create Tokens
    players.forEach(p => {
        const tok = document.createElement('div');
        tok.className = 'token';
        tok.id = `token-${p.id}`;
        tok.style.color = p.color; // Set icon color
        tok.style.backgroundColor = 'transparent'; // No background for emoji
        tok.style.border = 'none'; // No border
        tok.style.textShadow = `0 0 5px ${p.color}`;
        tok.style.fontSize = '24px';
        tok.style.display = 'flex';
        tok.style.alignItems = 'center';
        tok.style.justifyContent = 'center';
        tok.style.zIndex = '50';
        tok.innerText = p.icon; // Use Icon
        boardEl.appendChild(tok);
        moveToken(p.id, 0); // initial pos
    });
}

function getGroupColor(group) {
    switch(group) {
        case GROUPS.BROWN: return '#8B4513';
        case GROUPS.LBLUE: return '#87CEEB';
        case GROUPS.PINK: return '#FF69B4';
        case GROUPS.ORANGE: return '#FFA500';
        case GROUPS.RED: return '#FF0000';
        case GROUPS.YELLOW: return '#FFFF00';
        case GROUPS.GREEN: return '#008000';
        case GROUPS.BLUE: return '#0000FF';
        case GROUPS.RAIL: return '#FFFFFF'; 
        default: return '#555';
    }
}

function moveToken(playerId, index) {
    const tok = document.getElementById(`token-${playerId}`);
    const pos = getGridPosition(index);
    const offsetMap = [
        {x:-10, y:-10}, {x:10, y:-10},
        {x:-10, y:10}, {x:10, y:10}
    ];
    const off = offsetMap[playerId] || {x:0, y:0};
    
    tok.style.gridRow = pos.r;
    tok.style.gridColumn = pos.c;
    // Store base transform to allow appending scale later
    const baseTransform = `translate(${off.x}px, ${off.y}px)`;
    tok.dataset.baseTransform = baseTransform;
    
    // Check if active player to apply scale
    if (playerId === currentPlayerIndex) {
        tok.style.transform = `${baseTransform} scale(1.3)`;
        tok.style.zIndex = 100;
        tok.style.filter = "drop-shadow(0 0 8px #fff)";
    } else {
        tok.style.transform = baseTransform;
        tok.style.zIndex = 50;
        tok.style.filter = "none";
    }
}

function showFloatingText(playerId, text, color) {
    const token = document.getElementById(`token-${playerId}`);
    if (!token) return;
    
    const el = document.createElement('div');
    el.className = 'float-text';
    el.innerText = text;
    el.style.color = color || '#fff';
    
    // Position relative to token
    const rect = token.getBoundingClientRect();
    // But token is in board, which has relative positioning.
    // Easier to append to token direct? But token moves.
    // Best to append to board at token's grid position.
    
    const board = document.getElementById('board');
    el.style.left = token.offsetLeft + "px";
    el.style.top = (token.offsetTop - 20) + "px";
    
    // Grid hack:
    el.style.gridRow = token.style.gridRow;
    el.style.gridColumn = token.style.gridColumn;
    el.style.justifySelf = 'center';
    el.style.alignSelf = 'start';
    
    board.appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

function updateMoney(player, amount) {
    player.money += amount;
    const text = amount >= 0 ? `+$${amount}` : `-$${Math.abs(amount)}`;
    const color = amount >= 0 ? '#0f0' : '#f00';
    showFloatingText(player.id, text, color);
    updateUI(); // force update
}

// Actions
function actionRoll() {
    if (turnPhase !== 'roll') return;
    const p = getCurrentPlayer();
    
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    diceValue = [d1, d2];
    const total = d1 + d2;
    
    const diceChars = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    
    // UI Dice
    const diceDisplay = document.getElementById('dice-display');
    // Simple wobble animation
    diceDisplay.style.animation = 'none';
    diceDisplay.offsetHeight; /* trigger reflow */
    diceDisplay.style.animation = 'shake 0.5s';
    
    setTimeout(() => {
        const style = "font-size:40px; color:#fff; background:transparent; box-shadow:none; width:auto; height:auto; padding:0 10px;";
        diceDisplay.innerHTML = `<div class="die" style="${style}">${diceChars[d1-1]}</div>
                                 <div class="die" style="${style}">${diceChars[d2-1]}</div>`;
        log(`${p.name} rolled ${d1} + ${d2} = ${total}`);
        // Continue game logic after animation? No, immediate for now.
    }, 250);
    
    if (p.inJail) {
        if (d1 === d2) {
            log("Doubles! Released from Jail.");
            p.inJail = false;
            p.jailTurns = 0;
            movePlayer(p, total);
        } else {
            p.jailTurns++;
            log("Stayed in Jail.");
            if (p.jailTurns >= 3) {
                 log("Paid $50 to leave Jail.");
                 updateMoney(p, -50);
                 p.inJail = false;
                 p.jailTurns = 0;
                 movePlayer(p, total);
            } else {
                turnPhase = 'end';
                updateUI();
                checkBotTurn();
                return;
            }
        }
    } else {
        movePlayer(p, total);
    }
}

function movePlayer(player, steps) {
    // Animate later?
    let newPos = player.position + steps;
    if (newPos >= BOARD_SIZE) {
        newPos -= BOARD_SIZE;
        log(`${player.name} passed GO! Collect $200.`);
        updateMoney(player, 200);
    }
    player.position = newPos;
    moveToken(player.id, newPos);
    
    handleLanding(player);
}

function handleLanding(player) {
    const space = spaces[player.position];
    log(`Landed on ${space.name}`);
    
    // Types
    if (space.type === 'property' || space.type === 'railroad' || space.type === 'utility') {
        // Owned?
        const owner = players.find(p => p.properties.includes(space.index));
        if (owner) {
            if (owner.id === player.id) {
                log("You own this property.");
                turnPhase = 'end';
            } else {
                // Rent
                let rent = space.rent || 0;
                // Simple logic: if util, roll * 4? rail * 25
                if (space.type === 'utility') rent = (diceValue[0]+diceValue[1]) * 4;
                if (space.type === 'railroad') {
                    // Count owned
                    const count = owner.properties.filter(idx => spaces[idx].type === 'railroad').length;
                    rent = 25 * Math.pow(2, count - 1);
                }
                
                log(`Paid $${rent} rent to ${owner.name}`);
                // Use new updateMoney for visual feedback
                updateMoney(player, -rent);
                updateMoney(owner, rent);
                turnPhase = 'end';
            }
        } else {
            // Unowned - can buy
            if (player.money >= space.price) {
                if (player.isHuman) {
                    turnPhase = 'action'; // Enable Buy button
                    document.getElementById('btn-buy').disabled = false;
                    document.getElementById('btn-buy').innerText = `Buy for $${space.price}`;
                } else {
                    // Bot logic
                    botDecideBuy(player, space);
                }
            } else {
                log("Cannot afford to buy.");
                turnPhase = 'end';
            }
        }
    } else if (space.type === 'tax') {
        log(`Paid tax $${space.amount}`);
        updateMoney(player, -space.amount);
        turnPhase = 'end';
    } else if (space.type === 'gotojail') {
        log("Go to Jail!");
        player.position = 10;
        player.inJail = true;
        moveToken(player.id, 10);
        turnPhase = 'end';
    } else if (space.type === 'chance' || space.type === 'chest') {
        handleCard(player, space.type);
    } else {
        // Parking, Just Visiting...
        log("Safe space.");
        turnPhase = 'end';
    }
    
    updateUI();
    
    // If not human buy phase, or if bot finished logic immediately
    if (turnPhase === 'end' && !player.isHuman) {
        setTimeout(actionEndTurn, 1000);
    }
}

function handleCard(player, type) {
    // Simple card logic
    const cards = [
        { text: "Advance to GO", action: (p) => { 
            p.position = 0; 
            moveToken(p.id, 0); 
            // Money handled by move pass Log, but card explicitly says so
            // Actually movePlayer handles +200. Logic might double pay?
            // movePlayer adds 200 if pass go. If we warp to 0, movePlayer logic
            // depends on (newPos >= BOARD_SIZE). Setting p.position=0 bypasses that check.
            // So we pay manually.
            updateMoney(p, 200);
            log("Bank pays you dividend of $200.");
        }},
        { text: "Bank error in your favor. Collect $200.", action: (p) => { updateMoney(p, 200); }},
        { text: "Doctor's fees. Pay $50.", action: (p) => { updateMoney(p, -50); }},
        { text: "Get Out of Jail Free.", action: (p) => { p.hasJailCard = true; }}, // simplistic
        { text: "Go to Jail.", action: (p) => { 
            p.position = 10; 
            p.inJail = true; 
            moveToken(p.id, 10); 
        }},
        { text: "Grand Opera Night. Collect $50 from every player.", action: (p) => {
            players.forEach(pl => {
                if (pl !== p) {
                    updateMoney(pl, -50);
                    updateMoney(p, 50);
                }
            });
        }},
        { text: "Holiday Fund matures. Receive $100.", action: (p) => { updateMoney(p, 100); }},
        { text: "Income tax refund. Collect $20.", action: (p) => { updateMoney(p, 20); }},
        { text: "It is your birthday. Collect $10 from every player.", action: (p) => {
            players.forEach(pl => {
                if (pl !== p) {
                    updateMoney(pl, -10);
                    updateMoney(p, 10);
                }
            });
        }},
        { text: "Life insurance matures. Collect $100.", action: (p) => { updateMoney(p, 100); }},
        { text: "Pay hospital fees of $100.", action: (p) => { updateMoney(p, -100); }},
        { text: "Pay school fees of $50.", action: (p) => { updateMoney(p, -50); }},
        { text: "Receive $25 consultancy fee.", action: (p) => { updateMoney(p, 25); }},
        { text: "You have won second prize in a beauty contest. Collect $10.", action: (p) => { updateMoney(p, 10); }},
        { text: "You inherit $100.", action: (p) => { updateMoney(p, 100); }}
    ];
    
    // Pick random
    const card = cards[Math.floor(Math.random() * cards.length)];
    log(`[${type.toUpperCase()}] ${card.text}`);
    if (card.action) card.action(player);
    turnPhase = 'end';
}


function actionBuy() {
    if (turnPhase !== 'action') return;
    const p = getCurrentPlayer();
    const space = spaces[p.position];
    if (p.money >= space.price) {
        updateMoney(p, -space.price);
        p.properties.push(space.index);
        log(`${p.name} bought ${space.name}!`);
        
        // Highlight property
        const cell = document.getElementById(`space-${space.index}`);
        cell.style.borderColor = p.color;
        cell.style.borderWidth = '3px';
        
        turnPhase = 'end';
        updateUI();
    }
}

function botDecideBuy(bot, space) {
    const diffSelect = document.getElementById('difficultySelect');
    const difficulty = diffSelect ? parseInt(diffSelect.value) : 1; // Default 1 (Gambler)

    let shouldBuy = false;

    if (difficulty === 0) {
        // Apprentice: Very Conservative. Keeps $300 buffer.
        shouldBuy = (bot.money >= space.price + 300);
    } else if (difficulty === 1) {
        // Gambler: Moderate. Keeps $50 buffer.
        shouldBuy = (bot.money >= space.price + 50);
    } else {
        // Ruthless: Aggressive. Buys if affordable.
        shouldBuy = (bot.money >= space.price);
    }

    if (shouldBuy) {
        updateMoney(bot, -space.price);
        bot.properties.push(space.index);
        log(`${bot.name} bought ${space.name}.`);
        
        const cell = document.getElementById(`space-${space.index}`);
        cell.style.borderColor = bot.color;
        cell.style.borderWidth = '3px';
    } else {
        log(`${bot.name} passed on ${space.name}.`);
    }
    turnPhase = 'end';
}

function actionEndTurn() {
    // Check bankruptcy
    const p = getCurrentPlayer();
    if (p.money < 0) {
        log(`💥 <b>${p.name} WENT BANKRUPT!</b>`);
        p.eliminated = true;
        
        // Return properties to bank
        p.properties.forEach(idx => {
            const cell = document.getElementById(`space-${idx}`);
            if(cell) {
                cell.style.borderColor = "#444";
                cell.style.borderWidth = "1px";
            }
        });
        p.properties = [];

        // Remove token
        const tok = document.getElementById(`token-${p.id}`);
        if (tok) tok.style.display = 'none';
        
        // Check for Winner
        const survivors = players.filter(pl => !pl.eliminated);
        if (survivors.length === 1) {
            log(`🏆 <b>GAME OVER! ${survivors[0].name} WINS!</b>`);
            showVictory(survivors[0]);
            return;
        }
        
        if (p.isHuman) {
            log("💀 You have been eliminated.");
        }
    }
    
    turnPhase = 'roll';
    document.getElementById('btn-buy').disabled = true;
    document.getElementById('btn-buy').innerText = "Buy Property";
    
    // Find next active player
    let nextIndex = (currentPlayerIndex + 1) % players.length;
    let loopCount = 0;
    while (players[nextIndex].eliminated && loopCount < players.length) {
        nextIndex = (nextIndex + 1) % players.length;
        loopCount++;
    }
    
    currentPlayerIndex = nextIndex;
    updateUI();
    checkBotTurn();
}

function showVictory(winner) {
    const overlay = document.createElement('div');
    overlay.className = 'victory-overlay';
    overlay.innerHTML = `
        <div class="victory-title">🏆 ${winner.name} WINS!</div>
        <div style="font-size: 20px; color: #fff; margin-bottom: 20px;">
            Total Wealth: $${winner.money} <br>
            Properties Owned: ${winner.properties.length}
        </div>
        <button class="victory-btn" onclick="location.reload()">Play Again</button>
        <button class="victory-btn" style="margin-top: 10px;" onclick="location.href='../index.html'">Exit</button>
    `;
    document.body.appendChild(overlay);
    
    // Confetti effect via emoji rain
    if(window.createPixelRain) {
        // Boost rain
        for(let i=0; i<50; i++) setTimeout(window.createPixelRain, i*50);
    }
}

function checkBotTurn() {
    const p = getCurrentPlayer();
    if (!p.isHuman) {
        setTimeout(() => {
            actionRoll();
        }, 1000); // delay for effect
    }
}

function getCurrentPlayer() {
    return players[currentPlayerIndex];
}

function updateUI() {
    const p = getCurrentPlayer();
    const list = document.getElementById('player-list');
    list.innerHTML = "";
    
    players.forEach((pl, i) => {
        const div = document.createElement('div');
        div.style.padding = "5px";
        div.style.border = (i === currentPlayerIndex) ? "1px solid white" : "1px solid transparent";
        div.style.backgroundColor = (i === currentPlayerIndex) ? "#333" : "transparent";
        div.style.color = pl.color;
        // Use icon in list
        div.innerHTML = `<b>${pl.icon} ${pl.name}</b>: $${pl.money}`;
        // Show properties count
        div.innerHTML += `<br><small>Props: ${pl.properties.length}</small>`;
        list.appendChild(div);
        
        // Update Token visual state (Scale active player)
        const tok = document.getElementById(`token-${pl.id}`);
        if(tok && tok.dataset.baseTransform) {
            const base = tok.dataset.baseTransform;
            if (i === currentPlayerIndex) {
                 tok.style.transform = `${base} scale(1.3)`;
                 tok.style.zIndex = 100;
                 tok.style.filter = "drop-shadow(0 0 5px white)";
            } else {
                 tok.style.transform = base; // Reset scale
                 tok.style.zIndex = 50;
                 tok.style.filter = "none";
            }
        }
    });

    const human = players.find(pl => pl.isHuman);
    const rollBtn = document.getElementById('btn-roll');
    const endBtn = document.getElementById('btn-end');
    
    // Button States
    if (p.isHuman) {
        if (turnPhase === 'roll') {
            rollBtn.disabled = false;
            endBtn.disabled = true;
        } else if (turnPhase === 'action') {
            rollBtn.disabled = true;
            endBtn.disabled = false; // can skip buying
        } else if (turnPhase === 'end') {
            rollBtn.disabled = true;
            endBtn.disabled = false;
        }
    } else {
        rollBtn.disabled = true;
        endBtn.disabled = true;
    }
}

function log(msg) {
    const box = document.getElementById('log');
    const line = document.createElement('div');
    
    // Add color/class based on content
    if (msg.includes('Bankrupt') || msg.includes('Eliminated')) {
        line.style.color = '#ff0055'; // Red/Pink
        line.style.fontWeight = 'bold';
    } else if (msg.includes('bought') || msg.includes('dividend')) {
        line.style.color = '#00ffcc'; // Cyan
    } else if (msg.includes('rent') || msg.includes('tax')) {
        line.style.color = '#ffff00'; // Yellow
    } else if (msg.includes('rolled')) {
        line.style.color = '#aaaaaa';
    }
    
    line.innerHTML = `> ${msg}`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
}

// Start
// window.onload = initGame; // Handled by index.html
