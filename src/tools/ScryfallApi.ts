import axios from "axios";
import type {ScryfallCard} from "../models/Scryfall.ts";

const baseUrl = "https://api.scryfall.com";

export class ScryfallApi {
    static async getCardsByNames(names: string[]) {
        const promises = names.map(name => ScryfallApi.getCardByName(name));
        const results = await Promise.all(promises);
        const nullCount = results.filter(c => c === null).length;

        return {
            cards: results.filter(c => c !== null),
            errors: nullCount > 0 ? [`${nullCount} cards could not be found.`] : []
        };
    }

    static async getCardByName(name: string): Promise<ScryfallCard | null> {
        try {
            const res = (await axios.get<ScryfallCard>(`${baseUrl}/cards/named`, {
                params: { exact: name },
            }));
            return res.data;
        } catch {
            return null;
        }
    }
}