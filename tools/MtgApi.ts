import axios from "axios";
import type {Card} from "../models/MTG.ts";

interface CardsResponse {
    cards: Card[];
}

const baseUrl = "https://api.magicthegathering.io/v1";

export class MtgApi {
    static async getCardsByNames(names: string[]): Promise<Card[]> {
        const res = await axios.get<CardsResponse>(`${baseUrl}/cards`, {
            params: {
                name: names.join("|"),
            }
        });
        return res.data.cards;
    }
}