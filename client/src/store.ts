import { create } from 'zustand';
import type { GameState, ReactionBox, Player, QueueToken } from './shared/types';

interface PendingToken {
  tempId: string;
  kind: string;
  displayName: string;
}

interface Store {
  version: number;
  currentTurn: number;
  roundEnded: boolean;
  lastSeenTurn: number;

  boxesById: Record<number, ReactionBox>;
  boxOrder: number[];
  playersById: Record<number, Player>;
  queueById: Record<number, QueueToken>;
  queueOrder: number[];

  pendingTokens: PendingToken[];
  optimisticMainUsed: number;
  optimisticCustomUsed: number;

  self: { playerId?: number; isDm: boolean; sessionId: string };
  connected: boolean;
  showTurnToast: number | null;

  setSelf: (self: Store['self']) => void;
  setConnected: (c: boolean) => void;
  applyState: (state: GameState, version: number) => void;
  addPendingToken: (token: PendingToken, isCustom: boolean) => void;
  clearPendingTokens: () => void;
  dismissTurnToast: () => void;
}

export const useStore = create<Store>((set, get) => ({
  version: 0,
  currentTurn: 1,
  roundEnded: false,
  lastSeenTurn: 0,

  boxesById: {},
  boxOrder: [],
  playersById: {},
  queueById: {},
  queueOrder: [],

  pendingTokens: [],
  optimisticMainUsed: 0,
  optimisticCustomUsed: 0,

  self: { isDm: false, sessionId: '' },
  connected: false,
  showTurnToast: null,

  setSelf: (self) => set({ self }),
  setConnected: (connected) => set({ connected }),

  applyState: (state, version) => {
    const current = get();
    if (version <= current.version && current.version > 0) return;

    const boxesById: Record<number, ReactionBox> = {};
    const boxOrder: number[] = [];
    for (const b of state.reactionBoxes) {
      boxesById[b.id] = b;
      boxOrder.push(b.id);
    }

    const playersById: Record<number, Player> = {};
    for (const p of state.players) {
      playersById[p.id] = p;
    }

    const queueById: Record<number, QueueToken> = {};
    const queueOrder: number[] = [];
    for (const t of state.queue) {
      queueById[t.id] = t;
      queueOrder.push(t.id);
    }

    const myPlayer = current.self.playerId ? playersById[current.self.playerId] : null;
    const optimisticMainUsed = myPlayer?.mainTokensUsed ?? 0;
    const optimisticCustomUsed = myPlayer?.customTokensUsed ?? 0;

    let showTurnToast: number | null = null;
    if (current.lastSeenTurn > 0 && state.currentTurn > current.lastSeenTurn) {
      showTurnToast = state.currentTurn;
    }

    set({
      version,
      currentTurn: state.currentTurn,
      roundEnded: state.roundEnded,
      lastSeenTurn: state.currentTurn,
      boxesById,
      boxOrder,
      playersById,
      queueById,
      queueOrder,
      pendingTokens: [],
      optimisticMainUsed,
      optimisticCustomUsed,
      showTurnToast: showTurnToast ?? current.showTurnToast,
    });
  },

  addPendingToken: (token, isCustom) => set((s) => ({
    pendingTokens: [...s.pendingTokens, token],
    optimisticMainUsed: isCustom ? s.optimisticMainUsed : s.optimisticMainUsed + 1,
    optimisticCustomUsed: isCustom ? s.optimisticCustomUsed + 1 : s.optimisticCustomUsed,
  })),

  clearPendingTokens: () => set({ pendingTokens: [] }),

  dismissTurnToast: () => set({ showTurnToast: null }),
}));
