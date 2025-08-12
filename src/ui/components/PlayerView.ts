import {Container, Text, TextStyle} from "pixi.js";
import {type StackType, StackView} from "./StackView.ts";
import {HandView} from "./HandView.ts";
import {CounterButton} from "./CounterButton.ts";
import {CommanderView} from "./CommanderView.ts";
import {PlayedCardsView} from "./PlayedCardsView.ts";
import type {Player} from "../../server/sessionTypes.ts";
import {CARD_HEIGHT, FONT_COLOR, FONT_SIZE, getCardSize, MARGIN, onCardSizeChange} from "../globals.ts";
import type {Card} from "../../models/MTG.ts";
import {applyMoves, compileEvent, type GameEvent, type ZoneName, type DrawCardsEvent, type MoveCardsEvent} from "../../game/events.ts";

export class PlayerView extends Container {
    public setMaxHandWidth(width: number) {
        if (this.hand) {
            this.hand.setMaxWidth(width);
        }
    }

    public info: Player;
    public isSelf: boolean;

    public nameLabel: Text;
    public library: StackView;
    private readonly attractions: null | StackView;
    private readonly stickers: null | StackView;
    public commanderView: CommanderView;
    public battlefield: PlayedCardsView;
    public hand?: HandView;
    public graveyard: StackView;
    public exile: StackView;
    public lifeCounter: CounterButton;
    private lastMoveSource?: ZoneName;
    private unsubscribeCardSize?: () => void;

    constructor(info: Player, isSelf: boolean) {
        super();
        this.info = info;
        this.isSelf = isSelf;

        const nameText = new Text({
            text: info.name + (isSelf ? " (You)" : ""),
            style: new TextStyle({
                fontFamily: "Arial",
                fontSize: FONT_SIZE,
                fill: FONT_COLOR,
                align: "left",
            }),
        });
        nameText.anchor.set(0, 1);
        nameText.position.set(0, -90);
        this.nameLabel = nameText;
        this.addChild(nameText);

        // Build decks. Decks are face-down by default.
        this.library = this.addDeck("library", info.deck.library)!;
        this.attractions = this.addDeck("attractions", info.deck.attractions);
        this.stickers = this.addDeck("stickers", info.deck.stickers);

        this.commanderView = new CommanderView(info.deck.commanders ?? []);
        this.addChild(this.commanderView);

        this.battlefield = new PlayedCardsView(info.deck.inPlay ?? []);
        this.addChild(this.battlefield);
        this.battlefield.on("cardDragEnd", (payload: any) => {
            if (!this.isSelf) {
                return;
            }
            this.handleCardDragDrop(payload);
        });


        this.graveyard = new StackView("graveyard", []);
        this.addChild(this.graveyard);

        this.exile = new StackView("exile", []);
        this.addChild(this.exile);

        this.hand = new HandView([]);
        this.addChild(this.hand);

        // Bubble openMenu from children
        if (this.hand) {
            this.hand.on("openMenu", (payload: any) => {
                if (!this.isSelf) {
                    return;
                }
                this.emit("openMenu", payload);
            });
            this.hand.on("playCard", (payload: any) => {
                if (!this.isSelf) {
                    return;
                }
                const card = payload?.card as Card;
                if (!card) {
                    return;
                }
                const event: MoveCardsEvent = { type: "MOVE_CARDS", source: "hand", target: "battlefield", cardIds: [card.id] };
                this.handleEvent(event);
            });
            this.hand.on("cardDragEnd", (payload: any) => {
                if (!this.isSelf) {
                    return;
                }
                this.handleCardDragDrop(payload);
            });
        }
        if (this.commanderView) {
            this.commanderView.on("openMenu", (payload: any) => {
                if (!this.isSelf) {
                    return;
                }
                this.emit("openMenu", payload);
            });
        }
        this.graveyard.on("cardRightClick", (payload: any) => {
            if (!this.isSelf) {
                return;
            }
            this.emit("openMenu", payload);
        });
        this.exile.on("cardRightClick", (payload: any) => {
            if (!this.isSelf) {
                return;
            }
            this.emit("openMenu", payload);
        });

        // Add life counter per player
        this.lifeCounter = new CounterButton({value: 40, style: {label: "♥️", fill: 0x1e1e1e, stroke: 0x444444}});
        this.addChild(this.lifeCounter);

        // Visibility rules: only local player's hand/GY/exile are revealed; others are face-down.
        if (!isSelf) {
            if (this.hand) {
                this.hand.setFaceDown(true);
            }
            this.graveyard.setFaceDown(true);
            this.exile.setFaceDown(true);
        } else {
            if (this.hand) {
                this.hand.setFaceDown(false);
            }
            this.graveyard.setFaceDown(false);
            this.exile.setFaceDown(false);
        }

        // Ensure consistent z-index layering so cards draw above view texts
        // Enable sortable children for this player view
        this.sortableChildren = true;
        // Default zIndex for texts should be low
        this.nameLabel.zIndex = 1;
        // Life counter should not cover enlarged cards
        this.lifeCounter.zIndex = 2;
        // Stacks and commander area below hand/battlefield
        this.library.zIndex = 5;
        if (this.commanderView) {
            this.commanderView.zIndex = 6;
        }
        this.graveyard.zIndex = 7;
        this.exile.zIndex = 8;
        // Hand above stacks
        if (this.hand) {
            this.hand.zIndex = 15;
        }
        // Battlefield on top among player's zones so its cards hover above labels
        this.battlefield.zIndex = 20;

        // Apply initial layout scaled by current card size
        this.applyScaledLayout();
        // Subscribe to card size changes to re-apply layout
        this.unsubscribeCardSize = onCardSizeChange(() => this.applyScaledLayout());
    }

    private addDeck(name: StackType, cards?: Card[]) {
        if (!cards) {
            return null;
        }

        const deck = new StackView(name, cards ?? []);
        deck.setFaceDown(true);
        this.addChild(deck);

        deck.on("cardLeftClick", () => {
            if (!this.isSelf) {
                return;
            }
            // Use the generic event handler to process a draw event
            const event: DrawCardsEvent = { type: "DRAW_CARDS", count: 1, from: name as any, to: "hand" };
            this.handleEvent(event);
        });
        deck.on("cardRightClick", (payload: any) => {
            if (!this.isSelf) {
                return;
            }
            // Bubble up an openMenu event with at least a Search option
            this.emit("openMenu", payload);
        });

        return deck;
    }

    private row(index: number) {
        const base = -(CARD_HEIGHT / 2) * getCardSize();
        return base - this.rowHeight() * (index - 1);
    }

    private rowHeight() {
        return (CARD_HEIGHT * getCardSize()) + MARGIN;
    }

    private applyScaledLayout() {
        const row1 = this.row(1);
        const row2 = this.row(2);
        const row3 = this.row(3);

        const width = window.innerWidth;
        const left = -width / 2;

        this.nameLabel.position.set(left + 200, row3 - (CARD_HEIGHT / 2));
        this.lifeCounter.position.set(left + 30, row3 - 30 - (CARD_HEIGHT / 2));
        let stacksLeft = left + MARGIN;

        stacksLeft = this.addContainer(this.graveyard, stacksLeft, row1);
        const commanderCount = (this.info.deck.commanders?.length ?? 0);
        if (commanderCount > 0) {
            stacksLeft = this.addContainer(this.commanderView, stacksLeft, row1);
        }

        stacksLeft = this.addContainer(this.attractions, stacksLeft, row1);
        stacksLeft = this.addContainer(this.stickers, stacksLeft, row1);

        this.addContainer(this.hand, stacksLeft, row1);

        this.addContainer(this.library, left + MARGIN, row2);
        const battlefieldLeft = this.addContainer(this.exile, left + MARGIN, row3);
        this.addContainer(this.battlefield, battlefieldLeft + (commanderCount * (100 * getCardSize())), row3);
    }

    private addContainer(stackView: Container | null | undefined, layoutX: number, layoutY: number) {
        if (!stackView) {
            return layoutX;
        }

        stackView.position.set(layoutX, layoutY);
        return layoutX + 100 * getCardSize();
    }

    // Map zone names to concrete views this PlayerView controls
    private zoneToView(zone: ZoneName): StackView | HandView | CommanderView | PlayedCardsView | null {
        switch (zone) {
            case "library":
                return this.library;
            case "hand":
                return this.hand ?? null;
            case "graveyard":
                return this.graveyard;
            case "exile":
                return this.exile;
            case "attractions":
                return this.attractions ?? null;
            case "stickers":
                return this.stickers ?? null;
            case "command":
                return this.commanderView;
            case "battlefield":
                return this.battlefield;
            default:
                return null;
        }
    }

    private drawTopN(zone: ZoneName, count: number): Card[] {
        this.lastMoveSource = zone;
        const v = this.zoneToView(zone);
        if (!v) {
            return [];
        }
        if (v instanceof StackView) {
            return v.drawCount(count) ?? [];
        }
        // Not supported for other zones
        return [];
    }

    private removeByIds(zone: ZoneName, ids: string[]): Card[] {
        this.lastMoveSource = zone;
        const v = this.zoneToView(zone);
        if (!v) {
            return [];
        }
        if (v instanceof HandView) {
            return v.removeByIds(ids);
        }
        if (v instanceof PlayedCardsView) {
            return v.removeByIds(ids);
        }
        if (v instanceof StackView) {
            // Not implemented for stacks yet: fallback to draw top if ids length provided
            return [];
        }
        return [];
    }

    private pushCards(zone: ZoneName, cards: Card[]) {
        if (cards.length === 0) {
            return;
        }
        const v = this.zoneToView(zone);
        if (!v) {
            return;
        }
        if (v instanceof HandView) {
            v.addCards(cards);
            return;
        }
        if (v instanceof StackView) {
            v.addCards(cards);
            return;
        }
        if (v instanceof PlayedCardsView) {
            const from = this.lastMoveSource ?? "hand";
            const played = cards.map(c => ({ card: c, playedFrom: from }));
            v.addCards(played);
            return;
        }
        // Commander zone currently displayed via CommanderView; adding to it is a no-op for now
    }

    public handleEvent(event: GameEvent) {
        const compiled = compileEvent(event);
        applyMoves({
            drawTopN: (z, c) => this.drawTopN(z, c),
            removeByIds: (z, ids) => this.removeByIds(z, ids),
            pushCards: (z, cs) => this.pushCards(z, cs)
        }, compiled, {
            preferCommandZoneForCommander: event.type === "MOVE_CARDS" ? event.preferCommandZoneForCommander === true : false
        });
    }

    private handleCardDragDrop(payload: { source: ZoneName; card: Card; index?: number; global: { x: number; y: number } }) {
        const target = this.dropTargetAt(payload.global.x, payload.global.y);
        if (!target) {
            return;
        }
        const event: MoveCardsEvent = { type: "MOVE_CARDS", source: payload.source, target, cardIds: [payload.card.id] };
        this.handleEvent(event);
    }

    private dropTargetAt(x: number, y: number): ZoneName | null {
        const gy = this.graveyard.getBounds();
        if (x >= gy.x && x <= gy.x + gy.width && y >= gy.y && y <= gy.y + gy.height) {
            return "graveyard";
        }
        const ex = this.exile.getBounds();
        if (x >= ex.x && x <= ex.x + ex.width && y >= ex.y && y <= ex.y + ex.height) {
            return "exile";
        }
        return null;
    }

    public override destroy(options?: any): void {
        if (this.unsubscribeCardSize) {
            try {
                this.unsubscribeCardSize();
            } catch (e) {
                // ignore unsubscribe errors
            }
            this.unsubscribeCardSize = undefined;
        }

        if (this.commanderView) {
            this.commanderView.destroy();
        }

        super.destroy(options);
    }
}
