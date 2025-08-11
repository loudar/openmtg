import type {Card, CardLine, Deck} from "../models/MTG.ts";
import {cardLine} from "./Converters.ts";
import {ScryfallApi} from "./ScryfallApi.ts";

export class DeckDownloader {
    static async getFromDeckUrl(deckUrl: string): Promise<Deck> {
        const cardLines: CardLine[] = [];

        return DeckDownloader.getFromCardList(cardLines);
    }

    static async getFromCardList(cardLines: CardLine[]): Promise<Deck> {
        const mtgCards = await ScryfallApi.getCardsByNames(cardLines.map(card => card.name));

        const deck: Deck = {
            library: [],
            errors: []
        };

        for (const line of cardLines) {
            const card = mtgCards.cards.find((card) => card.name === line.name) as Card;
            if (card) {
                const count = line.count ?? 1;
                for (let i = 0; i < count; i++) {
                    card.isCommander = false;
                    if (line.categories?.includes("Commander{top}")) {
                        card.isCommander = true;
                        deck.commanders ??= [];
                        deck.commanders.push(card);
                    } else if (line.categories?.includes("Attraction{noDeck}")) {
                        deck.attractions ??= [];
                        deck.attractions.push(card);
                    } else {
                        deck.library.push(card);
                    }
                }
            } else {
                deck.errors!.push(`Card ${line.name} could not be found (${line.count ?? 1}x times)`);
            }
        }

        return deck;
    }

    static async getFromString(input: string): Promise<Deck> {
        if (input.includes("http")) {
            return await DeckDownloader.getFromDeckUrl(input);
        }

        return await DeckDownloader.getFromCardList(input.split("\n").map(line => cardLine(line)));
    }
}