/* eslint-env bun */
/* eslint-disable no-undef */
import type {ServerWebSocket} from "bun";
import {
    type MtgSession,
    type Player,
    type CreateSessionRequest,
    type JoinSessionRequest,
    type SessionResponse
} from "./server/sessionTypes.ts";

const sessions = new Map<string, MtgSession>();
const sessionSockets = new Map<string, Set<ServerWebSocket<Session>>>();

function getOrCreateSocketSet(sessionId: string) {
    let set = sessionSockets.get(sessionId);
    if (!set) {
        set = new Set<ServerWebSocket<Session>>();
        sessionSockets.set(sessionId, set);
    }
    return set;
}

function jsonResponse(data: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Allow": "GET, POST, PUT, DELETE, OPTIONS"
        },
        ...init,
    });
}

function badRequest(message: string, status = 400) {
    return jsonResponse({error: message}, {status});
}

function createPlayer(name: string, deck?: Player["deck"]): Player {
    return {id: crypto.randomUUID(), name, deck};
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
        players: Array.from(s.players.values()).map((p) => ({id: p.id, name: p.name})),
    };
}

async function handleCreateSession(req: Request) {
    const body = (await req.json().catch(() => null)) as CreateSessionRequest | null;
    if (!body || !body.name) return badRequest("Missing name");

    const session = createSession();
    const player = createPlayer(body.name, body.deck);
    session.players.set(player.id, player);

    const res: SessionResponse = {sessionId: session.id, player};
    return jsonResponse(res);
}

async function handleJoinSession(req: Request) {
    const body = (await req.json().catch(() => null)) as JoinSessionRequest | null;
    if (!body || !body.sessionId || !body.name) return badRequest("Missing sessionId or name");
    const session = sessions.get(body.sessionId);
    if (!session) return badRequest("Session not found", 404);

    const player = createPlayer(body.name, body.deck);
    session.players.set(player.id, player);

    const res: SessionResponse = {sessionId: session.id, player};
    // Notify existing players via WS that a new player joined
    const msg = JSON.stringify({type: "player:joined", payload: {player: {id: player.id, name: player.name}}});
    for (const ws of getOrCreateSocketSet(session.id)) {
        if (ws.readyState === 1) {
            ws.send(msg);
        }
    }
    return jsonResponse(res);
}

function handleGetSession(url: URL) {
    const id = url.searchParams.get("id");
    if (!id) return badRequest("Missing id");
    const session = sessions.get(id);
    if (!session) return badRequest("Session not found", 404);
    return jsonResponse(publicSession(session));
}

interface Session {
    sessionId: string;
    playerId: string
}

const textDecoder = new TextDecoder();

const server = Bun.serve<Session, any>({
    port: 3000,
    fetch(req, srv) {
        if (req.method === "OPTIONS") {
            return jsonResponse("OK");
        }

        const url = new URL(req.url);

        if (url.pathname === "/api/session" && req.method === "POST") {
            return handleCreateSession(req);
        }
        if (url.pathname === "/api/session/join" && req.method === "POST") {
            return handleJoinSession(req);
        }
        if (url.pathname === "/api/session" && req.method === "GET") {
            return handleGetSession(url);
        }

        if (url.pathname === "/ws") {
            const sessionId = url.searchParams.get("sessionId") || undefined;
            const playerId = url.searchParams.get("playerId") || undefined;
            if (!sessionId || !playerId) return badRequest("Missing sessionId or playerId");
            const s = sessions.get(sessionId);
            if (!s || !s.players.has(playerId)) return badRequest("Invalid session or player", 403);

            const success = srv.upgrade(req, {data: {sessionId, playerId}});
            if (!success) return badRequest("WebSocket upgrade failed", 500);
            return new Response();
        }

        return new Response("Not Found", {status: 404});
    },
    websocket: {
        open(ws) {
            const {sessionId} = ws.data as Session;
            getOrCreateSocketSet(sessionId).add(ws);
        },
        close(ws) {
            const {sessionId} = ws.data as Session;
            getOrCreateSocketSet(sessionId).delete(ws);
        },
        message(ws, message) {
            const {sessionId, playerId} = ws.data as Session;
            let payload: string;

            if (typeof message === "string") {
                payload = message;
            } else if ([ArrayBuffer, Uint8Array].includes(message.constructor as any)) {
                payload = textDecoder.decode(message);
            } else {
                payload = String(message);
            }

            const wrapped = JSON.stringify({type: "relay", from: playerId, payload});

            for (const peer of getOrCreateSocketSet(sessionId)) {
                if (peer !== ws && peer.readyState === 1) {
                    peer.send(wrapped);
                }
            }
        },
    },
});

console.log(`OpenMTG server running on http://localhost:${server.port}`);
