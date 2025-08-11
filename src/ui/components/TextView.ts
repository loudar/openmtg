import {type CanvasTextOptions, Container, Graphics, Text, TextStyle} from "pixi.js";
import {FONT_SIZE} from "../globals.ts";
import type {CounterButtonStyle} from "./CounterButton.ts";

export interface TextViewOptions extends CanvasTextOptions {
    backgroundColor?: string;
}

export class TextView extends Container {
    constructor(opts: TextViewOptions) {
        super();
        this.eventMode = "static";
        this.cursor = "default";

        const style: Required<Omit<CounterButtonStyle, "textStyle" | "label">> & {
            textStyle: TextStyle;
            label: string
        } = {
            width: 120,
            height: 44,
            radius: 8,
            fill: 0x2a2a2a,
            stroke: 0x555555,
            strokeWidth: 2,
            textStyle: new TextStyle({
                fontFamily: "Arial",
                fontSize: FONT_SIZE,
                fill: 0xffffff
            }),
            label: opts.text,
        } as any;

        const bg = new Graphics();
        this.drawBg(bg, style);

        const labelText = new Text({
            text: opts.text,
            style: style.textStyle,
        });
        labelText.anchor.set(0.5);
        labelText.position.set(style.width / 2, style.height / 2);
        this.addChild(labelText);
    }

    private drawBg(bg: Graphics, style: Required<Omit<CounterButtonStyle, "textStyle" | "label">> & {}) {
        const {width, height, radius, fill, stroke, strokeWidth} = style;
        bg.clear();
        bg.roundRect(0, 0, width, height, radius)
            .fill(fill)
            .stroke({color: stroke, width: strokeWidth});
        this.addChild(bg);
    }
}