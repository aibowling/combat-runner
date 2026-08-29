import { create } from 'zustand';
import type { GameState, Chip, Player, Npc, Phase, ReactionBox } from './shared/types';

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
  previousChipCount: number;

  /** kept keyed so an editor can subscribe to one box and not rerender on the rest */
  boxesById: Record<number, ReactionBox>;
  boxOrder: number[];

  self: { playerId?: number; isDm: boolean; sessionId: string };
  connected: boolean;
  showRoundToast: number | null;
  errorText: string | null;

  setSelf: (self: Store['self']) => void;
  setConnected: (c: boolean) => void;
  /** optimistic: paint a die change before the server confirms it */
  setBoxValues: (boxId: number, values: number[]) => void;
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
  previousChipCount: 0,
  boxesById: {},
  boxOrder: [],

  self: { isDm: false, sessionId: '' },
  connected: false,
  showRoundToast: null,
  errorText: null,

  setSelf: (self) => set({ self }),
  setConnected: (connected) => set({ connected }),
  setError: (errorText) => set({ errorText }),

  setBoxValues: (boxId, values) => {
    const box = get().boxesById[boxId];
    if (!box) return;
    set({ boxesById: { ...get().boxesById, [boxId]: { ...box, values } } });
  },

  applyState: (state, version) => {
    const current = get();
    if (version < current.version && current.version > 0) return;

    const playersById: Record<number, Player> = {};
    const playerOrder: number[] = [];
    for (const p of state.players) {
      playersById[p.id] = p;
      playerOrder.push(p.id);
    }

    const boxesById: Record<number, ReactionBox> = {};
    const boxOrder: number[] = [];
    for (const b of state.reactionBoxes ?? []) {
      boxesById[b.id] = b;
      boxOrder.push(b.id);
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
      previousChipCount: state.previousChipCount ?? 0,
      boxesById,
      boxOrder,
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
