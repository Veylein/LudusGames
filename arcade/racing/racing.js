class RacingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // UI Elements
        this.ui = {
            cash: document.getElementById('cash-display'),
            laps: document.getElementById('laps-display'),
            time: document.getElementById('time-display'),
            start: document.getElementById('start-screen'),
            over: document.getElementById('game-over'),
            winnings: document.getElementById('winnings'),
            finalTime: document.getElementById('final-time'),
            result: document.getElementById('race-result'),
            restart: document.getElementById('restart-btn')
        };
        
        // Game State
        this.running = false;
        this.cash = parseInt(localStorage.getItem('racingCash') || 500); 
        this.currentMapIndex = 0;
        this.laps = 0;
        this.maxLaps = 3;
        this.startTime = 0;
        this.currentTime = 0;
        
        this.particles = [];
        this.tireTracks = [];
        
        // Car Stats (Upgradable)
        this.carStats = JSON.parse(localStorage.getItem('racingStats')) || {
            maxSpeed: 6.0,
            accel: 0.15,
            turnSpeed: 0.05,
            grip: 0.96, // Friction
            engineLevel: 1,
            tireLevel: 1,
            suspensionLevel: 1,
            nitro: 1
        };
        
        this.car = {
            x: 0, y: 0,
            angle: 0,
            speed: 0,
            drift: 0,
            boost: 0,
            color: '#d00',
            width: 14,
            height: 24
        };
        
        this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Space: false };
        
        this.setupMaps();
        this.setupInputs();
        this.updateUI();
        
        // Initial Render
        this.loadMap(0);
        
        // Loop
        requestAnimationFrame((t) => this.loop(t));
    }
    
    setupMaps() {
        // 0: Grass, 1: Road, 2: Wall, 3: Start/Finish, 4: Dirt, 5: Boost
        // Grid 32x24 (20px tiles for 640x480)
        this.maps = [
            // Map 0: Oval (Green grass)
            {
                name: "Oval Circuit",
                bgColor: "#2a5",
                roadColor: "#555",
                wallColor: "#fff",
                width: 32,
                height: 24,
                tileSize: 20,
                startPos: { x: 4, y: 12, angle: -1.57 }, // Facing Up
                data: this.generateMap('oval')
            },
            // Map 1: Desert (Yellow Sand)
            {
                name: "Desert Drift",
                bgColor: "#eec",
                roadColor: "#a98",
                wallColor: "#864",
                width: 32,
                height: 24,
                tileSize: 20,
                startPos: { x: 2, y: 3, angle: 0 },
                data: this.generateMap('desert')
            },
            // Map 2: City (Dark Blue)
            {
                name: "City Sprint",
                bgColor: "#112",
                roadColor: "#334",
                wallColor: "#0ff", // Neon walls
                width: 32,
                height: 24,
                tileSize: 20,
                startPos: { x: 15, y: 20, angle: -1.57 },
                data: this.generateMap('city')
            }
        ];
    }
    
    generateMap(type) {
        let map = [];
        // Init Empty
        for(let y=0; y<24; y++) {
            let row = [];
            for(let x=0; x<32; x++) row.push(0);
            map.push(row);
        }

        const rect = (x, y, w, h, val) => {
            for(let j=y; j<y+h; j++)
                for(let i=x; i<x+w; i++)
                    if(j>=0 && j<24 && i>=0 && i<32) map[j][i] = val;
        };
        
        if (type === 'oval') {
            // Walls
            rect(0, 0, 32, 24, 2);
            rect(1, 1, 30, 22, 0); // Grass inside
            
            // Track
            rect(2, 2, 28, 20, 1); // Road ring
            rect(6, 6, 20, 12, 0); // Grass center
            rect(4, 11, 2, 1, 3); // Finish Line (Left side)
            
        } else if (type === 'desert') {
            // Walls
            rect(0, 0, 32, 24, 2);
            rect(1, 1, 30, 22, 0);
            
            // Zig Zag Path
            rect(2, 2, 28, 3, 1); // Top
            rect(27, 2, 3, 8, 1); // Right Down
            rect(6, 8, 24, 3, 1); // Mid Left
            rect(6, 8, 3, 8, 1); // Left Down
            rect(6, 14, 22, 3, 1); // Bot Right
            rect(25, 14, 3, 8, 1); // Bot Hook
            rect(2, 20, 26, 2, 1); // Bot Straight
            rect(2, 2, 3, 20, 1); // Left Up Return
            
            rect(2, 3, 3, 1, 3); // Start
            
        } else if (type === 'city') {
            // City Grid
            for(let y=0; y<24; y++) {
                for(let x=0; x<32; x++) {
                    map[y][x] = 2; // Default Building
                }
            }
            
            // Roads
            const road = (x,y,w,h) => rect(x,y,w,h,1);
            
            road(2, 2, 28, 2); // Top
            road(2, 20, 28, 2); // Bot
            road(2, 2, 2, 20); // Left
            road(28, 2, 2, 20); // Right
            road(14, 2, 4, 20); // Center V
            road(2, 10, 28, 4); // Center H
            
            rect(14, 18, 4, 1, 3); // Start
        }
        
        return map;
    }
    
    setupInputs() {
        window.addEventListener('keydown', (e) => {
            if(this.keys.hasOwnProperty(e.code)) this.keys[e.code] = true;
            if(e.code === 'Space') {
                if(!this.running) this.startGame();
                else this.activateNitro();
            }
        });
        window.addEventListener('keyup', (e) => {
            if(this.keys.hasOwnProperty(e.code)) this.keys[e.code] = false;
        });
        
        // Expose for UI buttons
        window.game = this; 
    }
    
    selectMap(idx) {
        this.currentMapIndex = idx;
        this.loadMap(idx);
    }
    
    loadMap(idx) {
        this.map = this.maps[idx];
        this.canvas.style.backgroundColor = this.map.bgColor;
        
        let ts = this.map.tileSize;
        // Reset Car Centered On Start Tile
        this.car.x = (this.map.startPos.x * ts) + (ts/2);
        this.car.y = (this.map.startPos.y * ts) + (ts/2);
        this.car.angle = this.map.startPos.angle;
        this.car.speed = 0;
        
        this.tireTracks = [];
        this.particles = [];
        
        document.querySelectorAll('.map-btn').forEach((b, i) => {
            b.classList.toggle('active', i === idx);
        });
        
        this.draw(); 
    }
    
    buyUpgrade(type) {
        let cost = 100 * (type === 'speed' ? this.carStats.engineLevel : 
                          type === 'accel' ? this.carStats.tireLevel : 
                          type === 'handling' ? this.carStats.suspensionLevel : 5);
        if(type === 'nitro') cost = 500;
        
        if(this.cash >= cost) {
            this.cash -= cost;
            if(type === 'speed') {
                this.carStats.maxSpeed += 0.5;
                this.carStats.engineLevel++;
            } else if(type === 'accel') {
                this.carStats.accel += 0.05; 
                this.carStats.tireLevel++;
            } else if(type === 'handling') {
                this.carStats.turnSpeed += 0.01;
                this.carStats.suspensionLevel++;
            } else if(type === 'nitro') {
                this.carStats.nitro++;
            }
            this.saveProgress();
            this.updateUI();
        }
    }
    
    saveProgress() {
        localStorage.setItem('racingCash', this.cash);
        localStorage.setItem('racingStats', JSON.stringify(this.carStats));
    }
    
    activateNitro() {
        if(this.carStats.nitro > 0 && this.car.boost <= 0) {
            this.carStats.nitro--;
            this.car.boost = 60; // Frames
            this.saveProgress();
            this.updateUI();
        }
    }
    
    startGame() {
        this.running = true;
        this.laps = 0;
        this.startTime = Date.now();
        this.passedCheckpoint = false;
        
        this.ui.start.style.display = 'none';
        this.ui.over.style.display = 'none';
        
        // Ensure starting pos
        this.loadMap(this.currentMapIndex);
        
        this.loop();
    }
    
    loop(timestamp) {
        if(!this.running) return;
        
        this.update();
        this.draw();
        
        requestAnimationFrame((t) => this.loop(t));
    }
    
    update() {
        // Timer
        this.currentTime = (Date.now() - this.startTime) / 1000;
        this.ui.time.innerText = this.currentTime.toFixed(2);
        
        let stats = this.carStats;
        
        // Input Physics
        if(this.keys.ArrowUp) {
            this.car.speed += stats.accel;
        } else if(this.keys.ArrowDown) {
            this.car.speed -= stats.accel;
        } else {
            this.car.speed *= stats.grip; // Coast friction
        }
        
        // Boost
        let maxS = stats.maxSpeed;
        if(this.car.boost > 0) {
            maxS *= 1.5;
            this.car.speed += 0.3;
            this.car.boost--;
            this.createParticle(this.car.x, this.car.y, '#0ff', 2); // Blue flame
        }
        
        // Constraints
        if(this.car.speed > maxS) this.car.speed = maxS;
        if(this.car.speed < -maxS/2) this.car.speed = -maxS/2;
        
        // Turning (Only when moving)
        if(Math.abs(this.car.speed) > 0.1) {
            let dir = this.car.speed > 0 ? 1 : -1;
            // Drifting logic
            let turn = stats.turnSpeed * (this.keys.ArrowLeft ? -1 : this.keys.ArrowRight ? 1 : 0);
            this.car.angle += turn * dir;
        }
        
        // Velocity
        this.car.x += Math.cos(this.car.angle) * this.car.speed;
        this.car.y += Math.sin(this.car.angle) * this.car.speed;
        
        // Boundaries
        if(this.car.x < 0) this.car.x = 0;
        if(this.car.x > 640) this.car.x = 640;
        if(this.car.y < 0) this.car.y = 0;
        if(this.car.y > 480) this.car.y = 480;
        
        // Collision
        this.checkCollisions();
        
        // Particles
        this.updateParticles();
        
        // Tire Tracks Check
        if(Math.abs(this.car.speed) > 4 && (this.keys.ArrowLeft || this.keys.ArrowRight)) {
            // Skidding
            if(Math.random() > 0.7) this.createParticle(this.car.x, this.car.y, '#aaa', 1);
            
            if(this.tireTracks.length > 300) this.tireTracks.shift();
            this.tireTracks.push({ x: this.car.x, y: this.car.y, age: 200 });
        }
    }
    
    checkCollisions() {
        let tx = Math.floor(this.car.x / this.map.tileSize);
        let ty = Math.floor(this.car.y / this.map.tileSize);
        
        if(tx < 0) tx = 0; if(tx >= 32) tx = 31;
        if(ty < 0) ty = 0; if(ty >= 24) ty = 23;
        
        let tile = this.map.data[ty][tx];
        
        if(tile === 0) { // Offroad
            this.car.speed *= 0.85; 
            if(Math.abs(this.car.speed) > 2) this.createParticle(this.car.x, this.car.y, '#4b3', 1);
        } else if(tile === 2) { // Wall
            this.car.speed *= -0.5;
            this.car.x -= Math.cos(this.car.angle) * 5;
            this.car.y -= Math.sin(this.car.angle) * 5;
            this.createParticle(this.car.x, this.car.y, '#fff', 3); // Spark
        } else if(tile === 3) {
            // Checkpoint Logic (Distance based)
            let startX = (this.map.startPos.x * this.map.tileSize) + 10;
            let startY = (this.map.startPos.y * this.map.tileSize) + 10;
            // Only count lap if we've been away
            if(this.passedCheckpoint) {
                this.laps++;
                this.passedCheckpoint = false;
                this.ui.laps.innerText = `${this.laps}/${this.maxLaps}`;
                this.createParticle(this.car.x, this.car.y, '#ff0', 5);
                
                if(this.laps >= this.maxLaps) this.finishRace();
            }
        }
        
        // Checkpoint logic (simple distance check from start)
        let startX = (this.map.startPos.x * this.map.tileSize) + 10;
        let startY = (this.map.startPos.y * this.map.tileSize) + 10;
        let dist = Math.hypot(this.car.x - startX, this.car.y - startY);
        
        if(dist > 200) { // If > 200px away from start, enable next lap trigger
            this.passedCheckpoint = true;
        }
    }

    finishRace() {
        this.running = false;
        let baseWin = 200 + (this.currentMapIndex * 100);
        // Time Bonus (Arbitrary par times)
        let par = 30 + (this.currentMapIndex * 10);
        let bonus = Math.max(0, Math.floor((par - this.currentTime) * 10));
        
        let total = baseWin + bonus;
        this.cash += total;
        this.saveProgress();
        
        this.ui.finalTime.innerText = this.currentTime.toFixed(2);
        this.ui.winnings.innerText = total;
        this.ui.over.style.display = 'block';
        this.updateUI();
    }

    updateUI() {
        if(this.ui.cash) this.ui.cash.innerText = this.cash;
        
        const setText = (id, txt) => { 
            let el = document.getElementById(id);
            if(el) el.innerText = txt; 
        }
        
        setText('speed-cost', "$" + (100 * this.carStats.engineLevel));
        setText('accel-cost', "$" + (100 * this.carStats.tireLevel));
        setText('handling-cost', "$" + (100 * this.carStats.suspensionLevel));
        setText('nitro-cost', "$500 (Qty: " + this.carStats.nitro + ")");
    }

    createParticle(x, y, color, count=1) {
        for(let i=0; i<count; i++) {
            this.particles.push({
                x: x + (Math.random()-0.5)*10,
                y: y + (Math.random()-0.5)*10,
                vx: (Math.random()-0.5)*2,
                vy: (Math.random()-0.5)*2,
                life: Math.random()*20 + 10,
                color: color
            });
        }
    }

    updateParticles() {
        for(let i=this.particles.length-1; i>=0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if(p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw() {
        // Clear Background (Grass/Sand/City)
        this.ctx.fillStyle = this.map.bgColor; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        let ts = this.map.tileSize;
        
        // Draw Map Tiles
        for(let y=0; y<this.map.height; y++) {
            for(let x=0; x<this.map.width; x++) {
                let tile = this.map.data[y][x];
                let tx = x * ts;
                let ty = y * ts;
                
                if(tile === 1 || tile === 3) { // Road
                    this.ctx.fillStyle = this.map.roadColor;
                    this.ctx.fillRect(tx, ty, ts+1, ts+1); 
                    
                    // Road Markings
                    if(tile===1 && (x+y)%2 === 0) {
                         this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
                         this.ctx.fillRect(tx+8, ty+8, 4, 4);
                    }

                    if(tile === 3) { // Finish Checkers
                        this.ctx.fillStyle = '#fff';
                        this.ctx.fillRect(tx, ty, ts/2, ts/2);
                        this.ctx.fillRect(tx+ts/2, ty+ts/2, ts/2, ts/2);
                        this.ctx.fillStyle = '#000';
                        this.ctx.fillRect(tx+ts/2, ty, ts/2, ts/2);
                        this.ctx.fillRect(tx, ty+ts/2, ts/2, ts/2);
                    }
                } else if(tile === 2) { // Wall
                    this.ctx.fillStyle = this.map.wallColor;
                    this.ctx.fillRect(tx, ty, ts, ts);
                    this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    this.ctx.fillRect(tx+ts-3, ty, 3, ts); // Right shading
                    this.ctx.fillRect(tx, ty+ts-3, ts, 3); // Bottom shading
                }
            }
        }
        
        // Tracks
        this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
        this.tireTracks.forEach(t => {
            if(t.age > 0) {
                this.ctx.fillRect(t.x, t.y, 2, 2);
                t.age--;
            }
        });
        
        // Car Render
        this.ctx.save();
        this.ctx.translate(this.car.x, this.car.y);
        this.ctx.rotate(this.car.angle);
        
        // Scale car
        this.ctx.scale(1.5, 1.5);
        
        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(-8, -3, 20, 10);
        
        // Wheels
        this.ctx.fillStyle = '#000';
        // Front turn based on input
        let turn = 0;
        if(this.keys.ArrowLeft) turn = -0.3;
        if(this.keys.ArrowRight) turn = 0.3;
        
        this.ctx.save(); // Front Left
        this.ctx.translate(6, -6);
        this.ctx.rotate(turn);
        this.ctx.fillRect(-2, -1, 5, 2);
        this.ctx.restore();

        this.ctx.save(); // Front Right
        this.ctx.translate(6, 4);
        this.ctx.rotate(turn);
        this.ctx.fillRect(-2, -1, 5, 2);
        this.ctx.restore();

        this.ctx.fillRect(-8, -6, 5, 2);  // BL
        this.ctx.fillRect(-8, 4, 5, 2);   // BR
        
        // Chassis
        this.ctx.fillStyle = this.car.color;
        this.ctx.fillRect(-10, -5, 20, 10);
        
        // Roof window
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(-4, -4, 8, 8); 
        this.ctx.fillStyle = this.car.color;
        this.ctx.fillRect(-2, -2, 4, 4); 
        
        // Spoiler
        this.ctx.fillStyle = '#a00';
        this.ctx.fillRect(-12, -6, 2, 12);
        
        // Headlights
        this.ctx.fillStyle = (Math.random() > 0.1) ? '#ffeba7' : '#fff'; // Flicker
        this.ctx.fillRect(8, -4, 2, 3);
        this.ctx.fillRect(8, 1, 2, 3);
        
        // Nitro Flame
        if(this.car.boost > 0) {
            this.ctx.fillStyle = '#0ff';
            this.ctx.fillRect(-14 + Math.random()*2, -2, 6, 4);
        }

        this.ctx.restore();
        
        // Particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life / 20;
            this.ctx.fillRect(p.x, p.y, 2, 2);
        });
        this.ctx.globalAlpha = 1.0;
    }
}

window.onload = () => {
    new RacingGame();
};