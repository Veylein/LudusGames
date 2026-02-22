
/* GLOBAL UI & GAME LOGIC */

document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initFontTheme(); // Added font theme init
    initDifficulty();
    initPoints();
    ensureBackButton();
});

/* THEME SYSTEM */
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "theme-classic";
    // Remove old theme classes but keep others
    document.body.classList.remove("theme-classic", "theme-relaxation", "theme-arcade", "theme-casino", "theme-yacht", "theme-dark", "theme-light", "theme-holo", "theme-rainbow", "theme-opal-fire");
    document.body.classList.add(savedTheme);

    const themeBtn = document.getElementById("themeBtn");
    const themeDropdown = document.querySelector(".theme-dropdown"); // This selects only the FIRST theme dropdown
    
    if (themeBtn && themeDropdown) {
        // Toggle theme dropdown
        themeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            // Close other dropdowns if open (like font dropdown)
            document.querySelectorAll('.font-dropdown.open').forEach(el => {
                el.classList.remove('open');
            });
            themeDropdown.classList.toggle("open");
        });

        // Close when clicking outside
        document.addEventListener("click", (e) => {
            if (!themeDropdown.contains(e.target) && !e.target.closest('#themeBtn')) {
                themeDropdown.classList.remove("open");
            }
        });

        const themeOptions = themeDropdown.querySelectorAll("button");
        themeOptions.forEach(btn => {
            btn.addEventListener("click", () => {
                const newTheme = btn.dataset.theme;
                if (newTheme) {
                    // Remove old themes, keep utility classes
                    document.body.classList.remove("theme-classic", "theme-relaxation", "theme-arcade", "theme-casino", "theme-yacht", "theme-dark", "theme-light", "theme-holo", "theme-rainbow", "theme-opal-fire");
                    document.body.classList.add(newTheme);
                    localStorage.setItem("theme", newTheme);
                    themeDropdown.classList.remove("open"); // Auto-close
                }
            });
        });
    }
}

/* FONT THEME SYSTEM */
function initFontTheme() {
    const savedFont = localStorage.getItem("fontTheme") || "retro"; // Default to retro
    document.body.setAttribute("data-font", savedFont);

    const fontBtn = document.getElementById("fontBtn");
    const fontDropdown = document.querySelector(".font-dropdown");
    
    if (fontBtn && fontDropdown) {
        fontBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            // Close other dropdowns
            document.querySelectorAll('.theme-dropdown.open').forEach(el => {
                el.classList.remove('open');
            });
            fontDropdown.classList.toggle("open");
        });

        document.addEventListener("click", (e) => {
           if (!fontDropdown.contains(e.target) && !e.target.closest('#fontBtn')) {
                fontDropdown.classList.remove("open");
            }
        });

        const fontOptions = fontDropdown.querySelectorAll("button");
        fontOptions.forEach(btn => {
            btn.addEventListener("click", () => {
                const newFont = btn.dataset.font;
                if (newFont) {
                    document.body.setAttribute("data-font", newFont);
                    localStorage.setItem("fontTheme", newFont);
                    fontDropdown.classList.remove("open");
                }
            });
        });
    }
}

/* DIFFICULTY SYSTEM */
const DIFFICULTIES = ["Apprentice", "Gambler", "Ruthless"];
let currentDifficulty = parseInt(localStorage.getItem("difficulty") || "0");

function initDifficulty() {
    const diffSelect = document.getElementById("difficultySelect");
    if (diffSelect) {
        diffSelect.value = currentDifficulty;
        diffSelect.addEventListener("change", (e) => {
            currentDifficulty = parseInt(e.target.value);
            localStorage.setItem("difficulty", currentDifficulty);
            updateDifficultyLabel();
        });
        updateDifficultyLabel();
    }
}

function updateDifficultyLabel() {
    const label = document.getElementById("difficultyLabel");
    if (label) {
        label.innerText = DIFFICULTIES[currentDifficulty];
        label.className = `difficulty-label diff-${currentDifficulty}`;
    }
}

function getDifficulty() {
    return parseInt(localStorage.getItem("difficulty") || "0");
}

/* POINT SYSTEM */
let userPoints = parseInt(localStorage.getItem("userPoints") || "1000");

function initPoints() {
    updatePointsDisplay();
}

function addPoints(amount) {
    userPoints += amount;
    if (userPoints <= 0) {
        userPoints = 500; // Bankruptcy protection
        setTimeout(() => alert("BANKRUPT! The house gives you 500 pity credits."), 500);
    }
    localStorage.setItem("userPoints", userPoints);
    updatePointsDisplay();
    showFloatText(amount > 0 ? `+${amount}` : amount, amount > 0 ? "var(--text-color)" : "red");
}

function updatePointsDisplay() {
    const displays = document.querySelectorAll(".points-display");
    displays.forEach(d => d.innerText = userPoints.toLocaleString());
}

function showFloatText(text, color) {
    const floater = document.createElement("div");
    floater.innerText = text;
    Object.assign(floater.style, {
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", color: color,
        fontSize: "2rem", fontWeight: "bold", textShadow: "2px 2px 0 #000",
        pointerEvents: "none", zIndex: "9999",
        animation: "floatUpFade 1.5s ease-out forwards"
    });
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 1500);
}

const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes floatUpFade {
    0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -150%) scale(1.5); }
}
.fixed-corner { position: fixed !important; top: 20px; left: 20px; z-index: 1000; }
`;
document.head.appendChild(styleSheet);


/* NAVIGATION */
function ensureBackButton() {
    // Only run in sub-pages
    if (window.location.pathname.includes("/cards/") || window.location.pathname.includes("/board/") || window.location.pathname.includes("/connections/")) {
        
        // Remove old 'EXIT' button if it was auto-created previously to avoid dupes
        const oldBtn = document.querySelector(".back-button.fixed-corner");
        if (oldBtn) oldBtn.remove();

        // Find the top bar to inject the home button
        const topBar = document.querySelector(".top-bar");
        if (topBar) {
            // Check if home button already exists
            if (!topBar.querySelector(".home-button")) {
                const homeBtn = document.createElement("a");
                homeBtn.href = "../index.html";
                homeBtn.className = "home-button";
                homeBtn.innerHTML = "🏠"; // House Emoji
                homeBtn.title = "Back to Arcade";
                
                // Style it right here or via class
                homeBtn.style.marginLeft = "auto"; // Push to right if flex
                homeBtn.style.fontSize = "24px";
                homeBtn.style.textDecoration = "none";
                homeBtn.style.filter = "drop-shadow(0 0 5px var(--accent-color))";
                
                topBar.appendChild(homeBtn);
            }
        } else {
            // Fallback if no top-bar (unlikely given our structure, but safe)
            let btn = document.querySelector(".back-button");
            if (!btn) {
                btn = document.createElement("a");
                btn.href = "../index.html";
                btn.className = "back-button fixed-corner";
                btn.innerText = "🏠 EXIT";
                document.body.appendChild(btn);
            }
        }
    }
}

// Make globals available
window.addPoints = addPoints;
window.getPoints = () => userPoints;
window.getDifficulty = getDifficulty;

