import type {Card} from "../models/MTG.ts";
import type {CounterType} from "../models/CounterType.ts";

export type ZoneType =
    | "library"
    | "hand"
    | "graveyard"
    | "exile"
    | "attractions"
    | "stickers"
    | "commander"
    | "battlefield";

export interface BoardZone {
    cards: Card[];
    type: ZoneType;
}

function emptyBoardZone(type: ZoneType) {
    return <BoardZone>{
        type,
        cards: [],
    }
}

export type PlayerId = string;
export type CardId = string;

export interface Player {
    id: PlayerId;
    name: string;
    life: number;
    commanderDamage: Record<PlayerId, number>;
    counters: Record<CounterType, number>;
    zones: BoardZone[];
    hasWon: boolean;
    hasLost: boolean;
}

export enum Phase {
    Untap = "untap",
    Upkeep = "upkeep",
    Draw = "draw",
    Main = "main",
    CombatStart = "combatStart",
    CombatAttack = "combatAttack",
    CombatBlock = "combatBlock",
    CombatStrike = "combatStrike",
    CombatDamage = "combatDamage",
    CombatEnd = "combatEnd",
    End = "end",
    Cleanup = "cleanup",
}

export const DefaultPhases: Phase[] = [
    Phase.Untap,
    Phase.Upkeep,
    Phase.Draw,
    Phase.Main,
    Phase.CombatStart,
    Phase.CombatAttack,
    Phase.CombatBlock,
    Phase.CombatStrike,
    Phase.CombatDamage,
    Phase.CombatEnd,
    Phase.End,
    Phase.Cleanup,
]

export interface Turn {
    round: number;
    playerId: PlayerId;
    extraCombatPhaseCount: number;
    phases: Phase[];
    currentPhase?: Phase;
    playedSpells: Card[];
}

export interface BoardstateInfo {
    players: Player[];
    firstPlayerId?: PlayerId;
    currentTurn?: Turn;
}

export const DefaultZones: BoardZone[] = [
    emptyBoardZone("hand"),
    emptyBoardZone("attractions"),
    emptyBoardZone("battlefield"),
    emptyBoardZone("commander"),
    emptyBoardZone("library"),
    emptyBoardZone("exile"),
    emptyBoardZone("graveyard"),
    emptyBoardZone("stickers"),
]

export interface CardFilter {
    property: keyof Card;
    value?: any;
    regex?: RegExp;
    filterFunction?: (cardProperty: any) => boolean;
    required?: boolean;
}

export class Boardstate {
    public info: BoardstateInfo

    constructor(boardstate?: BoardstateInfo) {
        this.info = boardstate ?? {
            players: [],
        };
    }

    public addPlayer(player: Player) {
        this.info.players.push(player);
    }

    public getPlayerById(id: PlayerId): Player {
        const currentPlayer = this.info.players.find(p => p.id === id);
        if (!currentPlayer) {
            throw new Error(`Player with ID ${id} not found`);
        }

        return currentPlayer;
    }

    public getPlayerZone(playerId: PlayerId, zoneType: ZoneType) {
        const zone = this.getPlayerById(playerId).zones.find(z => z.type === zoneType);
        if (!zone) {
            throw new Error(`Zone ${zoneType} not found for player ${playerId}`);
        }

        return zone;
    }

    public gameNotStarted() {
        return this.info.currentTurn === undefined && this.info.firstPlayerId === undefined;
    }

    public startGame(force: boolean = false) {
        if (!this.gameNotStarted() && !force) {
            return;
        }

        const firstPlayer = this.randomPlayer().player;
        this.info.currentTurn = {
            phases: DefaultPhases,
            round: 0,
            playerId: firstPlayer.id,
            extraCombatPhaseCount: 0,
            playedSpells: []
        };
        this.info.firstPlayerId = firstPlayer.id;
    }

    public randomPlayer() {
        if (this.info.players.length === 0) {
            throw new Error(`No players in boardstate`);
        }

        const random = Math.floor(Math.random() * this.info.players.length);
        return {
            index: random,
            player: this.info.players[random]!
        };
    }

    public nextPlayer(currentPlayerId?: PlayerId) {
        if (this.info.players.length === 0) {
            throw new Error(`No players in boardstate`);
        }

        if (!currentPlayerId) {
            return {
                index: 0,
                player: this.info.players.at(0)!
            };
        }

        const currentIndex = this.info.players.indexOf(this.getPlayerById(currentPlayerId));
        const newIndex = (currentIndex === this.info.players.length - 1) ? 0 : (currentIndex + 1);
        return {
            index: newIndex,
            player: this.info.players[newIndex]!
        };
    }

    public nextTurn(turn?: Turn) {
        if (!turn) {
            throw new Error(`Turn is empty. Make sure to start the game first`);
        }

        const nextPlayer = this.nextPlayer(turn.playerId);

        return {
            ...turn,
            round: nextPlayer.player.id === this.info.firstPlayerId ? turn.round + 1 : turn.round,
            playerId: nextPlayer.player.id,
            extraCombatPhaseCount: 0,
            phases: DefaultPhases,
            playedSpells: [],
            currentPhase: undefined,
        } satisfies Turn;
    }

    public nextPhase() {
        if (!this.info.currentTurn) {
            throw new Error("Turn is empty. Make sure to start the game first");
        }

        const currentPhaseIndex = this.currentPhaseIndex();
        if (currentPhaseIndex === this.info.currentTurn.phases.length - 1) {
            return undefined;
        }

        return this.info.currentTurn.phases[currentPhaseIndex + 1];
    }

    public currentPhaseIndex() {
        if (!this.info.currentTurn) {
            throw new Error("Turn is empty. Make sure to start the game first");
        }

        const currentPhase = this.info.currentTurn.currentPhase;
        if (!currentPhase) {
            throw new Error(`Current phase is not set. Make sure to start the game first`);
        }

        return this.info.currentTurn.phases.indexOf(currentPhase);
    }

    public addCardsToZone(playerId: PlayerId, zoneType: ZoneType, cards: Card[]) {
        this.getPlayerById(playerId).zones.forEach(zone => {
            if (zone.type === zoneType) {
                zone.cards.push(...cards);
            }
        });
    }

    public getCardsFromZone(playerId: PlayerId, zoneType: ZoneType, cards: Card[]) {
        const out: Card[] = [];
        this.getPlayerById(playerId).zones.forEach(zone => {
            if (zone.type === zoneType) {
                out.push(...cards);
            }
        });
        return out;
    }

    public removeCardsFromZone(playerId: PlayerId, zoneType: ZoneType, cardIds: CardId[]) {
        const out: Card[] = [];
        this.getPlayerById(playerId).zones.forEach(zone => {
            if (zone.type === zoneType) {
                const outCards = zone.cards.filter(c => cardIds.includes(c.id));
                out.push(...outCards);
                zone.cards = zone.cards.filter(c => cardIds.includes(c.id));
            }
        });
        return out;
    }

    public static filterCards(cards: Card[], filters: CardFilter[]) {
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

    public alivePlayerCount() {
        return this.info.players.filter(p => {
            return !p.hasWon && !p.hasLost;
        }).length;
    }
}