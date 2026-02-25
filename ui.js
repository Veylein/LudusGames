
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

/* GLOBAL CSS INJECTION FOR DYNAMIC ELEMENTS */
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes floatUpFade {
        0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -150%) scale(1.5); }
    }
    .fixed-corner { 
        position: fixed !important; 
        top: 20px; 
        left: 20px; 
        z-index: 99999 !important; 
        background: rgba(0,0,0,0.8);
        color: white !important;
        padding: 10px 15px;
        border: 2px solid var(--accent-color, #00ff9d);
        border-radius: 5px;
        font-family: 'Press Start 2P', monospace;
        text-decoration: none !important;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
        cursor: pointer;
        display: block !important;
    }
    .fixed-corner:hover {
        background: var(--accent-color, #00ff9d);
        color: black !important;
    }
`;
document.head.appendChild(styleSheet);


/* NAVIGATION */
function ensureBackButton() {
    // Determine context
    const path = window.location.pathname;
    const isArcadeGame = path.includes("/arcade/") && !path.endsWith("/arcade/index.html");
    const isCardGame = path.includes("/cards/") && !path.endsWith("/cards/index.html");
    const isBoardGame = path.includes("/board/") && !path.endsWith("/board/index.html");
    
    // Only add button if we are deep in a game
    if (isArcadeGame || isCardGame || isBoardGame) {
        
        let targetUrl = "../index.html"; // Default up one level (e.g. arcade/game -> arcade/)
        
        // Remove existing to avoid dupes
        const oldBtn = document.querySelector(".back-button.fixed-corner");
        if (oldBtn) oldBtn.remove();
        
        // Find existing nav bar
        const topBar = document.querySelector(".top-bar") || document.querySelector("header.nav");
        
        if (topBar) {
            // Inject into header if it exists
            if (!topBar.querySelector(".home-button")) {
                const homeBtn = document.createElement("a");
                homeBtn.href = targetUrl;
                homeBtn.className = "home-button";
                homeBtn.innerHTML = "🏠"; 
                homeBtn.title = "Back";
                Object.assign(homeBtn.style, {
                    marginLeft: "auto", fontSize: "24px", 
                    textDecoration: "none", cursor: "pointer",
                    filter: "drop-shadow(0 0 5px var(--accent-color))"
                });
                topBar.appendChild(homeBtn);
            }
        } else {
            // Floating button fallback
            const btn = document.createElement("a");
            btn.href = targetUrl;
            btn.className = "back-button fixed-corner";
            btn.innerHTML = "🏠 EXIT";
            document.body.appendChild(btn);
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
            const scripts = document.body.querySelectorAll('script');
            const scriptPromises = [];

            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                const src = oldScript.getAttribute('src');

                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });

                if (src && src.includes('ui.js')) return;

                if (src) {
                    newScript.src = src; 
                    scriptPromises.push(new Promise(resolve => {
                        newScript.onload = resolve;
                        newScript.onerror = resolve; // Continue even if error
                    }));
                } else {
                    newScript.textContent = oldScript.textContent;
                }
                
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });
            
            // Wait for scripts to load
            Promise.all(scriptPromises).then(() => {
                const event = document.createEvent("Event");
                event.initEvent("DOMContentLoaded", true, true);
                document.dispatchEvent(event);
                
                const loadEvent = document.createEvent("Event");
                loadEvent.initEvent("load", true, true);
                window.dispatchEvent(loadEvent);
            });

            // 4. RE-INIT GLOBALS
            if (typeof initTheme === 'function') initTheme();
            if (typeof initStyle === 'function') initStyle();
            if (typeof initFontTheme === 'function') initFontTheme();
            if (typeof initDifficulty === 'function') initDifficulty();
            
            if (typeof ensureBackButton === 'function') ensureBackButton();
            
            // Ensure Mobile Controls are injected/hooked up
            if (typeof ensureMobileControls === 'function') ensureMobileControls();

            window.scrollTo(0, 0);

        } catch (err) {
            console.error('SPA Navigation Error:', err);
            window.location.href = url; // Fallback
        }
    }
})();


/* --- UNIVERSAL MOBILE CONTROLS INJECTOR --- */
function ensureMobileControls() {
    // Only run for arcade games
    // Note: We check if path includes /arcade/ OR body has theme-arcade
    // But sometimes theme isn't applied yet. Path is safer.
    if (!window.location.href.includes('/arcade/') && !document.body.classList.contains('theme-arcade')) return;

    let container = document.querySelector('.mobile-controls');
    
    // If container doesn't exist, create it
    if (!container) {
        container = document.createElement('div');
        container.className = 'mobile-controls';
        document.body.appendChild(container);
    }
    
    // If container is empty (or we just created it), populate standard D-Pad
    if (!container.querySelector('button')) {
        console.log('Injecting Universal Mobile Controls...');
        container.innerHTML = `
            <button id="up-btn" data-key="ArrowUp" style="grid-area: up;">▲</button>
            <button id="left-btn" data-key="ArrowLeft" style="grid-area: left;">◀</button>
            <button id="down-btn" data-key="ArrowDown" style="grid-area: down;">▼</button>
            <button id="right-btn" data-key="ArrowRight" style="grid-area: right;">▶</button>
        `;
    }

    // Bind events - UNIVERSAL SIMULATION
    const buttons = container.querySelectorAll('button');
    buttons.forEach(btn => {
        // Determine key code
        let code = btn.getAttribute('data-key');
        if (!code) {
            if (btn.id === 'up-btn') code = 'ArrowUp';
            else if (btn.id === 'down-btn') code = 'ArrowDown';
            else if (btn.id === 'left-btn') code = 'ArrowLeft';
            else if (btn.id === 'right-btn') code = 'ArrowRight';
        }
        if (!code) return;

        // Simulator function
        const simulate = (type) => {
            const eventOpts = {
                key: code,
                code: code,
                bubbles: true,
                cancelable: true,
                view: window
            };
            
            // Legacy keyCode support
            if (code === 'ArrowUp') eventOpts.keyCode = 38;
            if (code === 'ArrowDown') eventOpts.keyCode = 40;
            if (code === 'ArrowLeft') eventOpts.keyCode = 37;
            if (code === 'ArrowRight') eventOpts.keyCode = 39;
            
            const event = new KeyboardEvent(type, eventOpts);
            document.dispatchEvent(event);
            window.dispatchEvent(event); 
        };

        const handleStart = (e) => {
            // e.preventDefault(); // CAREFUL: blocking default might stop scrolling on some pages?
            // But for games, we DON'T want scrolling when pressing controls.
            if(e.cancelable) e.preventDefault(); 
            
            simulate('keydown');
            btn.classList.add('active');
        };
        
        const handleEnd = (e) => {
            if(e.cancelable) e.preventDefault();
            simulate('keyup');
            btn.classList.remove('active');
        };

        // Attach listeners (overwrite if needed to avoid duplicates)
        btn.onmousedown = handleStart;
        btn.ontouchstart = handleStart; // Passive: false by default for on-prop?
        
        btn.onmouseup = handleEnd;
        btn.ontouchend = handleEnd;
        btn.onmouseleave = handleEnd;
        
        // Stop click propagation
        btn.onclick = (e) => e.stopPropagation();
    });
}

// Run on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureMobileControls);
} else {
    ensureMobileControls();
}
