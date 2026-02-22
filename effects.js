const emojiToggle = document.getElementById("emojiToggle");
const container = document.getElementById("emoji-container");

let rainInterval;
const symbols = ["\u2660", "\u2665", "\u2666", "\u2663", "1", "0", "L", "U", "D", "U", "S"];
const colors = ["#00ff9d", "#ff00ff", "#00ffff"];

if (emojiToggle) {
    emojiToggle.addEventListener("change", () => {
        if (emojiToggle.checked) {
            rainInterval = setInterval(createPixelRain, 100);
        } else {
            clearInterval(rainInterval);
            container.innerHTML = "";
        }
    });
} else {
    // If no toggle but container exists, maybe default on? Or off.
    // Safe failure.
}

function createPixelRain() {
    if (!container) return;
    const el = document.createElement("div");
    el.innerText = symbols[Math.floor(Math.random() * symbols.length)];
    el.style.position = "absolute";
    el.style.left = Math.random() * window.innerWidth + "px";
    el.style.top = "-20px";
    el.style.fontSize = Math.random() * 20 + 10 + "px";
    el.style.color = colors[Math.floor(Math.random() * colors.length)];
    el.style.opacity = Math.random();
    el.style.fontFamily = "'Press Start 2P', monospace";
    el.style.textShadow = "0 0 5px " + el.style.color;
    
    const duration = Math.random() * 3 + 2;
    el.style.transition = `top ${duration}s linear, opacity ${duration}s ease-out`;
    
    container.appendChild(el);

    // Trigger animation
    requestAnimationFrame(() => {
        el.style.top = (window.innerHeight + 50) + "px";
        el.style.opacity = 0;
    });

    setTimeout(() => el.remove(), duration * 1000);
}
