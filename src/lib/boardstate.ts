import {type Card, type Deck, MtgShortColor} from "../models/MTG.ts";
import {fisherYatesShuffle} from "./shuffling.ts";
import {isLand, producedManaOptions, producesMana} from "./filtering.ts";
import {type Ability, cardAbilites, manaCardsThatWouldPayCost, toColorArray} from "./cardFeatures.ts";

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
    counters: Record<string, number>;
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
    floatingMana: MtgShortColor[];
    landPlayed: boolean;
    round: number;
    playerId: PlayerId;
    extraCombatPhaseCount: number;
    phases: Phase[];
    currentPhase?: Phase;
    stack: StackItem[];
    playedSpells: Card[];
}

export interface StackItem {
    playedBy: PlayerId,
    effect: string,
    card: Card,
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

export interface ManaOption {
    cost: string;
    text: string;
    options: MtgShortColor[][];
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

    public setPlayerDeck(playerId: PlayerId, deck: Deck) {
        this.getPlayerById(playerId).zones = DefaultZones;

        this.getPlayerZone(playerId, "library").cards = fisherYatesShuffle(deck.library);
        this.getPlayerZone(playerId, "commander").cards = deck.commanders ?? [];
        this.getPlayerZone(playerId, "attractions").cards = fisherYatesShuffle(deck.attractions ?? []);
        this.getPlayerZone(playerId, "stickers").cards = fisherYatesShuffle(deck.stickers ?? []);

        this.getPlayerZone(playerId, "exile").cards = [];
        this.getPlayerZone(playerId, "graveyard").cards = [];
        this.getPlayerZone(playerId, "hand").cards = [];
        this.getPlayerZone(playerId, "battlefield").cards = [];
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
            playedSpells: [],
            stack: [],
            landPlayed: false,
            floatingMana: []
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
            stack: [],
            landPlayed: false,
            floatingMana: [],
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

    public removeCardsFromZone(playerId: PlayerId, zoneType: ZoneType, cardIds: CardId[]) {
        const out: Card[] = [];
        const zone = this.getPlayerZone(playerId, zoneType);
        const outCards = zone.cards.filter(c => cardIds.includes(c.uniqueId));
        out.push(...outCards);
        zone.cards = zone.cards.filter(c => !cardIds.includes(c.uniqueId));
        return out;
    }

    public getCardFromZone(playerId: PlayerId, zoneType: ZoneType, cardId: CardId) {
        const zone = this.getPlayerZone(playerId, zoneType);
        const card = zone.cards.find(c => cardId === c.uniqueId);
        if (!card) {
            throw new Error(`Card with ID ${cardId} not found in ${zoneType}`);
        }
        return card;
    }

    public alivePlayerCount() {
        return this.info.players.filter(p => {
            return !p.hasWon && !p.hasLost;
        }).length;
    }

    public getTopCardFromZone(playerId: PlayerId, zoneType: ZoneType) {
        return this.getPlayerZone(playerId, zoneType).cards.pop();
    }

    public playerDrawCard() {
        if (!this.info.currentTurn) {
            throw new Error("Turn is empty. Make sure to start the game first");
        }

        const turn = this.info.currentTurn;
        const topCard = this.getTopCardFromZone(turn.playerId, "library");
        if (topCard) {
            console.log(`drawing card to hand: ${topCard.name}`);
            this.addCardsToZone(turn.playerId, "hand", [topCard]);
        }
    }

    public playerHasLost(playerId: PlayerId) {
        const player = this.getPlayerById(playerId);
        if (player.life <= 0
            || this.getPlayerZone(player.id, "library").cards.length === 0
        ) {
            // TODO: implement lose cases or preventions
            return true;
        }

        return false;
    }

    public playerHasWon(playerId: PlayerId) {
        // TODO: implement win cons
        return false;
    }

    public checkForWins() {
        for (const player of this.info.players) {
            if (this.playerHasWon(player.id)) {
                player.hasWon = true;
                continue;
            }

            if (this.playerHasLost(player.id)) {
                player.hasLost = true;
            }
        }
    }

    public playerUntapCards() {
        if (!this.info.currentTurn) {
            throw new Error("Turn is empty. Make sure to start the game first");
        }

        const turn = this.info.currentTurn;
        const battlefield = this.getPlayerZone(turn.playerId, "battlefield");
        battlefield.cards.forEach(c => {
            if (this.cardDoesNotUntap(c)) {
                return;
            }

            c.tapped = false;
        });
    }

    public cardDoesNotUntap(c: Card) {
        const abs = cardAbilites(c);
        if (abs.some(a => !a.cost && a.text === `${c.name} doesn't untap during your untap step`)) {
            return true;
        }

        // TODO: implement global untap prevention effects

        return false;
    }

    public tapCard(playerId: PlayerId, cardId: CardId) {
        const card = this.getPlayerZone(playerId, "battlefield").cards.find(card => card.uniqueId === cardId);
        if (!card) {
            throw new Error(`Card with unique ID ${cardId} not found fo rplayer ${playerId}`);
        }

        card.tapped = true;
    }

    public playerManaCardOptions() {
        if (!this.info.currentTurn) {
            throw new Error("Turn is empty. Make sure to start the game first");
        }

        const turn = this.info.currentTurn;
        return this.untappedManaOptions(turn.playerId);
    }

    public untappedManaOptions(playerId: string) {
        const battlefield = this.getPlayerZone(playerId, "battlefield");
        const cardsThatCanProduceMana = battlefield.cards.filter(c => producesMana(c.oracle_text) || isLand(c));
        const cardsWithTappableManaAbility = cardsThatCanProduceMana.filter(c => {
            const tapForManaAbs = cardAbilites(c).filter(a => (!a.cost || a.cost === "{T}") && producesMana(a.text));
            if (tapForManaAbs.length === 0 && isLand(c)) {
                return !c.tapped;
            }

            return tapForManaAbs.length > 0 && !c.tapped;
        });

        return cardsWithTappableManaAbility.map(c => {
            return {
                card: c,
                manaOptions: cardAbilites(c).filter(a => producesMana(a.text))
                    .map(a => <ManaOption>{
                        cost: a.cost,
                        text: a.text,
                        options: producedManaOptions(a.text)
                    })
            };
        });
    }

    public playerTriggerUpkeep() {
        if (!this.info.currentTurn) {
            throw new Error("Turn is empty. Make sure to start the game first");
        }

        const turn = this.info.currentTurn;
        const bf = this.getPlayerZone(turn.playerId, "battlefield");
        bf.cards.forEach(c => {
            const abs = cardAbilites(c);
            for (const ability of abs) {
                const trigger = "At the beginning of your upkeep,";
                if (ability.text.startsWith(trigger)) {
                    this.runEffect(turn.playerId, c, ability, trigger);
                }
            }
        });

        this.info.players.forEach(p => {
            if (p.id !== turn.playerId) {
                this.playerTriggerOpponentUpkeep(p.id);
            }
        });
    }

    public playerTriggerOpponentUpkeep(playerId: PlayerId) {
        const bf = this.getPlayerZone(playerId, "battlefield");
        bf.cards.forEach(c => {
            const abs = cardAbilites(c);
            for (const ability of abs) {
                const trigger = "At the beginning of each opponent's upkeep,";
                if (ability.text.startsWith(trigger)) {
                    this.runEffect(playerId, c, ability, trigger);
                }
            }
        });
    }

    public runEffect(playerId: PlayerId, c: Card, ability: Ability, trigger: string) {
        const effects = ability.text.slice(trigger.length).split(".");
        for (const effect of effects) {
            const justHappens = !effect.includes("if") && !effect.includes("unless") && !effect.includes("you may");
            console.log(effect);
            if (justHappens || this.conditionMet(c, effect)) {
                this.addEffectToStack(playerId, c, effect);
            }
        }
    }

    private conditionMet(c: Card, effect: string) {
        return false;
    }

    private addEffectToStack(playerId: PlayerId, c: Card, effect: string) {
        if (!this.info.currentTurn) {
            throw new Error("Turn is empty. Make sure to start the game first");
        }

        const turn = this.info.currentTurn;
        turn.stack.push({
            playedBy: playerId,
            effect,
            card: c
        });
    }

    resolveStack() {
        if (!this.info.currentTurn) {
            throw new Error("Turn is empty. Make sure to start the game first");
        }

        const turn = this.info.currentTurn;
        for (const stackItem of turn.stack) {
            switch (stackItem.effect) {
                case "cast":
                    console.log(`PLAYING: ${stackItem.card.name}`);
                    this.addCardsToZone(turn.playerId, "battlefield", [stackItem.card]);
                    break;
                default:
                    console.log(`RUNNING: ${stackItem.effect}\t(from ${stackItem.card.name})`);
                    break;
            }
        }
        turn.stack = [];
    }

    public playableCards() {
        if (!this.info.currentTurn) {
            throw new Error("Turn is empty. Make sure to start the game first");
        }

        const turn = this.info.currentTurn;
        const manaCards = this.playerManaCardOptions();
        const hand = this.getPlayerZone(turn.playerId, "hand");
        const cards: Card[] = [];

        for (const card of hand.cards) {
            if (isLand(card) && !turn.landPlayed) {
                cards.push(card);
            } else if (manaCards.length > 0) {
                // TODO: add card if payable with mana
                const cost = toColorArray(card.mana_cost);
                const optionsThatWouldPay = manaCardsThatWouldPayCost(cost, manaCards);
                if (optionsThatWouldPay.length > 0) {
                    cards.push(card);
                }
            }
        }

        return cards.sort((a, b) => {
            if (isLand(a) || a.cmc < b.cmc) {
                return -1;
            } else if (b.cmc < a.cmc) {
                return 1;
            } else {
                return 0;
            }
        });
    }

    public playCard(cardId: CardId) {
        if (!this.info.currentTurn) {
            throw new Error("Turn is empty. Make sure to start the game first");
        }

        const turn = this.info.currentTurn;
        const card = this.getCardFromZone(turn.playerId, "hand", cardId);
        if (card.cmc > 0) {
            // TODO: finalize this shit
            /*
            const manaCards = this.playerManaCardOptions();
            const cost = toColorArray(card.mana_cost);
            const optionsThatWouldPay = manaCardsThatWouldPayCost(cost, manaCards);
            if (optionsThatWouldPay.length > 0) {
                optionsThatWouldPay.forEach(option => {
                    this.payCost(option.manaOption.cost, option.card);
                    this.floatMana(option.manaOption.options.at(0)!);
                });
            }*/
        }

        const cRemoved = this.removeCardsFromZone(turn.playerId, "hand", [cardId]);
        cRemoved.forEach(c => {
            this.addEffectToStack(turn.playerId, c, "cast");
        });
    }

    private payCost(cost: string, card: Card) {
        if (cost.includes("{T}")) {
            card.tapped = true;
        }
    }

    private floatMana(mana: MtgShortColor[]) {
        if (!this.info.currentTurn) {
            throw new Error("Turn is empty. Make sure to start the game first");
        }

        const turn = this.info.currentTurn;
        turn.floatingMana.push(...mana);
    }
}