import {Container, Graphics, Text, TextStyle} from "pixi.js";

export type CounterButtonStyle = {
    width?: number;
    height?: number;
    radius?: number;
    fill?: number;
    stroke?: number;
    strokeWidth?: number;
    textStyle?: Partial<TextStyle>;
    label?: string;
};

export class CounterButton extends Container {
    private bg: Graphics;
    private labelText: Text;
    private _value: number;
    private style: Required<Omit<CounterButtonStyle, "textStyle" | "label">> & { textStyle: TextStyle; label: string };

    constructor(opts?: { value?: number; style?: CounterButtonStyle }) {
        super();
        this.eventMode = "static";
        this.cursor = "pointer";

        this._value = opts?.value ?? 0;

        const defaultStyle: Required<Omit<CounterButtonStyle, "textStyle" | "label">> & {
            textStyle: TextStyle;
            label: string
        } = {
            width: 120,
            height: 44,
            radius: 8,
            fill: 0x2a2a2a,
            stroke: 0x555555,
            strokeWidth: 2,
            textStyle: new TextStyle({fontFamily: "Arial", fontSize: 18, fill: 0xffffff}),
            label: "Counter",
        } as any;

        const s = opts?.style ?? {};
        this.style = {
            width: s.width ?? defaultStyle.width,
            height: s.height ?? defaultStyle.height,
            radius: s.radius ?? defaultStyle.radius,
            fill: s.fill ?? defaultStyle.fill,
            stroke: s.stroke ?? defaultStyle.stroke,
            strokeWidth: s.strokeWidth ?? defaultStyle.strokeWidth,
            textStyle: new TextStyle({...(defaultStyle.textStyle as any), ...(s.textStyle as any)}),
            label: s.label ?? defaultStyle.label,
        };

        this.bg = new Graphics();
        this.drawBg();
        this.addChild(this.bg);

        this.labelText = new Text({
            text: `${this.style.label}: ${this._value}`,
            style: this.style.textStyle,
        });
        this.labelText.anchor.set(0.5);
        this.labelText.position.set(this.style.width / 2, this.style.height / 2);
        this.addChild(this.labelText);

        // Left/Right click with Shift support using pointerdown
        this.on("pointerdown", (e: any) => {
            const ev = e as any; // FederatedPointerEvent
            const shift = !!ev.shiftKey;
            const base = shift ? 10 : 1;
            const button = ev.button ?? 0; // 0 left, 2 right
            const delta = button === 2 ? -base : base;
            this.change(delta);
        });

        // Prevent context menu on right click if running in browser
        if (typeof window !== "undefined") {
            this.addEventListener?.("contextmenu", (evt: Event) => {
                evt.preventDefault();
            });
        }
    }

    private drawBg() {
        const {width, height, radius, fill, stroke, strokeWidth} = this.style;
        this.bg.clear();
        this.bg.roundRect(0, 0, width, height, radius).fill(fill).stroke({color: stroke, width: strokeWidth});
    }

    get value() {
        return this._value;
    }

    set value(v: number) {
        this._value = v;
        this.refreshLabel();
    }

    setLabel(label: string) {
        this.style.label = label;
        this.refreshLabel();
    }

    change(delta: number) {
        this._value += delta;
        this.refreshLabel();
        this.emit("change", this._value, delta);
    }

    private refreshLabel() {
        this.labelText.text = `${this.style.label}: ${this._value}`;
    }
}
