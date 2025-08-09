/* eslint-env browser */
/* eslint-disable no-undef */
import type { Deck } from "../models/MTG.ts";
import type { SessionResponse } from "../server/sessionTypes.ts";

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "http://localhost:3000";

export async function createSession(name: string, deck?: Deck): Promise<SessionResponse> {
    const res = await fetch(`${API_BASE}/api/session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        mode: "cors",
        body: JSON.stringify({ name, deck }),
    });
    if (!res.ok) throw new Error(`Create failed: ${res.status}`);
    return res.json();
}

export async function joinSession(sessionId: string, name: string, deck?: Deck): Promise<SessionResponse> {
    const res = await fetch(`${API_BASE}/api/session/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        mode: "cors",
        body: JSON.stringify({ sessionId, name, deck }),
    });
    if (!res.ok) throw new Error(`Join failed: ${res.status}`);
    return res.json();
}

export function connectSessionWS(sessionId: string, playerId: string): WebSocket {
    const url = new URL(`${API_BASE}/ws`);
    url.protocol = url.protocol.replace("http", "ws");
    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("playerId", playerId);
    return new WebSocket(url);
}
