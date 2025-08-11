import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { CardView } from "./CardView.ts";
import {CARD_HEIGHT, CARD_WIDTH, getCardSize, onCardSizeChange, MARGIN, FONT_SIZE} from "../globals.ts";
import {drawDashedRoundedRect} from "../uiHelpers.ts";
import type {Card} from "../../models/MTG.ts";

export class CommanderView extends Container {
    private readonly frame: Graphics;
    private readonly content: Container;
    private readonly labelText: Text;
    private readonly additionalCostTexts: Text[] = [];
    
    private castableCommanders: Card[] = [];
    private inPlayCommanders: Card[] = [];
    private commanderCastCounts: Map<string, number> = new Map();
    private unsubscribeCardSize?: () => void;

    constructor() {
        super();
        this.eventMode = "static";
        this.cursor = "default";

        this.frame = new Graphics();
        this.addChild(this.frame);
        
        this.content = new Container();
        this.addChild(this.content);

        this.labelText = new Text({
            text: "Commanders",
            style: new TextStyle({fontFamily: "Arial", fontSize: FONT_SIZE, fill: 0xcccccc})
        });
        this.labelText.position.set(4, -16);
        this.addChild(this.labelText);

        // React to card size changes
        this.unsubscribeCardSize = onCardSizeChange(() => this.redraw());
    }

    public setCastableCommanders(commanders: Card[]) {
        this.castableCommanders = [...commanders];
        this.redraw();
    }

    public setInPlayCommanders(commanders: Card[]) {
        this.inPlayCommanders = [...commanders];
        this.redraw();
    }

    public incrementCommanderCastCount(commanderId: string) {
        const currentCount = this.commanderCastCounts.get(commanderId) || 0;
        this.commanderCastCounts.set(commanderId, currentCount + 1);
        this.redraw();
    }

    public getCommanderCastCount(commanderId: string): number {
        return this.commanderCastCounts.get(commanderId) || 0;
    }

    private redraw() {
        this.content.removeChildren();
        this.frame.clear();
        this.additionalCostTexts.forEach(text => text.destroy());
        this.additionalCostTexts.length = 0;

        const w = CARD_WIDTH * getCardSize();
        const h = CARD_HEIGHT * getCardSize();
        const spacing = MARGIN * getCardSize();

        drawDashedRoundedRect(this.content, 0, 0, w, h, 6, 0x777777, 2, 6, 6);
        drawDashedRoundedRect(this.content, w + spacing, 0, w, h, 6, 0x777777, 2, 6, 6);

        // Draw in-play commanders (top row)
        for (let i = 0; i < Math.min(2, this.inPlayCommanders.length); i++) {
            const commander = this.inPlayCommanders[i];
            const cardView = new CardView(commander, w, h, false);
            cardView.position.set(i * (w + spacing), 0);
            this.content.addChild(cardView);
        }

        // Draw castable commanders (bottom row)
        for (let i = 0; i < Math.min(2, this.castableCommanders.length); i++) {
            const commander = this.castableCommanders[i]!;
            const cardView = new CardView(commander, w, h, false);
            cardView.position.set(i * (w + spacing), h + spacing);
            cardView.eventMode = "static";
            cardView.cursor = "pointer";
            
            // Add click handler to move commander to in-play
            cardView.on("pointerdown", () => {
                this.moveCommanderToInPlay(i);
            });
            
            this.content.addChild(cardView);

            // Add additional cost indicator
            const castCount = this.getCommanderCastCount(commander.id);
            if (castCount > 0) {
                const additionalCost = castCount * 2;
                const costText = new Text({
                    text: `+${additionalCost}`,
                    style: new TextStyle({
                        fontFamily: "Arial", 
                        fontSize: FONT_SIZE,
                        fill: 0xffffff,
                        stroke: 0x000000,
                    })
                });
                costText.anchor.set(1, 0);
                costText.position.set((i + 1) * (w + spacing) - 10, h + spacing + 10);
                this.additionalCostTexts.push(costText);
                this.addChild(costText);
            }
        }
    }

    private moveCommanderToInPlay(index: number) {
        if (index < 0 || index >= this.castableCommanders.length) {
            return;
        }

        const commander = this.castableCommanders[index];
        
        // Increment cast count for this commander
        /*this.incrementCommanderCastCount(commander.id);
        
        // Remove from castable and add to in-play
        this.castableCommanders.splice(index, 1);
        this.inPlayCommanders.push(commander);*/
        
        this.redraw();
    }

    public isVisible(): boolean {
        return this.castableCommanders.length > 0 || this.inPlayCommanders.length > 0;
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