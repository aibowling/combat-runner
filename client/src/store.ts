import { create } from 'zustand';
import type { GameState, Chip, Player, Npc, Phase } from './shared/types';

interface Store {
  version: number;
  round: number;
  phase: Phase;
  entryWedge: number | null;
  stepIndex: number;
  revealed: boolean;
  hiddenChipCount: number;
  lastSeenRound: number;

  chips: Chip[];
  playersById: Record<number, Player>;
  playerOrder: number[];
  npcs: Npc[];
  previousNpcNames: string[];

  self: { playerId?: number; isDm: boolean; sessionId: string };
  connected: boolean;
  showRoundToast: number | null;
  errorText: string | null;

  setSelf: (self: Store['self']) => void;
  setConnected: (c: boolean) => void;
  applyState: (state: GameState, version: number) => void;
  dismissRoundToast: () => void;
  setError: (msg: string | null) => void;
}

export const useStore = create<Store>((set, get) => ({
  version: 0,
  round: 1,
  phase: 'placing',
  entryWedge: null,
  stepIndex: 0,
  revealed: false,
  hiddenChipCount: 0,
  lastSeenRound: 0,

  chips: [],
  playersById: {},
  playerOrder: [],
  npcs: [],
  previousNpcNames: [],

  self: { isDm: false, sessionId: '' },
  connected: false,
  showRoundToast: null,
  errorText: null,

  setSelf: (self) => set({ self }),
  setConnected: (connected) => set({ connected }),
  setError: (errorText) => set({ errorText }),

  applyState: (state, version) => {
    const current = get();
    if (version < current.version && current.version > 0) return;

    const playersById: Record<number, Player> = {};
    const playerOrder: number[] = [];
    for (const p of state.players) {
      playersById[p.id] = p;
      playerOrder.push(p.id);
    }

    let showRoundToast: number | null = current.showRoundToast;
    if (current.lastSeenRound > 0 && state.round > current.lastSeenRound) {
      showRoundToast = state.round;
    }

    set({
      version,
      round: state.round,
      phase: state.phase,
      entryWedge: state.entryWedge,
      stepIndex: state.stepIndex,
      revealed: state.revealed,
      hiddenChipCount: state.hiddenChipCount,
      lastSeenRound: state.round,
      chips: state.chips,
      playersById,
      playerOrder,
      npcs: state.npcs,
      previousNpcNames: state.previousNpcNames ?? [],
      showRoundToast,
    });
  },

  dismissRoundToast: () => set({ showRoundToast: null }),
}));

/** Wedge the pointer sits on, or null before the entry roll / after the rotation. */
export function useCurrentWedge(): number | null {
  const phase = useStore((s) => s.phase);
  const entryWedge = useStore((s) => s.entryWedge);
  const stepIndex = useStore((s) => s.stepIndex);
  if (phase !== 'resolving' || entryWedge == null || stepIndex >= 10) return null;
  return ((entryWedge - 1 + stepIndex) % 10) + 1;
}

const CHIP_COLORS = ['#d8a24a', '#4f9d92', '#c05572', '#6f7fc9', '#8aa445', '#c07a45'];

export function playerColor(playerId: number): string {
  return CHIP_COLORS[playerId % CHIP_COLORS.length];
}
