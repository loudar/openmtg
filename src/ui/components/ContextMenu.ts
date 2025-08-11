import { Container, Graphics, Text, TextStyle } from "pixi.js";

export type ContextMenuItem = {
    label: string;
    onClick?: () => void;
};

export class ContextMenu extends Container {
    private backdrop: Graphics;
    private panel: Graphics;
    private itemsContainer: Container;
    private isOpen: boolean = false;

    private readonly itemHeight: number = 26;
    private readonly padding: number = 8;
    private readonly radius: number = 8;

    private viewportWidth: number;
    private viewportHeight: number;

    constructor(viewportWidth: number, viewportHeight: number) {
        super();
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;

        // Fullscreen invisible backdrop to detect outside clicks
        this.backdrop = new Graphics();
        this.backdrop.rect(0, 0, viewportWidth, viewportHeight).fill({color: 0x000000, alpha: 0.001});
        this.backdrop.eventMode = "static";
        this.backdrop.on("pointerdown", () => {
            this.close();
        });
        this.addChild(this.backdrop);

        // Panel that will be positioned near pointer
        this.panel = new Graphics();
        this.panel.eventMode = "static";
        this.addChild(this.panel);

        // Items container
        this.itemsContainer = new Container();
        this.panel.addChild(this.itemsContainer);

        this.visible = false;
        this.zIndex = 1_000_000; // make sure it's on top
    }

    public open(items: ContextMenuItem[], x: number, y: number): void {
        if (!items || items.length === 0) {
            return;
        }

        // Clear previous
        this.itemsContainer.removeChildren();
        this.panel.clear();

        // Build items
        let maxWidth = 0;
        for (let i = 0; i < items.length; i++) {
            const it = items[i]!;
            const row = this.buildItem(it.label, i, () => {
                if (it.onClick) {
                    try {
                        it.onClick();
                    } catch {
                        // ignore
                    }
                }
                this.close();
            });
            this.itemsContainer.addChild(row);
            maxWidth = Math.max(maxWidth, (row as any).computedWidth ?? 0);
        }

        const totalHeight = items.length * this.itemHeight + this.padding * 2;
        const totalWidth = Math.max(120, maxWidth + this.padding * 2);

        // Draw panel with rounded corners
        this.panel.clear();
        this.panel.roundRect(0, 0, totalWidth, totalHeight, this.radius)
            .fill(0x1a1a1a)
            .stroke({color: 0x444444, width: 1});

        // Position rows
        for (let i = 0; i < this.itemsContainer.children.length; i++) {
            const row = this.itemsContainer.children[i]! as Container & { setWidth?: (w: number) => void };
            row.y = this.padding + i * this.itemHeight;
            if (typeof row.setWidth === "function") {
                row.setWidth(totalWidth - this.padding * 2);
            }
        }
        this.itemsContainer.x = this.padding;
        this.itemsContainer.y = 0;

        // Keep menu within viewport
        let px = x;
        let py = y;
        if (px + totalWidth > this.viewportWidth) {
            px = Math.max(0, this.viewportWidth - totalWidth - 4);
        }
        if (py + totalHeight > this.viewportHeight) {
            py = Math.max(0, this.viewportHeight - totalHeight - 4);
        }
        this.panel.position.set(px, py);

        this.isOpen = true;
        this.visible = true;
    }

    public close(): void {
        if (!this.isOpen) {
            return;
        }
        this.isOpen = false;
        this.visible = false;
    }

    private buildItem(label: string, index: number, onClick: () => void): Container & { computedWidth: number, setWidth: (w: number) => void, rowWidth?: number } {
        const row = new Container() as Container & { computedWidth: number, setWidth: (w: number) => void, rowWidth?: number };
        const bg = new Graphics();
        const txt = new Text({
            text: label,
            style: new TextStyle({ fontFamily: "Arial", fontSize: 14, fill: 0xffffff })
        });
        txt.y = (this.itemHeight - 14) / 2;
        row.addChild(bg);
        row.addChild(txt);

        // For measuring width (text + horizontal padding inside row)
        row.computedWidth = txt.width + 16;
        row.setWidth = (w: number) => {
            row.rowWidth = Math.max(0, w);
            txt.x = 8;
        };

        row.eventMode = "dynamic";
        row.cursor = "pointer";
        row.on("pointerover", () => {
            bg.clear();
            const w = (row.rowWidth && row.rowWidth > 0) ? row.rowWidth : (txt.width + 16);
            bg.roundRect(0, 0, w, this.itemHeight, 6).fill(0x2a2a2a);
        });
        row.on("pointerout", () => {
            bg.clear();
        });
        row.on("pointerdown", () => {
            onClick();
        });

        return row;
    }
}
