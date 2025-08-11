import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { CardView } from "./CardView.ts";
import type {ScryfallCard} from "../../models/Scryfall.ts";
import {CARD_HEIGHT, CARD_WIDTH, getCardSize, onCardSizeChange} from "../globals.ts";

export type StackType = "library" | "graveyard" | "exile" | "attractions";

export class StackView extends Container {
    private readonly frame: Graphics;
    private readonly content: Container;
    private readonly countText: Text;
    private readonly labelText: Text;
    private readonly type: StackType;
    private cards: ScryfallCard[] = [];
    private faceDown: boolean = false;
    private unsubscribeCardSize?: () => void;

    constructor(type: StackType, cards?: ScryfallCard[]) {
        super();
        this.eventMode = "static";
        this.cursor = "pointer";
        this.type = type;

        this.frame = new Graphics();
        this.addChild(this.frame);
        this.content = new Container();
        this.addChild(this.content);

        this.labelText = new Text({
            text: this.typeLabel(),
            style: new TextStyle({fontFamily: "Arial", fontSize: 12, fill: 0xcccccc})
        });
        this.labelText.position.set(4, -16);
        this.addChild(this.labelText);

        this.countText = new Text({
            text: "0",
            style: new TextStyle({fontFamily: "Arial", fontSize: 16, fill: 0xffffff})
        });
        this.countText.anchor.set(0.5);
        this.countText.position.set(40, 55);
        this.addChild(this.countText);

        if (cards) {
            this.cards = [...cards];
        }

        this.redraw();

        // React to card size changes
        this.unsubscribeCardSize = onCardSizeChange(() => this.redraw());
    }

    setCards(cards: ScryfallCard[]) {
        this.cards = [...cards];
        this.redraw();
    }

    addCard(card: ScryfallCard) {
        this.cards.push(card);
        this.redraw();
    }

    public drawTop(): ScryfallCard | undefined {
        if (this.cards.length === 0) {
            return undefined;
        }
        const c = this.cards.pop();
        this.redraw();
        return c;
    }

    public drawCount(count: number): ScryfallCard[] | undefined {
        if (this.cards.length === 0) {
            return undefined;
        }

        const c = this.cards.splice(this.cards.length - count - 1, count);
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

        // Face-down rendering using CardUI when requested
        if (this.faceDown) {
            if (this.type === "library") {
                for (let i = 0; i < 3; i++) {
                    const cardBack = new CardView(undefined, w, h, true);
                    cardBack.x = i * 2;
                    cardBack.y = i * 2;
                    this.content.addChild(cardBack);
                }
            } else {
                const cardBack = new CardView(undefined, w, h, true);
                this.content.addChild(cardBack);
            }
            this.countText.text = `${this.cards.length}`;
            return;
        }

        if (this.cards.length === 0) {
            // Draw dashed placeholder box
            this.drawDashedRoundedRect(0, 0, w, h, 6, 0x777777, 2, 6, 6);
            this.countText.text = "0";
        } else {
            // Show the top card using CardUI
            const top = this.cards[this.cards.length - 1];
            const cardTop = new CardView(top, w, h, false);
            this.content.addChild(cardTop);
            this.countText.text = `${this.cards.length}`;
        }
    }

    private drawDashedRoundedRect(x: number, y: number, w: number, h: number, r: number, color: number, width: number, dash: number, gap: number) {
        const edges = [
            {x1: x + r, y1: y, x2: x + w - r, y2: y},
            {x1: x + w, y1: y + r, x2: x + w, y2: y + h - r},
            {x1: x + w - r, y1: y + h, x2: x + r, y2: y + h},
            {x1: x, y1: y + h - r, x2: x, y2: y + r},
        ];

        const drawSegment = (x1: number, y1: number, x2: number, y2: number) => {
            const total = Math.hypot(x2 - x1, y2 - y1);
            const dx = (x2 - x1) / total;
            const dy = (y2 - y1) / total;
            let drawn = 0;
            while (drawn < total) {
                const seg = Math.min(dash, total - drawn);
                const sx = x1 + dx * drawn;
                const sy = y1 + dy * drawn;
                const ex = x1 + dx * (drawn + seg);
                const ey = y1 + dy * (drawn + seg);
                const g = new Graphics();
                g.moveTo(sx, sy).lineTo(ex, ey).stroke({color, width});
                this.content.addChild(g);
                drawn += dash + gap;
            }
        };

        // straight edges
        edges.forEach((e) => drawSegment(e.x1, e.y1, e.x2, e.y2));

        // approximate dashed corners with short arc dashes (very light approx)
        const arc = (cx: number, cy: number, start: number, end: number) => {
            const circumference = r * (end - start);
            const steps = Math.max(3, Math.floor(circumference / (dash + gap)));
            for (let i = 0; i < steps; i++) {
                const a1 = start + (i * (end - start)) / steps;
                const a2 = start + ((i + 0.5) * (end - start)) / steps; // half-length dash
                const sx = cx + Math.cos(a1) * r;
                const sy = cy + Math.sin(a1) * r;
                const ex = cx + Math.cos(a2) * r;
                const ey = cy + Math.sin(a2) * r;
                const g = new Graphics();
                g.moveTo(sx, sy).lineTo(ex, ey).stroke({color, width});
                this.content.addChild(g);
            }
        };

        // corners centers
        arc(x + w - r, y + r, -Math.PI / 2, 0); // top-right
        arc(x + w - r, y + h - r, 0, Math.PI / 2); // bottom-right
        arc(x + r, y + h - r, Math.PI / 2, Math.PI); // bottom-left
        arc(x + r, y + r, Math.PI, (3 * Math.PI) / 2); // top-left
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
