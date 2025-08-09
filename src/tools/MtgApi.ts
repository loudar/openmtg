import axios from "axios";
import type {MtgCard} from "../models/MTG.ts";

interface CardsResponse {
    cards: MtgCard[];
}

const baseUrl = "https://api.magicthegathering.io/v1";

export class MtgApi {
    static async getCardsByNames(names: string[]) {
        const promises = names.map(name => MtgApi.getCardByName(name));
        const results = await Promise.all(promises);
        const nullCount = results.filter(c => c === null).length;

        return {
            cards: results.filter(c => c !== null),
            errors: nullCount > 0 ? [`${nullCount} cards could not be found.`] : []
        };
    }

    static async getCardByName(name: string): Promise<MtgCard | null> {
        const res = (await axios.get<CardsResponse>(`${baseUrl}/cards`, {
            params: {
                name
            },
        }));

        if (res.data.cards.length > 0) {
            const card = res.data.cards.at(0)!;

            if (card.imageUrl) {
                card.imageUrl = await MtgApi.resolveFinalUrl(card.imageUrl);
            }

            return card;
        }

        return null;
    }

    static async resolveFinalUrl(startUrl: string) {
        const res = await fetch(startUrl, { redirect: "follow" });
        if (!res.ok && res.type !== "opaqueredirect") {
            throw new Error(`Request failed: ${res.status}`);
        }
        return res.url;
    }
}