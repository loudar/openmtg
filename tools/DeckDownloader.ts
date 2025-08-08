import type {Card, CardLine, Deck} from "../models/MTG.ts";
import {MtgApi} from "./MtgApi.ts";
import {cardLine} from "./Converters.ts";

export class DeckDownloader {
    static async getFromDeckUrl(deckUrl: string): Promise<Deck> {
        const cardLines: CardLine[] = [];

        return DeckDownloader.getFromCardList(cardLines);
    }

    static async getFromCardList(cardLines: CardLine[]): Promise<Deck> {
        const mtgCards = await MtgApi.getCardsByNames(cardLines.map(card => card.name));

        const cards = [];
        for (const line of cardLines) {
            const card = mtgCards.find((card) => card.name === card.name);
            if (card) {
                const count = line.count ?? 1;
                for (let i = 1; i < count; i++) {
                    cards.push(card);
                }
            }
        }

        return {
            cards
        }
    }

    static async getFromString(input: string): Promise<Deck> {
        return DeckDownloader.getFromCardList(input.split("\n").map(line => cardLine(line)));
    }
}