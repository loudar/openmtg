import {applyMoves, compileEvent, type GameEvent, type ZoneName} from "../game/events.ts";
import type {Card, PlayedCard} from "../models/MTG.ts";
import type {MtgSession, Player} from "./sessionTypes.ts";

export function buildZoneOps(player: Player) {
    const deck = player.deck;
    let lastMoveSource: ZoneName | undefined = undefined;
    function zoneArray(zone: ZoneName): any {
        if (zone === "library") {
            return deck.library as Card[];
        }
        if (zone === "hand") {
            if (!deck.hand) { deck.hand = []; }
            return deck.hand as Card[];
        }
        if (zone === "graveyard") {
            if (!(deck as any).graveyard) { (deck as any).graveyard = []; }
            return (deck as any).graveyard as Card[];
        }
        if (zone === "exile") {
            if (!(deck as any).exile) { (deck as any).exile = []; }
            return (deck as any).exile as Card[];
        }
        if (zone === "attractions") {
            if (!deck.attractions) { deck.attractions = []; }
            return deck.attractions as Card[];
        }
        if (zone === "stickers") {
            if (!deck.stickers) { deck.stickers = []; }
            return deck.stickers as Card[];
        }
        if (zone === "battlefield") {
            if (!deck.battlefield) { deck.battlefield = []; }
            return deck.battlefield as PlayedCard[];
        }
        // command zone not stored in Deck; CommanderView state tracked on client for now
        return null;
    }
    return {
        drawTopN: (zone: ZoneName, count: number): Card[] => {
            lastMoveSource = zone;
            const arr = zoneArray(zone);
            if (!arr || !Array.isArray(arr)) {
                return [];
            }
            if (zone === "battlefield") {
                const playedArr = arr as PlayedCard[];
                const take = Math.max(0, Math.min(count, playedArr.length));
                const start = Math.max(0, playedArr.length - take);
                const takenPlayed = playedArr.splice(start, take);
                return takenPlayed.map(pc => pc.card);
            }
            const cardArr = arr as Card[];
            const take = Math.max(0, Math.min(count, cardArr.length));
            const start = Math.max(0, cardArr.length - take);
            const taken = cardArr.splice(start, take);
            return taken;
        },
        removeByIds: (zone: ZoneName, ids: string[]): Card[] => {
            lastMoveSource = zone;
            const arr = zoneArray(zone);
            if (!arr || !Array.isArray(arr)) {
                return [];
            }
            if (zone === "battlefield") {
                const playedArr = arr as PlayedCard[];
                const removed: Card[] = [];
                for (const id of ids) {
                    const idx = playedArr.findIndex(pc => pc.card.id === id);
                    if (idx >= 0) {
                        const [pc] = playedArr.splice(idx, 1);
                        if (pc && pc.card) {
                            removed.push(pc.card);
                        }
                    }
                }
                return removed;
            }
            const cardArr = arr as Card[];
            const removed: Card[] = [];
            for (const id of ids) {
                const idx = cardArr.findIndex(c => c.id === id);
                if (idx >= 0) {
                    const [c] = cardArr.splice(idx, 1);
                    if (c) {
                        removed.push(c);
                    }
                }
            }
            return removed;
        },
        pushCards: (zone: ZoneName, cards: Card[]) => {
            if (!cards || cards.length === 0) {
                return;
            }
            const arr = zoneArray(zone);
            if (!arr) {
                return;
            }
            if (zone === "battlefield") {
                const source: ZoneName = (lastMoveSource ?? "hand");
                const played = cards.map(c => ({ card: c, playedFrom: source }));
                (arr as PlayedCard[]).push(...played);
                return;
            }
            (arr as Card[]).push(...cards);
        }
    };
}

/**
 * Processes a raw WebSocket message text, updating server-side session state
 * for recognized event types (e.g., game:event, life:update).
 * This function does not handle relaying to peers; the caller should do that.
 */
export function processServerMessage(session: MtgSession, payloadText: string): void {
    try {
        const msg = JSON.parse(payloadText);
        if (msg && typeof msg === "object") {
            if (msg.type === "game:event") {
                const ev: GameEvent = msg.payload?.event as GameEvent;
                const pid: string | undefined = msg.payload?.playerId as string | undefined;
                if (ev && pid) {
                    const p = session.players.get(pid);
                    if (p) {
                        const compiled = compileEvent(ev);
                        applyMoves(buildZoneOps(p), compiled, {
                            preferCommandZoneForCommander: (ev as any).preferCommandZoneForCommander === true
                        });
                    }
                }
            } else if (msg.type === "life:update") {
                const pid: string | undefined = msg.payload?.playerId as string | undefined;
                const value: number | undefined = msg.payload?.value as number | undefined;
                if (pid && typeof value === "number") {
                    const p = session.players.get(pid);
                    if (p) {
                        p.life = value;
                    }
                }
            }
        }
    } catch {
        // ignore parse errors
    }
}
