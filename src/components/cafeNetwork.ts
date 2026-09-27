// How café visitors see each other. The engine only talks to a Transport,
// so the local (same-browser, cross-tab) version below can later be swapped
// for a real server-backed one (e.g. Supabase Realtime) without touching
// the game code.

export type NetMessage =
  | { type: 'state'; id: string; num: number; look: number; x: number; y: number; dir: string; moving: boolean }
  | { type: 'leave'; id: string };

export interface Transport {
  send(message: NetMessage): void;
  subscribe(handler: (message: NetMessage) => void): void;
  close(): void;
}

export interface Identity {
  id: string;
  /** Shown as "cecil <num>". 47 turns you into the sagehen. */
  num: number;
  /** Seed for hair/outfit colors, so every tab draws a visitor the same way. */
  look: number;
}

export const SAGEHEN_NUMBER = 47;

export function createIdentity(): Identity {
  // ?cecil=47 forces a number -- handy for testing the sagehen.
  const forced = Number(new URLSearchParams(window.location.search).get('cecil'));
  return {
    id: crypto.randomUUID(),
    num: Number.isInteger(forced) && forced > 0 ? forced : 1 + Math.floor(Math.random() * 99),
    look: Math.floor(Math.random() * 1e6),
  };
}

/** Syncs between tabs of the same browser only -- for local testing. */
export function createLocalTransport(): Transport {
  const channel = new BroadcastChannel('helen-cafe');
  let handler: ((message: NetMessage) => void) | null = null;
  channel.onmessage = (e) => handler?.(e.data as NetMessage);
  return {
    send: (message) => channel.postMessage(message),
    subscribe: (h) => {
      handler = h;
    },
    close: () => channel.close(),
  };
}
