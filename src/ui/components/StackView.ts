import {Container, Graphics, Text, TextStyle, Ticker, type TickerCallback} from "pixi.js";
import {CardView, type CardViewActions} from "./CardView.ts";
import {CARD_HEIGHT, CARD_WIDTH, FONT_COLOR, FONT_SIZE, getCardSize, onCardSizeChange} from "../globals.ts";
import {drawDashedRoundedRect} from "../uiHelpers.ts";
import type {Card} from "../../models/MTG.ts";

export type StackType = "library" | "graveyard" | "exile" | "attractions" | "stickers";

export class StackView extends Container {
    private readonly frame: Graphics;
    private readonly content: Container;
    private readonly labelText: Text;
    private readonly type: StackType;
    private readonly cards: Card[] = [];
    private faceDown: boolean = false;
    private unsubscribeCardSize?: () => void;
    private isAnimating: boolean = false;
    private activeShuffleTick?: TickerCallback<any>;

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

        this.content = new Container();
        this.addChild(this.content);

        if (cards) {
            this.cards = [...cards];
        }

        this.redraw();

        // React to card size changes
        this.unsubscribeCardSize = onCardSizeChange(() => this.redraw());
    }

    addCards(cards: Card[]) {
        if (cards.length === 0) {
            return;
        }
        this.cards.push(...cards);
        this.redraw();
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

    public removeByIds(ids: string[]): Card[] {
        if (!ids || ids.length === 0) {
            return [];
        }
        const set = new Set(ids);
        const kept: Card[] = [];
        const removed: Card[] = [];
        for (const c of this.cards) {
            if (set.has(c.id)) {
                removed.push(c);
            } else {
                kept.push(c);
            }
        }
        if (removed.length > 0) {
            (this.cards as any).length = 0;
            this.cards.push(...kept);
            this.redraw();
        }
        return removed;
    }

    setFaceDown(v: boolean) {
        this.faceDown = v;
        this.redraw();
    }

    private typeLabel() {
        let text = "";
        switch (this.type) {
            case "library":
                text = "Library";
                break;
            case "attractions":
                text = "Attractions";
                break;
            case "graveyard":
                text = "Graveyard";
                break;
            case "exile":
                text = "Exile";
                break;
        }
        return `${text} (${this.cards.length})`;
    }

    public shuffle(): void {
        // Fisher–Yates shuffle
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = this.cards[i];
            this.cards[i] = this.cards[j]!;
            this.cards[j] = tmp!;
        }
        this.redraw();
        this.playShuffleAnimation();
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
                let actions: string[] = [];
                if (this.type === "library") {
                    actions = ["Search", "Shuffle"];
                } else if (this.type === "graveyard" || this.type === "exile") {
                    actions = ["Return to Hand", "Return to Battlefield", "Details"];
                } else {
                    actions = ["Search"];
                }
                const options = {source: this.type, actions};
                const gx = (e && (e.global?.x ?? e.globalX ?? e.clientX)) ?? 0;
                const gy = (e && (e.global?.y ?? e.globalY ?? e.clientY)) ?? 0;
                // include the top card as context when face-up
                const card = this.faceDown ? undefined : (this.cards.length > 0 ? this.cards[this.cards.length - 1] : undefined);
                this.emit("cardRightClick", {zone: this.type, card, options, position: {x: gx, y: gy}});
            }
        };

        this.labelText.text = this.typeLabel();

        // Face-down rendering using CardUI when requested
        if (this.faceDown) {
            const cardBack = new CardView(undefined, w, h, true, stackOptions);
            this.content.addChild(cardBack);
            return;
        }

        if (this.cards.length === 0) {
            drawDashedRoundedRect(this.content, 0, 0, w, h, 6, 0x777777, 2, 6, 6);
        } else {
            // Show the top card using CardUI
            const top = this.cards[this.cards.length - 1];
            const cardTop = new CardView(top, w, h, false, stackOptions);
            this.content.addChild(cardTop);
        }
    }

    private playShuffleAnimation(): void {
        if (this.cards.length === 0) {
            return;
        }
        if (this.isAnimating) {
            return;
        }
        this.isAnimating = true;

        const c = this.content;
        const startX = c.x;
        const startY = c.y;
        const startR = c.rotation;
        const duration = 380; // ms, short and snappy
        const ampX = 6; // px
        const rotAmp = 0.09; // radians (~5 degrees)
        const waves = 3.5; // number of wiggles

        const start = (typeof performance !== "undefined" ? performance.now() : Date.now());
        const tick = (_delta: Ticker) => {
            const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
            const t = Math.min(1, (now - start) / duration);
            const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
            const phase = ease * Math.PI * 2 * waves;
            c.x = startX + Math.sin(phase) * ampX * (1 - t);
            c.rotation = startR + Math.sin(phase) * rotAmp * (1 - t);
            if (t >= 1) {
                c.x = startX;
                c.y = startY;
                c.rotation = startR;
                if (this.activeShuffleTick) {
                    try {
                        Ticker.shared.remove(this.activeShuffleTick);
                    } catch {
                        // ignore
                    }
                }
                this.activeShuffleTick = undefined;
                this.isAnimating = false;
            }
        };
        this.activeShuffleTick = tick;
        Ticker.shared.add(tick);
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
        if (this.activeShuffleTick) {
            try {
                Ticker.shared.remove(this.activeShuffleTick);
            } catch {
                // ignore ticker remove errors
            }
            this.activeShuffleTick = undefined;
        }
        super.destroy(options);
    }
}
