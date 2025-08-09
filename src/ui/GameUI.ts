/* eslint-disable no-undef */
import {Application, Container} from "pixi.js";
import {DeckView} from "./DeckView.ts";
import {CardView} from "./CardView.ts";
import {CounterView} from "./CounterView.ts";

export class GameUI {
    public app: Application;
    public stage?: Container;
    public deck?: DeckView;
    public lifeCounter?: CounterView;

    constructor(options?: {
        width?: number;
        height?: number;
        background?: number;
        parent?: any;
        sampleCards?: string[]
    }) {
        const width = options?.width ?? 1024;
        const height = options?.height ?? 768;

        this.app = new Application();
        this.app.init({
            width,
            height,
            backgroundColor: options?.background ?? 0x0a0a0a,
            antialias: true
        }).then(() => {
            document.body.appendChild(this.app.canvas);
            this.stage = this.app.stage;

            // Allow zIndex sorting for dragging
            this.stage.sortableChildren = true;

            // Deck
            this.deck = new DeckView(options?.sampleCards ?? [
                "Island",
                "Mountain",
                "Lightning Bolt",
                "Counterspell",
                "Forest",
                "Swamp",
                "Plains",
            ]);
            this.deck.position.set(40, 40);
            this.stage.addChild(this.deck);

            // Hand area basic layout when drawing
            let nextHandX = 160;
            const handY = height - 200;

            this.deck.on("drawn", (cv: CardView) => {
                cv.position.set(nextHandX, handY);
                cv.zIndex = 100; // beneath dragging 9999
                nextHandX += 130; // basic spacing
                this.stage!.addChild(cv);
            });

            // Life counter
            this.lifeCounter = new CounterView({label: "Life", value: 20});
            this.lifeCounter.position.set(width - 200, 40);
            this.stage.addChild(this.lifeCounter);
        });
    }
}

export async function startGameUI(container?: any) {
    const win: any = (globalThis as any).window;
    const doc: any = (globalThis as any).document;
    if (!win || !doc) {
        // In non-browser (tests, CLI), do nothing but return a constructible UI
        return new GameUI();
    }
    return new GameUI({parent: container ?? doc.body});
}
