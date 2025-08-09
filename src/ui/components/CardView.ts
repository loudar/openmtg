import {Assets, Container, Graphics, Sprite, Text, TextStyle, Texture} from "pixi.js";
import type {ScryfallCard} from "../../models/Scryfall.ts";

// CardUI is responsible for rendering a single card (face-up or face-down)
// Width/height are fixed per instance; callers position/scale externally as needed.
export class CardView extends Container {
    private content: Container = new Container();
    private static readonly HOVER_SCALE: number = 1.1;
    private static readonly ALT_SCALE: number = 2.0;

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
                CardView.altPressed = next;
                CardView.notifyAltChange();
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            // If no modifier left, clear
            const next = e.altKey === true; // keyup could still have altKey if another alt is held
            if (next !== CardView.altPressed) {
                CardView.altPressed = next;
                CardView.notifyAltChange();
            }
            if (!next) {
                CardView.altPressed = false;
                CardView.notifyAltChange();
            }
        };
        if (typeof window !== "undefined") {
            window.addEventListener("keydown", onKeyDown);
            window.addEventListener("keyup", onKeyUp);
        }
        CardView.listenersSetup = true;
    }

    private static notifyAltChange(): void {
        for (const inst of CardView.instances) {
            if (inst.isHovered) {
                inst.updateScale();
            }
        }
    }

    private card?: ScryfallCard;
    private faceDown: boolean = false;
    private readonly w: number;
    private readonly h: number;

    private gfx?: Graphics;
    private sprite?: Sprite;
    private nameText?: Text;

    private isHovered: boolean = false;

    constructor(card?: ScryfallCard, width: number = 80, height: number = 110, faceDown: boolean = false) {
        super();
        this.w = width;
        this.h = height;
        this.faceDown = faceDown;

        // Setup internal content container centered for proper scaling around center
        this.content.pivot.set(this.w / 2, this.h);
        this.content.position.set(this.w / 2, this.h);
        this.addChild(this.content);

        CardView.setupAltListeners();
        CardView.instances.add(this);

        // Enable interactions for hover
        this.eventMode = "dynamic";
        this.cursor = "pointer";
        this.on("pointerover", () => {
            this.isHovered = true;
            this.updateScale();
        });
        this.on("pointerout", () => {
            this.isHovered = false;
            this.updateScale();
        });

        if (card) {
            this.card = card;
            this.init().then();
        } else {
            this.redraw();
        }
    }

    private async init(): Promise<void> {
        if (this.card?.image_uris.normal) {
            await Assets.load(this.card?.image_uris.normal);
        }
        this.redraw();
    }

    public setCard(card?: ScryfallCard) {
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
            this.sprite.destroy({ children: true, texture: false });
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
            const target = CardView.altPressed ? CardView.ALT_SCALE : CardView.HOVER_SCALE;
            this.content.scale.set(target, target);
        } else {
            this.content.scale.set(1, 1);
        }
    }

    private redraw() {
        this.clear();

        // Base rounded rectangle (used as fallback and base frame)
        const g = new Graphics();
        const fillColor = this.faceDown ? 0x444444 : 0x2e2e2e;
        const strokeColor = this.faceDown ? 0x222222 : 0x555555;
        g.roundRect(0, 0, this.w, this.h, 6).fill(fillColor).stroke({ color: strokeColor, width: 2 });
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
                style: new TextStyle({ fontFamily: "Arial", fontSize: 11, fill: 0xffffff, wordWrap: true, wordWrapWidth: this.w - 8 })
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
