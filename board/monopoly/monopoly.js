/*
 * NEON ESTATE (Monopoly-style)
 * 
 * Logic:
 * - 40 Space Board
 * - 4 Players (1 Human, 3 AI)
 * - Buying, Rent, Go, Jail
 * - Canvas Rendering
 */

window.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Constants
    const BOARD_SIZE = 40;
    const SIDE_COUNT = 10; // Spaces per side (excluding corners mostly, handled by logic)
    const PLAYER_COLORS = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00'];
    const GROUPS = {
        BROWN: '#8B4513', LBLUE: '#87CEEB', PINK: '#FF69B4', ORANGE: '#FFA500',
        RED: '#FF0000', YELLOW: '#FFFF00', GREEN: '#008000', BLUE: '#0000FF',
        RAIL: '#FFFFFF', UTIL: '#CCCCCC'
    };
    
    // Data
    const SPACES = [
        { name: 'GO', type: 'go', color: null },
        { name: 'Med Ave', price: 60, rent: 2, group: GROUPS.BROWN, type: 'prop' },
        { name: 'Com Chest', type: 'chest', color: null },
        { name: 'Baltic Ave', price: 60, rent: 4, group: GROUPS.BROWN, type: 'prop' },
        { name: 'Inc Tax', type: 'tax', amount: 200, color: null },
        { name: 'Read RR', price: 200, rent: 25, group: GROUPS.RAIL, type: 'rail' },
        { name: 'Ori Ave', price: 100, rent: 6, group: GROUPS.LBLUE, type: 'prop' },
        { name: 'Chance', type: 'chance', color: null },
        { name: 'Ver Ave', price: 100, rent: 6, group: GROUPS.LBLUE, type: 'prop' },
        { name: 'Conn Ave', price: 120, rent: 8, group: GROUPS.LBLUE, type: 'prop' },
        { name: 'Jail', type: 'jail', color: null },
        { name: 'St. C Pl', price: 140, rent: 10, group: GROUPS.PINK, type: 'prop' },
        { name: 'Electric', price: 150, rent: 0, group: GROUPS.UTIL, type: 'util' },
        { name: 'States', price: 140, rent: 10, group: GROUPS.PINK, type: 'prop' },
        { name: 'Virg Ave', price: 160, rent: 12, group: GROUPS.PINK, type: 'prop' },
        { name: 'Penn RR', price: 200, rent: 25, group: GROUPS.RAIL, type: 'rail' },
        { name: 'St. J Pl', price: 180, rent: 14, group: GROUPS.ORANGE, type: 'prop' },
        { name: 'Com Chest', type: 'chest', color: null },
        { name: 'Tenn Ave', price: 180, rent: 14, group: GROUPS.ORANGE, type: 'prop' },
        { name: 'NY Ave', price: 200, rent: 16, group: GROUPS.ORANGE, type: 'prop' },
        { name: 'Parking', type: 'parking', color: null },
        { name: 'Ken Ave', price: 220, rent: 18, group: GROUPS.RED, type: 'prop' },
        { name: 'Chance', type: 'chance', color: null },
        { name: 'Ind Ave', price: 220, rent: 18, group: GROUPS.RED, type: 'prop' },
        { name: 'Ill Ave', price: 240, rent: 20, group: GROUPS.RED, type: 'prop' },
        { name: 'B&O RR', price: 200, rent: 25, group: GROUPS.RAIL, type: 'rail' },
        { name: 'Atl Ave', price: 260, rent: 22, group: GROUPS.YELLOW, type: 'prop' },
        { name: 'Ven Ave', price: 260, rent: 22, group: GROUPS.YELLOW, type: 'prop' },
        { name: 'Water', price: 150, rent: 0, group: GROUPS.UTIL, type: 'util' },
        { name: 'Marvin', price: 280, rent: 24, group: GROUPS.YELLOW, type: 'prop' },
        { name: 'Go Jail', type: 'gotojail', color: null },
        { name: 'Pac Ave', price: 300, rent: 26, group: GROUPS.GREEN, type: 'prop' },
        { name: 'NC Ave', price: 300, rent: 26, group: GROUPS.GREEN, type: 'prop' },
        { name: 'Com Chest', type: 'chest', color: null },
        { name: 'Penn Ave', price: 320, rent: 28, group: GROUPS.GREEN, type: 'prop' },
        { name: 'Short Ln', price: 200, rent: 25, group: GROUPS.RAIL, type: 'rail' },
        { name: 'Chance', type: 'chance', color: null },
        { name: 'Park Pl', price: 350, rent: 35, group: GROUPS.BLUE, type: 'prop' },
        { name: 'Lux Tax', type: 'tax', amount: 100, color: null },
        { name: 'Boardwlk', price: 400, rent: 50, group: GROUPS.BLUE, type: 'prop' }
    ];

    // State
    let players = [];
    let currentPlayer = 0;
    let turnState = 'roll'; // roll, buy, end
    let dice = [1, 1];
    let message = 'NEON ESTATE';
    
    // Layout Metrics (calculated on resize)
    let boardRect = { x: 0, y: 0, w: 0, h: 0 };
    let spaceSize = 0;

    function init() {
        if (window.GameUI) {
            window.GameUI.init(canvas, {
                onStart: startGame,
                onLoop: loop,
                onResize: handleResize
            });
            window.GameUI.showStartScreen();
        } else {
            // Fallback
            handleResize();
            startGame();
            setInterval(loop, 16);
        }

        // Setup Buttons
        document.getElementById('btn-roll').onclick = () => playerRoll();
        document.getElementById('btn-buy').onclick = () => playerBuy();
        document.getElementById('btn-end').onclick = () => endTurn();
    }

    function startGame() {
        if (window.GameUI) window.GameUI.hideStartScreen();
        
        players = [
            { id: 0, name: 'You', money: 1500, pos: 0, color: PLAYER_COLORS[0], props: [], jail: 0, isBot: false },
            { id: 1, name: 'CPU1', money: 1500, pos: 0, color: PLAYER_COLORS[1], props: [], jail: 0, isBot: true },
            { id: 2, name: 'CPU2', money: 1500, pos: 0, color: PLAYER_COLORS[2], props: [], jail: 0, isBot: true },
            { id: 3, name: 'CPU3', money: 1500, pos: 0, color: PLAYER_COLORS[3], props: [], jail: 0, isBot: true },
        ];
        
        // Reset properties
        SPACES.forEach(s => s.owner = null);
        
        currentPlayer = 0;
        turnState = 'roll';
        updateUI();
        log('Welcome to Neon Estate!');
    }

    function handleResize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const minDim = Math.min(canvas.width, canvas.height);
        const padding = 20;
        boardRect.w = minDim - padding * 2;
        boardRect.h = boardRect.w;
        boardRect.x = (canvas.width - boardRect.w) / 2;
        boardRect.y = (canvas.height - boardRect.h) / 2;
        
        // 11 spaces per side logic (Corners count twice in simplistic math, but we need 13 cells? No, 11x11 grid)
        // corner + 9 middle + corner = 11 units
        spaceSize = boardRect.w / 11;
        
        render();
    }

    function loop() {
        render();
    }

    // --- Logic ---

    function playerRoll() {
        const p = players[currentPlayer];
        
        // Roll
        dice = [Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)];
        const total = dice[0] + dice[1];
        
        log(${p.name} rolled  +  = );
        
        // Jail Logic
        if (p.jail > 0) {
            if (dice[0] === dice[1]) {
                log('Double! Escaped Jail!');
                p.jail = 0;
            } else {
                log(Still in jail. Turns left: );
                p.jail--;
                endTurn();
                return;
            }
        }
        
        // Move
        movePlayer(p, total);
        
        // Check Landing
        handleLanding(p);
    }
    
    function movePlayer(p, steps) {
        let oldPos = p.pos;
        p.pos = (p.pos + steps) % 40;
        
        // Pass Go
        if (p.pos < oldPos) {
            p.money += 200;
            log('Passed GO! +');
        }
    }
    
    function handleLanding(p) {
        const space = SPACES[p.pos];
        log(Landed on );
        
        // Logic by type
        if (space.type === 'prop' || space.type === 'rail' || space.type === 'util') {
            if (space.owner === null) {
                // Can buy
                if (p.money >= space.price) {
                     if (!p.isBot) {
                         turnState = 'buy';
                         updateButtons();
                     } else {
                         // Bot AI: always buy if money > price + 200
                         if (p.money > space.price + 200) {
                             buyProperty(p, space);
                         } 
                         endTurn();
                     }
                     return; // Wait for input if human
                } else {
                    log('Not enough cash to buy.');
                    endTurn();
                }
            } else if (space.owner !== p.id) {
                // Pay Rent
                const owner = players[space.owner];
                const rent = calculateRent(space);
                p.money -= rent;
                owner.money += rent;
                log(Paid body {
    margin: 0;
    overflow: hidden;
    background: #050510;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    color: #fff;
}

#game-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

canvas {
    box-shadow: 0 0 50px rgba(0, 255, 255, 0.1);
}

#ui-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 20px;
    box-sizing: border-box;
}

#score-panel {
    display: flex;
    gap: 20px;
    justify-content: center;
    pointer-events: auto;
}

.player-card {
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #333;
    padding: 10px;
    width: 120px;
    text-align: center;
    border-radius: 5px;
    transition: all 0.3s;
}

.player-card.active {
    border-color: #0ff;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
    transform: scale(1.1);
}

.p-name { font-weight: bold; margin-bottom: 5px; color: #aaa; }
.p-money { font-size: 1.2rem; color: #fff; text-shadow: 0 0 5px #fff; }
.p-props { font-size: 0.8rem; color: #888; }

.p1.active .p-name { color: #0ff; }
.p2.active .p-name { color: #f0f; }
.p3.active .p-name { color: #ff0; }
.p4.active .p-name { color: #0f0; }

#center-message {
    text-align: center;
    font-size: 3rem;
    font-weight: bold;
    color: rgba(255, 255, 255, 0.1);
    text-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
    pointer-events: none;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
}

#action-panel {
    display: flex;
    gap: 20px;
    justify-content: center;
    pointer-events: auto;
    margin-bottom: 20px;
}

.neon-btn {
    background: rgba(0, 0, 0, 0.8);
    color: #0ff;
    border: 1px solid #0ff;
    padding: 15px 30px;
    font-size: 1.2rem;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 2px;
    transition: all 0.2s;
    font-family: inherit;
    min-width: 150px;
}

.neon-btn:hover:not(:disabled) {
    background: #0ff;
    color: #000;
    box-shadow: 0 0 20px #0ff;
}

.neon-btn:disabled {
    border-color: #333;
    color: #555;
    cursor: not-allowed;
}
{rent} rent to );
                checkBankrupt(p);
                endTurn();
            } else {
                // Own property
                endTurn();
            }
        } else if (space.type === 'tax') {
            p.money -= space.amount;
            log(Paid body {
    margin: 0;
    overflow: hidden;
    background: #050510;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    color: #fff;
}

#game-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

canvas {
    box-shadow: 0 0 50px rgba(0, 255, 255, 0.1);
}

#ui-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 20px;
    box-sizing: border-box;
}

#score-panel {
    display: flex;
    gap: 20px;
    justify-content: center;
    pointer-events: auto;
}

.player-card {
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #333;
    padding: 10px;
    width: 120px;
    text-align: center;
    border-radius: 5px;
    transition: all 0.3s;
}

.player-card.active {
    border-color: #0ff;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
    transform: scale(1.1);
}

.p-name { font-weight: bold; margin-bottom: 5px; color: #aaa; }
.p-money { font-size: 1.2rem; color: #fff; text-shadow: 0 0 5px #fff; }
.p-props { font-size: 0.8rem; color: #888; }

.p1.active .p-name { color: #0ff; }
.p2.active .p-name { color: #f0f; }
.p3.active .p-name { color: #ff0; }
.p4.active .p-name { color: #0f0; }

#center-message {
    text-align: center;
    font-size: 3rem;
    font-weight: bold;
    color: rgba(255, 255, 255, 0.1);
    text-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
    pointer-events: none;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
}

#action-panel {
    display: flex;
    gap: 20px;
    justify-content: center;
    pointer-events: auto;
    margin-bottom: 20px;
}

.neon-btn {
    background: rgba(0, 0, 0, 0.8);
    color: #0ff;
    border: 1px solid #0ff;
    padding: 15px 30px;
    font-size: 1.2rem;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 2px;
    transition: all 0.2s;
    font-family: inherit;
    min-width: 150px;
}

.neon-btn:hover:not(:disabled) {
    background: #0ff;
    color: #000;
    box-shadow: 0 0 20px #0ff;
}

.neon-btn:disabled {
    border-color: #333;
    color: #555;
    cursor: not-allowed;
}
{space.amount} tax.);
            checkBankrupt(p);
            endTurn();
        } else if (space.type === 'gotojail') {
            p.pos = 10; // Jail index
            p.jail = 3;
            log('GO TO JAIL!');
            endTurn();
        } else {
            // chance, chest, parking
            endTurn();
        }
    }
    
    function calculateRent(space) {
        if (space.type === 'prop') return space.rent; // Simplified
        if (space.type === 'rail') return 25; // Simplified
        if (space.type === 'util') return 4 * (dice[0]+dice[1]);
        return 0;
    }
    
    function playerBuy() {
        const p = players[currentPlayer];
        const space = SPACES[p.pos];
        
        buyProperty(p, space);
        endTurn();
    }
    
    function buyProperty(p, space) {
        if (p.money >= space.price) {
            p.money -= space.price;
            space.owner = p.id;
            p.props.push(p.pos);
            log(Bought !);
        }
    }
    
    function endTurn() {
        currentPlayer = (currentPlayer + 1) % 4;
        turnState = 'roll';
        updateUI();
        
        const p = players[currentPlayer];
        if (p.isBot) {
            setTimeout(() => playerRoll(), 1500); // Delay for bot
        }
    }
    
    function checkBankrupt(p) {
        if (p.money < 0) {
            log(${p.name} WENT BANKRUPT!);
            // Reset props
            SPACES.forEach(s => {
                if (s.owner === p.id) s.owner = null;
            });
            // Mark inactive? (Simple version just lets them play with neg money for now or hangs)
            // Real version removes player.
        }
    }
    
    function updateUI() {
        // Cards
        players.forEach((p, i) => {
            const card = document.querySelectorAll('.player-card')[i];
            card.querySelector('.p-money').innerText = '$' + p.money;
            card.querySelector('.p-props').innerText = 'Props: ' + p.props.length;
            
            if (i === currentPlayer) card.classList.add('active');
            else card.classList.remove('active');
        });
        
        updateButtons();
    }
    
    function updateButtons() {
        const p = players[currentPlayer];
        const rollBtn = document.getElementById('btn-roll');
        const buyBtn = document.getElementById('btn-buy');
        const endBtn = document.getElementById('btn-end');
        
        rollBtn.disabled = true;
        buyBtn.disabled = true;
        endBtn.disabled = true;
        
        if (p.isBot) return; // Disable all for bot
        
        if (turnState === 'roll') rollBtn.disabled = false;
        if (turnState === 'buy') {
            buyBtn.disabled = false;
            endBtn.disabled = false; // Can skip buy
        }
    }
    
    function log(msg) {
        document.getElementById('center-message').innerHTML = msg;
    }

    // --- Rendering ---
    
    function render() {
        // BG
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Board
        drawBoard();
        
        // Players
        drawPlayers();
        
        // Dice (Visual only)
        // drawDice();
    }
    
    function getSpaceCoords(index) {
        // Map 0-39 to x,y on board
        // 0=BottomRight, 10=BottomLeft, 20=TopLeft, 30=TopRight
        
        // Correct monopoly standard starts Bottom Right and goes CCW?
        // Actually usually standard is Bottom Right = Go (index 0). 
        // Then move Left to 10 (Jail). Up to 20 (Parking). Right to 30 (Go Jail). Down to 0.
        
        let x, y;
        const bs = boardRect.w;
        const ss = spaceSize;
        const ssH = ss; // height of normal space
        
        // Adjust for corners being larger? 
        // Simplification: uniform grid 11x11
        // 0 is at (10, 10) in grid coords
        // 1..9 are (9..1, 10)
        // 10 is at (0, 10)
        // 11..19 are (0, 9..1)
        // 20 is at (0, 0)
        // 21..29 are (1..9, 0)
        // 30 is at (10, 0)
        // 31..39 are (10, 1..9)
        
        let gx, gy;
        
        if (index === 0) { gx=10; gy=10; }
        else if (index < 10) { gx=10-index; gy=10; }
        else if (index === 10) { gx=0; gy=10; }
        else if (index < 20) { gx=0; gy=10-(index-10); }
        else if (index === 20) { gx=0; gy=0; }
        else if (index < 30) { gx=index-20; gy=0; }
        else if (index === 30) { gx=10; gy=0; }
        else if (index < 40) { gx=10; gy=index-30; }
        
        x = boardRect.x + gx * ss;
        y = boardRect.y + gy * ss;
        
        return { x, y };
    }
    
    function drawBoard() {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0ff';
        
        SPACES.forEach((space, i) => {
            const pos = getSpaceCoords(i);
            const size = spaceSize;
            
            // Background
            ctx.fillStyle = '#111';
            ctx.fillRect(pos.x, pos.y, size, size);
            ctx.strokeRect(pos.x, pos.y, size, size);
            
            // Color Bar
            if (space.group) {
                const barH = size * 0.25;
                ctx.fillStyle = space.group;
                
                // Orient based on side?
                // For simplicity, just draw a bar at the 'top' relative to the space content
                // Actually need to rotate based on side.
                
                // Determine side
                let side = 0; // 0=bot, 1=left, 2=top, 3=right
                if (i > 0 && i < 10) side = 0;
                else if (i > 10 && i < 20) side = 1;
                else if (i > 20 && i < 30) side = 2;
                else if (i > 30 && i < 40) side = 3;
                
                if (side === 0) ctx.fillRect(pos.x, pos.y, size, barH); // Top of cell (which is inner edge for bottom row)
                if (side === 1) ctx.fillRect(pos.x + size - barH, pos.y, barH, size); // Right of cell (inner)
                if (side === 2) ctx.fillRect(pos.x, pos.y + size - barH, size, barH); // Bottom of cell (inner)
                if (side === 3) ctx.fillRect(pos.x, pos.y, barH, size); // Left of cell (inner)
            }
            
            // Text
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(space.name.substring(0, 3), pos.x + size/2, pos.y + size/2);
            
            // Owner Marker
            if (space.owner !== null && space.owner !== undefined) {
                ctx.fillStyle = players[space.owner].color;
                ctx.beginPath();
                ctx.arc(pos.x + size/2, pos.y + size/2 + 10, 3, 0, Math.PI*2);
                ctx.fill();
            }
        });
        
        // Center Void
        ctx.fillStyle = '#050510';
        //fillRect for center hole (1 to 9)
        ctx.fillRect(boardRect.x + spaceSize, boardRect.y + spaceSize, spaceSize*9, spaceSize*9);
    }
    
    function drawPlayers() {
        players.forEach((p, i) => {
            const pos = getSpaceCoords(p.pos);
            const size = spaceSize;
            
            // Offset players so they don't overlap perfectly
            const offX = (i % 2) * 10 - 5;
            const offY = Math.floor(i / 2) * 10 - 5;
            
            const px = pos.x + size/2 + offX;
            const py = pos.y + size/2 + offY;
            
            // Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI*2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
        });
    }

    init();
});
