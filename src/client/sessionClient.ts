/* eslint-env browser */
import axios from "axios";
import type {CreateSessionRequest, JoinSessionRequest, Player, SessionResponse} from "../server/sessionTypes.ts";

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "http://localhost:3000";

const api = axios.create({
    baseURL: API_BASE,
    headers: {"content-type": "application/json"},
    withCredentials: false,
});

export async function createSession(name: string, deck: string): Promise<SessionResponse> {
    const {data} = await api.post<SessionResponse>(`/api/session`, {
        name,
        deck
    } satisfies CreateSessionRequest);
    return data;
}

export async function joinSession(sessionId: string, name: string, deck: string): Promise<SessionResponse> {
    const {data} = await api.post<SessionResponse>(`/api/session/join`, {
        sessionId,
        name,
        deck
    } satisfies JoinSessionRequest);
    return data;
}

export interface PublicSessionResponse {
    id: string;
    createdAt: number;
    players: Player[];
}

export async function getSessionPublic(sessionId: string): Promise<PublicSessionResponse> {
    const { data } = await api.get<PublicSessionResponse>(`/api/session`, { params: { id: sessionId } });
    return data;
}

export function connectSessionWS(sessionId: string, playerId: string): WebSocket {
    const url = new URL(`${API_BASE}/ws`);
    url.protocol = url.protocol.replace("http", "ws");
    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("playerId", playerId);
    return new WebSocket(url);
}
