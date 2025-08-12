import { Container, Graphics, Text, TextStyle } from "pixi.js";
import {CardView, type CardViewActions} from "./CardView.ts";
import {CARD_HEIGHT, CARD_WIDTH, FONT_COLOR, FONT_SIZE, getCardSize, onCardSizeChange} from "../globals.ts";
import {drawDashedRoundedRect} from "../uiHelpers.ts";
import type {Card} from "../../models/MTG.ts";

export type StackType = "library" | "graveyard" | "exile" | "attractions" | "stickers";

export class StackView extends Container {
    private readonly frame: Graphics;
    private readonly content: Container;
    private readonly countText: Text;
    private readonly labelText: Text;
    private readonly type: StackType;
    private cards: Card[] = [];
    private faceDown: boolean = false;
    private unsubscribeCardSize?: () => void;

    constructor(type: StackType, cards?: Card[]) {
        super();
        this.eventMode = "static";
        this.cursor = "pointer";
        this.type = type;

        this.frame = new Graphics();
        this.addChild(this.frame);

        this.labelText = new Text({
            text: this.typeLabel(),
            style: new TextStyle({
                fontFamily: "Arial",
                fontSize: FONT_SIZE,
                fill: FONT_COLOR
            })
        });
        this.labelText.position.set(4, -16);
        this.addChild(this.labelText);

        this.countText = new Text({
            text: "0",
            style: new TextStyle({fontFamily: "Arial", fontSize: FONT_SIZE, fill: FONT_COLOR})
        });
        this.countText.anchor.set(0.5);
        this.countText.position.set(40, 55);
        this.addChild(this.countText);

        this.content = new Container();
        this.addChild(this.content);


        if (cards) {
            this.cards = [...cards];
        }

        this.redraw();

        // React to card size changes
        this.unsubscribeCardSize = onCardSizeChange(() => this.redraw());
    }

    setCards(cards: Card[]) {
        this.cards = [...cards];
        this.redraw();
    }

    addCard(card: Card) {
        this.cards.push(card);
        this.redraw();
    }

    addCards(cards: Card[]) {
        if (cards.length === 0) {
            return;
        }
        this.cards.push(...cards);
        this.redraw();
    }

    public drawTop(): Card | undefined {
        if (this.cards.length === 0) {
            return undefined;
        }
        const c = this.cards.pop();
        this.redraw();
        return c;
    }

    public drawCount(count: number): Card[] | undefined {
        if (this.cards.length === 0) {
            return undefined;
        }
        const take = Math.min(count, this.cards.length);
        const start = this.cards.length - take;
        const c = this.cards.splice(start, take);
        this.redraw();
        return c;
    }

    setFaceDown(v: boolean) {
        this.faceDown = v;
        this.redraw();
    }

    get size() {
        return this.cards.length;
    }

    private typeLabel() {
        switch (this.type) {
            case "library":
                return "Library";
            case "attractions":
                return "Attractions";
            case "graveyard":
                return "Graveyard";
            case "exile":
                return "Exile";
        }
    }

    private redraw() {
        // Clear previous content and frame
        this.content.removeChildren();
        this.frame.clear();

        const w = CARD_WIDTH * getCardSize();
        const h = CARD_HEIGHT * getCardSize();

        const stackOptions: CardViewActions = {
            leftClick: () => {
                this.emit("cardLeftClick", {zone: this.type});
            },
            rightClick: (_c, e) => {
                const options = {source: this.type, actions: ["Search"]};
                const gx = (e && (e.global?.x ?? e.globalX ?? e.clientX)) ?? 0;
                const gy = (e && (e.global?.y ?? e.globalY ?? e.clientY)) ?? 0;
                this.emit("cardRightClick", {zone: this.type, options, position: {x: gx, y: gy}});
            }
        };

        // Face-down rendering using CardUI when requested
        if (this.faceDown) {
            const cardBack = new CardView(undefined, w, h, true, stackOptions);
            this.content.addChild(cardBack);
            this.countText.text = `${this.cards.length}`;
            return;
        }

        if (this.cards.length === 0) {
            drawDashedRoundedRect(this.content, 0, 0, w, h, 6, 0x777777, 2, 6, 6);
            this.countText.text = "0";
        } else {
            // Show the top card using CardUI
            const top = this.cards[this.cards.length - 1];
            const cardTop = new CardView(top, w, h, false, stackOptions);
            this.content.addChild(cardTop);
            this.countText.text = `${this.cards.length}`;
        }
    }

    // Ensure we detach listener when destroyed
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
