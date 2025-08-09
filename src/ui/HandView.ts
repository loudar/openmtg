import { Container, Graphics, Text, TextStyle, Sprite, Texture } from "pixi.js";
import type {Card} from "mtggraphql";

export class HandView extends Container {
    private cards: Card[] = [];
    private faceDown: boolean = false;
    private cardWidth: number = 80;
    private cardHeight: number = 110;
    private defaultGap: number = 8;
    private minSpacing: number = 12; // minimal spacing between cards when heavily overlapped
    private maxWidth: number = 600;

    private basePositions: number[] = [];
    private cardNodes: Container[] = [];

    constructor(cards?: Card[]) {
        super();
        this.eventMode = "static";
        this.cursor = "default";
        if (cards) {
            this.cards = [...cards];
        }
        this.redraw();
    }

    public setCards(names: Card[]) {
        this.cards = [...names];
        this.redraw();
    }

    public addCards(cards: Card[]) {
        this.cards.push(...cards);
        this.redraw();
    }

    public setFaceDown(v: boolean) {
        this.faceDown = v;
        this.redraw();
    }

    public setMaxWidth(w: number) {
        if (w <= 0) {
            return;
        }
        this.maxWidth = w;
        this.layoutPositions();
        this.applyBasePositions();
    }

    private clearCards() {
        for (const node of this.cardNodes) {
            node.removeAllListeners();
            this.removeChild(node);
            // Destroy graphics inside but keep textures cached
            node.destroy({ children: true, texture: false });
        }
        this.cardNodes = [];
    }

    private buildCardNode(card: Card): Container {
        const node = new Container();
        const g = new Graphics();
        g.roundRect(0, 0, this.cardWidth, this.cardHeight, 6)
            .fill(this.faceDown ? 0x444444 : 0x2e2e2e)
            .stroke({ color: this.faceDown ? 0x222222 : 0x555555, width: 2 });

        node.addChild(g);

        if (this.faceDown) {
            try {
                const tex = Texture.from("http://localhost:3000/img/cardBack.jpg");
                const spr = new Sprite(tex);
                spr.width = this.cardWidth;
                spr.height = this.cardHeight;
                spr.x = 0;
                spr.y = 0;
                node.addChild(spr);
            } catch {
                // already drew placeholder g
            }
        } else {
            const text = new Text({
                text: card.name || "Card",
                style: new TextStyle({ fontFamily: "Arial", fontSize: 11, fill: 0xffffff, wordWrap: true, wordWrapWidth: this.cardWidth - 8 })
            });
            text.position.set(4, 4);
            node.addChild(text);
        }

        // Interactions for hover
        node.eventMode = "dynamic";
        node.cursor = "pointer";
        node.on("pointerover", () => {
            const idx = this.cardNodes.indexOf(node);
            if (idx >= 0) {
                this.onHoverIndex(idx);
            }
        });
        node.on("pointerout", () => {
            this.applyBasePositions();
        });

        return node;
    }

    private redraw() {
        this.clearCards();
        for (let i = 0; i < this.cards.length; i++) {
            const node = this.buildCardNode(this.cards[i]!);
            node.zIndex = i; // ensure natural stacking to the right
            this.addChild(node);
            this.cardNodes.push(node);
        }
        this.sortableChildren = true;
        this.layoutPositions();
        this.applyBasePositions();
    }

    private layoutPositions() {
        const n = this.cardNodes.length;
        this.basePositions = new Array(n).fill(0);
        if (n === 0) {
            return;
        }
        // Preferred spacing without overlap
        const idealSpacing = this.cardWidth + this.defaultGap;
        // Compute spacing to fit within maxWidth
        let spacing: number;
        if (n === 1) {
            spacing = 0;
        } else {
            const fitSpacing = (this.maxWidth - this.cardWidth) / (n - 1);
            if (this.cardWidth + this.defaultGap <= this.maxWidth - this.cardWidth + this.cardWidth) {
                // if ideal total width could fit, just use ideal spacing
            }
            spacing = Math.min(idealSpacing, Math.max(this.minSpacing, fitSpacing));
            // If using the min/ideal clamping causes overflow, enforce exact fitSpacing
            const rightEdge = this.cardWidth + (n - 1) * spacing;
            if (rightEdge > this.maxWidth) {
                spacing = Math.max(this.minSpacing, fitSpacing);
            }
        }
        for (let i = 0; i < n; i++) {
            this.basePositions[i] = i * spacing;
        }
    }

    private applyBasePositions() {
        for (let i = 0; i < this.cardNodes.length; i++) {
            const node = this.cardNodes[i];
            if (!node) {
                continue;
            }

            node.x = this.basePositions[i] ?? 0;
            node.y = 0;
        }
    }

    private onHoverIndex(i: number) {
        // Shift cards to the right of i so the hovered card is fully visible
        const n = this.cardNodes.length;
        if (n <= 1) {
            return;
        }
        const spacing = n >= 2 ? (this.basePositions[1]! - this.basePositions[0]!) : 0;
        const requiredExtra = Math.max(0, this.cardWidth - spacing);
        if (requiredExtra <= 0) {
            // No overlap; nothing to shift
            return;
        }
        // Available extra room before hitting maxWidth
        const currentRightEdge = this.cardWidth + (n - 1) * (spacing <= 0 ? 0 : spacing);
        const maxExtra = Math.max(0, this.maxWidth - currentRightEdge);
        const appliedExtra = Math.min(requiredExtra, maxExtra);

        for (let j = 0; j < n; j++) {
            const node = this.cardNodes[j];
            if (!node) {
                continue;
            }

            if (j <= i) {
                node.x = this.basePositions[j]!;
            } else {
                node.x = this.basePositions[j]! + appliedExtra;
            }
            node.y = 0;
        }

        // Ensure hovered card draws above left neighbors
        for (let j = 0; j < n; j++) {
            this.cardNodes[j]!.zIndex = j;
        }
        this.cardNodes[i]!.zIndex = n + 1;
        this.sortChildren();
    }
}
