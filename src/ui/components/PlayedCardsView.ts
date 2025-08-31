import { Container, Text, TextStyle, Graphics } from "pixi.js";
import { CardView } from "./CardView.ts";
import { getCardSize, onCardSizeChange, FONT_COLOR, FONT_SIZE } from "../globals.ts";
import type { Card, PlayedCard } from "../../models/MTG.ts";

export class PlayedCardsView extends Container {
    private backdrop: Graphics;
    private played: PlayedCard[] = [];
    private landsContainer: Container;
    private othersContainer: Container;
    private landsLabel: Text;
    private othersLabel: Text;
    private unsubscribeCardSize?: () => void;

    constructor(cards?: PlayedCard[]) {
        super();
        this.eventMode = "static";
        this.cursor = "default";

        this.backdrop = new Graphics();
        this.addChild(this.backdrop);

        this.landsContainer = new Container();
        this.othersContainer = new Container();

        this.landsLabel = new Text({
            text: "Lands",
            style: new TextStyle({ fontFamily: "Arial", fontSize: FONT_SIZE, fill: FONT_COLOR })
        });
        this.othersLabel = new Text({
            text: "Permanents",
            style: new TextStyle({ fontFamily: "Arial", fontSize: FONT_SIZE, fill: FONT_COLOR })
        });

        this.addChild(this.landsLabel);
        this.addChild(this.othersLabel);
        this.addChild(this.landsContainer);
        this.addChild(this.othersContainer);

        if (cards && cards.length > 0) {
            this.played = [...cards];
        }

        this.redraw();
        this.unsubscribeCardSize = onCardSizeChange(() => this.redraw());
    }

    public setCards(cards: PlayedCard[]) {
        this.played = [...cards];
        this.redraw();
    }

    public addCards(cards: PlayedCard[]) {
        if (cards.length === 0) {
            return;
        }
        this.played.push(...cards);
        this.redraw();
    }

    public removeByIds(ids: string[]): Card[] {
        if (ids.length === 0) {
            return [];
        }
        const idset = new Set(ids);
        const kept: PlayedCard[] = [];
        const removed: Card[] = [];
        for (const pc of this.played) {
            if (idset.has(pc.card.id)) {
                removed.push(pc.card);
            } else {
                kept.push(pc);
            }
        }
        if (removed.length > 0) {
            this.played = kept;
            this.redraw();
        }
        return removed;
    }

    private clearChildren(container: Container) {
        container.removeChildren();
        for (const c of container.children) {
            try {
                (c as any).removeAllListeners?.();
            } catch {
                // ignore cleanup errors
            }
        }
    }

    private isLand(card: Card): boolean {
        const tl = (card as any).type_line as string | undefined;
        if (!tl) {
            return false;
        }
        return tl.includes("Land");
    }

    private cardWidth(): number {
        return 80 * getCardSize();
    }

    private cardHeight(): number {
        return 110 * getCardSize();
    }

    private layoutRow(container: Container, cards: Card[], startY: number) {
        const w = this.cardWidth();
        const h = this.cardHeight();
        const gap = 8 * getCardSize();
        const maxPerRow = Math.max(1, Math.floor(((typeof window !== "undefined" ? window.innerWidth : 1024) - 200) / (w + gap)));

        let x = 0;
        let y = startY;
        let count = 0;

        for (const card of cards) {
            const node = new CardView(card, w, h, false, {
                leftClick: () => {
                    // Future: tap/untap or target selection
                },
                rightClick: (_c, e) => {
                    const gx = (e && (e.global?.x ?? e.globalX ?? e.clientX)) ?? 0;
                    const gy = (e && (e.global?.y ?? e.globalY ?? e.clientY)) ?? 0;
                    this.emit("openMenu", { card, options: { source: "battlefield", actions: ["Move to Graveyard", "Move to Exile", "Return to Hand", "Details"] }, position: { x: gx, y: gy } });
                },
                draggable: true,
                onDragEnd: (_c, global) => {
                    this.emit("cardDragEnd", { source: "battlefield", card, global });
                }
            });
            node.x = x;
            node.y = y;
            container.addChild(node);

            count++;
            if (count >= maxPerRow) {
                count = 0;
                x = 0;
                y += h + gap;
            } else {
                x += w + gap;
            }
        }

        return y + h; // bottom Y of the area
    }

    private redraw() {
        // Ensure a minimum hit area regardless of content
        const w = this.cardWidth();
        const h = this.cardHeight();
        const gap = 8 * getCardSize();
        const minWidth = (3 * w) + (2 * gap);
        const minHeight = (h * 2) + 26; // two rows plus label spacing
        this.backdrop.clear();
        this.backdrop.beginFill(0x000000, 0.0001);
        this.backdrop.drawRect(0, -18, minWidth, minHeight + 18);
        this.backdrop.endFill();
        this.clearChildren(this.landsContainer);
        this.clearChildren(this.othersContainer);

        const lands: Card[] = [];
        const others: Card[] = [];
        for (const pc of this.played) {
            if (this.isLand(pc.card)) {
                lands.push(pc.card);
            } else {
                others.push(pc.card);
            }
        }

        // Position labels
        this.landsLabel.position.set(0, -18);
        const landsBottom = this.layoutRow(this.landsContainer, lands, 0);
        this.othersLabel.position.set(0, landsBottom + 8);
        this.othersContainer.y = landsBottom + 26;
        this.layoutRow(this.othersContainer, others, 0);
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
