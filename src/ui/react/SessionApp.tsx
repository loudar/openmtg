/* eslint-env browser */
/* eslint-disable no-undef */
import React, { useCallback, useMemo, useState } from "react";
import { createSession, joinSession, connectSessionWS } from "../../client/sessionClient.ts";
import { startGameUI } from "../GameUI.ts";

export function SessionApp() {
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [deckJson, setDeckJson] = useState("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const parsedDeck = useMemo(() => {
    const txt = deckJson.trim();
    if (!txt) return undefined;
    try {
      return JSON.parse(txt);
    } catch (e) {
      return { __parseError: (e as Error).message } as any;
    }
  }, [deckJson]);

  const handleAfterJoin = useCallback(async (sid: string, pid: string, playerName: string) => {
    const ws = connectSessionWS(sid, pid);
    ws.addEventListener("open", async () => {
      setStatus(`Joined session ${sid} as ${playerName}`);
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
    if (parsedDeck && (parsedDeck as any).__parseError) {
      setStatus(`Invalid deck JSON: ${(parsedDeck as any).__parseError}`);
      return;
    }
    setBusy(true);
    setStatus("Creating session...");
    try {
      const res = await createSession(finalName, parsedDeck as any);
      await handleAfterJoin(res.sessionId, res.player.id, finalName);
    } catch (e) {
      setStatus(`Create failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }, [name, parsedDeck, handleAfterJoin]);

  const onJoin = useCallback(async () => {
    const sid = sessionId.trim();
    if (!sid) {
      setStatus("Please enter a session ID");
      return;
    }
    const finalName = name.trim() || `Player-${Math.floor(Math.random() * 1000)}`;
    if (parsedDeck && (parsedDeck as any).__parseError) {
      setStatus(`Invalid deck JSON: ${(parsedDeck as any).__parseError}`);
      return;
    }
    setBusy(true);
    setStatus(`Joining session ${sid}...`);
    try {
      const res = await joinSession(sid, finalName, parsedDeck as any);
      await handleAfterJoin(res.sessionId, res.player.id, finalName);
    } catch (e) {
      setStatus(`Join failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }, [sessionId, name, parsedDeck, handleAfterJoin]);

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontWeight: 600 }}>OpenMTG Session</h2>
      <div style={{ margin: "8px 0", color: "#ccc", minHeight: 20 }}>{status}</div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          style={{ padding: 6 }}
        />
        <button onClick={onCreate} disabled={busy} style={{ padding: "6px 10px" }}>Create Session</button>
        <input
          placeholder="Session ID to join"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          disabled={busy}
          style={{ padding: 6 }}
        />
        <button onClick={onJoin} disabled={busy} style={{ padding: "6px 10px" }}>Join Session</button>
      </div>

      <textarea
        placeholder="Optional: Paste deck JSON (matches Deck interface)"
        rows={4}
        value={deckJson}
        onChange={(e) => setDeckJson(e.target.value)}
        disabled={busy}
        style={{ display: "block", width: "100%", margin: "8px 0", padding: 6 }}
      />
    </div>
  );
}
