import {Application, Container} from "pixi.js";
import {CounterButton} from "./CounterButton.ts";
import {PlayerUI, type PlayerInfo} from "./PlayerUI.ts";
import {getSessionPublic} from "../client/sessionClient.ts";

export class GameUI {
    public app: Application;
    public stage?: Container;

    // Player management
    private players: PlayerInfo[] = [];
    private playerViews = new Map<string, PlayerUI>();
    private localPlayerId?: string;
    private sessionId?: string;
    private ws?: WebSocket;

    // layout
    private rotationOffset: number = 0; // radians, clockwise; 0 means self at bottom

    public lifeCounter?: CounterButton;

    constructor(options?: {
        width?: number;
        height?: number;
        background?: number;
        parent?: any;
        sampleCards?: string[]
    }) {
        // prevent opening context menu in-game
        if (typeof document !== "undefined") {
            (document as any).oncontextmenu = (e: Event) => e.preventDefault();
        }

        const width = options?.width ?? 1024;
        const height = options?.height ?? 768;

        // Read session globals put by the React pre-screen
        const win: any = (globalThis as any).window ?? undefined;
        const openmtg = win?.openmtg;
        this.localPlayerId = openmtg?.playerId;
        this.sessionId = openmtg?.sessionId;
        this.ws = openmtg?.ws as WebSocket | undefined;
        const localDeckNames: string[] | undefined = openmtg?.localDeck?.cards?.map((c: any) => c?.name).filter((n: any) => typeof n === "string");

        this.app = new Application();
        this.app.init({
            width,
            height,
            backgroundColor: options?.background ?? 0x0a0a0a,
            antialias: true
        }).then(async () => {
            if (typeof document !== "undefined" && (document as any).body) {
                document.body.appendChild(this.app.canvas);
            }
            this.stage = this.app.stage;

            // Allow zIndex sorting for dragging
            this.stage.sortableChildren = true;

            this.lifeCounter = new CounterButton({ value: 20, style: { label: "Life", fill: 0x1e1e1e, stroke: 0x444444 } });
            this.lifeCounter.position.set(width - 160, height - 80);
            this.stage.addChild(this.lifeCounter);

            // Fetch initial session player list
            if (this.sessionId) {
                try {
                    const session = await getSessionPublic(this.sessionId);
                    this.players = session.players;
                } catch (e) {
                    console.warn("Failed to load session players:", e);
                }
            }

            // Build initial player views
            this.rebuildPlayerViews(localDeckNames);
            this.layoutPlayers();

            // Subscribe to WS for player join/left
            if (this.ws) {
                this.ws.addEventListener("message", (ev) => this.onWSMessage(ev));
            }

            // Handle window resize to keep layout circular
            if (typeof window !== "undefined") {
                window.addEventListener("resize", () => this.layoutPlayers());
            }
        });
    }

    private onWSMessage(ev: MessageEvent) {
        let data: any;
        try {
            data = JSON.parse(ev.data as any);
        } catch {
            return;
        }
        // Server may send either direct notifications or relay wrappers
        if (data?.type === "player:joined") {
            const p = data.payload?.player as PlayerInfo;
            if (p && !this.players.find(x => x.id === p.id)) {
                this.players.push(p);
                this.rebuildPlayerViews();
                this.layoutPlayers();
            }
            return;
        }
        if (data?.type === "player:left") {
            const id = data.payload?.playerId as string;
            if (id) {
                this.players = this.players.filter(p => p.id !== id);
                const view = this.playerViews.get(id);
                if (view && this.stage) this.stage.removeChild(view);
                this.playerViews.delete(id);
                this.layoutPlayers();
            }
            return;
        }

        if (data?.type === "relay") {
            // Future: handle relayed custom messages
            // const payload = JSON.parse(data.payload);
        }
    }

    private rebuildPlayerViews(sampleCards?: string[]) {
        if (!this.stage) return;
        // remove old views not present
        const knownIds = new Set(this.players.map(p => p.id));
        for (const [id, view] of this.playerViews) {
            if (!knownIds.has(id)) {
                this.stage.removeChild(view);
                this.playerViews.delete(id);
            }
        }
        // add missing
        for (const p of this.players) {
            if (!this.playerViews.has(p.id)) {
                const isLocal = p.id === this.localPlayerId;
                const view = new PlayerUI(
                    p,
                    isLocal,
                    isLocal
                        ? (sampleCards ?? [])
                        : new Array(Math.max(0, p.deckSize ?? 0)).fill("")
                );
                this.playerViews.set(p.id, view);
                this.stage.addChild(view);
            }
        }
    }

    private layoutPlayers() {
        if (!this.stage) return;
        const width = this.app.renderer.width as number;
        const height = this.app.renderer.height as number;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 120; // padding from edges

        const ids = this.players.map(p => p.id);
        const selfIndex = Math.max(0, ids.indexOf(this.localPlayerId ?? ""));
        const N = Math.max(1, ids.length);

        if (ids.length > 0) {
            for (let i = 0; i < N; i++) {
                const pid = ids[i]!;
                const view = this.playerViews.get(pid);
                if (!view) {
                    continue;
                }

                // Place self at bottom (angle Math.PI/2) then distribute others evenly around circle
                const relIndex = (i - selfIndex + N) % N;
                const angle = (Math.PI / 2) + (this.rotationOffset) + (2 * Math.PI * relIndex / N);
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                view.position.set(x, y);
                view.pivot.set(0, 0);
                view.rotation = angle - Math.PI / 2; // rotate UI upright facing center
            }
        }
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
