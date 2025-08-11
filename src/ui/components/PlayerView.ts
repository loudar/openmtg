import {Container, Text, TextStyle} from "pixi.js";
import {type StackType, StackView} from "./StackView.ts";
import {HandView} from "./HandView.ts";
import {CounterButton} from "./CounterButton.ts";
import {CommanderView} from "./CommanderView.ts";
import type {Player} from "../../server/sessionTypes.ts";
import {CARD_HEIGHT, FONT_COLOR, FONT_SIZE, getCardSize, MARGIN, onCardSizeChange} from "../globals.ts";
import type {Card} from "../../models/MTG.ts";

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
    public commanderView: CommanderView;
    public hand?: HandView;
    public graveyard: StackView;
    public exile: StackView;
    public lifeCounter: CounterButton;
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

        this.commanderView = new CommanderView(info.deck.commanders ?? []);
        this.addChild(this.commanderView);

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
        this.lifeCounter = new CounterButton({value: 20, style: {label: "Life", fill: 0x1e1e1e, stroke: 0x444444}});
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
            const drawn = deck.drawCount(1);
            if (drawn && this.hand) {
                this.hand.addCards(drawn);
            }
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
        stacksLeft = this.addContainer(this.attractions, stacksLeft, row1);

        if ((this.info.deck.commanders?.length ?? 0) > 0) {
            stacksLeft = this.addContainer(this.commanderView, stacksLeft, row1);
        }

        this.addContainer(this.hand, stacksLeft, row1);

        this.addContainer(this.library, left + MARGIN, row2);
        this.addContainer(this.exile, left + MARGIN, row3);
    }

    private addContainer(stackView: Container | null | undefined, layoutX: number, layoutY: number) {
        if (!stackView) {
            return layoutX;
        }

        stackView.position.set(layoutX, layoutY);
        return layoutX + 100 * getCardSize();
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
