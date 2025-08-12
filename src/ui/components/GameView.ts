import {Application, Container, Assets} from "pixi.js";
import { NotificationBanner } from "./NotificationBanner.ts";
import {PlayerView} from "./PlayerView.ts";
import type {Player} from "../../server/sessionTypes.ts";
import {getSessionPublic} from "../../client/sessionClient.ts";
import {ContextMenu} from "./ContextMenu.ts";

export class GameView {
    public app!: Application;
    public stage?: Container;

    // Player management
    private players: Player[] = [];
    private playerViews = new Map<string, PlayerView>();
    private readonly localPlayerId?: string;
    private readonly sessionId?: string;
    private readonly ws?: WebSocket;

    // layout
    private rotationOffset: number = 0; // radians, clockwise; 0 means self at bottom

    // context menu
    private contextMenu?: ContextMenu;

    constructor(options?: {
        ws: WebSocket;
        player: Player;
        sessionId: string;
        width?: number;
        height?: number;
        background?: number;
        parent?: any;
    }) {
        // prevent opening context menu in-game
        if (typeof document !== "undefined") {
            (document as any).oncontextmenu = (e: Event) => e.preventDefault();
        }

        if (!options) {
            return;
        }

        const width = options?.width ?? (typeof window !== "undefined" ? window.innerWidth : 1024);
        const height = options?.height ?? (typeof window !== "undefined" ? window.innerHeight : 768);

        this.localPlayerId = options.player.id;
        this.players = [options.player];
        this.sessionId = options.sessionId;
        this.ws = options.ws as WebSocket;

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

            // Setup context menu
            const wv = this.app.renderer.width as number;
            const hv = this.app.renderer.height as number;
            this.contextMenu = new ContextMenu(wv, hv);
            this.stage.addChild(this.contextMenu);

            // Fetch initial session player list
            if (this.sessionId) {
                try {
                    const session = await getSessionPublic(this.sessionId);
                    this.players = session.players;
                } catch (e) {
                    console.warn("Failed to load session players:", e);
                }
            }

            try {
                await Assets.load("http://localhost:3000/img/cardBack.png");
            } catch (e) {
                console.warn("Failed to preload assets:", e);
            }

            // Build initial player views
            await this.rebuildPlayerViews();
            this.layoutPlayers();

            // Show deck error notification for the local player, if any
            try {
                const local = this.players.find(p => p.id === this.localPlayerId);
                if (local && local.deck && Array.isArray((local.deck as any).errors) && (local.deck as any).errors.length > 0) {
                    const msg = (local.deck as any).errors.join("\n");
                    const banner = new NotificationBanner(`Deck errors:\n${msg}`, { durationMs: 7000, width: 420, height: 56 });
                    banner.position.set(12, 12);
                    banner.zIndex = 10000;
                    this.stage.addChild(banner);
                }
            } catch {
                // ignore notification errors
            }

            // Subscribe to WS for player join/left
            if (this.ws) {
                this.ws.addEventListener("message", (ev) => this.onWSMessage(ev));
            }

            // Close context menu on window resize and relayout
            if (this.contextMenu) {
                this.contextMenu.close();
            }

            // Handle window resize to keep layout circular
            if (typeof window !== "undefined") {
                window.addEventListener("resize", () => this.layoutPlayers());
            }
        });
    }

    private async onWSMessage(ev: MessageEvent) {
        let data: any;
        try {
            data = JSON.parse(ev.data as any);
        } catch {
            return;
        }
        // Server may send either direct notifications or relay wrappers
        if (data?.type === "player:joined") {
            const p = data.payload?.player as Player;
            if (p && !this.players.find(x => x.id === p.id)) {
                this.players.push(p);
                await this.rebuildPlayerViews();
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

    private async rebuildPlayerViews() {
        if (!this.stage) {
            return;
        }

        // remove old views not present
        const knownIds = new Set(this.players.map(p => p.id));
        for (const [id, view] of this.playerViews) {
            if (!knownIds.has(id)) {
                this.stage.removeChild(view);
                this.playerViews.delete(id);
            }
        }

        // add missing views
        for (const p of this.players) {
            if (!this.playerViews.has(p.id)) {
                const isLocal = p.id === this.localPlayerId;
                const view = new PlayerView(p, isLocal);
                // Listen for context menu requests from this player's UI
                view.on("openMenu", (payload: any) => {
                    if (!this.contextMenu) {
                        return;
                    }
                    const actions: string[] = payload?.options?.actions ?? [];
                    const items = actions.map((label: string) => ({
                        label,
                        onClick: () => {
                            // Placeholder: future action dispatch can go here
                        }
                    }));
                    const pos = payload?.position ?? {x: (this.app.renderer.width as number) / 2, y: (this.app.renderer.height as number) / 2};
                    this.contextMenu.close();
                    this.contextMenu.open(items, pos.x, pos.y);
                });
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
                if (typeof (view as any).setMaxHandWidth === "function") {
                    (view as any).setMaxHandWidth(width);
                }
            }
        }
    }
}

export async function startGameUI(player: Player, sessionId: string, ws: WebSocket, container?: any) {
    const win: any = (globalThis as any).window;
    const doc: any = (globalThis as any).document;
    if (!win || !doc) {
        // In non-browser (tests, CLI), do nothing but return a constructible UI
        return new GameView();
    }

    return new GameView({
        parent: container ?? doc.body,
        sessionId,
        player,
        ws
    });
}
