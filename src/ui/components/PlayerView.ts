import {Container, Text, TextStyle} from "pixi.js";
import {type StackType, StackView} from "./StackView.ts";
import {HandView} from "./HandView.ts";
import {CounterButton} from "./CounterButton.ts";
import type {Player} from "../../server/sessionTypes.ts";
import {getCardSize, onCardSizeChange} from "../globals.ts";
import type {ScryfallCard} from "../../models/Scryfall.ts";

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
    private attractions: null | StackView;
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
                fontSize: 14,
                fill: 0xffffff,
                align: "left",
            }),
        });
        nameText.anchor.set(0.5);
        nameText.position.set(0, -90);
        // name position will be scaled in layout
        this.nameLabel = nameText;
        this.addChild(nameText);

        // Build decks. Decks are face-down by default.
        this.library = this.addDeck("library", info.deck.library)!;
        this.attractions = this.addDeck("library", info.deck.attractions);

        this.graveyard = new StackView("graveyard", []);
        this.addChild(this.graveyard);

        this.exile = new StackView("exile", []);
        this.addChild(this.exile);

        this.hand = new HandView([]);
        this.addChild(this.hand);

        // Add life counter per player
        this.lifeCounter = new CounterButton({ value: 20, style: { label: "Life", fill: 0x1e1e1e, stroke: 0x444444 } });
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

    private addDeck(name: StackType, cards?: ScryfallCard[]) {
        if (!cards) {
            return null;
        }

        const deck = new StackView(name, cards ?? []);
        deck.setFaceDown(true);
        this.addChild(deck);

        deck.on("pointerdown", (e: any) => {
            if (!this.isSelf) {
                return;
            }

            const isLeftClick = typeof e?.button === "number" ? e.button === 0 : true;
            if (!isLeftClick) {
                return;
            }

            const drawn = deck.drawCount(1);
            if (drawn && this.hand) {
                this.hand.addCards(drawn);
            }
        });

        return deck;
    }

    private applyScaledLayout() {
        const scale = getCardSize();
        const yStacks = -60 * scale;
        const width = window.innerWidth;
        const left = -width / 2;

        const topRowY = -110 * scale;
        this.nameLabel.position.set(left + 200, topRowY + 30);

        let stacksLeft = left + 10;
        const dist = 100 * scale;

        if (this.attractions) {
            stacksLeft = this.addStackView(this.attractions, stacksLeft, yStacks);
        }

        stacksLeft = this.addStackView(this.library, stacksLeft, yStacks);
        stacksLeft = this.addStackView(this.graveyard, stacksLeft, yStacks);
        stacksLeft = this.addStackView(this.exile, stacksLeft, yStacks);

        if (this.hand) {
            this.hand.position.set(stacksLeft + (dist * 3), yStacks);
        }
        // Life counter placed below stacks, centered under name
        this.lifeCounter.position.set(left + 30, topRowY);
    }

    private addStackView(stackView: StackView, layoutX: number, layoutY: number) {
        stackView.position.set(layoutX, layoutY);
        return layoutX + 100 * getCardSize()
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
        super.destroy(options);
    }
}
