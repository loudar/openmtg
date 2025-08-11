import {Container, Graphics, Text, TextStyle} from "pixi.js";
import { CardView } from "./CardView.ts";
import {CARD_HEIGHT, CARD_WIDTH, getCardSize, onCardSizeChange, MARGIN, FONT_SIZE} from "../globals.ts";
import {drawDashedRoundedRect} from "../uiHelpers.ts";
import type {Card} from "../../models/MTG.ts";

export class CommanderView extends Container {
    private readonly frame: Graphics;
    private readonly content: Container;
    private readonly commanders: Card[] = [];

    private unsubscribeCardSize?: () => void;

    constructor(commanders: Card[]) {
        super();
        this.commanders = commanders;
        this.eventMode = "static";
        this.cursor = "default";

        this.frame = new Graphics();
        this.addChild(this.frame);
        
        this.content = new Container();
        this.addChild(this.content);
        this.redraw();

        this.unsubscribeCardSize = onCardSizeChange(() => this.redraw());
    }

    private redraw() {
        this.content.removeChildren();
        this.frame.clear();

        const w = CARD_WIDTH * getCardSize();
        const h = CARD_HEIGHT * getCardSize();
        const spacing = MARGIN * getCardSize();

        for (let i = 0; i < this.commanders.length; i++) {
            const commander = this.commanders[i]!;
            commander.playedTimes ??= 0;

            drawDashedRoundedRect(this.content, i * (w + spacing), 0, w, h, 6, 0x777777, 2, 6, 6);

            const cardView = new CardView(commander, w, h, false, {
                leftClick: () => {
                    commander.inPlay = true;
                    this.redraw();
                },
                rightClick: (_c, e) => {
                    this.openMenu(i, e);
                }
            });
            cardView.position.set(i * (w + spacing), h + spacing);
            this.content.addChild(cardView);

            const textView = new Text({
                text: `+${commander.playedTimes * 2}`,
                style: new TextStyle({
                    fontFamily: "Arial",
                    fontSize: FONT_SIZE,
                    fill: 0xffffff
                }),
                position: { x: 0, y: -FONT_SIZE }
            });
            this.content.addChild(textView);
        }
    }

    private openMenu(index: number, e?: any) {
        const commander = this.commanders[index];
        const options = {source: "commander", actions: ["Cast", "View Command Zone", "Details"]};
        const gx = (e && (e.global?.x ?? e.globalX ?? e.clientX)) ?? 0;
        const gy = (e && (e.global?.y ?? e.globalY ?? e.clientY)) ?? 0;
        this.emit("openMenu", {card: commander, index, options, position: {x: gx, y: gy}});
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