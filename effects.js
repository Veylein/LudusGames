const emojiToggle = document.getElementById("emojiToggle");
const container = document.getElementById("emoji-container");

let rainInterval;

emojiToggle.addEventListener("change", () => {
    if (emojiToggle.checked) {
        rainInterval = setInterval(createEmoji, 300);
    } else {
        clearInterval(rainInterval);
        container.innerHTML = "";
    }
});

function createEmoji() {
    const emoji = document.createElement("div");
    emoji.innerText = "🃏";
    emoji.style.position = "absolute";
    emoji.style.left = Math.random() * window.innerWidth + "px";
    emoji.style.top = "-20px";
    emoji.style.fontSize = "20px";
    emoji.style.animation = "fall 4s linear";
    container.appendChild(emoji);

    setTimeout(() => emoji.remove(), 4000);
}

const style = document.createElement("style");
style.innerHTML = `
@keyframes fall {
    to { transform: translateY(100vh); }
}
`;
document.head.appendChild(style);
