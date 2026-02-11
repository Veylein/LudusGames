import { createDeck, shuffle } from "./engine.js";
import { renderCard } from "./cardRenderer.js";

let deck = createDeck();
shuffle(deck);

let playerHand = [];
let dealerHand = [];

function deal() {
    playerHand.push(deck.pop());
    dealerHand.push(deck.pop());
    playerHand.push(deck.pop());
    dealerHand.push(deck.pop());

    updateUI();
}

function getValue(hand) {
    let total = 0;
    let aces = 0;

    hand.forEach(card => {
        if (["J","Q","K"].includes(card.rank)) total += 10;
        else if (card.rank === "A") {
            total += 11;
            aces++;
        } else total += parseInt(card.rank);
    });

    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }

    return total;
}
