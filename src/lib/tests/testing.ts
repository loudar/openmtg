import {Boardstate, DefaultZones} from "../boardstate.ts";
import {v4} from "uuid";
import {GameSimulator} from "../gameSimulator.ts";
import {DeckDownloader} from "../../tools/DeckDownloader.ts";
import {cardAbilites} from "../cardFeatures.ts";

const player1 = {
    id: v4(),
    hasLost: false,
    hasWon: false,
    commanderDamage: {},
    counters: {},
    life: 40,
    name: "test player 1",
    zones: DefaultZones,
};

const player2 = {
    id: v4(),
    hasLost: false,
    hasWon: false,
    commanderDamage: {},
    counters: {},
    life: 40,
    name: "test player 2",
    zones: DefaultZones,
};

const deck1 = await DeckDownloader.getFromDeckUrl("https://archidekt.com/decks/15596020/eoe_counter_intelligence");
const deck2 = await DeckDownloader.getFromDeckUrl("https://archidekt.com/decks/15391450/hatecrimes");

const bs = new Boardstate();

bs.addPlayer(player1);
bs.setPlayerDeck(player1.id, deck1);

bs.addPlayer(player2);
bs.setPlayerDeck(player2.id, deck2);

deck1.library.map(c => {
    const abs = cardAbilites(c);
    for (const ab of abs) {
        if (!ab.cost) {
            continue;
        }

        console.log(true, ab.cost);
        bs.payCost(ab.cost, c);
    }
})

//GameSimulator.simulateGame(bs);
