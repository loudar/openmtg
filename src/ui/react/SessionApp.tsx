/* eslint-env browser */
import React, {useCallback, useEffect, useRef, useState} from "react";
import {createSession, joinSession, connectSessionWS, getSessionPublic} from "../../client/sessionClient.ts";
import type {Player} from "../../server/sessionTypes.ts";
import {startGameUI} from "../components/GameView.ts";
import { getStoredPlayerId, setStoredPlayerId, clearStoredPlayerId } from "../../client/playerIdStore.ts";

export function SessionApp() {
    const [name, setName] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [deckInput, setDeckInput] = useState("");
    const [status, setStatus] = useState<string>("");
    const [busy, setBusy] = useState(false);

    // Track if we detected a sessionId from URL and intend to auto-join when possible
    const autoJoinSidRef = useRef<string | null>(null);

    const setUrlSessionParam = useCallback((sid: string | null) => {
        // Keep current path and other params, just set or delete sessionId
        try {
            const url = new URL(window.location.href);
            if (sid) {
                url.searchParams.set("sessionId", sid);
            } else {
                url.searchParams.delete("sessionId");
            }
            window.history.replaceState({}, "", url);
        } catch (e) {
            // ignore URL update failures
            console.warn("Failed to update URL:", e);
        }
    }, []);

    const handleAfterJoin = useCallback(async (sid: string, player: Player) => {
        // Persist playerId mapping for auto-rejoin later
        try {
            setStoredPlayerId(sid, player.id);
        } catch {
            // ignore storage errors
        }

        // Reflect joined/created session in the URL
        setUrlSessionParam(sid);

        const ws = connectSessionWS(sid, player.id);
        ws.addEventListener("open", async () => {
            setStatus(`Joined session ${sid} as ${player.name}`);
            const rootEl = document.getElementById("root");
            if (rootEl && rootEl.parentElement) {
                rootEl.parentElement.removeChild(rootEl);
            }
            await startGameUI(player, sid, ws);
        });

        ws.addEventListener("message", (ev) => {
            console.log("WS message:", ev.data);
        });

        ws.addEventListener("close", () => {
            console.warn("WS closed");
        });
    }, [setUrlSessionParam]);

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
            // URL will be updated in handleAfterJoin
            await handleAfterJoin(res.sessionId, res.player);
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
            // URL will be updated in handleAfterJoin
            await handleAfterJoin(res.sessionId, res.player);
        } catch (e) {
            setStatus(`Join failed: ${(e as Error).message}`);
        } finally {
            setBusy(false);
        }
    }, [sessionId, name, deckInput, handleAfterJoin]);

    // On initial load, check URL for sessionId and validate it.
    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            const sid = url.searchParams.get("sessionId");
            if (sid) {
                // Validate session asynchronously
                (async () => {
                    try {
                        const pub = await getSessionPublic(sid);
                        if (pub && pub.id === sid) {
                            setSessionId(sid);

                            // Attempt auto-reconnect using stored playerId
                            const storedId = getStoredPlayerId(sid);
                            if (storedId) {
                                const existing = pub.players.find(p => p.id === storedId);
                                if (existing) {
                                    setStatus(`Rejoining session ${sid} as ${existing.name}...`);
                                    const ws = connectSessionWS(sid, storedId);
                                    ws.addEventListener("open", async () => {
                                        const rootEl = document.getElementById("root");
                                        if (rootEl && rootEl.parentElement) {
                                            rootEl.parentElement.removeChild(rootEl);
                                        }
                                        await startGameUI(existing, sid, ws);
                                    });
                                    ws.addEventListener("close", () => {
                                        console.warn("WS closed");
                                    });
                                    return; // do not set auto-join with deck; we're done
                                } else {
                                    // stale mapping: clear it
                                    clearStoredPlayerId(sid);
                                }
                            }

                            setStatus(`Found session ${sid}. Enter your name and deck to join, or paste deck to auto-join.`);
                            autoJoinSidRef.current = sid;
                        }
                    } catch (e) {
                        // If invalid, clear param from URL to avoid confusion
                        setStatus(`Session ${sid} not found or unavailable.`);
                        setUrlSessionParam(null);
                        autoJoinSidRef.current = null;
                    }
                })();
            }
        } catch (e) {
            // ignore URL parse errors
        }
        // no dependencies: run once
    }, [setUrlSessionParam]);

    // If we have a pending auto-join sid and the user supplied a deck, auto-join.
    useEffect(() => {
        if (autoJoinSidRef.current && deckInput && !busy) {
            if (!sessionId) {
                setSessionId(autoJoinSidRef.current);
            }
            // Trigger join
            (async () => {
                await onJoin();
                autoJoinSidRef.current = null;
            })();
        }
    }, [deckInput, busy, sessionId, onJoin]);

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
                />
                <button onClick={onCreate} disabled={busy}>Create Session</button>
                <input
                    placeholder="Session ID to join"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    disabled={busy}
                />
                <button onClick={onJoin} disabled={busy}>Join Session</button>
            </div>

            <textarea
                placeholder="Paste deck URL or list of cards (1x card name etc.)"
                rows={4}
                value={deckInput}
                onChange={(e) => setDeckInput(e.target.value.trim())}
                disabled={busy}
                style={{display: "block", width: "100%", margin: "8px 0"}}
            />
        </div>
    );
}
