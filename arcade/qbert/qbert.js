class QbertGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.scoreEl = document.getElementById('score');
        this.livesEl = document.getElementById('lives');
        this.startScreen = document.getElementById('start-screen');
        
        this.cubeW = 40;
        this.cubeH = 40; // Full height of hexagon image
        
        this.rows = 7;
        this.cubes = []; // Array of {r, c, x, y, colorIndex}
        
        this.qbert = { r: 0, c: 0, x: 0, y: 0, targetX: 0, targetY: 0, jumping: false, jumpTime: 0 };
        
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        
        this.colors = ['#aaa', '#ffcc00', '#00ccff']; // Base, changed, double changed
        
        this.isRunning = false;
        
        this.init();
    }
    
    init() {
        window.addEventListener('keydown', (e) => this.input(e));
        
        this.initLevel();
        this.draw();
    }
    
    initLevel() {
        this.cubes = [];
        const startX = this.canvas.width / 2;
        const startY = 80;
        
        for(let r=0; r<this.rows; r++) {
            for(let c=0; c<=r; c++) {
                // Calc screen position
                // Hex width w. Horizontal spacing w.
                // Each row offset by -w/2
                
                const x = startX + (c * this.cubeW) - (r * this.cubeW / 2);
                const y = startY + (r * 30); // 30 is vertical overlap
                
                this.cubes.push({
                    r: r, 
                    c: c,
                    x: x, 
                    y: y, 
                    color: 0
                });
            }
        }
        
        this.resetQbert();
    }
    
    resetQbert() {
        this.qbert.r = 0;
        this.qbert.c = 0;
        this.updateQbertPos();
    }
    
    updateQbertPos() {
        const cube = this.getCube(this.qbert.r, this.qbert.c);
        if(cube) {
            this.qbert.x = cube.x;
            this.qbert.y = cube.y - 15; // Stand on top
        } else {
            // Fall off
            this.lives--;
            if(this.livesEl) this.livesEl.innerText = this.lives;
            if (this.lives > 0) {
                 this.resetQbert();
            } else {
                this.isRunning = false;
                alert("Game Over! Score: " + this.score);
                this.score = 0;
                this.lives = 3;
                this.initLevel();
            }
        }
    }
    
    getCube(r, c) {
        return this.cubes.find(cb => cb.r === r && cb.c === c);
    }
    
    start() {
        if(this.isRunning) return;
        this.isRunning = true;
        this.startScreen.style.display = 'none';
        this.loop();
    }
    
    input(e) {
        if (!this.isRunning) {
            if(e.code === 'Space') this.start();
            return;
        }
        
        // Diagonal logic with Arrows is tricky.
        // Up -> UR? or UL?
        // Let's use Keypad: 7, 9, 1, 3.
        // Or mapped Arrows:
        // Up: UL (-1, -1) ? No moves to (r-1, c-1) or (r-1, c)
        // Let's say:
        // Left Arrow = DL (r+1, c)
        // Right Arrow = DR (r+1, c+1)
        // Up Arrow = UL (r-1, c-1)
        // Down Arrow = UR? No.
        
        // Standard mapping:
        // Up -> UL (r-1, c-1) -- Wait, Up should be UP visually.
        // Visually Up-Left is r-1, c-1. Up-Right is r-1, c.
        // Down-Left is r+1, c. Down-Right is r+1, c+1.
        
        let dr = 0, dc = 0;
        
        // I'll map:
        // Up: UL
        // Right: UR
        // Left: DL
        // Down: DR
        // Use diagonals if available?
        // Q: UL, W: UR, A: DL, S: DR
        
        if (e.code === 'ArrowUp' || e.code === 'KeyI') { dr=-1; dc=-1; } // UL relative?
        else if (e.code === 'ArrowRight' || e.code === 'KeyL') { dr=-1; dc=0; } // UR
        else if (e.code === 'ArrowDown' || e.code === 'KeyK') { dr=1; dc=1; } // DR
        else if (e.code === 'ArrowLeft' || e.code === 'KeyJ') { dr=1; dc=0; } // DL
        // Mapping is hard.
        // Let's simplify:
        // Up Arrow -> Moves "Up Left" (Visual Up)
        // Right Arrow -> Moves "Down Right" (Visual Right) -- This feels wrong.
        
        // Let's try:
        // Left: r+1, c (DL)
        // Right: r-1, c (UR)
        // Up: r-1, c-1 (UL)
        // Down: r+1, c+1 (DR)
        
        if (e.code === 'ArrowUp') { dr = -1; dc = -1; }
        else if (e.code === 'ArrowRight') { dr = -1; dc = 0; }
        else if (e.code === 'ArrowLeft') { dr = 1; dc = 0; }
        else if (e.code === 'ArrowDown') { dr = 1; dc = 1; }
        // Q W A S
        else if (e.code === 'KeyQ') { dr = -1; dc = -1; }
        else if (e.code === 'KeyW') { dr = -1; dc = 0; }
        else if (e.code === 'KeyA') { dr = 1; dc = 0; }
        else if (e.code === 'KeyS') { dr = 1; dc = 1; }
        
        if (dr !== 0 || dc !== 0) {
            this.jump(dr, dc);
        }
    }
    
    jump(dr, dc) {
        // Logic to move
        this.qbert.r += dr;
        this.qbert.c += dc;
        
        const cube = this.getCube(this.qbert.r, this.qbert.c);
        if (cube) {
            if (cube.color === 0) {
                cube.color = 1;
                this.score += 25;
                if(this.scoreEl) this.scoreEl.innerText = this.score;
            }
        }
        
        this.updateQbertPos();
    }
    
    // Old drawCube replaced

    
    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw Cubes
        // Sort by row/col for proper overlap?
        // Actually painters algorithm: draw back to front.
        // Row 0 is top. Row 6 is bottom.
        // Since y increases with r, default order is fine.
        this.cubes.forEach(c => {
            this.drawCube(c.x, c.y, c.color);
        });
        
        // Draw Qbert
        if (this.isRunning) {
            this.drawQbert(this.qbert.x, this.qbert.y - 15);
        }
    }
    
    drawCube(x, y, colorState) {
        // Pseudo-3D Isometric Cube
        // y is center of top face? No, y in initLevel was calculated roughly.
        // Let's standardise: x,y is the center of the TOP face.
        
        const size = 20; // Half-width
        const h = 25; // Height of side faces
        
        // Palette
        // State 0: Blue/Teal (Start)
        // State 1: Yellow (Target)
        // State 2: Green (Intermediate/Done)
        
        let topColor = '#888';
        if (colorState === 0) topColor = '#55a'; // Blueish
        else if (colorState === 1) topColor = '#fd0'; // Yellow
        else if (colorState === 2) topColor = '#0f0'; // Green

        const leftColor = '#555'; // Darker grey
        const rightColor = '#333'; // Darkest grey
        
        // Top Face (Rhombus)
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - size); // Top pt
        this.ctx.lineTo(x + size, y); // Right pt
        this.ctx.lineTo(x, y + size); // Bottom (center) pt
        this.ctx.lineTo(x - size, y); // Left pt
        this.ctx.closePath();
        this.ctx.fillStyle = topColor;
        this.ctx.fill();
        this.ctx.stroke(); // Outline for pop
        
        // Left Face
        this.ctx.beginPath();
        this.ctx.moveTo(x - size, y);
        this.ctx.lineTo(x, y + size);
        this.ctx.lineTo(x, y + size + h);
        this.ctx.lineTo(x - size, y + h);
        this.ctx.closePath();
        this.ctx.fillStyle = leftColor;
        this.ctx.fill();
        this.ctx.stroke();

        // Right Face
        this.ctx.beginPath();
        this.ctx.moveTo(x + size, y);
        this.ctx.lineTo(x, y + size);
        this.ctx.lineTo(x, y + size + h);
        this.ctx.lineTo(x + size, y + h);
        this.ctx.closePath();
        this.ctx.fillStyle = rightColor;
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    drawQbert(x, y) {
        // Draw Q*bert Sprite (Orange blob with nose)
        const w = 24; 
        const h = 24;
        
        this.ctx.fillStyle = '#ff7b00'; // Orange
        
        // Body (Circle-ish)
        this.ctx.beginPath();
        this.ctx.arc(x, y, 12, 0, Math.PI*2);
        this.ctx.fill();
        
        // Snoot (Nose) - varies by direction? Let's point down-right
        this.ctx.beginPath();
        this.ctx.moveTo(x + 5, y + 5);
        this.ctx.lineTo(x + 15, y + 15);
        this.ctx.lineTo(x + 20, y + 25);
        this.ctx.lineWidth = 6;
        this.ctx.strokeStyle = '#ff7b00';
        this.ctx.stroke();
        this.ctx.lineWidth = 1;
        
        // Eyes
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(x - 4, y - 4, 4, 0, Math.PI*2); // Left Eye
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(x + 6, y - 4, 4, 0, Math.PI*2); // Right Eye
        this.ctx.fill();
        
        // Pupils
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(x - 4, y - 4, 1.5, 0, Math.PI*2);
        this.ctx.arc(x + 6, y - 4, 1.5, 0, Math.PI*2);
        this.ctx.fill();
        
        // Legs (if any)
        this.ctx.fillStyle = '#ff7b00';
        this.ctx.fillRect(x - 8, y + 10, 4, 8);
        this.ctx.fillRect(x + 4, y + 10, 4, 8);
    }
    
    loop() {
        if(!this.isRunning) return;
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

window.onload = () => {
    new QbertGame();
};
