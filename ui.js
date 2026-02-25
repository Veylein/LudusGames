
/* GLOBAL UI & GAME LOGIC */

document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initStyle(); // Added Style init
    initFontTheme(); 
    initDifficulty();
    initPoints();
    ensureBackButton();
});

/* THEME SYSTEM (Colors) */
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "theme-dark"; // Default to dark
    
    // Remove old theme classes (colors)
    document.body.classList.remove("theme-dark", "theme-light", "theme-holo", "theme-rainbow", "theme-opal-fire");
    document.body.classList.add(savedTheme);

    const themeBtn = document.getElementById("themeBtn");
    const themeDropdown = document.querySelector(".theme-dropdown");
    
    if (themeBtn && themeDropdown) {
        themeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            closeAllDropdowns([themeDropdown]);
            themeDropdown.classList.toggle("open");
        });

        const themeOptions = themeDropdown.querySelectorAll("button");
        themeOptions.forEach(btn => {
            btn.addEventListener("click", () => {
                const newTheme = btn.dataset.theme;
                if (newTheme) {
                    document.body.classList.remove("theme-dark", "theme-light", "theme-holo", "theme-rainbow", "theme-opal-fire");
                    document.body.classList.add(newTheme);
                    localStorage.setItem("theme", newTheme);
                    themeDropdown.classList.remove("open");
                }
            });
        });
    }
}

/* STYLE SYSTEM (Backgrounds/Atmosphere) */
function initStyle() {
    const savedStyle = localStorage.getItem("gameStyle") || "style-classic"; // Default
    // Use data attribute for style to simplify CSS selectors and separate from classes
    document.body.setAttribute("data-style", savedStyle);

    const styleBtn = document.getElementById("styleBtn");
    const styleDropdown = document.querySelector(".style-dropdown");
    
    if (styleBtn && styleDropdown) {
        styleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            closeAllDropdowns([styleDropdown]);
            styleDropdown.classList.toggle("open");
        });

        const styleOptions = styleDropdown.querySelectorAll("button");
        styleOptions.forEach(btn => {
            btn.addEventListener("click", () => {
                const newStyle = btn.dataset.style;
                if (newStyle) {
                    document.body.setAttribute("data-style", newStyle);
                    localStorage.setItem("gameStyle", newStyle);
                    styleDropdown.classList.remove("open");
                }
            });
        });
    }
}

function closeAllDropdowns(except = []) {
    const all = document.querySelectorAll('.theme-dropdown, .style-dropdown, .font-dropdown');
    all.forEach(el => {
        if (!except.includes(el)) el.classList.remove('open');
    });
}

/* FONT THEME SYSTEM */
function initFontTheme() {
    const savedFont = localStorage.getItem("fontTheme") || "retro"; 
    document.body.setAttribute("data-font", savedFont);

    const fontBtn = document.getElementById("fontBtn");
    const fontDropdown = document.querySelector(".font-dropdown");
    
    if (fontBtn && fontDropdown) {
        fontBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            closeAllDropdowns([fontDropdown]);
            fontDropdown.classList.toggle("open");
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

/* Global Click to Close Dropdowns */
document.addEventListener("click", (e) => {
    if (!e.target.closest('.theme-dropdown') && !e.target.closest('.style-dropdown') && !e.target.closest('.font-dropdown')) {
        closeAllDropdowns();
    }
});


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
    // Only run in sub-pages (Added /arcade/)
    if (window.location.pathname.includes("/cards/") || window.location.pathname.includes("/board/") || window.location.pathname.includes("/connections/") || window.location.pathname.includes("/arcade/")) {
        
        // Remove old 'EXIT' button if it was auto-created previously to avoid dupes
        const oldBtn = document.querySelector(".back-button.fixed-corner");
        if (oldBtn) oldBtn.remove();

        // Find the top bar to inject the home button
        // Compatible with both .top-bar and header.nav
        const topBar = document.querySelector(".top-bar") || document.querySelector("header.nav");
        
        if (topBar) {
            // Check if home button already exists
            if (!topBar.querySelector(".home-button")) {
                const homeBtn = document.createElement("a");
                // Determine target based on depth?
                // For arcade games (depth 2), we want to go back to arcade root (depth 1)
                // ../index.html usually works relative to current file.
                homeBtn.href = "../index.html"; 
                homeBtn.className = "home-button";
                homeBtn.innerHTML = "🏠"; // House Emoji
                homeBtn.title = "Back";
                
                // Style it right here or via class
                homeBtn.style.marginLeft = "auto"; // Push to right if flex
                homeBtn.style.fontSize = "24px";
                homeBtn.style.textDecoration = "none";
                homeBtn.style.filter = "drop-shadow(0 0 5px var(--accent-color))";
                homeBtn.style.cursor = "pointer";
                
                topBar.appendChild(homeBtn);
            }
        } else {
            // Fallback if no top-bar (Arcade Cabinet screens usually need this)
            let btn = document.querySelector(".back-button");
            if (!btn) {
                btn = document.createElement("a");
                // If we are deep in arcade/galaga/, ../index.html -> arcade/index.html. Perfect.
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

/* FIX: Ensure sub-pages aren't hidden by 'lobby-page' CSS or stale overlays */
if (window.location.pathname.includes("/cards/") || window.location.pathname.includes("/board/") || window.location.pathname.includes("/arcade/") || window.location.pathname.includes("/connections/")) {
    // 1. Remove 'lobby-page' class to unhide .hero
    document.body.classList.remove("lobby-page");
    
    // 2. Force display of .hero content
    const hero = document.querySelector(".hero");
    if (hero) hero.style.display = "block";

    // 3. Remove any lingering lobby overlay if copied by mistake
    const lobbyOverlay = document.querySelector(".lobby-wrapper");
    if (lobbyOverlay) lobbyOverlay.remove();
}


/* AUTOMATIC SPA NAVIGATION HANDLER (FOR DISCORD & IFRAMES) */
(function() {
    // Prevent multiple initializations if script re-runs
    if (window.LUDUS_SPA_ACTIVE) return;
    window.LUDUS_SPA_ACTIVE = true;
    
    console.log("Ludus SPA Navigation Active");

    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link || !link.href) return;
        
        // Handle base-relative URLs
        const url = new URL(link.href, window.location.href);
        
        // Only internal links
        if (url.origin !== window.location.origin) return; 

        // Only HTML navigations
        if (url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
            e.preventDefault();
            navigateTo(url.href);
        }
    });

    window.addEventListener('popstate', function(e) {
        if (e.state && e.state.url) {
            loadPageContent(e.state.url);
        } else {
             loadPageContent(window.location.href);
        }
    });

    async function navigateTo(url) {
        window.history.pushState({url: url}, '', url);
        await loadPageContent(url);
    }

    async function loadPageContent(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');

            document.title = doc.title;

            // 1. UPDATE STYLES (HEAD)
            // Preserve global styles, swap page-specific ones
            // Simple heuristic to avoid removing global styles:
            // - Keep any link with 'style.css' or 'themes.css' in href
            // - Remove others, add new ones from doc
            
            const currentLinks = Array.from(document.head.querySelectorAll('link[rel="stylesheet"]'));
            const newLinks = Array.from(doc.head.querySelectorAll('link[rel="stylesheet"]'));
            
            // Remove old page-specific styles
            currentLinks.forEach(link => {
                const isGlobal = link.href.includes('style.css') || link.href.includes('themes.css');
                if (!isGlobal) link.remove();
            });

            // Add new page-specific styles
            newLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (!href) return;
                
                const isGlobal = href.includes('style.css') || href.includes('themes.css');
                if (!isGlobal) {
                    const newLink = document.createElement('link');
                    newLink.rel = 'stylesheet';
                    newLink.href = href; // Browser resolves relative to new current URL (set by pushState)
                    document.head.appendChild(newLink);
                }
            });
            
            // 2. REPLACE BODY CONTENT
            document.body.innerHTML = doc.body.innerHTML;
            document.body.className = doc.body.className;

            // 3. RE-EXECUTE SCRIPTS (CRITICAL)
            // We must manually recreate script tags for them to execute
            const scripts = document.body.querySelectorAll('script');

            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                const src = oldScript.getAttribute('src');

                // Copy all attributes
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });

                // Skip recursively loading ui.js
                if (src && src.includes('ui.js')) return;

                if (src) {
                    newScript.src = src; // Browser resolves relative to new current URL
                } else {
                    newScript.textContent = oldScript.textContent;
                }
                
                // Replace in DOM to execute
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });

            // 4. RE-INIT GLOBALS
            if (typeof initTheme === 'function') initTheme();
            if (typeof initStyle === 'function') initStyle();
            if (typeof initFontTheme === 'function') initFontTheme();
            if (typeof initDifficulty === 'function') initDifficulty();
            
            // Special: Re-run ensureBackButton logic
            if (typeof ensureBackButton === 'function') ensureBackButton();

            window.scrollTo(0, 0);

        } catch (err) {
            console.error('SPA Navigation Error:', err);
            window.location.href = url; // Fallback
        }
    }
})();

