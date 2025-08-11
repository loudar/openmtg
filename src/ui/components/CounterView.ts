import { Container, Graphics, Text, TextStyle } from "pixi.js";
import {FONT_COLOR, FONT_SIZE} from "../globals.ts";

export class CounterView extends Container {
    private value: number;
    private readonly mtgLabel: string;

    private readonly bg: Graphics;
    private readonly minusBtn: Graphics;
    private readonly plusBtn: Graphics;
    private readonly text: Text;

    constructor(opts?: { label?: string; value?: number }) {
        super();
        this.eventMode = "static";

        this.mtgLabel = opts?.label ?? "Life";
        this.value = opts?.value ?? 20;

        this.bg = new Graphics();
        this.bg.roundRect(0, 0, 160, 50, 8).fill(0x1e1e1e).stroke({ color: 0x444444, width: 2 });
        this.addChild(this.bg);

        this.minusBtn = new Graphics();
        this.minusBtn.roundRect(8, 10, 30, 30, 6).fill(0x8b0000);
        this.minusBtn.cursor = "pointer";
        this.minusBtn.eventMode = "static";
        this.addChild(this.minusBtn);

        const minusText = new Text({
            text: "-",
            style: new TextStyle({
                fontFamily: "Arial",
                fontSize: FONT_SIZE,
                fill: FONT_COLOR
            })
        });
        minusText.anchor.set(0.5);
        minusText.position.set(23, 25);
        this.addChild(minusText);

        this.plusBtn = new Graphics();
        this.plusBtn.roundRect(122, 10, 30, 30, 6).fill(0x006400);
        this.plusBtn.cursor = "pointer";
        this.plusBtn.eventMode = "static";
        this.addChild(this.plusBtn);

        const plusText = new Text({
            text: "+",
            style: new TextStyle({ fontFamily: "Arial", fontSize: FONT_SIZE, fill: FONT_COLOR })
        });
        plusText.anchor.set(0.5);
        plusText.position.set(137, 25);
        this.addChild(plusText);

        this.text = new Text({
            text: `${this.mtgLabel}: ${this.value}`,
            style: new TextStyle({ fontFamily: "Arial", fontSize: FONT_SIZE, fill: FONT_COLOR })
        });
        this.text.anchor.set(0.5);
        this.text.position.set(80, 25);
        this.addChild(this.text);

        this.minusBtn.on("pointertap", () => this.change(-1));
        this.plusBtn.on("pointertap", () => this.change(1));
    }

    get current() {
        return this.value;
    }

    change(delta: number) {
        this.value += delta;
        this.text.text = `${this.mtgLabel}: ${this.value}`;
        this.emit("change", this.value);
    }
}
