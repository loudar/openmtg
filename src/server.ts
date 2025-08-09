/* eslint-env node */
import express from "express";
import {createServer} from "http";
import {WebSocketServer, WebSocket} from "ws";
import {
    type MtgSession,
    type Player,
    type CreateSessionRequest,
    type JoinSessionRequest,
    type SessionResponse
} from "./server/sessionTypes.ts";
import {DeckDownloader} from "./tools/DeckDownloader.ts";
import * as path from "node:path";

const PORT = 3000;

const sessions = new Map<string, MtgSession>();
const sessionSockets = new Map<string, Set<WebSocket>>();

function getOrCreateSocketSet(sessionId: string) {
    let set = sessionSockets.get(sessionId);
    if (!set) {
        set = new Set<WebSocket>();
        sessionSockets.set(sessionId, set);
    }
    return set;
}

async function createPlayer(name: string, deckInput: string): Promise<Player> {
    const deck = await DeckDownloader.getFromString(deckInput);

    return {
        id: crypto.randomUUID(),
        name,
        deck
    };
}

function createSession(): MtgSession {
    const id = crypto.randomUUID();
    const s: MtgSession = {
        id,
        createdAt: Date.now(),
        players: new Map<string, Player>(),
    };
    sessions.set(id, s);
    return s;
}

function publicSession(s: MtgSession) {
    return {
        id: s.id,
        createdAt: s.createdAt,
        players: [...s.players.values()],
    };
}

// Express app
const app = express();
app.use(express.json());

// Serve static images from src/img at /img
const IMG_DIR = path.resolve(process.cwd(), "src", "img");
app.use("/img", express.static(IMG_DIR, {maxAge: "1d", etag: true}));

// Simple CORS middleware to mirror previous behavior
app.use((req, res, next) => {
    res.header("Content-Type", "application/json");
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Allow", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        return res.status(200).send("OK");
    }
    next();
});

app.post("/api/session", async (req, res) => {
    const body = (req.body ?? null) as CreateSessionRequest | null;

    if (!body?.name) {
        return res.status(400).json({error: "Missing name"});
    }

    if (!body?.deck) {
        return res.status(400).json({error: "Missing deck input"});
    }

    const session = createSession();
    const player = await createPlayer(body.name, body.deck);
    session.players.set(player.id, player);

    const response: SessionResponse = {sessionId: session.id, player};
    return res.json(response);
});

app.post("/api/session/join", async (req, res) => {
    const body = (req.body ?? null) as JoinSessionRequest | null;
    if (!body || !body.sessionId || !body.name) {
        return res.status(400).json({error: "Missing sessionId or name"});
    }

    const session = sessions.get(body.sessionId);
    if (!session) {
        return res.status(404).json({error: "Session not found"});
    }

    const player = await createPlayer(body.name, body.deck);
    session.players.set(player.id, player);

    const response: SessionResponse = {sessionId: session.id, player};

    // Notify existing players via WS that a new player joined
    const msg = JSON.stringify({
        type: "player:joined",
        payload: {
            player
        }
    });
    for (const ws of getOrCreateSocketSet(session.id)) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(msg);
        }
    }

    return res.json(response);
});

app.get("/api/session", (req, res) => {
    const id = (req.query.id as string | undefined) ?? undefined;
    if (!id) {
        return res.status(400).json({error: "Missing id"});
    }

    const session = sessions.get(id);
    if (!session) {
        return res.status(404).json({error: "Session not found"});
    }

    return res.json(publicSession(session));
});

// Create HTTP server and attach WS
const server = createServer(app);

const wss = new WebSocketServer({server, path: "/ws"});

wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId") || undefined;
    const playerId = url.searchParams.get("playerId") || undefined;

    if (!sessionId || !playerId) {
        ws.close(1008, "Missing sessionId or playerId");
        return;
    }

    const s = sessions.get(sessionId);
    if (!s || !s.players.has(playerId)) {
        ws.close(1008, "Invalid session or player");
        return;
    }

    // Track WS in session set
    const set = getOrCreateSocketSet(sessionId);
    set.add(ws);

    ws.on("close", () => {
        set.delete(ws);
    });

    ws.on("message", (data) => {
        let payload: string;
        if (typeof data === "string") {
            payload = data;
        } else if (data instanceof Buffer || data instanceof Uint8Array) {
            payload = data.toString();
        } else {
            payload = String(data);
        }

        const wrapped = JSON.stringify({type: "relay", from: playerId, payload});
        for (const peer of set) {
            if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                peer.send(wrapped);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`OpenMTG server running on http://localhost:${PORT}`);
});
