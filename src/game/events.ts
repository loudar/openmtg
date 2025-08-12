import type { Card } from "../models/MTG.ts";

export type ZoneName =
    | "library"
    | "hand"
    | "graveyard"
    | "exile"
    | "attractions"
    | "stickers"
    | "command"
    | "battlefield";

export interface BaseEvent {
    type: string;
}

export interface DrawCardsEvent extends BaseEvent {
    type: "DRAW_CARDS";
    count: number;
    from?: Extract<ZoneName, "library" | "attractions" | "stickers">;
    to?: Extract<ZoneName, "hand" | "graveyard" | "exile">;
}

export interface MoveCardsEvent extends BaseEvent {
    type: "MOVE_CARDS";
    source: ZoneName;
    target: ZoneName;
    // Option A: move specific cards by id
    cardIds?: string[];
    // Option B: move from top a given count (if ids omitted)
    count?: number;
    // If count is used, whether to take from top (default true) or bottom (future)
    top?: boolean;
    // Commander rules: if a commander would move to non-command zone, allow redirect
    preferCommandZoneForCommander?: boolean;
}

export type GameEvent = DrawCardsEvent | MoveCardsEvent;

export interface MoveInstruction {
    source: ZoneName;
    target: ZoneName;
    cardIds?: string[];
    count?: number;
    top?: boolean;
}

export interface CompiledEventResult {
    moves: MoveInstruction[];
}

// Compiles a high-level event into concrete move instructions without mutating state
export function compileEvent(event: GameEvent): CompiledEventResult {
    switch (event.type) {
        case "DRAW_CARDS": {
            const from: ZoneName = event.from ?? "library";
            const to: ZoneName = event.to ?? "hand";
            return { moves: [{ source: from, target: to, count: event.count, top: true }] };
        }
        case "MOVE_CARDS": {
            return { moves: [{ source: event.source, target: event.target, cardIds: event.cardIds, count: event.count, top: event.top ?? true }] };
        }
        default: {
            // Unknown event types are compiled to no-ops to keep forward compatibility
            return { moves: [] };
        }
    }
}

// A small adapter interface so different UIs can apply moves consistently
export interface ZoneOps {
    // Draw/Remove from a zone
    drawTopN: (zone: ZoneName, count: number) => Card[];
    removeByIds?: (zone: ZoneName, ids: string[]) => Card[]; // optional
    // Push to a zone
    pushCards: (zone: ZoneName, cards: Card[]) => void;
}

export interface ApplyResultMoveDetail {
    instruction: MoveInstruction;
    moved: number;
}

export interface ApplyResult {
    details: ApplyResultMoveDetail[];
}

// Applies compiled moves using provided zone operations.
// Handles simple Commander replacement effect when requested: if a moving card has isCommander === true and a
// preferCommandZoneForCommander flag was set on the originating MoveCardsEvent, redirect to command zone.
export function applyMoves(zoneOps: ZoneOps, compiled: CompiledEventResult, opts?: { preferCommandZoneForCommander?: boolean }): ApplyResult {
    const details: ApplyResultMoveDetail[] = [];

    for (const m of compiled.moves) {
        let target: ZoneName = m.target;
        // If we have cardIds, try removeByIds then push
        if (m.cardIds && m.cardIds.length > 0 && zoneOps.removeByIds) {
            const taken = zoneOps.removeByIds(m.source, m.cardIds);
            const redirected = redirectCommandersIfNeeded(taken, target, opts);
            zoneOps.pushCards(redirected.target, redirected.cards);
            details.push({ instruction: m, moved: taken.length });
            continue;
        }
        // Otherwise, count based
        const count = Math.max(0, m.count ?? 0);
        if (count === 0) {
            details.push({ instruction: m, moved: 0 });
            continue;
        }
        const taken = zoneOps.drawTopN(m.source, count);
        const redirected = redirectCommandersIfNeeded(taken, target, opts);
        zoneOps.pushCards(redirected.target, redirected.cards);
        details.push({ instruction: m, moved: taken.length });
    }

    return { details };
}

function redirectCommandersIfNeeded(cards: Card[], target: ZoneName, opts?: { preferCommandZoneForCommander?: boolean }): { cards: Card[]; target: ZoneName } {
    if (!opts?.preferCommandZoneForCommander) {
        return { cards, target };
    }
    // If any card is a commander, redirect that card to command zone per Commander rules 903.9
    const nonCommanders: Card[] = [];
    const commanders: Card[] = [];
    for (const c of cards) {
        if (c.isCommander) {
            commanders.push(c);
        } else {
            nonCommanders.push(c);
        }
    }
    if (commanders.length === 0) {
        return { cards, target };
    }
    // For now treat command zone as a single zone; tax increase is tracked elsewhere (CommanderView.playedTimes)
    // Return non-commanders to requested target first, then expect caller to also push commanders to command zone.
    // To keep single push operation, if both exist we default to keep target and rely on multiple moves, but here we
    // implement a simple rule: if any commander present, redirect all to command zone.
    return { cards, target: "command" };
}
