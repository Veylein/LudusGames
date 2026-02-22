// Clue/Cluedo Game Logic - 24x25 Grid with BFS AI

// Characters - Initial Positions matching standard board roughly (row, col) - using 24x25 grid
const CHARACTERS = [
    { name: "Miss Scarlet", color: "var(--clue-red)", id: "scarlet", start: [0, 16], tokenColor: "#ff0000" },
    { name: "Col. Mustard", color: "var(--clue-yellow)", id: "mustard", start: [7, 23], tokenColor: "#FFD700" },
    { name: "Mrs. White", color: "var(--clue-white)", id: "white", start: [24, 9], tokenColor: "#FFFFFF" },
    { name: "Mr. Green", color: "var(--clue-green)", id: "green", start: [24, 14], tokenColor: "#008000" },
    { name: "Mrs. Peacock", color: "var(--clue-blue)", id: "peacock", start: [18, 0], tokenColor: "#0000FF" },
    { name: "Prof. Plum", color: "var(--clue-purple)", id: "plum", start: [5, 0], tokenColor: "#800080" }
];

const WEAPONS = [
    "Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench"
];

const ROOMS = [
    "Study", "Hall", "Lounge",
    "Library", "Billiard Room", "Dining Room",
    "Conservatory", "Ballroom", "Kitchen"
];

// Room Centers/Entrance Mapping - Where players "snap" to when entering a room
// Based on the grid template below
const ROOM_MAP = {
    "Kitchen": { r: 21, c: 21, doors: [[19, 19]] }, 
    "Ballroom": { r: 20, c: 12, doors: [[19, 9], [19, 14], [17, 8], [17, 15]] },
    "Conservatory": { r: 21, c: 3, doors: [[19, 5]] },
    "Billiard Room": { r: 14, c: 3, doors: [[12, 1], [15, 6]] },
    "Library": { r: 8, c: 4, doors: [[10, 3], [6, 7]] },
    "Study": { r: 3, c: 4, doors: [[6, 4]] },
    "Hall": { r: 4, c: 12, doors: [[4, 7], [7, 11], [7, 12]] },
    "Lounge": { r: 3, c: 20, doors: [[6, 17]] },
    "Dining Room": { r: 12, c: 19, doors: [[9, 17], [12, 16]] }
};

/*
Grid Legend:
0: Wall/Void
1: Hallway
2: Room Floor
3: Door (connected to Room)
*/

// Approximated 24x25 board layout (Rows 0-24)
const BOARD_TEMPLATE = [
    // Row 0
    "000000000100001000000000",
    "000002200122221002220000",
    "002222200222222002222220",
    "002222200222222002222220",
    "002222200222222002222220",
    "002222200222222000030000",
    "010030000030030000101000", // Row 6 - Library door fixed
    "012222200111111002222220",
    "012222200122221002222220",
    "002222200022220003222220", // Row 9
    "002222230022220000000000",
    "000000000022220000000000",
    "012222230000000032222220",
    "002222200000000002222220",
    "002222200000000002222220",
    "002222230100000102222220", // Row 15
    "000000000122221000000000",
    "000000003122221300000000", // Entrance to Ballroom, Conservatory
    "010000000022220000000000",
    "002222230030030000300000",
    "002222200222222001000000",
    "002222200222222002222220",
    "002222200222222002222220",
    "002222200222222002222220",
    "000000000100001000000000" // Row 24 - Start points at bottom
];

class ClueGame {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.solution = {};
        this.turnPhase = "roll"; // roll, move, action, end
        this.diceValue = 0;
        this.boardGrid = []; // 2D array of cell elements (DOM)
        this.cells = []; // 2D array of logical types
        
        this.init();
    }

    init() {
        this.createBoard();
        
        // Setup Characters (Human is Scarlet)
        this.addPlayer(0, "scarlet", true);
        this.addPlayer(1, "mustard", false);
        this.addPlayer(2, "white", false);
        this.addPlayer(3, "green", false);
        this.addPlayer(4, "peacock", false);
        this.addPlayer(5, "plum", false);

        this.dealCards();
        this.setupEventListeners();
        
        this.log("Welcome to Clue. You are Miss Scarlet (Red).");
        this.log("Roll the dice to begin.");
        this.updateUI();
    }

    createBoard() {
        const boardEl = document.getElementById("game-board");
        boardEl.innerHTML = "";
        this.boardGrid = [];
        this.cells = [];

        // Parse template
        for (let r = 0; r < 25; r++) {
            const rowStr = BOARD_TEMPLATE[r]; // Using fallback if string missing logic omitted for brevity
            const domRow = [];
            const logicalRow = [];
            
            for (let c = 0; c < 24; c++) { // string is length 24
                const typeChar = rowStr ? rowStr[c] : "0";
                const cell = document.createElement("div");
                cell.dataset.r = r;
                cell.dataset.c = c;
                
                let logicalType = "wall";
                
                if (typeChar === "0") {
                    cell.className = "blocked-cell";
                    logicalType = "wall";
                } else if (typeChar === "1") {
                    cell.className = "corridor-cell";
                    logicalType = "hall";
                } else if (typeChar === "2") {
                    cell.className = "room-cell";
                    logicalType = "room";
                    const roomName = this.getRoomName(r, c);
                    if (roomName) {
                        cell.classList.add(`room-${roomName.split(' ')[0].toLowerCase()}`);
                        cell.dataset.room = roomName;
                    }
                } else if (typeChar === "3") {
                    cell.className = "door-cell";
                    logicalType = "door";
                }
                
                // Add room labels roughly in center of rooms
                 const roomName = this.getRoomName(r, c);
                 if (roomName) {
                     const center = ROOM_MAP[roomName];
                     if (center && center.r === r && center.c === c) {
                         cell.textContent = roomName;
                         cell.classList.add("room-label-cell");
                     }
                 }

                cell.onclick = () => this.handleCellClick(r, c);
                
                const tokenCont = document.createElement("div");
                tokenCont.className = "token-container";
                tokenCont.style.position = "relative";
                tokenCont.style.width = "100%";
                tokenCont.style.height = "100%";
                tokenCont.style.pointerEvents = "none"; 
                cell.appendChild(tokenCont);

                boardEl.appendChild(cell);
                domRow.push(cell);
                logicalRow.push(logicalType);
            }
            this.boardGrid.push(domRow);
            this.cells.push(logicalRow);
        }
    }

    getRoomName(r, c) {
        if (r <= 6 && c <= 6) return "Study";
        if (r <= 7 && c >= 9 && c <= 15) return "Hall";
        if (r <= 6 && c >= 17) return "Lounge";
        if (r >= 6 && r <= 10 && c <= 6) return "Library";
        if (r >= 12 && r <= 16 && c <= 6) return "Billiard Room";
        if (r >= 19 && c <= 6) return "Conservatory";
        if (r >= 18 && c >= 9 && c <= 15) return "Ballroom";
        if (r >= 19 && c >= 18) return "Kitchen";
        if (r >= 9 && r <= 15 && c >= 17) return "Dining Room";
        return null;
    }

    addPlayer(index, charId, isHuman) {
        const charData = CHARACTERS.find(c => c.id === charId);
        const player = {
            id: charId,
            name: charData.name,
            color: charData.color,
            x: charData.start[1], 
            y: charData.start[0],
            isHuman: isHuman,
            hand: [],
            notebook: [], 
            active: true,
            possibleSolutions: {
                suspects: [...CHARACTERS.map(c=>c.name)],
                weapons: [...WEAPONS],
                rooms: [...ROOMS]
            }
        };
        this.players.push(player);
        this.renderPlayerToken(player);
    }
    
    drawRandom(array) {
        const idx = Math.floor(Math.random() * array.length);
        return array.splice(idx, 1)[0];
    }
    
    dealCards() {
        let suspects = [...CHARACTERS.map(c => c.name)];
        let weapons = [...WEAPONS];
        let rooms = [...ROOMS];

        const sSuspect = this.drawRandom(suspects);
        const sWeapon = this.drawRandom(weapons);
        const sRoom = this.drawRandom(rooms);
        this.solution = { suspect: sSuspect, weapon: sWeapon, room: sRoom };

        let deck = [...suspects, ...weapons, ...rooms];
        deck.sort(() => Math.random() - 0.5);

        let pIndex = 0;
        while (deck.length > 0) {
            const card = deck.pop();
            this.players[pIndex].hand.push(card);
            this.markCardImpossible(this.players[pIndex], card);
            pIndex = (pIndex + 1) % this.players.length;
        }
        
        this.renderHand();
    }
    
    markCardImpossible(player, cardName) {
        player.possibleSolutions.suspects = player.possibleSolutions.suspects.filter(s => s !== cardName);
        player.possibleSolutions.weapons = player.possibleSolutions.weapons.filter(w => w !== cardName);
        player.possibleSolutions.rooms = player.possibleSolutions.rooms.filter(r => r !== cardName);
        
        if (!player.notebook.includes(cardName)) {
            player.notebook.push(cardName);
        }
    }

    renderPlayerToken(player) {
         document.querySelectorAll(`.token-${player.id}`).forEach(el => el.remove());
         
         const cell = this.boardGrid[player.y][player.x];
         if(!cell) return;
         
         const container = cell.querySelector(".token-container");
         const token = document.createElement("div");
         token.className = `player-token token-${player.id}`;
         token.style.backgroundColor = player.color;
         token.title = player.name;
         container.appendChild(token);
    }

    renderHand() {
        const container = document.getElementById("hand-container");
        container.innerHTML = "";
        const human = this.players.find(p => p.isHuman);
        human.hand.forEach(card => {
             const div = document.createElement("div");
             div.className = "card-item";
             div.textContent = card;
             container.appendChild(div);
        });
    }

    startTurn() {
        const player = this.players[this.currentPlayerIndex];
        document.getElementById("turn-indicator").textContent = `${player.name}`;
        
        if (!player.active) {
            this.endTurn();
            return;
        }

        this.diceValue = 0;
        this.turnPhase = "roll";

        if (player.isHuman) {
             document.getElementById("btn-roll").disabled = false;
             document.getElementById("btn-end-turn").disabled = true;
             document.getElementById("btn-suggest").disabled = true;
             document.getElementById("btn-accuse").disabled = false;
             this.log(`> Your turn.`);
        } else {
             setTimeout(() => this.aiTurn(), 800);
        }
    }

    rollDice() {
        if (this.turnPhase !== "roll") return;
        
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        this.diceValue = d1 + d2;
        
        document.getElementById("dice-display").textContent = `🎲 ${d1 + d2} (${d1},${d2})`;
        this.log(`Rolled ${this.diceValue}.`);
        
        this.turnPhase = "move";
        document.getElementById("btn-roll").disabled = true;
        
        if (this.players[this.currentPlayerIndex].isHuman) {
            this.highlightBFS(this.players[this.currentPlayerIndex], this.diceValue);
        }
    }

    highlightBFS(player, moves) {
        document.querySelectorAll(".highlight").forEach(el => el.classList.remove("highlight"));
        document.querySelectorAll(".highlight-secret").forEach(el => el.classList.remove("highlight-secret"));
        
        const queue = [{r: player.y, c: player.x, dist: 0}];
        const visited = new Set();
        visited.add(`${player.y},${player.x}`);
        
        const reachable = []; 
        const dirs = [[-1,0], [1,0], [0,-1], [0,1]];

        while (queue.length > 0) {
            const current = queue.shift();
            
            if (current.dist < moves) {
                dirs.forEach(([dr, dc]) => {
                    const nr = current.r + dr;
                    const nc = current.c + dc;
                    const key = `${nr},${nc}`;
                    
                    if (nr >= 0 && nr < 25 && nc >= 0 && nc < 24 && !visited.has(key)) {
                        const type = this.cells[nr][nc];
                        
                        let canEnter = false;
                        // Logic: Walk freely in Halls (1) logic. Doors (3) are transitions.
                        if (type === "hall" || type === "door" || (type === "start")) {
                            canEnter = true;
                        }

                        if (canEnter) {
                            visited.add(key);
                            reachable.push({r: nr, c: nc});
                            queue.push({r: nr, c: nc, dist: current.dist + 1});
                        }
                    }
                });
            }
        }
        
        // Secret Passages
        const currentRoom = this.getRoomName(player.y, player.x);
        if (currentRoom) {
             let destRoom = null;
             if (currentRoom === "Study") destRoom = "Kitchen";
             if (currentRoom === "Kitchen") destRoom = "Study";
             if (currentRoom === "Lounge") destRoom = "Conservatory";
             if (currentRoom === "Conservatory") destRoom = "Lounge";
             
             if (destRoom) {
                 const center = ROOM_MAP[destRoom];
                 const cell = this.boardGrid[center.r][center.c];
                 cell.classList.add("highlight");
                 cell.dataset.isSecret = "true";
             }
             
             // Also, if in a Room, you can exit to any of its doors "freely" usually as step 1?
             // Simplification: BFS doesn't work well starting FROM inside a room unless we map the room nodes to doors.
             // If starting in a room, add its doors to the Queue at cost 1.
             if (current.dist === 0) { // Should adjust BFS init logic but simpler here:
                const mapData = ROOM_MAP[currentRoom];
                if (mapData && mapData.r === player.y && mapData.c === player.x) {
                    mapData.doors.forEach(d => {
                        // All doors of current room are reachable at cost 0 or 1
                        // Let's add them to reachable for manual selection
                         const cell = this.boardGrid[d[0]][d[1]];
                         cell.classList.add("highlight");
                         // Re-run BFS from each door? Too complex for this snippet.
                         // Just allow moving to doors.
                    });
                }
             }
        }

        reachable.forEach(pos => {
            const cell = this.boardGrid[pos.r][pos.c];
            cell.classList.add("highlight");
            if (this.cells[pos.r][pos.c] === "door") {
                cell.dataset.isDoor = "true";
            }
        });
        
        // Fix for "leaving room": If in room, allow clicking doors
        const startRoom = this.getRoomName(player.y, player.x);
        if (startRoom) {
            const mapData = ROOM_MAP[startRoom];
            if (mapData && mapData.r === player.y && mapData.c === player.x) {
                mapData.doors.forEach(d => {
                    const c = this.boardGrid[d[0]][d[1]];
                    c.classList.add("highlight");
                });
            }
        }
    }

    handleCellClick(r, c) {
        if (this.players[this.currentPlayerIndex].isHuman === false) return;
        if (this.turnPhase !== "move") return;
        const cell = this.boardGrid[r][c];
        if (!cell.classList.contains("highlight")) return;

        const player = this.players[this.currentPlayerIndex];
        
        if (cell.dataset.isSecret === "true") {
             this.log("Used Secret Passage!");
             this.movePlayerTo(player, r, c); 
             this.finishMove(player);
        } else if (cell.dataset.isDoor === "true") {
             // Entering a room
             let targetRoomCenter = null;
             // Check which room this door enters
            for (const [name, data] of Object.entries(ROOM_MAP)) {
                if (data.doors.some(d => d[0] === r && d[1] === c)) {
                    targetRoomCenter = data;
                    break;
                }
            }

            if (targetRoomCenter) {
                this.movePlayerTo(player, targetRoomCenter.r, targetRoomCenter.c);
                this.finishMove(player);
            } else {
                 // Just exit to door tile (leaving)?
                 this.movePlayerTo(player, r, c);
                 // If leaving, we are now in hall (door). Usually you can continue moving but for simplicity stop.
                 this.currentMovesLeft = 0;
                 this.enableActionButtons(false);
                 document.getElementById("btn-end-turn").disabled = false;
            }
        } else {
             // Hallway
             this.movePlayerTo(player, r, c);
             document.getElementById("btn-end-turn").disabled = false;
        }
        
        // Clean up highlights
        document.querySelectorAll(".highlight").forEach(el => el.classList.remove("highlight"));
        document.activeElement.blur();
    }

    movePlayerTo(player, r, c) {
        player.y = r;
        player.x = c;
        this.renderPlayerToken(player);
    }
    
    finishMove(player) {
         const room = this.getRoomName(player.y, player.x);
         if (room) {
             this.log(`Entered ${room}.`);
             this.enableInteraction(room);
         } else {
             document.getElementById("btn-end-turn").disabled = false;
         }
    }

    enableInteraction(roomName) {
        document.getElementById("btn-suggest").disabled = false;
        document.getElementById("btn-end-turn").disabled = false;
        
        const roomSel = document.getElementById("select-room");
        roomSel.innerHTML = `<option>${roomName}</option>`;
        roomSel.value = roomName;
    }
    
    enableActionButtons(inRoom) {
        if (!inRoom) {
            document.getElementById("btn-suggest").disabled = true;
        }
    }

    updateUI() {
        this.renderNotebook();
        this.renderHand();
    }
    
    aiTurn() {
        const ai = this.players[this.currentPlayerIndex];
        
        const d = Math.floor(Math.random()*11)+2;
        this.log(`${ai.name} rolled ${d}.`);
        
        if (this.canAccuse(ai)) {
            const sol = ai.possibleSolutions;
            this.makeAccusation(ai, sol.suspects[0], sol.weapons[0], sol.rooms[0]);
            return;
        }
        
        const targetRoomName = ai.possibleSolutions.rooms[Math.floor(Math.random() * ai.possibleSolutions.rooms.length)];
        const roomData = ROOM_MAP[targetRoomName];

        if (roomData) {
             ai.y = roomData.r;
             ai.x = roomData.c;
             this.renderPlayerToken(ai);
             this.log(`${ai.name} enters ${targetRoomName}.`);

             // Prefer unknown cards for suggestion
            let sus = ai.possibleSolutions.suspects[Math.floor(Math.random() * ai.possibleSolutions.suspects.length)];
            let wep = ai.possibleSolutions.weapons[Math.floor(Math.random() * ai.possibleSolutions.weapons.length)];
            // Fallback if empty (shouldn't happen if game running)
            if(!sus) sus = CHARACTERS[0].name;
            if(!wep) wep = WEAPONS[0];

            this.makeSuggestion(ai, sus, wep, targetRoomName);
        } else {
             this.log(`${ai.name} wanders the halls.`);
             this.endTurn();
        }
    }
    
    makeSuggestion(player, s, w, r) {
        this.log(`${player.name} suggests: ${s}, ${w}, ${r}`);
        
        const suspectPlayer = this.players.find(p => p.name === s);
        if (suspectPlayer) {
            const roomD = ROOM_MAP[r];
            if (roomD) {
                suspectPlayer.x = roomD.c;
                suspectPlayer.y = roomD.r;
                this.renderPlayerToken(suspectPlayer);
            }
        }
        
        let disproved = false;
        const start = (this.players.indexOf(player) + 1) % this.players.length;
        
        for (let i = 0; i < this.players.length - 1; i++) {
            const idx = (start + i) % this.players.length;
            const p = this.players[idx];
            
            const match = p.hand.find(c => c === s || c === w || c === r);
            if (match) {
                this.log(`${p.name} disproves the suggestion.`);
                disproved = true;
                
                if (player.isHuman) {
                     this.showReveal(match, p.name);
                     this.markCardImpossible(player, match);
                } else {
                    this.markCardImpossible(player, match);
                }
                break;
            } else {
                this.log(`${p.name} cannot disprove.`);
            }
        }
        
        if (!disproved) {
            this.log("No one could disprove it!");
            if (!player.isHuman) {
                 const myHand = player.hand;
                 if (!myHand.includes(s)) player.possibleSolutions.suspects = [s];
                 if (!myHand.includes(w)) player.possibleSolutions.weapons = [w];
                 if (!myHand.includes(r)) player.possibleSolutions.rooms = [r];
            }
        }
        
        if (player.isHuman) {
            document.getElementById("btn-suggest").disabled = true;
            document.getElementById("btn-end-turn").disabled = false;
        } else {
            setTimeout(() => this.endTurn(), 2000);
        }
    }

    canAccuse(ai) {
        return (ai.possibleSolutions.suspects.length === 1 &&
                ai.possibleSolutions.weapons.length === 1 &&
                ai.possibleSolutions.rooms.length === 1);
    }
    
    makeAccusation(player, s, w, r) {
        this.log(`!!! ${player.name} ACCUSES: ${s}, ${w}, ${r} !!!`);
        if (s === this.solution.suspect && w === this.solution.weapon && r === this.solution.room) {
             if (player.isHuman) {
                 alert("YOU WIN! Your deduction was correct!");
             } else {
                 alert(`${player.name} WINS! They solved the case.`);
             }
             this.log("GAME OVER."); 
        } else {
             this.log(`${player.name} was WRONG! They are eliminated.`);
             player.active = false;
             this.endTurn();
        }
    }

    setupEventListeners() {
        document.getElementById("btn-roll").onclick = () => this.rollDice();
        document.getElementById("btn-end-turn").onclick = () => this.endTurn();
        
        document.getElementById("btn-notebook").onclick = () => {
             this.renderNotebook();
             this.toggleModal("modal-notebook", true);
        };
        document.getElementById("btn-cards").onclick = () => this.toggleModal("modal-cards", true);
        
        document.querySelectorAll(".close-modal").forEach(b => b.onclick = () => {
            document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
            document.getElementById("modal-overlay").classList.add("hidden");
        });
        
        document.getElementById("btn-suggest").onclick = () => {
             document.getElementById("action-title").textContent = "Make Suggestion";
             this.fillSelects();
             const p = this.players[this.currentPlayerIndex];
             const r = this.getRoomName(p.y, p.x);
             document.getElementById("select-room").value = r;
             document.getElementById("select-room").disabled = true;
             
             document.getElementById("btn-confirm-action").onclick = () => {
                 const s = document.getElementById("select-suspect").value;
                 const w = document.getElementById("select-weapon").value;
                 const rm = document.getElementById("select-room").value;
                 this.toggleModal("modal-action", false);
                 this.makeSuggestion(p, s, w, rm);
             };
             this.toggleModal("modal-action", true);
        };
        
        document.getElementById("btn-accuse").onclick = () => {
             document.getElementById("action-title").textContent = "ACCUSE!";
             this.fillSelects();
             document.getElementById("select-room").disabled = false;
             
             document.getElementById("btn-confirm-action").onclick = () => {
                 const s = document.getElementById("select-suspect").value;
                 const w = document.getElementById("select-weapon").value;
                 const rm = document.getElementById("select-room").value;
                 this.toggleModal("modal-action", false);
                 this.makeAccusation(p, s, w, rm);
             };
             this.toggleModal("modal-action", true);
        };
    }
    
    fillSelects() {
        const sSel = document.getElementById("select-suspect");
        const wSel = document.getElementById("select-weapon");
        const rSel = document.getElementById("select-room");
        sSel.innerHTML=""; wSel.innerHTML=""; rSel.innerHTML="";
        
        CHARACTERS.forEach(c => sSel.innerHTML += `<option>${c.name}</option>`);
        WEAPONS.forEach(w => wSel.innerHTML += `<option>${w}</option>`);
        ROOMS.forEach(r => rSel.innerHTML += `<option>${r}</option>`);
    }

    toggleModal(id, show) {
        const el = document.getElementById(id);
        const ov = document.getElementById("modal-overlay");
        // Simple toggle
        if (show) {
            el.classList.remove("hidden");
            ov.classList.remove("hidden");
        } else {
            el.classList.add("hidden");
            ov.classList.add("hidden");
        }
    }
    
    showReveal(card, name) {
        document.getElementById("reveal-message").textContent = `${name} shows you:`;
        const box = document.getElementById("reveal-card");
        box.innerHTML = `<div class='card-item'><strong>${card}</strong></div>`;
        this.toggleModal("modal-reveal", true);
    }

    renderNotebook() {
        const p = this.players.find(x => x.isHuman);
        const cont = document.getElementById("notebook-content");
        
        const genList = (title, arr) => {
            let h = `<div class='notebook-col'><h4>${title}</h4>`;
            arr.forEach(item => {
                const isOut = p.notebook.includes(item);
                h += `<div><input type='checkbox' ${isOut?"checked":""} disabled> <span style='${isOut?"text-decoration:line-through; opacity:0.5":""}'>${item}</span></div>`;
            });
            h += "</div>";
            return h;
        };
        
        cont.innerHTML = `
            <div style="display:flex; gap:20px;">
                ${genList("Suspects", CHARACTERS.map(c=>c.name))}
                ${genList("Weapons", WEAPONS)}
                ${genList("Rooms", ROOMS)}
            </div>
        `;
    }

    endTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.startTurn();
    }
    
    log(msg) {
        const logEl = document.getElementById("log-container");
        const entry = document.createElement("div");
        entry.className = "log-entry";
        entry.textContent = `> ${msg}`;
        logEl.prepend(entry);
    }
}

// Start
window.onload = () => {
    new ClueGame();
};