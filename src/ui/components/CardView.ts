import {Assets, Container, Graphics, Sprite, Text, TextStyle, Texture} from "pixi.js";
import type {Card} from "../../models/MTG.ts";
import {FONT_COLOR, FONT_SIZE} from "../globals.ts";

// CardUI is responsible for rendering a single card (face-up or face-down)
// Width/height are fixed per instance; callers position/scale externally as needed.
export type CardViewActions = {
    leftClick?: (card?: Card, e?: any) => void;
    rightClick?: (card?: Card, e?: any) => void;
    // Enable simple dragging; when true, left click is deferred until pointer up if no drag occurred
    draggable?: boolean;
    onDragEnd?: (card?: Card, global?: { x: number; y: number }) => void;
};

export class CardView extends Container {
    private content: Container = new Container();
    private static readonly HOVER_SCALE: number = 1.1;
    private static altZoomScale: number = 2.0;

    private static altPressed: boolean = false;
    private static listenersSetup: boolean = false;
    private static instances: Set<CardView> = new Set<CardView>();

    private static setupAltListeners(): void {
        if (CardView.listenersSetup) {
            return;
        }
        // Track Alt key globally so hovering cards can react in real time
        const onKeyDown = (e: KeyboardEvent) => {
            const next = e.altKey === true;
            if (next !== CardView.altPressed) {
                e.preventDefault();
                CardView.altPressed = next;
                CardView.notifyAltChange();
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            // If no modifier left, clear
            const next = e.altKey === true; // keyup could still have altKey if another alt is held
            if (next !== CardView.altPressed) {
                e.preventDefault();
                CardView.altPressed = next;
                CardView.notifyAltChange();
            }
            if (!next) {
                CardView.altPressed = false;
                CardView.notifyAltChange();
            }
        };
        const onWheel = (e: WheelEvent) => {
            if (!e.altKey) {
                return;
            }
            // Adjust Alt zoom scale dynamically with Alt + scroll
            // Negative deltaY typically means scroll up (zoom in)
            const delta = -e.deltaY * 0.001;
            CardView.altZoomScale = Math.max(1.1, Math.min(5.0, CardView.altZoomScale + delta));
            CardView.notifyAltChange();
            try {
                e.preventDefault();
            } catch {
                // ignore
            }
        };
        if (typeof window !== "undefined") {
            window.addEventListener("keydown", onKeyDown);
            window.addEventListener("keyup", onKeyUp);
            window.addEventListener("wheel", onWheel, {passive: false});
        }
        CardView.listenersSetup = true;
    }

    private static notifyAltChange(): void {
        for (const inst of CardView.instances) {
            if (inst.isHovered) {
                inst.updateScale();
                inst.updateDepth();
            }
        }
    }

    private card?: Card;
    private faceDown: boolean = false;
    private readonly w: number;
    private readonly h: number;

    private gfx?: Graphics;
    private sprite?: Sprite;
    private nameText?: Text;

    private isHovered: boolean = false;
    private baseZIndex: number = 0;
    private readonly actions?: CardViewActions;

    constructor(card?: Card, width: number = 80, height: number = 110, faceDown: boolean = false, actions?: CardViewActions) {
        super();
        this.w = width;
        this.h = height;
        this.faceDown = faceDown;
        this.actions = actions;

        // Setup internal content container centered for proper scaling around center
        this.content.pivot.set(this.w / 2, this.h);
        this.content.position.set(this.w / 2, this.h);
        this.addChild(this.content);

        CardView.instances.add(this);

        this.initializeInteraction();

        if (card) {
            this.card = card;
            this.init().then();
        } else {
            this.redraw();
        }
    }

    private initializeInteraction() {
        CardView.setupAltListeners();

        // Enable interactions for hover/click
        this.eventMode = "dynamic";
        this.cursor = "pointer";
        this.on("pointerover", () => {
            this.isHovered = true;
            this.updateScale();
            this.updateDepth();
        });
        this.on("pointerout", () => {
            this.isHovered = false;
            this.updateScale();
            this.updateDepth();
        });

        // If draggable enabled, use drag-aware handlers; otherwise keep immediate click behavior
        if (this.actions && this.actions.draggable) {
            let dragging = false;
            let down = false;
            let startGlobal = { x: 0, y: 0 } as any;
            let startLocal = { x: 0, y: 0 } as any;
            let origPos = { x: 0, y: 0 } as any;

            this.on("pointerdown", (e: any) => {
                const btn = typeof e?.button === "number" ? e.button : 0;
                if (btn === 2) {
                    if (this.actions && this.actions.rightClick) {
                        this.actions.rightClick(this.card, e);
                    }
                    this.emit("cardRightClick", this.card, e);
                    return;
                }
                down = true;
                dragging = false;
                startGlobal = { x: e.global.x, y: e.global.y };
                startLocal = this.parent ? this.parent.toLocal(e.global) : { x: 0, y: 0 };
                origPos = { x: this.x, y: this.y };
                this.alpha = 0.95;
                this.zIndex = 999999;
                if (this.parent) {
                    this.parent.sortableChildren = true;
                }
            });
            this.on("pointermove", (e: any) => {
                if (!down) {
                    return;
                }
                const currentLocal = this.parent ? this.parent.toLocal(e.global) : { x: 0, y: 0 };
                const dx = currentLocal.x - startLocal.x;
                const dy = currentLocal.y - startLocal.y;
                if (!dragging) {
                    const mdx = e.global.x - startGlobal.x;
                    const mdy = e.global.y - startGlobal.y;
                    const dist2 = (mdx * mdx) + (mdy * mdy);
                    if (dist2 > 25) {
                        dragging = true;
                    }
                }
                if (dragging) {
                    this.position.set(origPos.x + dx, origPos.y + dy);
                }
            });
            const finish = (e: any) => {
                if (!down) {
                    return;
                }
                down = false;
                this.alpha = 1;
                // Snap back
                this.position.set(origPos.x, origPos.y);
                const wasDragging = dragging;
                dragging = false;
                if (wasDragging) {
                    if (this.actions && this.actions.onDragEnd) {
                        try {
                            this.actions.onDragEnd(this.card, { x: e.global.x, y: e.global.y });
                        } catch {
                            // ignore errors from consumer
                        }
                    }
                } else {
                    // Treat as a click if no drag
                    if (this.actions && this.actions.leftClick) {
                        this.actions.leftClick(this.card, e);
                    }
                    this.emit("cardLeftClick", this.card, e);
                }
            };
            this.on("pointerup", finish);
            this.on("pointerupoutside", finish);
        } else {
            this.on("pointerdown", (e: any) => {
                const btn = typeof e?.button === "number" ? e.button : 0;
                if (btn === 2) {
                    if (this.actions && this.actions.rightClick) {
                        this.actions.rightClick(this.card, e);
                    }
                    this.emit("cardRightClick", this.card, e);
                } else {
                    if (this.actions && this.actions.leftClick) {
                        this.actions.leftClick(this.card, e);
                    }
                    this.emit("cardLeftClick", this.card, e);
                }
            });
            // Also listen to explicit rightclick event for completeness
            this.on("rightclick", (e: any) => {
                if (this.actions && this.actions.rightClick) {
                    this.actions.rightClick(this.card, e);
                }
                this.emit("cardRightClick", this.card, e);
            });
        }
    }

    private async init(): Promise<void> {
        if (this.card?.image_uris.normal) {
            await Assets.load(this.card?.image_uris.normal);
        }
        this.redraw();
    }

    public setCard(card?: Card) {
        this.card = card;
        this.redraw();
    }

    public setFaceDown(v: boolean) {
        this.faceDown = v;
        this.redraw();
    }

    public get widthPx() {
        return this.w;
    }

    public get heightPx() {
        return this.h;
    }

    private clear() {
        // Clear only the internal content; preserve the container itself
        this.content.removeChildren();
        if (this.sprite) {
            this.sprite.destroy({children: true, texture: false});
            this.sprite = undefined;
        }
        if (this.gfx) {
            this.gfx.destroy();
            this.gfx = undefined;
        }
        if (this.nameText) {
            this.nameText.destroy();
            this.nameText = undefined;
        }
    }

    private updateScale(): void {
        if (this.isHovered) {
            const target = CardView.altPressed ? CardView.altZoomScale : CardView.HOVER_SCALE;
            this.content.scale.set(target, target);
        } else {
            this.content.scale.set(1, 1);
        }
    }

    private updateDepth(): void {
        if (this.isHovered && CardView.altPressed) {
            this.zIndex = 1000000;
            if (this.parent) {
                this.parent.sortableChildren = true;
            }
        } else {
            this.zIndex = 0;
        }
    }

    private redraw() {
        this.clear();

        // Base rounded rectangle (used as fallback and base frame)
        const g = new Graphics();
        const fillColor = this.faceDown ? 0x444444 : 0x2e2e2e;
        const strokeColor = this.faceDown ? 0x222222 : 0x555555;
        g.roundRect(0, 0, this.w, this.h, 6).fill(fillColor).stroke({color: strokeColor, width: 2});
        this.content.addChild(g);
        this.gfx = g;

        if (this.faceDown) {
            // Try to draw card back texture
            try {
                const tex = Texture.from("http://localhost:3000/img/cardBack.jpg");
                const spr = new Sprite(tex);
                spr.width = this.w;
                spr.height = this.h;
                spr.x = 0;
                spr.y = 0;
                this.sprite = spr;
                this.content.addChild(spr);
            } catch {
                // keep fallback base graphics
            }
            return;
        }

        if (this.card?.image_uris) {
            const tex = Texture.from(this.card.image_uris.normal);
            const spr = new Sprite(tex);
            spr.width = this.w;
            spr.height = this.h;
            spr.x = 0;
            spr.y = 0;
            this.sprite = spr;
            this.content.addChild(spr);
        } else {
            const name = this.card?.name || "Card";
            const text = new Text({
                text: name,
                style: new TextStyle({
                    fontFamily: "Arial",
                    fontSize: FONT_SIZE,
                    fill: FONT_COLOR,
                    wordWrap: true,
                    wordWrapWidth: this.w - 8
                })
            });
            text.position.set(4, 4);
            this.content.addChild(text);
            this.nameText = text;
        }
    }

    public override destroy(options?: any): void {
        CardView.instances.delete(this);
        super.destroy(options);
    }
}
