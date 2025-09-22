import {type Card, MtgShortColor} from "../models/MTG.ts";
import type {ManaOption} from "./boardstate.ts";

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

export function toColorArray(cost: string) {
    return cost.replaceAll("{", "")
        .replaceAll("}", "")
        .split("")
        .filter(c => {
            if (c === "0") {
                return false;
            }

            return true;
        }) as (MtgShortColor | number)[];
}

export function manaCardsThatWouldPayCost(cost: (MtgShortColor | number)[], manaCards: {
    card: Card;
    manaOptions: ManaOption[]
}[]): {
    card: Card;
    manaOption: ManaOption;
}[] {
    // write check that iterates through all possible mana options and finds the best one to pay the cost

    // TODO: fix temp solution lmao
    return manaCards.map(mc => {
        const option = mc.manaOptions.at(0)!;

        return {
            card: mc.card,
            manaOption: {
                ...option,
            }
        }
    });
}