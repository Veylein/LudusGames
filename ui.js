const themeSelect = document.getElementById("themeSelect");
const emojiToggle = document.getElementById("emojiToggle");

themeSelect.addEventListener("change", () => {
    document.body.className = "theme-" + themeSelect.value;
    localStorage.setItem("theme", themeSelect.value);
});

emojiToggle.addEventListener("change", () => {
    if (emojiToggle.checked) {
        startEmojiRain();
    } else {
        stopEmojiRain();
    }
});

window.onload = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
        document.body.className = "theme-" + savedTheme;
        themeSelect.value = savedTheme;
    }
};
