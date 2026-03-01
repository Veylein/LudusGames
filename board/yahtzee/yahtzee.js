/*
 * RNG PROTOCOL (Yahtzee)
 * Theme: Cyber Dice
 * Logic: Canvas Dice + DOM Scorecard
 */

window.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // State
    let dice = [1, 1, 1, 1, 1];
    let locked = [false, false, false, false, false];
    let rollsLeft = 3;
    let turnActive = true;
    let scores = {}; // category -> value
    let totalScore = 0;
    let animationFrame = 0;
    let isRolling = false;
    
    // Config
    const DICE_SIZE = 80;
    const SPACING = 20;
    const CATEGORIES = [
        'Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes',
        'Sum', 'Bonus',
        'ThreeKind', 'FourKind', 'FullHouse', 'SmallStr', 'LargeStr', 'M_Chance', 'RNG_Proto'
    ];
    
    // Layout
    let diceRects = []; // Hitboxes

    function init() {
        if (window.GameUI) {
            window.GameUI.init(canvas, {
                onStart: startGame,
                onLoop: loop,
                onResize: handleResize
            });
            window.GameUI.showStartScreen();
            
            // Custom click handler for dice
            canvas.addEventListener('mousedown', handleInput);
            canvas.addEventListener('touchstart', handleInput);
        } else {
            handleResize();
            startGame();
            setInterval(loop, 16);
            canvas.addEventListener('mousedown', handleInput);
        }
        
        document.getElementById('roll-btn').onclick = () => rollDice();
        setupScorecard();
        
        // Initial render for safety
        handleResize();
    }
    
    function setupScorecard() {
        const container = document.getElementById('score-entries');
        container.innerHTML = '';
        
        CATEGORIES.forEach(cat => {
            if (cat === 'Sum' || cat === 'Bonus') return; 
            
            const div = document.createElement('div');
            div.className = 'score-row';
            div.id = 'cat-' + cat;
            div.innerHTML = '<span>' + cat + '</span><span class=\'val\'>-</span>';
            div.onclick = () => selectCategory(cat);
            container.appendChild(div);
        });
    }

    function startGame() {
        if (window.GameUI) window.GameUI.hideStartScreen();
        
        // Reset
        scores = {};
        totalScore = 0;
        resetTurn();
        updateScoreUI();
    }
    
    function resetTurn() {
        dice = [1, 1, 1, 1, 1];
        locked = [false, false, false, false, false];
        rollsLeft = 3;
        rollDice(true); // Initial roll
    }

    function handleResize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        calcDicePositions();
    }
    
    function calcDicePositions() {
        const totalW = (DICE_SIZE * 5) + (SPACING * 4);
        const startX = (canvas.width - totalW) / 2;
        const y = canvas.height / 2 - DICE_SIZE / 2;
        
        diceRects = [];
        for(let i=0; i<5; i++) {
            diceRects.push({
                x: startX + i * (DICE_SIZE + SPACING),
                y: y,
                w: DICE_SIZE,
                h: DICE_SIZE
            });
        }
    }
    
    function handleInput(e) {
        if (rollsLeft === 3 && !isRolling) return; 
        
        const rect = canvas.getBoundingClientRect();
        let x, y;
        if (e.touches && e.touches.length > 0) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        
        for(let i=0; i<5; i++) {
            const d = diceRects[i];
            if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) {
                if (rollsLeft < 3) { 
                    locked[i] = !locked[i];
                }
            }
        }
    }
    
    function rollDice(force=false) {
        if (isRolling) return;
        if ((rollsLeft <= 0 && !force) && !force) return;
        
        isRolling = true;
        rollsLeft--;
        document.getElementById('rolls-left').innerText = rollsLeft;
        
        // Animate
        let frames = 0;
        const interval = setInterval(() => {
            frames++;
            for(let i=0; i<5; i++) {
                if (!locked[i] || force) {
                    dice[i] = Math.ceil(Math.random() * 6);
                }
            }
            if (frames > 20) {
                clearInterval(interval);
                isRolling = false;
                calculatePotentials();
            }
        }, 30);
    }
    
    function calculatePotentials() {
        if (Object.keys(scores).length >= 13) return; 
        
        CATEGORIES.forEach(cat => {
            if (scores[cat] !== undefined) return; 
            if (cat === 'Sum' || cat === 'Bonus') return;
            
            const el = document.querySelector('#cat-' + cat + ' .val');
            if (el) {
                const pot = getScoreFor(cat);
                el.innerText = pot;
                el.classList.add('potential');
            }
        });
    }
    
    function selectCategory(cat) {
        if (isRolling) return;
        if (scores[cat] !== undefined) return;
        
        // Confirm score
        const s = getScoreFor(cat);
        scores[cat] = s;
        totalScore += s;
        
        // Update UI row
        const row = document.getElementById('cat-' + cat);
        row.classList.add('filled');
        row.querySelector('.val').innerText = s;
        row.querySelector('.val').classList.remove('potential');
        
        // Clear potentials
        document.querySelectorAll('.potential').forEach(el => el.innerText = '-');
        
        document.getElementById('grand-total').innerText = totalScore;
        
        // Check End Game
        const filled = Object.keys(scores).length;
        if (filled >= 13) { 
            setTimeout(() => {
                if (window.GameUI) window.GameUI.showGameOverScreen(totalScore);
            }, 1000);
        } else {
            resetTurn(); 
        }
    }
    
    function getScoreFor(cat) {
        const counts = [0,0,0,0,0,0,0];
        dice.forEach(d => counts[d]++);
        const sum = dice.reduce((a,b)=>a+b,0);
        
        switch(cat) {
            case 'Ones': return counts[1] * 1;
            case 'Twos': return counts[2] * 2;
            case 'Threes': return counts[3] * 3;
            case 'Fours': return counts[4] * 4;
            case 'Fives': return counts[5] * 5;
            case 'Sixes': return counts[6] * 6;
            
            case 'ThreeKind': return counts.some(c=>c>=3) ? sum : 0;
            case 'FourKind': return counts.some(c=>c>=4) ? sum : 0;
            case 'FullHouse': return (counts.some(c=>c===3) && counts.some(c=>c===2)) ? 25 : 0;
            case 'SmallStr': return checkStraight(counts) >= 4 ? 30 : 0;
            case 'LargeStr': return checkStraight(counts) >= 5 ? 40 : 0;
            case 'M_Chance': return sum;
            case 'RNG_Proto': return counts.some(c=>c===5) ? 50 : 0; // Yahtzee
            default: return 0;
        }
    }
    
    function checkStraight(counts) {
        let maxRun = 0;
        let run = 0;
        for(let i=1; i<=6; i++) {
            if (counts[i] > 0) run++;
            else run = 0;
            if (run > maxRun) maxRun = run;
        }
        return maxRun;
    }
    
    function updateScoreUI() {
        setupScorecard();
        document.getElementById('grand-total').innerText = totalScore;
        document.getElementById('rolls-left').innerText = rollsLeft;
    }

    function loop() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw Dice
        diceRects.forEach((r, i) => {
            const val = dice[i];
            const isLocked = locked[i];
            
            ctx.save();
            ctx.translate(r.x, r.y);
            
            // Glow
            if (isLocked) {
                ctx.shadowColor = '#f00';
                ctx.shadowBlur = 20;
                ctx.strokeStyle = '#f00';
                ctx.lineWidth = 4;
            } else {
                ctx.shadowColor = '#f0f';
                ctx.shadowBlur = 10;
                ctx.strokeStyle = '#f0f';
                ctx.lineWidth = 2;
            }
            
            // Box
            ctx.fillStyle = '#100010'; 
            ctx.fillRect(0, 0, r.w, r.h);
            ctx.strokeRect(0, 0, r.w, r.h);
            
            // Dots
            ctx.fillStyle = isLocked ? '#f00' : '#f0f';
            drawDots(val, r.w);
            
            // Lock icon text
            if (isLocked) {
                ctx.font = '12px Courier New';
                ctx.fillStyle = '#f00';
                ctx.fillText('LOCKED', 10, -5);
            }
            
            ctx.restore();
        });
        
        // Rolling animation effect
        if (isRolling) {
            ctx.fillStyle = 'rgba(255, 0, 255, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    function drawDots(val, size) {
        const dotSize = size / 10;
        const c = size / 2;
        const q = size / 4;
        const tq = size * 0.75;
        
        ctx.shadowBlur = 0; // Crisp dots
        
        const dots = [];
        if (val === 1) dots.push([c, c]);
        if (val === 2) dots.push([q, q], [tq, tq]);
        if (val === 3) dots.push([q, q], [c, c], [tq, tq]);
        if (val === 4) dots.push([q, q], [tq, q], [q, tq], [tq, tq]);
        if (val === 5) dots.push([q, q], [tq, q], [c, c], [q, tq], [tq, tq]);
        if (val === 6) dots.push([q, q], [tq, q], [q, c], [tq, c], [q, tq], [tq, tq]);
        
        dots.forEach(pt => {
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], dotSize, 0, Math.PI*2);
            ctx.fill();
        });
    }

    init();
});
