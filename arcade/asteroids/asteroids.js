(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    class AsteroidsGame {
        constructor() {
            this.canvas = canvas;
            this.ctx = this.canvas.getContext('2d');
            
            this.scoreEl = document.getElementById('score');
            this.livesEl = document.getElementById('lives');
            this.startScreen = document.getElementById('start-screen');
            this.gameOverScreen = document.getElementById('game-over-screen');
            this.finalScoreEl = document.getElementById('final-score');
            this.restartBtn = document.getElementById('restart-btn');
            
            this.btnUp = document.getElementById('up-btn');
            this.btnLeft = document.getElementById('left-btn');
            this.btnRight = document.getElementById('right-btn');
            this.btnFire = document.getElementById('fire-btn');
            
            this.ship = {
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                a: 0, 
                r: 10, 
                vx: 0,
                vy: 0,
                rot: 0,
                thrusting: false,
                dead: false
            };
            
            this.asteroids = [];
            this.bullets = [];
            
            this.score = 0;
            this.lives = 3;
            this.level = 0;
            this.isRunning = false;
            
            this.boundKeyDown = this.keyDown.bind(this);
            this.boundKeyUp = this.keyUp.bind(this);
            this.boundStartGame = this.startGame.bind(this);
            this.boundShoot = this.shoot.bind(this);
            
            this.init();
        }
        
        init() {
            this.canvas.width = 800;
            this.canvas.height = 600;
            
            window.addEventListener('keydown', this.boundKeyDown);
            window.addEventListener('keyup', this.boundKeyUp);
            
            this.canvas.addEventListener('click', (e) => {
                if (!this.isRunning) this.startGame();
                else this.shoot();
            });
            
            if(this.startScreen) this.startScreen.addEventListener('click', this.boundStartGame);
            
            if(this.gameOverScreen) this.gameOverScreen.addEventListener('click', this.boundStartGame);
            
            if(this.restartBtn) this.restartBtn.addEventListener('click', this.boundStartGame);
            
            // Mobile
            if(this.btnUp) {
                this.btnUp.addEventListener('touchstart', (e) => { e.preventDefault(); this.ship.thrusting = true; });
                this.btnUp.addEventListener('touchend', (e) => { e.preventDefault(); this.ship.thrusting = false; });
                this.btnUp.addEventListener('mousedown', () => { this.ship.thrusting = true; });
                this.btnUp.addEventListener('mouseup', () => { this.ship.thrusting = false; });
            }
            if(this.btnLeft) {
                this.btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); this.ship.rot = -0.1; }); 
                this.btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); this.ship.rot = 0; });
                this.btnLeft.addEventListener('mousedown', () => { this.ship.rot = -0.1; });
                this.btnLeft.addEventListener('mouseup', () => { this.ship.rot = 0; });
            }
            if(this.btnRight) {
                this.btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); this.ship.rot = 0.1; });
                this.btnRight.addEventListener('touchend', (e) => { e.preventDefault(); this.ship.rot = 0; });
                this.btnRight.addEventListener('mousedown', () => { this.ship.rot = 0.1; });
                this.btnRight.addEventListener('mouseup', () => { this.ship.rot = 0; });
            }
            if(this.btnFire) {
                this.btnFire.addEventListener('click', this.boundShoot);
            }
            
            this.loop();
        }
        
        cleanup() {
            window.removeEventListener('keydown', this.boundKeyDown);
            window.removeEventListener('keyup', this.boundKeyUp);
            if (this.startScreen) this.startScreen.removeEventListener('click', this.boundStartGame);
            if (this.gameOverScreen) this.gameOverScreen.removeEventListener('click', this.boundStartGame);
            if (this.restartBtn) this.restartBtn.removeEventListener('click', this.boundStartGame);
            this.isRunning = false;
        }

        startGame() {
            this.isRunning = true;
            if(this.startScreen) this.startScreen.style.display = 'none';
            if(this.gameOverScreen) this.gameOverScreen.style.display = 'none';
            this.score = 0;
            this.lives = 3;
            this.level = 0;
            this.ship.dead = false;
            this.ship.x = this.canvas.width / 2;
            this.ship.y = this.canvas.height / 2;
            this.ship.vx = 0;
            this.ship.vy = 0;
            
            this.newLevel();
            this.updateScore();
        }
        
        newLevel() {
            this.level++;
            this.asteroids = [];
            const num = 2 + this.level; 
            for(let i=0; i<num; i++) {
                let x, y;
                do {
                    x = Math.floor(Math.random() * this.canvas.width);
                    y = Math.floor(Math.random() * this.canvas.height);
                } while(this.dist(x, y, this.ship.x, this.ship.y) < 100); 
                
                this.asteroids.push(this.newAsteroid(x, y, Math.ceil(Math.random() * 30) + 30)); 
            }
        }
        
        newAsteroid(x, y, r) {
            const lvlMult = 1 + 0.1 * this.level;
            const asteroid = {
                x: x,
                y: y,
                vx: Math.random() * 2 * lvlMult - lvlMult,
                vy: Math.random() * 2 * lvlMult - lvlMult,
                r: r,
                a: Math.random() * Math.PI * 2,
                vert: Math.floor(Math.random() * 10 + 7), 
                offs: [] 
            };
            
            for(let i=0; i<asteroid.vert; i++) {
                asteroid.offs.push(Math.random() * 0.4 * r + r * 0.8); 
            }
            return asteroid;
        }
        
        dist(x1, y1, x2, y2) {
            return Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
        }
        
        shoot() {
            if(this.ship.dead || !this.isRunning) return;
            this.bullets.push({
                x: this.ship.x + 4/3 * this.ship.r * Math.cos(this.ship.a),
                y: this.ship.y + 4/3 * this.ship.r * Math.sin(this.ship.a),
                vx: this.ship.vx + 5 * Math.cos(this.ship.a), 
                vy: this.ship.vy + 5 * Math.sin(this.ship.a),
                ttl: 60 
            });
        }
    
        keyDown(e) {
            if(this.ship.dead) return;
            if ((e.code === 'ArrowLeft') || (e.code === 'KeyA')) this.ship.rot = -0.1; 
            else if ((e.code === 'ArrowRight') || (e.code === 'KeyD')) this.ship.rot = 0.1; 
            else if ((e.code === 'ArrowUp') || (e.code === 'KeyW')) this.ship.thrusting = true;
            else if ((e.code === 'Space') || (e.code === 'KeyK') || (e.code === 'Enter')) {
                if (!this.isRunning) {
                    this.startGame();
                } else {
                    this.shoot();
                }
            }
        }
        
        keyUp(e) {
            if ((e.code === 'ArrowLeft') || (e.code === 'KeyA') || (e.code === 'ArrowRight') || (e.code === 'KeyD')) this.ship.rot = 0;
            if ((e.code === 'ArrowUp') || (e.code === 'KeyW')) this.ship.thrusting = false;
        }
        
        update() {
            if(!this.isRunning) return;
            
            // Ship
            if(!this.ship.dead) {
                this.ship.a += this.ship.rot;
                
                if(this.ship.thrusting) {
                    this.ship.vx += 0.1 * Math.cos(this.ship.a);
                    this.ship.vy += 0.1 * Math.sin(this.ship.a);
                } else {
                    this.ship.vx *= 0.99; 
                    this.ship.vy *= 0.99;
                }
                
                this.ship.x += this.ship.vx;
                this.ship.y += this.ship.vy;
                
                // Wrap
                if(this.ship.x < 0 - this.ship.r) this.ship.x = this.canvas.width + this.ship.r;
                else if(this.ship.x > this.canvas.width + this.ship.r) this.ship.x = 0 - this.ship.r;
                if(this.ship.y < 0 - this.ship.r) this.ship.y = this.canvas.height + this.ship.r;
                else if(this.ship.y > this.canvas.height + this.ship.r) this.ship.y = 0 - this.ship.r;
            }
    
            // Asteroids
            this.asteroids.forEach((a) => {
                a.x += a.vx;
                a.y += a.vy;
                
                if(a.x < 0 - a.r) a.x = this.canvas.width + a.r;
                else if(a.x > this.canvas.width + a.r) a.x = 0 - a.r;
                if(a.y < 0 - a.r) a.y = this.canvas.height + a.r;
                else if(a.y > this.canvas.height + a.r) a.y = 0 - a.r;
            });
            
            // Bullets
            for(let i=this.bullets.length-1; i>=0; i--) {
                let b = this.bullets[i];
                b.x += b.vx;
                b.y += b.vy;
                b.ttl--;
                
                if(b.x < 0) b.x = this.canvas.width;
                if(b.x > this.canvas.width) b.x = 0;
                if(b.y < 0) b.y = this.canvas.height;
                if(b.y > this.canvas.height) b.y = 0;
                
                if(b.ttl <= 0) {
                    this.bullets.splice(i, 1);
                    continue;
                }
                
                // Collision Bullet vs Asteroid
                for(let j=this.asteroids.length-1; j>=0; j--) {
                    let a = this.asteroids[j];
                    if(this.dist(b.x, b.y, a.x, a.y) < a.r) {
                        this.bullets.splice(i, 1);
                        this.destroyAsteroid(j);
                        break;
                    }
                }
            }
            
            // Ship vs Asteroids
            if(!this.ship.dead) {
                for(let i=0; i<this.asteroids.length; i++) {
                    if(this.dist(this.ship.x, this.ship.y, this.asteroids[i].x, this.asteroids[i].y) < this.ship.r + this.asteroids[i].r) {
                        this.explodeShip();
                        break; 
                    }
                }
            }
            
            if (this.asteroids.length === 0 && this.lives > 0) {
                this.newLevel();
            }
        }
        
        destroyAsteroid(index) {
            let a = this.asteroids[index];
            this.asteroids.splice(index, 1);
            this.score += 100;
            this.updateScore();
            
            if(a.r > 15) { 
                for(let i=0; i<2; i++) {
                     const newR = a.r / 2;
                     const newVert = Math.floor(Math.random() * 5 + 5);
                     const newOffs = [];
                     for(let k=0; k<newVert; k++) newOffs.push(Math.random() * 0.4 * newR + newR * 0.8);
                     
                     this.asteroids.push({
                        x: a.x,
                        y: a.y,
                        vx: Math.random() * 4 - 2, 
                        vy: Math.random() * 4 - 2,
                        r: newR,
                        a: Math.random() * 6.28,
                        vert: newVert,
                        offs: newOffs
                     });
                }
            }
        }
        
        explodeShip() {
            this.ship.dead = true;
            this.lives--;
            this.updateScore();
            
            setTimeout(() => {
                if(this.lives > 0) {
                    this.ship.dead = false;
                    this.ship.x = this.canvas.width / 2;
                    this.ship.y = this.canvas.height / 2;
                    this.ship.vx = 0;
                    this.ship.vy = 0;
                } else {
                    this.gameOver();
                }
            }, 1000);
        }
        
        gameOver() {
            this.isRunning = false;
            if(this.finalScoreEl) this.finalScoreEl.innerText = this.score;
            if(this.gameOverScreen) this.gameOverScreen.style.display = 'flex';
        }
        
        updateScore() {
            if(this.scoreEl) this.scoreEl.innerText = this.score;
            if(this.livesEl) this.livesEl.innerText = this.lives;
        }
    
        draw() {
            if (!this.ctx) return;
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Ship
            if(!this.ship.dead && this.isRunning) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.moveTo(
                    this.ship.x + 4/3 * this.ship.r * Math.cos(this.ship.a),
                    this.ship.y + 4/3 * this.ship.r * Math.sin(this.ship.a)
                );
                this.ctx.lineTo(
                    this.ship.x - this.ship.r * (2/3 * Math.cos(this.ship.a) + Math.sin(this.ship.a)),
                    this.ship.y - this.ship.r * (2/3 * Math.sin(this.ship.a) - Math.cos(this.ship.a))
                );
                this.ctx.lineTo(
                    this.ship.x - this.ship.r * (2/3 * Math.cos(this.ship.a) - Math.sin(this.ship.a)),
                    this.ship.y - this.ship.r * (2/3 * Math.sin(this.ship.a) + Math.cos(this.ship.a))
                );
                this.ctx.closePath();
                this.ctx.stroke();
                
                if(this.ship.thrusting) {
                    this.ctx.strokeStyle = '#f00';
                    this.ctx.beginPath();
                    this.ctx.moveTo(
                         this.ship.x - this.ship.r * (2/3 * Math.cos(this.ship.a) + 0.5 * Math.sin(this.ship.a)),
                         this.ship.y - this.ship.r * (2/3 * Math.sin(this.ship.a) - 0.5 * Math.cos(this.ship.a))
                    );
                    this.ctx.lineTo(
                         this.ship.x - this.ship.r * 5/3 * Math.cos(this.ship.a),
                         this.ship.y - this.ship.r * 5/3 * Math.sin(this.ship.a)
                    );
                    this.ctx.lineTo(
                         this.ship.x - this.ship.r * (2/3 * Math.cos(this.ship.a) - 0.5 * Math.sin(this.ship.a)),
                         this.ship.y - this.ship.r * (2/3 * Math.sin(this.ship.a) + 0.5 * Math.cos(this.ship.a))
                    );
                    this.ctx.stroke();
                }
            }
            
            // Asteroids
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1.5;
            this.asteroids.forEach(a => {
                this.ctx.beginPath();
                const angleStep = (Math.PI * 2) / a.vert;
                for(let j=0; j<a.vert; j++) {
                    const angle = a.a + j * angleStep;
                    const r = a.offs[j] || a.r; 
                    const x = a.x + r * Math.cos(angle);
                    const y = a.y + r * Math.sin(angle);
                    if(j===0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                }
                this.ctx.closePath();
                this.ctx.stroke();
            });
            
            // Bullets
            this.ctx.fillStyle = '#fff';
            this.bullets.forEach(b => {
                 this.ctx.beginPath();
                 this.ctx.arc(b.x, b.y, 2, 0, Math.PI*2);
                 this.ctx.fill();
            });
        }
        
        loop() {
            if (!document.getElementById('gameCanvas')) {
                this.cleanup();
                return;
            }
            this.update();
            this.draw();
            requestAnimationFrame(() => this.loop());
        }
    }

    new AsteroidsGame();
})();
