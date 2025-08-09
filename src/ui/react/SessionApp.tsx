/* eslint-env browser */
import React, {useCallback, useMemo, useState} from "react";
import {createSession, joinSession, connectSessionWS} from "../../client/sessionClient.ts";
import {startGameUI} from "../GameUI.ts";

export function SessionApp() {
    const [name, setName] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [deckInput, setDeckInput] = useState("");
    const [status, setStatus] = useState<string>("");
    const [busy, setBusy] = useState(false);

    const handleAfterJoin = useCallback(async (sid: string, pid: string, playerName: string) => {
        const ws = connectSessionWS(sid, pid);
        ws.addEventListener("open", async () => {
            setStatus(`Joined session ${sid} as ${playerName}`);
            // Expose session info globally for the Pixi UI
            (window as any).openmtg = { sessionId: sid, playerId: pid, name: playerName, ws };
            // Remove React root and start Pixi Game UI
            const rootEl = document.getElementById("root");
            if (rootEl && rootEl.parentElement) {
                rootEl.parentElement.removeChild(rootEl);
            }
            await startGameUI();
        });
        ws.addEventListener("message", (ev) => {
            console.log("WS message:", ev.data);
        });
        ws.addEventListener("close", () => {
            console.warn("WS closed");
        });
    }, []);

    const onCreate = useCallback(async () => {
        const finalName = name.trim() || `Player-${Math.floor(Math.random() * 1000)}`;
        if (!deckInput) {
            setStatus(`Must provide a deck input`);
            return;
        }
        setBusy(true);
        setStatus("Creating session...");
        try {
            const res = await createSession(finalName, deckInput);
            (window as any).openmtg = { ...(window as any).openmtg, localDeck: res.player.deck };
            await handleAfterJoin(res.sessionId, res.player.id, finalName);
        } catch (e) {
            setStatus(`Create failed: ${(e as Error).message}`);
        } finally {
            setBusy(false);
        }
    }, [name, deckInput, handleAfterJoin]);

    const onJoin = useCallback(async () => {
        const sid = sessionId.trim();
        if (!sid) {
            setStatus("Please enter a session ID");
            return;
        }
        const finalName = name.trim() || `Player-${Math.floor(Math.random() * 1000)}`;
        if (!deckInput) {
            setStatus(`Must provide a deck input`);
            return;
        }
        setBusy(true);
        setStatus(`Joining session ${sid}...`);
        try {
            const res = await joinSession(sid, finalName, deckInput);
            (window as any).openmtg = { ...(window as any).openmtg, localDeck: res.player.deck };
            await handleAfterJoin(res.sessionId, res.player.id, finalName);
        } catch (e) {
            setStatus(`Join failed: ${(e as Error).message}`);
        } finally {
            setBusy(false);
        }
    }, [sessionId, name, deckInput, handleAfterJoin]);

    return (
        <div style={{padding: 16, maxWidth: 720, margin: "0 auto"}}>
            <h2 style={{fontWeight: 600}}>OpenMTG Session</h2>
            <div style={{margin: "8px 0", color: "#ccc", minHeight: 20}}>{status}</div>

            <div style={{display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap"}}>
                <input
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy}
                    style={{padding: 6}}
                />
                <button onClick={onCreate} disabled={busy} style={{padding: "6px 10px"}}>Create Session</button>
                <input
                    placeholder="Session ID to join"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    disabled={busy}
                    style={{padding: 6}}
                />
                <button onClick={onJoin} disabled={busy} style={{padding: "6px 10px"}}>Join Session</button>
            </div>

            <textarea
                placeholder="Paste deck URL or list of cards (1x card name etc.)"
                rows={4}
                value={deckInput}
                onChange={(e) => setDeckInput(e.target.value.trim())}
                disabled={busy}
                style={{display: "block", width: "100%", margin: "8px 0", padding: 6}}
            />
        </div>
    );
}
