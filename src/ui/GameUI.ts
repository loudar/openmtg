import {Application, Container} from "pixi.js";
import {StackView} from "./StackView.ts";
import {CounterButton} from "./CounterButton.ts";

export class GameUI {
    public app: Application;
    public stage?: Container;
    public library?: StackView;
    public graveyard?: StackView;
    public exile?: StackView;
    public lifeCounter?: CounterButton;

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

            // Stacks at top-left: Library, Graveyard, Exile
            const sample = options?.sampleCards ?? [
                "Island",
                "Mountain",
                "Lightning Bolt",
                "Counterspell",
                "Forest",
                "Swamp",
                "Plains",
            ];
            this.library = new StackView("library", sample);
            this.library.position.set(40, 40);
            this.stage.addChild(this.library);

            this.graveyard = new StackView("graveyard", []);
            this.graveyard.position.set(140, 40); // next to library
            this.stage.addChild(this.graveyard);

            this.exile = new StackView("exile", []);
            this.exile.position.set(240, 40); // next to graveyard
            this.stage.addChild(this.exile);

            // Life counter using generic CounterButton with right-click/shift support
            this.lifeCounter = new CounterButton({ value: 20, style: { label: "Life", fill: 0x1e1e1e, stroke: 0x444444 } });
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
