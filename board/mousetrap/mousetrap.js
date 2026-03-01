/*
 * CYBER TRAP
 * 
 * Game Logic:
 * - 4 Players
 * - Circuit Board Path
 * - Collect 3 Trap Parts: [Code, Exploit, Trigger]
 * - Trigger Trap on 'Execute' spaces
 */

(function() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Constants
    const PLAYER_COLORS = ['#00ff00', '#00ffff', '#ff00ff', '#ffff00'];
    const SPACE_TYPES = ['safe', 'data', 'part', 'hazard', 'execute'];
    const PARTS = ['CODE', 'EXPLOIT', 'TRIGGER'];
    
    // State
    let players = [];
    let currentPlayer = 0;
    let turnState = 'roll'; // roll, anim, end
    let message = 'SYSTEM READY';
    let diceVal = 0;
    let boardPath = []; 
    
    // Layout
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    function init() {
        if (window.GameUI) {
            window.GameUI.init(canvas, {
                onStart: startGame,
                onLoop: loop,
                onResize: handleResize
            });
            window.GameUI.showStartScreen();
        } else {
            handleResize();
            startGame();
            setInterval(loop, 16);
        }

        document.getElementById('btn-roll').onclick = () => doRoll();
        document.getElementById('btn-trap').onclick = () => doTrap();
    }

    function createPath() {
        // Create a 'circuit loop' path relative to 1000x1000 grid
        // A spiraling square or complex loop
        const p = [];
        
        // Outer Loop
        // Top edge
        for(let i=100; i<=900; i+=100) p.push({x: i, y: 100});
        // Right edge
        for(let i=200; i<=900; i+=100) p.push({x: 900, y: i});
        // Bottom edge
        for(let i=800; i>=100; i-=100) p.push({x: i, y: 900});
        // Left edge
        for(let i=800; i>=200; i-=100) p.push({x: 100, y: i});
        
        // Inner diversion (Loop-back)
        // Let's keep it simple: Just a 32-space outer loop is fine for now
        // The points above give: 9 + 8 + 8 + 7 = 32 points roughly. 
        // 100->900 (9 pts: 100,200..900)
        // 200->900 vertical (8 pts: 200..900)
        // 800->100 horizontal (8 pts)
        // 800->200 vertical (7 pts)
        // Total 32 steps. Perfect.
        
        return p.map((pt, i) => {
            // Assign types
            let type = 'safe';
            if (i % 4 === 0) type = 'data';    // +Points
            else if (i % 6 === 0) type = 'part';    // +Trap Part
            else if (i % 8 === 0) type = 'hazard';  // -Points or Lose Turn
            else if (i % 10 === 0) type = 'execute'; // Trigger Trap
            
            // Override corners
            if (i===0) type = 'start';
            
            return { ...pt, type, index: i };
        });
    }

    function startGame() {
        if (window.GameUI) window.GameUI.hideStartScreen();
        
        boardPath = createPath();
        
        players = [
            { id: 0, name: 'SYS_ADMIN', data: 0, pos: 0, color: PLAYER_COLORS[0], parts: [], stuck: 0, isBot: false },
            { id: 1, name: 'GUEST', data: 0, pos: 0, color: PLAYER_COLORS[1], parts: [], stuck: 0, isBot: true },
            { id: 2, name: 'BOT_Alpha', data: 0, pos: 0, color: PLAYER_COLORS[2], parts: [], stuck: 0, isBot: true },
            { id: 3, name: 'BOT_Beta', data: 0, pos: 0, color: PLAYER_COLORS[3], parts: [], stuck: 0, isBot: true }
        ];
        
        currentPlayer = 0;
        turnState = 'roll';
        updateUI();
        log('SYSTEM ONLINE. WAITING FOR INPUT.');
    }

    function handleResize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Fit 1000x1000 into screen
        const minDim = Math.min(canvas.width, canvas.height);
        scale = (minDim - 100) / 1000;
        offsetX = (canvas.width - 1000*scale) / 2;
        offsetY = (canvas.height - 1000*scale) / 2;
    }

    function loop() {
        // Clear
        ctx.fillStyle = '#000500';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        
        drawBoard();
        drawPlayers();
        
        ctx.restore();
    }
    
    function drawBoard() {
        // Draw connections
        ctx.beginPath();
        ctx.strokeStyle = '#003300';
        ctx.lineWidth = 20;
        ctx.lineJoin = 'round';
        if(boardPath.length > 0) {
            ctx.moveTo(boardPath[0].x, boardPath[0].y);
            for(let i=1; i<boardPath.length; i++) ctx.lineTo(boardPath[i].x, boardPath[i].y);
            ctx.lineTo(boardPath[0].x, boardPath[0].y); // Close loop
        }
        ctx.stroke();
        
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Nodes
        boardPath.forEach(pt => {
            // Base
            ctx.fillStyle = '#001100';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 30, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            
            // Icon/Color
            ctx.fillStyle = '#0f0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '20px Courier New';
            
            let char = '';
            let color = '#0f0';
            
            if (pt.type === 'start') { char = 'START'; color='#fff'; }
            else if (pt.type === 'data') { char = 'DATA'; color='#0ff'; }
            else if (pt.type === 'part') { char = 'PART'; color='#ff0'; }
            else if (pt.type === 'hazard') { char = 'BUG'; color='#f00'; }
            else if (pt.type === 'execute') { char = 'EXEC'; color='#f0f'; }
            
            ctx.fillStyle = color;
            ctx.fillText(char, pt.x, pt.y);
            
            // Glow for special types
            if (pt.type !== 'safe') {
                ctx.shadowBlur = 10;
                ctx.shadowColor = color;
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 35, 0, Math.PI*2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        });
    }
    
    function drawPlayers() {
        players.forEach((p, i) => {
            const pt = boardPath[p.pos];
            if (!pt) return;
            
            // Offset
             const offX = (i % 2) * 20 - 10;
            const offY = Math.floor(i / 2) * 20 - 10;
            
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = p.color;
            
            ctx.beginPath();
            ctx.arc(pt.x + offX, pt.y + offY, 10, 0, Math.PI*2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            
            // Current Player Indicator
            if (i === currentPlayer && turnState === 'roll') {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(pt.x + offX, pt.y + offY, 15, 0, Math.PI*2);
                ctx.stroke();
            }
        });
    }

    // --- Logic ---

    function doRoll() {
        if (turnState !== 'roll') return;
        
        turnState = 'anim';
        const p = players[currentPlayer];
        
        if (p.stuck > 0) {
            log(p.name + ' IS FROZEN (' + p.stuck + ')');
            p.stuck--;
            endTurn();
            return;
        }

        const roll = Math.floor(Math.random() * 6) + 1;
        diceVal = roll;
        document.getElementById('dice-display').innerText = roll;
        log(p.name + ' ROLLED ' + roll);
        
        // Animate move (simple jump for now)
        movePlayer(p, roll);
    }
    
    function movePlayer(p, steps) {
        let currentSteps = 0;
        
        const interval = setInterval(() => {
            p.pos = (p.pos + 1) % boardPath.length;
            currentSteps++;
            
            if (currentSteps >= steps) {
                clearInterval(interval);
                handleLand(p);
            }
        }, 200);
    }
    
    function handleLand(p) {
        const pt = boardPath[p.pos];
        log('LANDED ON: ' + pt.type.toUpperCase());
        
        if (pt.type === 'data') {
            p.data += 100;
            log('DATA MINED +100');
        } else if (pt.type === 'part') {
            if (p.parts.length < 3) {
                const part = PARTS[p.parts.length];
                p.parts.push(part);
                log('ACQUIRED PART: ' + part);
            } else {
                log('INVENTORY FULL');
            }
        } else if (pt.type === 'hazard') {
            log('HIT FIREWALL! DATA CORRUPTED.');
            p.data = Math.max(0, p.data - 50);
            p.stuck = 1;
        } else if (pt.type === 'execute') {
            // Can activate trap?
            if (p.parts.length === 3) {
                 if (!p.isBot) {
                     log('TRAP READY! EXECUTE?');
                     document.getElementById('btn-trap').disabled = false;
                     // Pause end turn until decided logic... 
                     // For simplicity, auto-trap highest score opponent
                 } 
                 // Allow trap logic here
                 attemptTrap(p);
                 return; // attemptTrap calls endTurn
            }
        }
        
        endTurn();
    }
    
    function attemptTrap(p) {
        // Find leader excluding self
        let target = null;
        let maxData = -1;
        
        players.forEach(pl => {
            if (pl.id !== p.id && pl.data > maxData) {
                maxData = pl.data;
                target = pl;
            }
        });
        
        if (target && p.parts.length === 3) {
            log('EXECUTING CYBER-TRAP ON ' + target.name + '!');
            target.data = Math.floor(target.data / 2);
            target.stuck = 2;
            p.parts = []; // Consume parts
        }
        
        document.getElementById('btn-trap').disabled = true;
        endTurn();
    }
    
    function doTrap() {
        // User clicked button manually
        attemptTrap(players[currentPlayer]);
    }

    function endTurn() {
        updateUI();
        currentPlayer = (currentPlayer + 1) % 4;
        turnState = 'roll';
        
        // Check win condition?
        if (players.some(p => p.data >= 1000)) {
            log('WINNER FOUND! REBOOTING...');
            setTimeout(startGame, 3000);
            return;
        }
        
        updateUI();
        
        // Bot Logic
        const p = players[currentPlayer];
        if (p.isBot) {
            setTimeout(doRoll, 1000);
        }
    }
    
    function updateUI() {
        // Cards
        players.forEach((p, i) => {
            const el = document.querySelectorAll('.p-panel')[i];
            el.querySelector('.p-data').innerText = 'DATA: ' + p.data;
            
            // Trap bar
            let trapStr = 'TRAP: ';
            trapStr += (p.parts.length > 0 ? '[/]' : '[ ]');
            trapStr += (p.parts.length > 1 ? '[/]' : '[ ]');
            trapStr += (p.parts.length > 2 ? '[X]' : '[ ]');
            el.querySelector('.p-trap').innerText = trapStr;
            
            if (i === currentPlayer) el.classList.add('active');
            else el.classList.remove('active');
        });
        
        // Buttons
        const p = players[currentPlayer];
        document.getElementById('btn-roll').disabled = p.isBot || turnState !== 'roll';
        // Trap button is managed in handleLand
    }
    
    function log(msg) {
        document.getElementById('status-log').innerText = msg;
    }

    init();
})();
