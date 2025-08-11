import { Container, Graphics, Text } from "pixi.js";
import { CardView } from "./CardView.ts";
import {CARD_HEIGHT, CARD_WIDTH, getCardSize, onCardSizeChange, MARGIN} from "../globals.ts";
import {drawDashedRoundedRect} from "../uiHelpers.ts";
import type {Card} from "../../models/MTG.ts";
import {TextView} from "./TextView.ts";

export class CommanderView extends Container {
    private readonly frame: Graphics;
    private readonly content: Container;
    private readonly labelText: TextView;
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

        this.labelText = new TextView({
            text: "Commanders",
            position: {
                x: 0, y: 0
            }
        });
        this.redraw();

        this.unsubscribeCardSize = onCardSizeChange(() => this.redraw());
    }

    private redraw() {
        this.content.removeChildren();
        this.frame.clear();

        const w = CARD_WIDTH * getCardSize();
        const h = CARD_HEIGHT * getCardSize();
        const spacing = MARGIN * getCardSize();

        // Draw castable commanders (bottom row)
        for (let i = 0; i < this.commanders.length; i++) {
            const commander = this.commanders[i]!;
            commander.playedTimes ??= 0;

            drawDashedRoundedRect(this.content, i * (w + spacing), 0, w, h, 6, 0x777777, 2, 6, 6);

            const cardView = new CardView(commander, w, h, false, {
                leftClick: () => {
                    this.moveCommanderToInPlay(i);
                },
                rightClick: () => {
                    this.openMenu(i);
                }
            });
            cardView.position.set(i * (w + spacing), h + spacing);
            this.content.addChild(cardView);
        }

        this.addChild(this.labelText);
    }

    private moveCommanderToInPlay(index: number) {
        // TODO: actual play logic should be implemented by consumer of this component
        this.emit("playCard", {source: "commander", index});
        this.redraw();
    }

    private openMenu(index: number) {
        const commander = this.commanders[index];
        const options = {source: "commander", actions: ["Cast", "View Command Zone", "Details"]};
        this.emit("openMenu", {card: commander, index, options});
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