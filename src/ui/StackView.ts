import {Container, Graphics, Text, TextStyle, Sprite, Texture} from "pixi.js";
import type {Card} from "mtggraphql";

export type StackType = "library" | "graveyard" | "exile";

export class StackView extends Container {
    private readonly frame: Graphics;
    private readonly content: Container;
    private readonly countText: Text;
    private readonly labelText: Text;
    private readonly type: StackType;
    private cards: Card[] = [];
    private faceDown: boolean = false;
    private backSprite?: Sprite;

    constructor(type: StackType, cards?: Card[]) {
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
    }

    setCards(cards: Card[]) {
        this.cards = [...cards];
        this.redraw();
    }

    addCard(card: Card) {
        this.cards.push(card);
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
            case "graveyard":
                return "Graveyard";
            case "exile":
                return "Exile";
        }
    }

    private redraw() {
        // Clear previous graphics and sprite
        this.content.removeChildren();
        this.frame.clear();
        if (this.backSprite) {
            this.backSprite.destroy({children: true, texture: false});
            this.backSprite = undefined;
        }

        const w = 80;
        const h = 110;

        // Face-down rendering using card back image when requested
        if (this.faceDown) {
            try {
                const tex = Texture.from("http://localhost:3000/img/cardBack.jpg");
                const spr = new Sprite(tex);
                spr.width = w;
                spr.height = h;
                spr.x = 0;
                spr.y = 0;
                this.backSprite = spr;
                this.content.addChild(spr);
            } catch {
                // fallback to solid placeholder if texture fails
                const g = new Graphics();
                g.roundRect(0, 0, w, h, 6).fill(0x444444).stroke({color: 0x222222, width: 2});
                this.content.addChild(g);
            }
            this.countText.text = `${this.cards.length}`;
            return;
        }

        if (this.cards.length === 0) {
            // Draw dashed placeholder box
            this.drawDashedRoundedRect(0, 0, w, h, 6, 0x777777, 2, 6, 6);
            this.countText.text = "0";
        } else {
            if (this.type === "library") {
                // face-down stacked look
                for (let i = 0; i < 3; i++) {
                    const g = new Graphics();
                    g.roundRect(i * 2, i * 2, w, h, 6).fill(0x444444).stroke({color: 0x222222, width: 2});
                    this.content.addChild(g);
                }
            } else {
                // single pile look (face-up pile placeholder)
                const g = new Graphics();
                g.roundRect(0, 0, w, h, 6).fill(0x2e2e2e).stroke({color: 0x555555, width: 2});
                this.content.addChild(g);
            }
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
}
