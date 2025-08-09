/* eslint-env browser */
/* eslint-disable no-undef */
import { startGameUI } from "./GameUI.ts";
import { connectSessionWS, createSession, joinSession } from "../client/sessionClient.ts";

export interface JoinedContext {
    sessionId: string;
    playerId: string;
    name: string;
    ws: WebSocket;
}

export function renderSessionUI(parent: HTMLElement = document.body) {
    const container = document.createElement("div");
    container.style.padding = "16px";
    container.style.maxWidth = "720px";
    container.style.margin = "0 auto";

    const header = document.createElement("h2");
    header.textContent = "OpenMTG Session";
    header.style.fontWeight = "600";
    container.appendChild(header);

    const status = document.createElement("div");
    status.style.margin = "8px 0";
    status.style.color = "#ccc";
    container.appendChild(status);

    const nameInput = document.createElement("input");
    nameInput.placeholder = "Your name";
    nameInput.style.marginRight = "8px";

    const deckTextarea = document.createElement("textarea");
    deckTextarea.placeholder = "Optional: Paste deck JSON (matches Deck interface)";
    deckTextarea.rows = 4;
    deckTextarea.style.display = "block";
    deckTextarea.style.width = "100%";
    deckTextarea.style.margin = "8px 0";

    const createBtn = document.createElement("button");
    createBtn.textContent = "Create Session";
    createBtn.style.marginRight = "8px";

    const joinInput = document.createElement("input");
    joinInput.placeholder = "Session ID to join";
    joinInput.style.marginRight = "8px";

    const joinBtn = document.createElement("button");
    joinBtn.textContent = "Join Session";

    container.appendChild(nameInput);
    container.appendChild(createBtn);
    container.appendChild(joinInput);
    container.appendChild(joinBtn);
    container.appendChild(deckTextarea);

    function parseDeck(): any | undefined {
        try {
            const txt = deckTextarea.value.trim();
            if (!txt) return undefined;
            return JSON.parse(txt);
        } catch (e) {
            status.textContent = `Invalid deck JSON: ${(e as Error).message}`;
            return undefined;
        }
    }

    async function onCreated(sessionId: string, playerId: string, name: string) {
        // Connect WS then start the game UI
        const ws = connectSessionWS(sessionId, playerId);
        ws.addEventListener("open", async () => {
            status.textContent = `Joined session ${sessionId} as ${name}`;
            // Remove session UI and create GameUI
            parent.removeChild(container);
            await startGameUI();
        });
        ws.addEventListener("message", (ev) => {
            // basic log for now
            console.log("WS message:", ev.data);
        });
        ws.addEventListener("close", () => {
            console.warn("WS closed");
        });
    }

    createBtn.onclick = async () => {
        status.textContent = "Creating session...";
        const name = nameInput.value.trim() || `Player-${Math.floor(Math.random() * 1000)}`;
        const deck = parseDeck();
        try {
            const res = await createSession(name, deck);
            await onCreated(res.sessionId, res.player.id, name);
        } catch (e) {
            status.textContent = `Create failed: ${(e as Error).message}`;
        }
    };

    joinBtn.onclick = async () => {
        const sessionId = joinInput.value.trim();
        if (!sessionId) {
            status.textContent = "Please enter a session ID";
            return;
        }
        status.textContent = `Joining session ${sessionId}...`;
        const name = nameInput.value.trim() || `Player-${Math.floor(Math.random() * 1000)}`;
        const deck = parseDeck();
        try {
            const res = await joinSession(sessionId, name, deck);
            await onCreated(res.sessionId, res.player.id, name);
        } catch (e) {
            status.textContent = `Join failed: ${(e as Error).message}`;
        }
    };

    parent.appendChild(container);
}
