/* eslint-env browser */

// Key used in localStorage to persist mapping of sessionId -> playerId
const STORAGE_KEY = "openmtg.sessionPlayers";

interface SessionPlayersMap {
    [sessionId: string]: string; // playerId
}

function readMap(): SessionPlayersMap {
    try {
        if (typeof window === "undefined" || !window.localStorage) {
            return {};
        }
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
            return parsed as SessionPlayersMap;
        }
        return {};
    } catch {
        return {};
    }
}

function writeMap(map: SessionPlayersMap): void {
    try {
        if (typeof window === "undefined" || !window.localStorage) {
            return;
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
        // ignore persistence errors
    }
}

export function getStoredPlayerId(sessionId: string): string | null {
    const map = readMap();
    return map[sessionId] ?? null;
}

export function setStoredPlayerId(sessionId: string, playerId: string): void {
    const map = readMap();
    map[sessionId] = playerId;
    writeMap(map);
}

export function clearStoredPlayerId(sessionId: string): void {
    const map = readMap();
    if (Object.prototype.hasOwnProperty.call(map, sessionId)) {
        delete map[sessionId];
        writeMap(map);
    }
}
