/*
 * CODE LADDER (Word Ladder)
 * Theme: Hacking Terminal
 * Logic: Change 1 letter to bridge Start to End
 */

(function() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Dictionary (4-letter words)
    const DICT = [
        'ABLE', 'ACID', 'AGED', 'ALSO', 'AREA', 'ARMY', 'ATOM', 'AWAY', 'AXIS', 
        'BABY', 'BACK', 'BALL', 'BAND', 'BANK', 'BASE', 'BATH', 'BEAM', 'BEAN', 'BEAR', 'BEAT', 'BELT', 'BEST', 'BIRD', 'BLUE', 'BOAT', 'BODY', 'BOND', 'BONE', 'BOOK', 'BOOM', 'BORN', 'BOSS', 'BOTH', 'BOWL', 'BULK', 'BURN', 'BUSH', 'BUSY', 'BYTE',
        'CALL', 'CALM', 'CAMP', 'CARD', 'CARE', 'CASE', 'CASH', 'CAST', 'CELL', 'CHAT', 'CHIP', 'CITY', 'CLUB', 'COAL', 'COAT', 'CODE', 'COLD', 'COME', 'COOK', 'COOL', 'CORE', 'COST', 'CREW', 'CROP', 
        'DARK', 'DATA', 'DATE', 'DEAD', 'DEAL', 'DEAR', 'DEBT', 'DEEP', 'DEMO', 'DESK', 'DIAL', 'DIET', 'DISK', 'DOOR', 'DOWN', 'DRAW', 'DROP', 'DRUG', 'DUAL', 'DUKE', 'DUST', 'DUTY',
        'EARN', 'EAST', 'EASY', 'EDGE', 'EDIT', 'ELSE', 'EVEN', 'EVER', 'EVIL', 'EXIT',
        'FACE', 'FACT', 'FAIL', 'FAIR', 'FALL', 'FARM', 'FAST', 'FATE', 'FEAR', 'FEED', 'FEEL', 'FEET', 'FILE', 'FILL', 'FILM', 'FIND', 'FINE', 'FIRE', 'FIRM', 'FISH', 'FIVE', 'FLAT', 'FLOW', 'FOOD', 'FOOT', 'FORM', 'FORT', 'FOUR', 'FREE', 'FROM', 'FUEL', 'FULL', 'FUND', 'FUSE',
        'GAIN', 'GAME', 'GATE', 'GEAR', 'GIFT', 'GIRL', 'GIVE', 'GLAD', 'GOAL', 'GOLD', 'GONE', 'GOOD', 'GRAY', 'GRID', 'GROW', 
        'HAIR', 'HALF', 'HALL', 'HAND', 'HARD', 'HARM', 'HATE', 'HAVE', 'HEAD', 'HEAR', 'HEAT', 'HELD', 'HELL', 'HELP', 'HERE', 'HERO', 'HIGH', 'HILL', 'HOLD', 'HOLE', 'HOME', 'HOPE', 'HOST', 'HOUR', 'HUGE', 'HUNT',
        'IDEA', 'ICON', 'INCH', 'INFO', 'IRON', 'ITEM', 
        'JACK', 'JAVA', 'JOIN', 'JUMP', 'JUST',
        'KEEP', 'KILL', 'KIND', 'KING', 'KNEE', 'KNOW',
        'LACK', 'LADY', 'LAKE', 'LAND', 'LANE', 'LAST', 'LATE', 'LEAD', 'LEFT', 'LESS', 'LIFE', 'LIFT', 'LIKE', 'LINE', 'LINK', 'LIST', 'LIVE', 'LOAD', 'LOCK', 'LONG', 'LOOK', 'LORD', 'LOSE', 'LOSS', 'LOST', 'LOVE', 'LUCK', 
        'MADE', 'MAIL', 'MAIN', 'MAKE', 'MALE', 'MANY', 'MARK', 'MASS', 'MATH', 'MEAL', 'MEAN', 'MEAT', 'MEET', 'MENU', 'MESH', 'MILE', 'MILK', 'MIND', 'MINE', 'MISS', 'MODE', 'MOOD', 'MOON', 'MORE', 'MOST', 'MOVE', 'MUCH', 'MUST', 
        'NAME', 'NEAR', 'NECK', 'NEED', 'NEWS', 'NEXT', 'NICE', 'NODE', 'NONE', 'NOSE', 'NOTE', 'NULL',
        'OKAY', 'ONCE', 'ONLY', 'OPEN', 'OVER',
        'PACE', 'PACK', 'PAGE', 'PAID', 'PAIN', 'PAIR', 'PALM', 'PARK', 'PART', 'PASS', 'PAST', 'PATH', 'PEAK', 'PICK', 'PILE', 'PING', 'PIPE', 'PLAN', 'PLAY', 'PLOT', 'PLUG', 'PLUS', 'POLL', 'POOL', 'POOR', 'PORT', 'POST', 'PUSH',
        'QUIZ', 'QUIT',
        'RACE', 'RAIL', 'RAIN', 'RANK', 'RARE', 'RATE', 'READ', 'REAL', 'REAR', 'RELY', 'REST', 'RICH', 'RIDE', 'RING', 'RISE', 'RISK', 'ROAD', 'ROCK', 'ROLE', 'ROLL', 'ROOF', 'ROOM', 'ROOT', 'ROSE', 'RULE', 'RUSH', 'RUST',
        'SAFE', 'SALE', 'SALT', 'SAME', 'SAND', 'SAVE', 'SCAN', 'SEAT', 'SEED', 'SEEK', 'SEEM', 'SEEN', 'SELF', 'SELL', 'SEND', 'SENT', 'SHIP', 'SHOP', 'SHOT', 'SHOW', 'SHUT', 'SIDE', 'SIGN', 'SITE', 'SIZE', 'SKIN', 'SLIP', 'SLOW', 'SOFT', 'SOIL', 'SOLD', 'SOLE', 'SOME', 'SONG', 'SOON', 'SORT', 'SOUL', 'SPOT', 'STAR', 'STAY', 'STEP', 'STOP', 'SUCH', 'SUIT', 'SURE', 'SYNC',
        'TAKE', 'TALK', 'TALL', 'TANK', 'TAPE', 'TASK', 'TEAM', 'TECH', 'TELL', 'TEND', 'TERM', 'TEST', 'TEXT', 'THAT', 'THEN', 'THIS', 'TIME', 'TINY', 'TOOL', 'TOUR', 'TOWN', 'TREE', 'TRIP', 'TRUE', 'TURN', 'TYPE',
        'UNIT', 'USER',
        'VERY', 'VIEW', 'VOID', 'VOTE',
        'WAIT', 'WAKE', 'WALK', 'WALL', 'WANT', 'WARM', 'WASH', 'WAVE', 'WEAR', 'WEEK', 'WELL', 'WENT', 'WEST', 'WHAT', 'WHEN', 'WIDE', 'WILD', 'WILL', 'WIND', 'WIRE', 'WISE', 'WISH', 'WITH', 'WORD', 'WORK',
        'YEAR', 'ZERO', 'ZONE', 'ZOOM'
    ];
    
    // State
    const WORD_LEN = 4;
    let startWord = '';
    let targetWord = '';
    let ladder = []; // { word: 'CODE', status: 'ok' }
    let currentInput = '';
    let message = 'INITIATE HACK...';
    let gameState = 'playing'; // playing, win
    let cursorVisible = true;
    
    // Layout
    const FONT_SIZE = 40;
    
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
        
        window.addEventListener('keydown', handleKey);
        setInterval(() => { cursorVisible = !cursorVisible; }, 500);
    }
    
    function handleResize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    function startGame() {
        if (window.GameUI) window.GameUI.hideStartScreen();
        
        // Pick pair
        // Simple random pick that definitely has path is hard without graph.
        // We pick two words and hope. Or pick pre-defined pairs.
        // For 'Hacker' theme, 'CODE' -> 'HACK' is classic.
        // CODE -> COKE -> CAKE -> HAKE -> HACK
        
        const pairs = [
            ['COLD', 'WARM'], ['HARD', 'EASY'], ['LOVE', 'HATE'], 
            ['HEAD', 'TAIL'], ['EAST', 'WEST'], ['DARK', 'DATA'],
            ['FIND', 'LOSE'], ['GIVE', 'TAKE'], ['WOOD', 'FIRE'],
            ['SLOW', 'FAST'], ['RICH', 'POOR'], ['WILD', 'ZOOM']
        ];
        
        const p = pairs[Math.floor(Math.random() * pairs.length)];
        startWord = p[0];
        targetWord = p[1];
        ladder = [{ word: startWord, status: 'locked' }];
        currentInput = '';
        gameState = 'playing';
        message = BRIDGE SEQUENCE:  >> ;
    }
    
    function handleKey(e) {
        if (gameState !== 'playing') {
            if (e.key === 'Enter') startGame();
            return;
        }
        
        if (e.key === 'Backspace') {
            currentInput = currentInput.slice(0, -1);
        } else if (e.key === 'Enter') {
            submitWord();
        } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
            if (currentInput.length < WORD_LEN) {
                currentInput += e.key.toUpperCase();
            }
        }
    }
    
    function submitWord() {
        if (currentInput.length !== WORD_LEN) {
            message = 'ERROR: INVALID LENGTH';
            return;
        }
        
        if (!DICT.includes(currentInput) && currentInput !== targetWord) { // Allow target even if missing from dict
             message = 'ERROR: UNKNOWN WORD';
             return;
        }
        
        // Check logic
        const lastWord = ladder[ladder.length - 1].word;
        if (!isOneOff(lastWord, currentInput)) {
            message = 'ERROR: MUST CHANGE 1 CHAR';
            return;
        }
        
        // Success
        ladder.push({ word: currentInput, status: 'ok' });
        message = 'SEQUENCE ACCEPTED';
        
        if (currentInput === targetWord) {
            gameState = 'win';
            message = 'SYSTEM CRACKED. ACCESS GRANTED.';
        }
        
        currentInput = '';
    }
    
    function isOneOff(a, b) {
        let diff = 0;
        for(let i=0; i<WORD_LEN; i++) {
            if (a[i] !== b[i]) diff++;
        }
        return diff === 1;
    }
    
    function loop() {
        // Render
        ctx.fillStyle = '#001100';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const cx = canvas.width / 2;
        const cy = 100;
        
        // Matrix Rain BG (Simplified)
        ctx.fillStyle = '#0f0';
        ctx.globalAlpha = 0.1;
        // ... (Skipping full expensive rain for now, just static noise)
        for(let i=0; i<50; i++) {
            ctx.fillText(String.fromCharCode(0x30A0 + Math.random()*96), Math.random()*canvas.width, Math.random()*canvas.height);
        }
        ctx.globalAlpha = 1.0;
        
        // Target
        ctx.textAlign = 'center';
        ctx.font = '24px Courier New';
        ctx.fillStyle = '#0a0';
        ctx.fillText(TARGET: , cx, 50);
        
        ctx.font = '20px Courier New';
        ctx.fillStyle = gameState === 'win' ? '#0ff' : '#0f0';
        ctx.fillText(message, cx, 80);
        
        // Ladder
        let y = 150;
        ladder.forEach((item, i) => {
            // Connector
            if (i > 0) {
                ctx.beginPath();
                ctx.moveTo(cx, y - 40);
                ctx.lineTo(cx, y - 25);
                ctx.strokeStyle = '#050';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // Box
            const w = 200;
            const h = 50;
            ctx.fillStyle = '#000';
            ctx.fillRect(cx - w/2, y - h/2, w, h);
            ctx.strokeStyle = item.status === 'locked' ? '#555' : '#0f0';
            ctx.strokeRect(cx - w/2, y - h/2, w, h);
            
            // Text
            ctx.font = '30px Courier New';
            ctx.fillStyle = item.status === 'locked' ? '#777' : '#0f0';
            ctx.fillText(item.word, cx, y + 10);
            
            y += 70;
        });
        
        // Input Box
        if (gameState === 'playing') {
             // Connector
            ctx.beginPath();
            ctx.moveTo(cx, y - 40);
            ctx.lineTo(cx, y - 25);
            ctx.strokeStyle = '#0f0';
            ctx.lineWidth = 2;
            ctx.stroke();

            const w = 200;
            const h = 50;
            ctx.fillStyle = '#002200';
            ctx.fillRect(cx - w/2, y - h/2, w, h);
            ctx.strokeStyle = '#0f0';
            ctx.lineWidth = 2;
            ctx.strokeRect(cx - w/2, y - h/2, w, h);
            
            ctx.font = '30px Courier New';
            ctx.fillStyle = '#fff';
            let displayTxt = currentInput + (cursorVisible ? '_' : '');
            ctx.fillText(displayTxt, cx, y + 10);
            
            // Hint text
            ctx.font = '14px Courier New';
            ctx.fillStyle = '#0a0';
            ctx.fillText('(TYPE WORD + ENTER)', cx, y + 50);
        } else {
             ctx.font = '20px Courier New';
             ctx.fillStyle = '#0ff';
             ctx.fillText('PRESS ENTER TO REBOOT', cx, y + 20);
        }
    }

    init();
})();
