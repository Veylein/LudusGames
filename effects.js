let rainInterval;

function startEmojiRain() {
    rainInterval = setInterval(() => {
        const emoji = document.createElement("div");
        emoji.textContent = ["🎴","✨","♠️","🌆","💎"][Math.floor(Math.random()*5)];
        emoji.style.position = "fixed";
        emoji.style.left = Math.random() * window.innerWidth + "px";
        emoji.style.top = "-30px";
        emoji.style.fontSize = "20px";
        emoji.style.pointerEvents = "none";
        document.body.appendChild(emoji);

        let fall = setInterval(() => {
            emoji.style.top = parseInt(emoji.style.top) + 5 + "px";
            if (parseInt(emoji.style.top) > window.innerHeight) {
                clearInterval(fall);
                emoji.remove();
            }
        }, 30);

    }, 300);
}

function stopEmojiRain() {
    clearInterval(rainInterval);
}
