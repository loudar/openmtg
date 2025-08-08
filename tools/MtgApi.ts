import axios from "axios";
import type {Card} from "mtggraphql";

interface CardsResponse {
    cards: Card[];
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

    static async getCardByName(name: string): Promise<Card | null> {
        const res = (await axios.get<CardsResponse>(`${baseUrl}/cards`, {
            params: {
                name
            },
        }));

        if (res.data.cards.length > 0) {
            return res.data.cards.at(0)!;
        }

        return null;
    }
}