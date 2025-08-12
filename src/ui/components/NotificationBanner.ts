import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { FONT_COLOR, FONT_SIZE } from "../globals.ts";

export class NotificationBanner extends Container {
    private readonly bg: Graphics;
    private readonly labelText: Text;

    constructor(message: string, options?: { durationMs?: number; width?: number; height?: number }) {
        super();
        const width = options?.width ?? 360;
        const height = options?.height ?? 50;

        this.bg = new Graphics();
        this.bg.roundRect(0, 0, width, height, 8)
            .fill(0x2a2a2a)
            .stroke({ color: 0x555555, width: 2 });
        this.addChild(this.bg);

        this.labelText = new Text({
            text: message,
            style: new TextStyle({
                fontFamily: "Arial",
                fontSize: FONT_SIZE,
                fill: FONT_COLOR,
                align: "left",
                wordWrap: true,
                wordWrapWidth: width - 16
            })
        });
        this.labelText.anchor.set(0, 0.5);
        this.labelText.position.set(8, height / 2);
        this.addChild(this.labelText);

        const duration = options?.durationMs ?? 7000;
        // Auto-destroy after duration
        setTimeout(() => {
            try {
                if (this.parent) {
                    this.parent.removeChild(this);
                }
                this.destroy({ children: true });
            } catch {
                // ignore destroy errors
            }
        }, duration);
    }
}
