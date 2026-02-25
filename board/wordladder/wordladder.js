console.log("Game loaded: wordladder.js");
{ // SCOPE START

// A list of common 4-letter words for connectivity
const dictionary = [
    "ABLE", "ACID", "AGED", "ALSO", "AREA", "ARMY", "AWAY", "BABY", "BACK", "BALL", "BAND", "BANK", "BASE", "BATH", "BEAR", "BEAT", "BEER", "BELL", "BELT", "BEST", "BIRD", "BLUE", "BOAT", "BODY", "BOND", "BONE", "BOOK", "BOOM", "BORN", "BOSS", "BOTH", "BOWL", "BULK", "BURN", "BUSH", "BUSY", "CALL", "CALM", "CAME", "CAMP", "CARD", "CARE", "CASE", "CASH", "CAST", "CELL", "CHAT", "CHIP", "CITY", "CLUB", "COAL", "COAT", "CODE", "COLD", "COME", "COOK", "COOL", "COPE", "COPY", "CORE", "COST", "CREW", "CROP", "DARK", "DATE", "DEAD", "DEAL", "DEAR", "DEBT", "DEEP", "DENY", "DESK", "DIAL", "DIET", "DIRT", "DISC", "DISK", "DOES", "DONE", "DOOR", "DOSE", "DOWN", "DRAW", "DREW", "DROP", "DRUG", "DUAL", "DUKE", "DUST", "DUTY", "EARN", "EASE", "EAST", "EASY", "EDGE", "ELSE", "EVEN", "EVER", "EVIL", "EXIT", "FACE", "FACT", "FAIL", "FAIR", "FALL", "FARM", "FAST", "FATE", "FEAR", "FEED", "FEEL", "FEET", "FELL", "FELT", "FILL", "FILM", "FIND", "FINE", "FIRE", "FIRM", "FISH", "FIVE", "FLAT", "FLOW", "FOOD", "FOOT", "FORD", "FORM", "FORT", "FOUR", "FREE", "FROM", "FUEL", "FULL", "FUND", "GAIN", "GAME", "GATE", "GAVE", "GEAR", "GENE", "GIFT", "GIRL", "GIVE", "GLAD", "GOAL", "GOES", "GOLD", "GOLF", "GONE", "GOOD", "GRAY", "GREY", "GREW", "GROW", "GULF", "HAIR", "HALF", "HALL", "HAND", "HANG", "HARD", "HARM", "HATE", "HAVE", "HEAD", "HEAR", "HEAT", "HELD", "HELL", "HELP", "HERE", "HERO", "HIGH", "HILL", "HIRE", "HOLD", "HOLE", "HOLY", "HOME", "HOPE", "HOST", "HOUR", "HUGE", "HUNG", "HUNT", "HURT", "IDEA", "INCH", "INTO", "IRON", "ITEM", "JACK", "JANE", "JEAN", "JOHN", "JOIN", "JUMP", "JUST", "KEEN", "KEEP", "KEPT", "KICK", "KILL", "KIND", "KING", "KNEE", "KNEW", "KNOW", "LACK", "LADY", "LAID", "LAKE", "LAND", "LANE", "LAST", "LATE", "LEAD", "LEFT", "LESS", "LIFE", "LIFT", "LIKE", "LINE", "LINK", "LIST", "LIVE", "LOAD", "LOAN", "LOCK", "LONG", "LOOK", "LORD", "LOSE", "LOSS", "LOST", "LOVE", "LUCK", "MADE", "MAIL", "MAIN", "MAKE", "MALE", "MANY", "MARK", "MASS", "MATH", "MEAL", "MEAN", "MEAT", "MEET", "MENU", "MILE", "MILK", "MIND", "MINE", "MISS", "MODE", "MOOD", "MOON", "MORE", "MOST", "MOVE", "MUCH", "MUST", "NAME", "NAVY", "NEAR", "NECK", "NEED", "NEWS", "NEXT", "NICE", "NINE", "NONE", "NOSE", "NOTE", "OKAY", "ONCE", "ONLY", "ONTO", "OPEN", "ORAL", "OVER", "PACE", "PACK", "PAGE", "PAID", "PAIN", "PAIR", "PALM", "PARK", "PART", "PASS", "PAST", "PATH", "PEAK", "PICK", "PILE", "PINK", "PIPE", "PLAN", "PLAY", "PLOT", "PLUG", "PLUS", "POLL", "POOL", "POOR", "PORT", "POST", "POUR", "PRAY", "PURE", "PUSH", "QUIT", "RACE", "RAIL", "RAIN", "RANK", "RARE", "RATE", "READ", "REAL", "REAR", "RELY", "RENT", "REST", "RICE", "RICH", "RIDE", "RING", "RISE", "RISK", "ROAD", "ROCK", "ROLE", "ROLL", "ROOF", "ROOM", "ROOT", "ROSE", "RULE", "RUSH", "RUTH", "SAFE", "SAID", "SAKE", "SALE", "SALT", "SAME", "SAND", "SAVE", "SEAT", "SEED", "SEEK", "SEEM", "SEEN", "SELF", "SELL", "SEND", "SENT", "SEPT", "SHIP", "SHOP", "SHOT", "SHOW", "SHUT", "SICK", "SIDE", "SIGN", "SILK", "SITE", "SIZE", "SKIN", "SLIP", "SLOW", "SNOW", "SOFT", "SOIL", "SOLD", "SOLE", "SOLO", "SOME", "SONG", "SOON", "SORT", "SOUL", "SOUP", "SPOT", "STAR", "STAY", "STEP", "STOP", "SUCH", "SUIT", "SURE", "TAKE", "TALE", "TALK", "TALL", "TANK", "TAPE", "TASK", "TEAM", "TECH", "TELL", "TEND", "TERM", "TEST", "TEXT", "THAN", "THAT", "THEM", "THEN", "THIN", "THIS", "THUS", "TILL", "TIME", "TINY", "TOLD", "TOLL", "TONE", "TOOK", "TOOL", "TOUR", "TOWN", "TREE", "TRIP", "TRUE", "TUNE", "TURN", "TWIN", "TYPE", "UNIT", "UPON", "USER", "VARY", "VAST", "VERY", "VICE", "VIEW", "VOTE", "WAGE", "WAIT", "WAKE", "WALK", "WALL", "WANT", "WARD", "WARM", "WASH", "WAVE", "WAYS", "WEAK", "WEAR", "WEEK", "WELL", "WENT", "WERE", "WEST", "WHAT", "WHEN", "WHOM", "WIDE", "WIFE", "WILD", "WILL", "WIND", "WINE", "WING", "WIRE", "WISE", "WISH", "WITH", "WOOD", "WORD", "WORK", "YARD", "YEAR", "ZERO", "ZONE", "LATE", "GATE", "HATE", "FATE", "MATE", "DATE", "RATE", "RATS", "CATS", "COTS", "DOTS", "DOGS", "LOGS", "LUGS", "BUGS", "BIGS", "PIGS", "DIGS", "DOGS", "DOES", "TOES", "TOPS", "TOYS", "BOYS", "BAYS", "SAYS", "PAYS"
];

// Ensure unique
const uniqueDictionary = [...new Set(dictionary)];

// Game State
let startWord = "";
let endWord = "";
let currentLadder = []; // Array of strings
let stepsContainer = null;
let messageArea = null;
let winModal = null;

// Init
function initGame() {
    if (!document.getElementById('steps-container')) return;

    stepsContainer = document.getElementById('steps-container');
    messageArea = document.getElementById('message-area');
    winModal = document.getElementById('win-message');
    
    // Attach headers
    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) undoBtn.onclick = () => {
        if (currentLadder.length > 1) {
            currentLadder.pop();
            renderBoard();
            messageArea.innerText = "";
        }
    };

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.onclick = () => {
        currentLadder = [startWord];
        renderBoard();
        messageArea.innerText = "";
    };

    const hintBtn = document.getElementById('hint-btn');
    if (hintBtn) hintBtn.onclick = () => {
        let current = currentLadder[currentLadder.length-1];
        let bestNext = findNextStep(current, endWord);
        if (bestNext) {
            showMessage(`Hint: Try "${bestNext}"`);
        } else {
            showMessage("No clear path found!");
        }
    };

    const newGameBtn = document.getElementById('new-game-btn');
    if (newGameBtn) newGameBtn.onclick = initGame;
    
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) playAgainBtn.onclick = initGame;

    if (messageArea) {
        messageArea.innerText = "";
        messageArea.classList.remove('success');
    }
    if (winModal) winModal.classList.add('hidden');
    
    // Generate Level
    let pair = generateLevel();
    if (!pair) {
        startWord = "COLD";
        endWord = "WARM";
    } else {
        startWord = pair.start;
        endWord = pair.end;
    }
    
    currentLadder = [startWord]; // Start is step 0
    
    renderBoard();
}

function generateLevel() {
    let attempts = 0;
    while(attempts < 50) {
        let start = uniqueDictionary[Math.floor(Math.random() * uniqueDictionary.length)];
        
        // BFS to find words at distance ~4-6
        let pathValues = getWordsAtDistance(start, 4, 7); 
        
        if (pathValues.length > 0) {
            let end = pathValues[Math.floor(Math.random() * pathValues.length)];
            return { start, end };
        }
        attempts++;
    }
    return null;
}

function getWordsAtDistance(start, minInfo, maxInfo) {
    let queue = [{ word: start, dist: 0 }];
    let visited = new Set([start]);
    let candidates = [];
    
    let head = 0;
    while(head < queue.length) {
        let { word, dist } = queue[head++];
        
        if (dist >= minInfo && dist <= maxInfo) {
            candidates.push(word);
        }
        
        if (dist >= maxInfo) continue;
        
        // Find neighbors
        for (let w of uniqueDictionary) {
            if (!visited.has(w) && isOneOff(word, w)) {
                visited.add(w);
                queue.push({ word: w, dist: dist + 1 });
            }
        }
    }
    return candidates;
}

function isOneOff(a, b) {
    let diff = 0;
    for (let i = 0; i < 4; i++) {
        if (a[i] !== b[i]) diff++;
    }
    return diff === 1;
}

function renderBoard() {
    if (!document.getElementById('start-word')) return;
    document.getElementById('start-word').innerText = startWord;
    document.getElementById('end-word').innerText = endWord;
    
    if (stepsContainer) stepsContainer.innerHTML = '';
    
    for (let i = 1; i < currentLadder.length; i++) {
        const div = document.createElement('div');
        div.classList.add('word-card', 'completed-step');
        div.innerText = currentLadder[i];
        if (stepsContainer) stepsContainer.appendChild(div);
    }
    
    if (currentLadder[currentLadder.length-1] !== endWord) {
        createInputRow(currentLadder[currentLadder.length-1]);
    } else {
        gameWin();
    }
}

function createInputRow(prevWord) {
    const row = document.createElement('div');
    row.classList.add('ladder-step', 'active');
    
    for (let i = 0; i < 4; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.classList.add('letter-input');
        input.maxLength = 1;
        input.value = prevWord[i];
        input.dataset.index = i;
        
        input.addEventListener('keyup', (e) => handleKeyUp(e, row));
        input.addEventListener('keydown', (e) => handleKeyDown(e, row));
        input.addEventListener('focus', (e) => e.target.select());
        
        row.appendChild(input);
    }
    
    const submitBtn = document.createElement('button');
    submitBtn.innerText = 'Go';
    submitBtn.classList.add('action-btn', 'mini-btn'); 
    submitBtn.style.marginLeft = '10px';
    submitBtn.onclick = () => submitStep(row);
    row.appendChild(submitBtn);

    if (stepsContainer) stepsContainer.appendChild(row);
    
    setTimeout(() => {
        const firstInput = row.querySelector('input');
        if(firstInput) firstInput.focus();
    }, 100);
}

function handleKeyUp(e, row) {
    const inputs = row.querySelectorAll('input');
    const index = parseInt(e.target.dataset.index);
    
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Shift', 'Control', 'Alt'].includes(e.key)) return;

    e.target.value = e.target.value.toUpperCase();
    
    if (e.target.value.length === 1 && index < 3) {
        inputs[index + 1].focus();
    }
}

function handleKeyDown(e, row) {
    const inputs = row.querySelectorAll('input');
    const index = parseInt(e.target.dataset.index);

    if (e.key === 'Enter') {
        submitStep(row);
        return;
    }
    
    if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        e.preventDefault();
        inputs[index - 1].focus();
    }
    
    if (e.key === 'ArrowRight' && index < 3) {
        inputs[index + 1].focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
        inputs[index - 1].focus();
    }
}

function submitStep(row) {
    const inputs = row.querySelectorAll('input');
    let newWord = "";
    for(let inp of inputs) newWord += inp.value;
    newWord = newWord.toUpperCase();
    
    if (newWord.length !== 4) {
        showMessage("Word must be 4 letters", true);
        shake(row);
        return;
    }
    
    const prevWord = currentLadder[currentLadder.length-1];
    
    if (!isOneOff(prevWord, newWord)) {
        if (newWord === prevWord) {
            showMessage("Change one letter!", true);
        } else {
            showMessage("Must change exactly one letter", true);
        }
        shake(row);
        return;
    }
    
    if (!uniqueDictionary.includes(newWord) && newWord !== endWord) { 
        showMessage("Not in dictionary!", true);
        shake(row);
        return;
    }
    
    currentLadder.push(newWord);
    if (messageArea) messageArea.innerText = "";
    renderBoard();
    
    setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
    }, 100);
}

function showMessage(msg, isError) {
    if (!messageArea) return;
    messageArea.innerText = msg;
    messageArea.className = 'message-area ' + (isError ? '' : 'success');
}

function shake(el) {
    el.classList.add('error');
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'shake 0.4s';
}

function gameWin() {
    if (messageArea) {
        messageArea.innerText = "COMPLETE!";
        messageArea.classList.add('success');
    }
    if (document.getElementById('step-count')) document.getElementById('step-count').innerText = currentLadder.length - 1;
    if (winModal) winModal.classList.remove('hidden');
}

function findNextStep(current, target) {
    let queue = [{ word: current, path: [] }];
    let visited = new Set([current]);
    
    let head = 0;
    while(head < queue.length) {
        let { word, path } = queue[head++];
        
        if (word === target) {
            return path[0];
        }
        
        for (let w of uniqueDictionary) {
            if (!visited.has(w) && isOneOff(word, w)) {
                visited.add(w);
                let newPath = [...path, w];
                queue.push({ word: w, path: newPath });
            }
        }
    }
    return null;
}

// Start
initGame();

} // SCOPE END
