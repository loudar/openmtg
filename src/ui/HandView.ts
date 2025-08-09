import { Container } from "pixi.js";
import { CardUI } from "./CardUI.ts";
import type {ScryfallCard} from "../models/Scryfall.ts";
import {getCardSize, onCardSizeChange} from "./globals.ts";

export class HandView extends Container {
    private cards: ScryfallCard[] = [];
    private faceDown: boolean = false;
    private defaultGap: number = 8;
    private minSpacing: number = 12; // minimal spacing between cards when heavily overlapped
    private maxWidth: number = (typeof window !== "undefined" ? window.innerWidth : 1024);

    private basePositions: number[] = [];
    private cardNodes: Container[] = [];
    private unsubscribeCardSize?: () => void;

    private get cardWidth(): number { return 80 * getCardSize(); }
    private get cardHeight(): number { return 110 * getCardSize(); }

    constructor(cards?: ScryfallCard[]) {
        super();
        this.eventMode = "static";
        this.cursor = "default";
        if (cards) {
            this.cards = [...cards];
        }
        this.redraw();
        // React to card size changes
        this.unsubscribeCardSize = onCardSizeChange(() => {
            this.redraw();
        });
    }

    public setCards(names: ScryfallCard[]) {
        this.cards = [...names];
        this.redraw();
    }

    public addCards(cards: ScryfallCard[]) {
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
        // When re-rendering due to card size change, rebuild nodes entirely
        for (const node of this.cardNodes) {
            node.removeAllListeners();
            this.removeChild(node);
            // Destroy graphics inside but keep textures cached
            node.destroy({ children: true, texture: false });
        }
        this.cardNodes = [];
    }

    private buildCardNode(card: ScryfallCard): Container {
        const node = new CardUI(card, this.cardWidth, this.cardHeight, this.faceDown);

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
