import {Container, Graphics, Text, TextStyle} from "pixi.js";
import type {Card} from "mtggraphql";

// Simple visual representation of a card that can be dragged around.
export class CardView extends Container {
    public readonly data?: Card;
    public readonly cardName: string;
    public widthPx: number;
    public heightPx: number;

    private bg: Graphics;
    private title: Text;

    constructor(opts: { name: string; data?: Card; width?: number; height?: number }) {
        super();
        this.eventMode = "static"; // enable interaction
        this.cursor = "pointer";

        this.data = opts.data;
        this.cardName = opts.name;
        this.widthPx = opts.width ?? 120;
        this.heightPx = opts.height ?? 170;

        this.bg = new Graphics();
        this.drawBackground(0xeeeeee, 0x333333);
        this.addChild(this.bg);

        this.title = new Text({
            text: this.name,
            style: new TextStyle({
                fontFamily: "Arial",
                fontSize: 12,
                fill: 0x111111,
                wordWrap: true,
                wordWrapWidth: this.widthPx - 12,
            }),
        });
        this.title.x = 6;
        this.title.y = 6;
        this.addChild(this.title);

        this.enableDragging();
    }

    private drawBackground(fill: number, stroke: number) {
        const r = 8;
        this.bg.clear();
        this.bg.roundRect(0, 0, this.widthPx, this.heightPx, r);
        this.bg.fill(fill);
        this.bg.stroke({color: stroke, width: 2});
    }

    private enableDragging() {
        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;

        this.on("pointerdown", (e) => {
            dragging = true;
            const global = e.global;
            offsetX = global.x - this.x;
            offsetY = global.y - this.y;
            this.alpha = 0.9;
            this.zIndex = 9999; // bring to front heuristically when using zIndex sorting
        });

        this.on("pointerup", () => {
            dragging = false;
            this.alpha = 1.0;
        });
        this.on("pointerupoutside", () => {
            dragging = false;
            this.alpha = 1.0;
        });

        this.on("pointermove", (e) => {
            if (!dragging) return;
            const global = e.global;
            this.position.set(global.x - offsetX, global.y - offsetY);
        });
    }
}
