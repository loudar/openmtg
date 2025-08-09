import type {CardLine, Deck} from "../models/MTG.ts";
import {cardLine} from "./Converters.ts";
import {ScryfallApi} from "./ScryfallApi.ts";

export class DeckDownloader {
    static async getFromDeckUrl(deckUrl: string): Promise<Deck> {
        const cardLines: CardLine[] = [];

        return DeckDownloader.getFromCardList(cardLines);
    }

    static async getFromCardList(cardLines: CardLine[]): Promise<Deck> {
        const mtgCards = await ScryfallApi.getCardsByNames(cardLines.map(card => card.name));

        const cards = [];
        for (const line of cardLines) {
            const card = mtgCards.cards.find((card) => card.name === line.name);
            if (card) {
                const count = line.count ?? 1;
                for (let i = 0; i < count; i++) {
                    cards.push(card);
                }
            }
        }

        return {
            cards,
            errors: mtgCards.errors
        }
    }

    static async getFromString(input: string): Promise<Deck> {
        if (input.includes("http")) {
            return await DeckDownloader.getFromDeckUrl(input);
        }

        return await DeckDownloader.getFromCardList(input.split("\n").map(line => cardLine(line)));
    }
}