import type {Card} from "../models/MTG.ts";

export interface Ability {
    cost?: string;
    text: string;
}

export function cardAbilites(card: Card): Ability[] {
    // TODO: respect any abilities that give cards the ability to tap for mana

    return card.oracle_text.split("\n").map(t => {
        const raw = t.trim();
        const parts = raw.split(":");

        return <Ability>{
            cost: parts.length > 1 ? parts[0] : undefined,
            text: parts.length > 1 ? parts[1] : raw
        };
    });
}