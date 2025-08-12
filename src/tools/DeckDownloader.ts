import type {Card, CardLine, Deck} from "../models/MTG.ts";
import {cardLine} from "./Converters.ts";
import {ScryfallApi} from "./ScryfallApi.ts";
import axios from "axios";
import type {ArchidektDeck} from "./ArchidektDeck.ts";

export class DeckDownloader {
    static async getFromDeckUrl(deckUrl: string): Promise<Deck> {
        const urlObj = new URL(deckUrl);
        let cardLines: CardLine[] = [];

        switch (urlObj.origin) {
            case "https://archidekt.com":
                cardLines = await DeckDownloader.getCardLinesFromArchidekt(deckUrl);
                break;
        }

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
                    if (line.categories?.some(c => c.startsWith("Commander"))) {
                        card.isCommander = true;
                        deck.commanders ??= [];
                        deck.commanders.push(card);
                    } else if (line.categories?.some(c => c.startsWith("Attraction"))) {
                        deck.attractions ??= [];
                        deck.attractions.push(card);
                    } else if (line.categories?.some(c => c.startsWith("Stickers"))) {
                        deck.stickers ??= [];
                        deck.stickers.push(card);
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
        if (input.startsWith("http")) {
            return await DeckDownloader.getFromDeckUrl(input);
        }

        return await DeckDownloader.getFromCardList(input.split("\n").map(line => cardLine(line)));
    }

    private static async getCardLinesFromArchidekt(deckUrl: string) {
        const deckId = deckUrl.split("/").at(-2);
        if (!deckId) {
            throw new Error("Invalid deck URL");
        }

        const url = `https://archidekt.com/api/decks/${deckId}/?format=json`;
        const res = await axios.get<ArchidektDeck>(url);
        const archideck = res.data;
        return archideck.cards.map(c => <CardLine>{
            name: c.card.oracleCard.name,
            count: c.quantity,
            categories: c.categories
        });
    }
}