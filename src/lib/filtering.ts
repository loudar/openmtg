import {type Card, MtgShortColor} from "../models/MTG.ts";
import type {CardFilter} from "./boardstate.ts";

export function filterCards(cards: Card[], filters: CardFilter[]) {
    return cards.filter(c => {
        for (const filter of filters) {
            if (filter.value !== undefined && filter.value !== null) {
                if (c[filter.property] === filter.value) {
                    return true;
                } else if (filter.required) {
                    return false;
                }
            }

            if (filter.regex !== undefined && filter.regex !== null) {
                const matches = c[filter.property]?.toString().match(filter.regex);
                if ((matches?.length ?? 0) > 0) {
                    return true;
                } else if (filter.required) {
                    return false;
                }
            }

            if (filter.filterFunction) {
                const result = filter.filterFunction(c[filter.property]);
                if (result) {
                    return true;
                } else if (filter.required) {
                    return false;
                }
            }
        }
    });
}

export function producesMana(text: string) {
    return text.match(/Add \w+ mana/gim) || text.match(/Add \{[WRUBGC]}/gim);
}

export function producedManaOptions(text: string) {
    const groups = text.match(/\{([WRUBGC])}(?:\{([WRUBGC])})?/gim);
    if (!groups) {
        return [];
    }

    return groups.map(g => toManaOptions(g))
        .flatMap(g => g);
}

/**
 * Converts text like "{W}{U} or {U}{B}" to a usable mana array
 * @param text
 */
function toManaOptions(text: string): MtgShortColor[][] {
    return text.split(" or ")
        .map(option => {
            return option.replaceAll("{", "")
                .replaceAll("}", "")
                .split("") as MtgShortColor[];
        });
}

export function isLand(c: Card) {
    return c.cmc === 0 && !c.mana_cost.includes("{");
}
