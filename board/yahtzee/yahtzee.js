document.addEventListener('DOMContentLoaded', () => {
    const game = new YahtzeeGame();
});

class YahtzeeGame {
    constructor() {
        this.dice = [1, 1, 1, 1, 1];
        this.held = [false, false, false, false, false];
        this.rollsLeft = 3;
        this.turn = 1;
        this.maxTurns = 13;
        this.scores = {}; // Tracks locked scores by category key
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
        this.rollBtn.addEventListener('click', () => this.rollDice());
        this.diceElements.forEach((die, index) => {
            die.addEventListener('click', () => this.toggleHold(index));
        });
        this.scoreRows.forEach(row => {
            row.addEventListener('click', (e) => this.handleScoreClick(e));
        });
        this.restartBtn.addEventListener('click', () => this.resetGame());

        // Initialize
        this.resetGame();
    }

    resetGame() {
        this.dice = [1, 1, 1, 1, 1];
        this.held = [false, false, false, false, false]; // true if die is kept
        this.rollsLeft = 3;
        this.turn = 1;
        this.scores = {};
        this.gameOver = false;
        
        this.updateDiceUI();
        this.rollBtn.disabled = false;
        this.rollBtn.textContent = `Roll Dice (${this.rollsLeft})`;
        this.turnIndicator.textContent = `Turn: ${this.turn}/${this.maxTurns}`;
        
        // Clear scorecard
        document.querySelectorAll('.score-value').forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('filled');
        });
        document.querySelectorAll('.score-row').forEach(row => {
            row.classList.remove('filled');
        });

        this.updateTotals();
        this.modal.style.display = 'none';
        
        // Clear held status
        this.diceElements.forEach(die => die.classList.remove('selected'));
    }

    rollDice() {
        if (this.rollsLeft <= 0 || this.gameOver) return;

        // Animate roll (simple random change for effect)
        let rolls = 0;
        const interval = setInterval(() => {
            rolls++;
            this.dice.forEach((val, i) => {
                if (!this.held[i]) {
                    const tempVal = Math.floor(Math.random() * 6) + 1;
                    this.diceElements[i].textContent = tempVal;
                }
            });
            if (rolls > 5) {
                clearInterval(interval);
                this.finalizeRoll();
            }
        }, 50);
    }

    finalizeRoll() {
        // Generate actual values
        this.dice = this.dice.map((val, i) => {
            return this.held[i] ? val : Math.floor(Math.random() * 6) + 1;
        });

        this.rollsLeft--;
        this.updateDiceUI();
        this.updateControls();
        this.updatePreviewScores();
    }

    toggleHold(index) {
        if (this.rollsLeft === 3) return; // Can't hold before first roll
        
        this.held[index] = !this.held[index];
        this.diceElements[index].classList.toggle('selected', this.held[index]);
    }

    updateDiceUI() {
        this.diceElements.forEach((die, i) => {
            die.textContent = this.dice[i];
            // Here you could add logic to show pip images instead of numbers
        });
    }

    updateControls() {
        this.rollBtn.textContent = this.rollsLeft > 0 ? `Roll Dice (${this.rollsLeft})` : 'Select Score';
        this.rollBtn.disabled = this.rollsLeft === 0;
    }

    handleScoreClick(e) {
        // Can't score if you haven't rolled yet
        if (this.rollsLeft === 3) return;
        if (this.gameOver) return;

        const row = e.currentTarget;
        const category = row.dataset.category;

        if (this.scores[category] !== undefined) return; // Already filled

        // Calculate score for this category
        const score = this.calculateScore(category);
        
        // Lock in score
        this.scores[category] = score;
        
        // UI Updates
        const scoreCell = row.querySelector('.score-value');
        scoreCell.textContent = score;
        scoreCell.classList.remove('preview'); // Remove preview styling if any
        row.classList.add('filled');

        this.advanceTurn();
    }

    advanceTurn() {
        this.updateTotals();
        
        if (Object.keys(this.scores).length >= this.maxTurns) {
            this.endGame();
            return;
        }

        // Reset for next turn
        this.turn++;
        this.rollsLeft = 3;
        this.held = [false, false, false, false, false];
        this.diceElements.forEach(die => die.classList.remove('selected'));
        
        this.turnIndicator.textContent = `Turn: ${this.turn}/${this.maxTurns}`;
        this.rollBtn.disabled = false;
        this.rollBtn.textContent = `Roll Dice (3)`;

        // Clear previews
        document.querySelectorAll('.score-value').forEach(cell => {
            if (!cell.parentElement.classList.contains('filled')) {
                cell.textContent = '';
            }
        });
    }

    calculateScore(category) {
        // Count occurrences of each die value
        const counts = {};
        for(let i=1; i<=6; i++) counts[i] = 0;
        this.dice.forEach(d => counts[d]++);
        
        const sum = this.dice.reduce((a, b) => a + b, 0);

        // Pre-claculate checks
        const values = Object.values(counts);
        const has3 = values.some(c => c >= 3);
        const has4 = values.some(c => c >= 4);
        const has3Exact = values.some(c => c === 3);
        const has2Exact = values.some(c => c === 2);
        const has5 = values.some(c => c === 5);

        switch (category) {
            case 'ones': return counts[1] * 1;
            case 'twos': return counts[2] * 2;
            case 'threes': return counts[3] * 3;
            case 'fours': return counts[4] * 4;
            case 'fives': return counts[5] * 5;
            case 'sixes': return counts[6] * 6;
            
            case 'three-kind': 
                return has3 ? sum : 0;
            
            case 'four-kind':
                return has4 ? sum : 0;
            
            case 'full-house':
                // Full House is strictly 3 of one and 2 of another. 
                // Or 5 of a kind (which is technically a full house in some variants, standard rules usually allow it as a "joker" or valid full house)
                return (has3Exact && has2Exact) || has5 ? 25 : 0;
            
            case 'small-straight':
                return this.checkStraight(4) ? 30 : 0;
            
            case 'large-straight':
                return this.checkStraight(5) ? 40 : 0;
            
            case 'yahtzee':
                return has5 ? 50 : 0;
            
            case 'chance':
                return sum;
                
            default: return 0;
        }
    }

    checkStraight(length) {
        // Unique sorted dice values
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
        // Check if the run at the end satisfies condition, though loop returns early if met
        return run >= length;
    }

    updatePreviewScores() {
        // Show potential scores for empty slots
        this.scoreRows.forEach(row => {
            if (!row.classList.contains('filled')) { // Only for unfilled rows
                const category = row.dataset.category;
                const potentialScore = this.calculateScore(category);
                const cell = row.querySelector('.score-value');
                cell.textContent = potentialScore;
                cell.classList.add('preview');
            }
        });
    }

    updateTotals() {
        // Upper Section
        const upperCats = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
        let upperSum = 0;
        upperCats.forEach(cat => {
            if (this.scores[cat] !== undefined) upperSum += this.scores[cat];
        });
        
        document.getElementById('upper-sum').textContent = upperSum;
        
        const bonus = upperSum >= 63 ? 35 : 0;
        document.getElementById('upper-bonus').textContent = bonus;
        
        const upperTotal = upperSum + bonus;
        document.getElementById('upper-total').innerHTML = `<strong>${upperTotal}</strong>`;

        // Lower Section
        const lowerCats = ['three-kind', 'four-kind', 'full-house', 'small-straight', 'large-straight', 'yahtzee', 'chance'];
        let lowerTotal = 0;
        lowerCats.forEach(cat => {
            if (this.scores[cat] !== undefined) lowerTotal += this.scores[cat];
        });

        document.getElementById('lower-total').innerHTML = `<strong>${lowerTotal}</strong>`;
        
        // Grand Total
        const grandTotal = upperTotal + lowerTotal;
        document.getElementById('grand-total').innerHTML = `<strong>${grandTotal}</strong>`;
        this.currentTotalScore = grandTotal;
    }

    endGame() {
        this.gameOver = true;
        this.finalScoreSpan.textContent = this.currentTotalScore;
        this.modal.style.display = 'flex';
        this.rollBtn.disabled = true;
        this.rollBtn.textContent = 'Game Over';
    }
}
