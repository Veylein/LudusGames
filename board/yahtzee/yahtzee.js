console.log("Game loaded: yahtzee.js");
{ // SCOPE START

// Class definition inside the scope
class YahtzeeGame {
    constructor() {
        if (!document.getElementById('turn-indicator')) return; // Guard in constructor too

        this.dice = [1, 1, 1, 1, 1];
        this.held = [false, false, false, false, false];
        this.rollsLeft = 3;
        this.turn = 1;
        this.maxTurns = 13;
        this.scores = {}; 
        this.gameOver = false;
        
        // DOM Elements
        this.rollBtn = document.getElementById('roll-btn');
        this.diceElements = Array.from(document.querySelectorAll('.die'));
        this.scoreRows = document.querySelectorAll('.score-row');
        this.turnIndicator = document.getElementById('turn-indicator');
        this.modal = document.getElementById('game-over-modal');
        this.finalScoreSpan = document.getElementById('final-score');
        this.restartBtn = document.getElementById('restart-btn');

        // Bind Events
        if (this.rollBtn) this.rollBtn.onclick = () => this.rollDice();
        this.diceElements.forEach((die, index) => {
            die.onclick = () => this.toggleHold(index);
        });
        this.scoreRows.forEach(row => {
            row.onclick = (e) => this.handleScoreClick(e);
        });
        if (this.restartBtn) this.restartBtn.onclick = () => this.resetGame();

        // Initialize
        this.resetGame();
    }

    resetGame() {
        this.dice = [1, 1, 1, 1, 1];
        this.held = [false, false, false, false, false]; 
        this.rollsLeft = 3;
        this.turn = 1;
        this.scores = {};
        this.gameOver = false;
        
        // Clear scorecard
        document.querySelectorAll('.score-value').forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('filled');
            cell.classList.remove('preview');
        });
        document.querySelectorAll('.score-row').forEach(row => {
            row.classList.remove('filled');
        });

        this.updateTotals();
        if (this.modal) this.modal.style.display = 'none';
        
        // Clear held status
        this.diceElements.forEach(die => die.classList.remove('selected'));
        
        this.updateDiceUI();
        if (this.rollBtn) {
            this.rollBtn.disabled = false;
            this.rollBtn.textContent = `Roll Dice (${this.rollsLeft})`;
        }
        if (this.turnIndicator) this.turnIndicator.textContent = `Turn: ${this.turn}/${this.maxTurns}`;
    }

    rollDice() {
        if (this.rollsLeft <= 0 || this.gameOver) return;

        let rolls = 0;
        const interval = setInterval(() => {
            rolls++;
            this.dice.forEach((val, i) => {
                if (!this.held[i] && this.diceElements[i]) {
                    const tempVal = Math.floor(Math.random() * 6) + 1;
                    this.diceElements[i].textContent = tempVal;
                }
            });
            if (rolls > 10) {
                clearInterval(interval);
                this.finalizeRoll();
            }
        }, 50);
    }

    finalizeRoll() {
        this.dice = this.dice.map((val, i) => {
            return this.held[i] ? val : Math.floor(Math.random() * 6) + 1;
        });

        this.rollsLeft--;
        this.updateDiceUI();
        this.updateControls();
        this.updatePreviewScores();
    }

    toggleHold(index) {
        if (this.rollsLeft === 3 && this.turn <= this.maxTurns) {
             // In some rules you can hold before rolling? Usually not.
             // But let's allow toggling if they re-thought their hold?
             // Actually standard rule: you roll, then hold.
             // But after turn start (rollsLeft=3), you haven't rolled yet.
             return; 
        }
        if (this.gameOver) return;
        
        this.held[index] = !this.held[index];
        if (this.diceElements[index]) this.diceElements[index].classList.toggle('selected', this.held[index]);
    }

    updateDiceUI() {
        this.diceElements.forEach((die, i) => {
            if (die) die.textContent = this.dice[i];
        });
    }

    updateControls() {
        if (!this.rollBtn) return;
        this.rollBtn.textContent = this.rollsLeft > 0 ? `Roll Dice (${this.rollsLeft})` : 'Select Score';
        this.rollBtn.disabled = this.rollsLeft === 0;
    }

    handleScoreClick(e) {
        if (this.rollsLeft === 3 && !this.gameOver) return; // Must roll at least once
        if (this.gameOver) return;

        const row = e.currentTarget;
        const category = row.dataset.category; // Uses data-category

        // If clicking on row, sometimes target is child. currentTarget is row.
        if (this.scores[category] !== undefined) return; 

        // Calculate actual score to lock in
        const score = this.calculateScore(category);
        
        this.scores[category] = score;
        
        const scoreCell = row.querySelector('.score-value');
        if (scoreCell) {
            scoreCell.textContent = score;
            scoreCell.classList.remove('preview');
        }
        row.classList.add('filled');

        this.advanceTurn();
    }

    advanceTurn() {
        this.updateTotals();
        
        // Check if game over (13 categories filled)
        // We can just check number of keys in scores
        // But categories names are fixed.
        if (Object.keys(this.scores).length >= 13) { // 13 categories
            this.endGame();
            return;
        }

        this.turn++;
        this.rollsLeft = 3;
        this.held = [false, false, false, false, false];
        this.diceElements.forEach(die => die.classList.remove('selected'));
        
        if (this.turnIndicator) this.turnIndicator.textContent = `Turn: ${this.turn}/${this.maxTurns}`;
        if (this.rollBtn) {
            this.rollBtn.disabled = false;
            this.rollBtn.textContent = `Roll Dice (3)`;
        }

        // Clear previews
        document.querySelectorAll('.score-value').forEach(cell => {
            if (cell.parentElement && !cell.parentElement.classList.contains('filled')) {
                cell.textContent = '';
                cell.classList.remove('preview');
            }
        });
    }

    calculateScore(category) {
        const counts = {};
        for(let i=1; i<=6; i++) counts[i] = 0;
        this.dice.forEach(d => counts[d]++);
        
        const sum = this.dice.reduce((a, b) => a + b, 0);
        const values = Object.values(counts); // array of counts
        
        const has3 = values.some(c => c >= 3);
        const has4 = values.some(c => c >= 4);
        const has5 = values.some(c => c === 5);
        
        // Full House: 3 of one, 2 of another. Or 5 of one (Joker rule usually applies but simpler here)
        // Standard FH is 25.
        const has3Exact = values.some(c => c === 3);
        const has2Exact = values.some(c => c === 2);
        const isFullHouse = (has3Exact && has2Exact) || has5;

        // Small Straight (4 consecutive)
        // Large Straight (5 consecutive)
        
        switch (category) {
            case 'ones': return counts[1] * 1;
            case 'twos': return counts[2] * 2;
            case 'threes': return counts[3] * 3;
            case 'fours': return counts[4] * 4;
            case 'fives': return counts[5] * 5;
            case 'sixes': return counts[6] * 6;
            
            case 'three-kind': return has3 ? sum : 0;
            case 'four-kind': return has4 ? sum : 0;
            case 'full-house': return isFullHouse ? 25 : 0;
            case 'small-straight': return this.checkStraight(4) ? 30 : 0;
            case 'large-straight': return this.checkStraight(5) ? 40 : 0;
            case 'yahtzee': return has5 ? 50 : 0;
            case 'chance': return sum;
                
            default: return 0;
        }
    }

    checkStraight(length) {
        const unique = [...new Set(this.dice)].sort((a,b) => a-b);
        let run = 1;
        for (let i = 0; i < unique.length - 1; i++) {
            if (unique[i+1] === unique[i] + 1) {
                run++;
                if (run >= length) return true;
            } else {
                run = 1;
            }
        }
        return run >= length;
    }

    updatePreviewScores() {
        this.scoreRows.forEach(row => {
            if (!row.classList.contains('filled')) { 
                const category = row.dataset.category;
                const potentialScore = this.calculateScore(category);
                const cell = row.querySelector('.score-value');
                if (cell) {
                    cell.textContent = potentialScore;
                    cell.classList.add('preview');
                }
            }
        });
    }

    updateTotals() {
        const upperCats = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
        let upperSum = 0;
        upperCats.forEach(cat => {
            if (this.scores[cat] !== undefined) upperSum += this.scores[cat];
        });
        
        const upperSumEl = document.getElementById('upper-sum');
        if (upperSumEl) upperSumEl.textContent = upperSum;
        
        const bonus = upperSum >= 63 ? 35 : 0;
        const upperBonusEl = document.getElementById('upper-bonus');
        if (upperBonusEl) upperBonusEl.textContent = bonus;
        
        const upperTotal = upperSum + bonus;
        const upperTotalEl = document.getElementById('upper-total');
        if (upperTotalEl) upperTotalEl.innerHTML = `<strong>${upperTotal}</strong>`;

        const lowerCats = ['three-kind', 'four-kind', 'full-house', 'small-straight', 'large-straight', 'yahtzee', 'chance'];
        let lowerTotal = 0;
        lowerCats.forEach(cat => {
            if (this.scores[cat] !== undefined) lowerTotal += this.scores[cat];
        });

        const lowerTotalEl = document.getElementById('lower-total');
        if (lowerTotalEl) lowerTotalEl.innerHTML = `<strong>${lowerTotal}</strong>`;
        
        const grandTotal = upperTotal + lowerTotal;
        const grandTotalEl = document.getElementById('grand-total');
        if (grandTotalEl) grandTotalEl.innerHTML = `<strong>${grandTotal}</strong>`;
        
        this.currentTotalScore = grandTotal;
    }

    endGame() {
        this.gameOver = true;
        if (this.finalScoreSpan) this.finalScoreSpan.textContent = this.currentTotalScore;
        if (this.modal) this.modal.style.display = 'flex';
        if (this.rollBtn) {
            this.rollBtn.disabled = true;
            this.rollBtn.textContent = 'Game Over';
        }
    }
}

// Start Game Logic
if (document.getElementById('turn-indicator')) {
    new YahtzeeGame();
}

} // SCOPE END
