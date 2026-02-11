export function renderCard(card, faceDown = false) {
    const div = document.createElement("div");
    div.className = "card";

    if (faceDown) {
        div.classList.add("back");
        return div;
    }

    div.innerHTML = `
        <div class="corner top">${card.rank}${card.suit}</div>
        <div class="center">${card.suit}</div>
        <div class="corner bottom">${card.rank}${card.suit}</div>
    `;

    if (card.suit === "♥" || card.suit === "♦") {
        div.classList.add("red");
    }

    return div;
}
