import type { Deck } from "../models/MTG.ts";

export interface Player {
  id: string; // uuid v4
  name: string;
  life: number;
  // the amount of commander damage other players have dealt this player
  commanderDamage: Record<string, number>;
  deck: Deck;
}

export interface MtgSession {
  id: string; // uuid v4
  createdAt: number;
  players: Map<string, Player>;
}

export interface CreateSessionRequest {
  name: string;
  deck: string;
}

export interface JoinSessionRequest {
  sessionId: string;
  name: string;
  deck: string;
}

export interface SessionResponse {
  sessionId: string;
  player: Player;
}
