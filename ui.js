
/* --- SPA CLEANUP MANAGER --- */
// This must be initialized early to wrap global timing/event functions to allow cleanup on navigation.
const PageCleanupManager = {
    intervals: new Set(),
    timeouts: new Set(),
    animationFrames: new Set(),
    eventListeners: [], // Store {target, type, listener, options}

    init: function() {
        if (window.cleanupManagerInitialized) return;
        window.cleanupManagerInitialized = true;

        // Wrap setInterval
        const originalSetInterval = window.setInterval;
        window.setInterval = (callback, delay, ...args) => {
            const id = originalSetInterval(callback, delay, ...args);
            this.intervals.add(id);
            return id;
        };
        const originalClearInterval = window.clearInterval;
        window.clearInterval = (id) => {
            originalClearInterval(id);
            this.intervals.delete(id);
        };

        // Wrap setTimeout
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = (callback, delay, ...args) => {
            const id = originalSetTimeout((...cbArgs) => {
                this.timeouts.delete(id);
                callback(...cbArgs);
            }, delay, ...args);
            this.timeouts.add(id);
            return id;
        };
        const originalClearTimeout = window.clearTimeout;
        window.clearTimeout = (id) => {
            originalClearTimeout(id);
            this.timeouts.delete(id);
        };

        // Wrap requestAnimationFrame
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = (callback) => {
            const id = originalRAF((timestamp) => {
                this.animationFrames.delete(id);
                callback(timestamp);
            });
            this.animationFrames.add(id);
            return id;
        };
        const originalCAF = window.cancelAnimationFrame;
        window.cancelAnimationFrame = (id) => {
            originalCAF(id);
            this.animationFrames.delete(id);
        };

        // Wrap addEventListener (optional but recommended for global listeners)
        // We only want to auto-remove listeners attached by page scripts, not UI infrastructure.
        // However, distinguishing them is hard.
        // Strategy: We only clear listeners on 'window' and 'document' that are likely game-related (keydown, resize, etc)
        // Or we clear ALL and re-init UI specific ones? No, UI.js has init logic.
        
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

        EventTarget.prototype.addEventListener = function(type, listener, options) {
            // Track listeners on window and document only, to avoid mem leaks from game logic
            if (this === window || this === document || this === document.body) {
                // Ignore our own internal events or critical ones?
                // For now, track everything. We can filter during cleanup.
                PageCleanupManager.eventListeners.push({
                    target: this,
                    type: type,
                    listener: listener,
                    options: options
                });
            }
            return originalAddEventListener.call(this, type, listener, options);
        };

        EventTarget.prototype.removeEventListener = function(type, listener, options) {
            // Remove from our tracker if manually removed
            const index = PageCleanupManager.eventListeners.findIndex(e => 
                e.target === this && e.type === type && e.listener === listener
            );
            if (index !== -1) PageCleanupManager.eventListeners.splice(index, 1);
            
            return originalRemoveEventListener.call(this, type, listener, options);
        };
    },

    cleanup: function() {
        console.log('Cleaning up page resources...');

        // Clear Intervals
        this.intervals.forEach(id => window.clearInterval(id)); // Use wrapped or original? Wrapped calls original.
        this.intervals.clear();

        // Clear Timeouts
        this.timeouts.forEach(id => window.clearTimeout(id));
        this.timeouts.clear();

        // Clear Animation Frames
        this.animationFrames.forEach(id => window.cancelAnimationFrame(id));
        this.animationFrames.clear();

        // Remove Event Listeners
        // Filter out critical UI listeners?
        // UI.js attaches: 'click' (for SPA), 'popstate', 'DOMContentLoaded'.
        // We really only want to remove 'keydown', 'keyup', 'resize' usually used by games.
        // Removing 'click' from document might break SPA navigation if we aren't careful.
        
        // Let's filter: Remove everything EXCEPT specific handlers?
        // Actually, UI.js re-runs its init logic (including attaching SPA handlers?)
        // SPA handler is in an IIFE in ui.js. It runs ONCE.
        // If we remove the 'click' listener for navigation, SPA breaks.
        
        // Safer approach: Only remove specific game-related events
        const gameEvents = ['keydown', 'keyup', 'keypress', 'resize', 'gamepadconnected', 'gamepaddisconnected', 'deviceorientation', 'devicemotion', 'load', 'DOMContentLoaded', 'mousedown', 'mouseup', 'mousemove', 'touchstart', 'touchend', 'touchmove', 'contextmenu', 'wheel']; 
        
        // Note: 'load' and 'DOMContentLoaded' listeners from old games might be re-triggered if we don't remove them!
        
        this.eventListeners.filter(e => gameEvents.includes(e.type)).forEach(e => {
            e.target.removeEventListener(e.type, e.listener, e.options);
        });
        
        // Also remove ALL listeners from old Canvas if we can find it? 
        // No, old canvas is destroyed by innerHTML replacement. Listeners on it die with it.
        
        // Clear tracker for removed listeners
        this.eventListeners = this.eventListeners.filter(e => !gameEvents.includes(e.type));
    }
};

// Initialize immediately
PageCleanupManager.init();


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
    const path = window.location.pathname.replace(/\\/g, "/");
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
                
                // Smart Back Logic
                if (window.location.pathname.includes("/cards/") && !window.location.pathname.includes("index.html")) {
                     homeBtn.href = "index.html"; // Back to Cards Menu
                     homeBtn.innerHTML = "&#x1F0CF; CARDS"; // Joker or Card Back
                     homeBtn.title = "Back to Cards";
                } else if (window.location.pathname.includes("/board/") && !window.location.pathname.endsWith("/board/index.html")) {
                     homeBtn.href = "../index.html"; // Back to Board Menu
                     homeBtn.innerHTML = "&#x1F3B2; BOARD"; // Die
                     homeBtn.title = "Back to Board Games";
                } else if (window.location.pathname.includes("/arcade/") && !window.location.pathname.endsWith("/arcade/index.html")) {
                     homeBtn.href = "../index.html"; // Back to Arcade Menu
                     homeBtn.innerHTML = "&#x1F579; ARCADE"; // Joystick
                     homeBtn.title = "Back to Arcade";
                } else {
                     homeBtn.href = isCardGame ? "index.html" : targetUrl; 
                     homeBtn.innerHTML = "&#x1F3E0; HOME"; // House
                     homeBtn.title = "Home";
                }

                homeBtn.className = "home-button glow-text";
                Object.assign(homeBtn.style, {
                    marginLeft: "20px", 
                    fontSize: "16px", 
                    textDecoration: "none", 
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    color: "var(--primary-color)",
                    background: "rgba(0,0,0,0.2)",
                    padding: "5px 10px",
                    borderRadius: "5px",
                    border: "1px solid var(--primary-color)"
                });
                topBar.appendChild(homeBtn);
            }
        } else {
            // Floating button fallback
            const btn = document.createElement("a");
            btn.href = targetUrl;
            btn.className = "back-button fixed-corner";
            btn.innerHTML = "&#x1F3E0; EXIT";
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
            // New Step 0: Cleanup previous page resources
            if (PageCleanupManager) PageCleanupManager.cleanup();

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
        container.innerHTML = `
            <button id="up-btn">▲</button>
            <button id="left-btn">◀</button>
            <button id="down-btn">▼</button>
            <button id="right-btn">▶</button>
        `;
        document.body.appendChild(container);
    }
}


/* INITIALIZATION ON LOAD */
function initGlobalUI() {
    if (PageCleanupManager) PageCleanupManager.init();
    
    // Init themes and styles
    if (typeof initTheme === 'function') initTheme();
    if (typeof initStyle === 'function') initStyle();
    if (typeof initFontTheme === 'function') initFontTheme();
    if (typeof initDifficulty === 'function') initDifficulty();
    
    // Init game systems
    if (typeof initPoints === 'function') initPoints();
    if (typeof ensureBackButton === 'function') ensureBackButton();
    if (typeof ensureMobileControls === 'function') ensureMobileControls();

    // Sound Effects
    const buttons = document.querySelectorAll("button, a, .game-link, .map-zone");
    buttons.forEach(btn => {
        btn.addEventListener("mouseenter", () => {
            // Optional: Hover sound
        });
        btn.addEventListener("click", () => {
             // Optional: Click sound
        });
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlobalUI);
} else {
    initGlobalUI();
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

/* --- GAME UI SYSTEM (MODALS) --- */
const GameUI = {
    overlay: null,

    // Creates the overlay if it doesn't exist
    init(canvas, options = {}) {
        // Store options if provided (so games can register callbacks via init)
        if (options) {
             this.callbacks = { ...this.callbacks, ...options };
        }
        
        if (this.overlay) return;
        
        this.overlay = document.createElement('div');
        this.overlay.id = 'game-ui-overlay';
        Object.assign(this.overlay.style, {
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'none', justifyContent: 'center', alignItems: 'center',
            flexDirection: 'column', zIndex: 10000,
            backdropFilter: 'blur(5px)',
            fontFamily: "'Press Start 2P', monospace",
            color: '#fff', textAlign: 'center'
        });
        document.body.appendChild(this.overlay);
    },

    // Aliases for compatibility with games calling specific hide methods
    hideStartScreen() { this.hide(); },
    hideGameOverScreen() { this.hide(); },
    hidePauseScreen() { this.hide(); },
    updateScore(score) { /* Placeholder for HUD updates if implemented */ },

    showPause(element, onResume, onQuit) {
        // Handle argument shifting if games call showPause(onResume, onQuit) or showPause() using stored options
        let resumeCb = onResume;
        let quitCb = onQuit;
        if (typeof element === 'function') {
            resumeCb = element;
            quitCb = onResume;
        }

        // Fallback to stored callbacks
        if (!resumeCb && this.callbacks && this.callbacks.onPause) {
             // Wait, onPause is usually "triggered when pause happens", not "what to do on resume". 
             // Logic in games: onStart, onRestart, etc.
             // Usually pause screen needs a "Resume" action. 
             // If game provided onStart/onRestart, did it provide onResume? Checkers has togglePause.
             // Usually Checkers calls showPause() and handles state itself.
             // But the button needs a callback.
        }

        this.init();
        this.overlay.innerHTML = '';
        this.overlay.style.display = 'flex';

        const title = document.createElement('h1');
        title.innerText = 'PAUSED';
        title.className = "glow-text"; // Use existing CSS animation if available
        title.style.fontSize = '3rem';
        title.style.marginBottom = '2rem';
        title.style.color = 'var(--secondary-color, cyan)';
        this.overlay.appendChild(title);

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '20px';

        const resumeBtn = this.createButton('RESUME', () => {
            this.hide();
            if (resumeCb) resumeCb();
            else if (this.callbacks && this.callbacks.onPause) {
                 // Is onPause a toggle? Checkers passes: onPause: () => this.togglePause()
                 // If we call it again, it unpauses? Correct.
                 this.callbacks.onPause();
            }
        });
        
        const quitBtn = this.createButton('QUIT', () => {
            this.hide();
            if (quitCb) quitCb();
            else window.history.back(); // Default behavior
        }, true); // Is danger button

        btnContainer.appendChild(resumeBtn);
        btnContainer.appendChild(quitBtn);
        this.overlay.appendChild(btnContainer);
    },

    showGameOver(score, onRestart, onQuit, titleText = "GAME OVER") {
        return this.showGameOverScreen(score, 100); // Redirect to robust method? No, keep implementation.
        // Wait, games call showGameOverScreen(score, maxScore?)
        // Checkers calls: showGameOverScreen(winner === 1 ? 100 : 0, 100)
    },

    showGameOverScreen(score, maxScore) { 
        // Adapter for games calling showGameOverScreen
        this.init();
        this.overlay.innerHTML = '';
        this.overlay.style.display = 'flex';

        const title = document.createElement('h1');
        title.innerText = "GAME OVER";
        title.style.fontSize = '3rem';
        title.style.marginBottom = '1rem';
        title.style.color = '#ff0055'; 
        title.style.textShadow = '0 0 10px #ff0055';
        this.overlay.appendChild(title);

        if (score !== undefined) {
            const scoreEl = document.createElement('p');
            scoreEl.innerText = `SCORE: ${score}`;
            scoreEl.style.fontSize = '1.5rem';
            scoreEl.style.marginBottom = '2rem';
            scoreEl.style.color = '#fff';
            this.overlay.appendChild(scoreEl);
        }

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '20px';

        const restartBtn = this.createButton('PLAY AGAIN', () => {
            this.hide();
            if (this.callbacks && this.callbacks.onRestart) this.callbacks.onRestart();
            else window.location.reload();
        });

        const quitBtn = this.createButton('EXIT', () => {
            this.hide();
            if (this.callbacks && this.callbacks.onQuit) this.callbacks.onQuit();
            else window.history.back();
        }, true);

        btnContainer.appendChild(restartBtn);
        btnContainer.appendChild(quitBtn);
        this.overlay.appendChild(btnContainer);
    },
    
    showStartScreen(titleText, instructions, onStart) {
        this.init();
        this.overlay.innerHTML = '';
        this.overlay.style.display = 'flex';
        
        // Defaults if missing (games calling with 0 args)
        const gameTitle = titleText || (document.title || "GAME START");
        const gameInstr = instructions || "Click Start to Play";
        
        const title = document.createElement('h1');
        title.innerText = gameTitle;
        title.className = "glow-text";
        title.style.fontSize = '3rem';
        title.style.marginBottom = '1rem';
        title.style.color = 'var(--accent-color, magenta)';
        this.overlay.appendChild(title);
        
        const instr = document.createElement('p');
        instr.innerHTML = gameInstr;
        instr.style.maxWidth = '600px';
        instr.style.lineHeight = '1.6';
        instr.style.marginBottom = '2rem';
        instr.style.fontSize = '1.2rem'; 
        this.overlay.appendChild(instr);
        
        const startBtn = this.createButton('START GAME', () => {
             this.hide();
             if (onStart) onStart();
             else if (this.callbacks && this.callbacks.onStart) this.callbacks.onStart();
        });
        startBtn.style.animation = "pulse 1.5s infinite";
        
        this.overlay.appendChild(startBtn);
    },

    hide() {
        if (this.overlay) this.overlay.style.display = 'none';
    },

    createButton(text, onClick, isDanger = false) {
        const btn = document.createElement('button');
        btn.innerText = text;
        Object.assign(btn.style, {
            padding: '15px 30px',
            fontSize: '1.2rem',
            fontFamily: "'Press Start 2P', monospace",
            border: isDanger ? '2px solid #ff0055' : '2px solid #00ff9d',
            background: 'transparent',
            color: '#fff',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'all 0.2s'
        });

        btn.onmouseover = () => {
            btn.style.background = isDanger ? '#ff0055' : '#00ff9d';
            btn.style.color = '#000';
            btn.style.boxShadow = `0 0 15px ${isDanger ? '#ff0055' : '#00ff9d'}`;
        };
        btn.onmouseout = () => {
            btn.style.background = 'transparent';
            btn.style.color = '#fff';
            btn.style.boxShadow = 'none';
        };
        
        btn.onclick = onClick;
        return btn;
    }
};

window.GameUI = GameUI;
window.GameUI.init();
