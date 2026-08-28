/* ------------------------------------------------------------------ *
 * The Wheel — shared contract between server and client.
 * Ten wedges, fixed layout, clockwise from wedge 1.
 * ------------------------------------------------------------------ */

export type WedgeType = 'player' | 'enemy' | 'status' | 'environment';

export interface WedgeDef {
  wedge: number;
  type: WedgeType;
}

/**
 * Layout is fixed forever. Only the entry point moves.
 * Enemies bracket the Status wedge; players bracket Environment.
 */
export const WHEEL: readonly WedgeDef[] = [
  { wedge: 1, type: 'player' },
  { wedge: 2, type: 'enemy' },
  { wedge: 3, type: 'status' },
  { wedge: 4, type: 'enemy' },
  { wedge: 5, type: 'player' },
  { wedge: 6, type: 'enemy' },
  { wedge: 7, type: 'player' },
  { wedge: 8, type: 'environment' },
  { wedge: 9, type: 'player' },
  { wedge: 10, type: 'enemy' },
] as const;

export const WEDGE_COUNT = 10;
export const PLAYER_WEDGES = [1, 5, 7, 9];
export const ENEMY_WEDGES = [2, 4, 6, 10];
export const SPECIAL_WEDGES = [3, 8];

export function wedgeType(wedge: number): WedgeType {
  return WHEEL[wedge - 1]?.type ?? 'player';
}

/** Walk clockwise from the entry wedge. */
export function wedgeAtStep(entryWedge: number, stepIndex: number): number {
  return ((entryWedge - 1 + stepIndex) % WEDGE_COUNT) + 1;
}

export const MAX_CHIPS_PER_PLAYER = PLAYER_WEDGES.length;
export const MAX_NPC_BATCH = 20;
export const MAX_NAME_LENGTH = 40;
export const MAX_NOTE_LENGTH = 40;

/* ----------------------------- state ----------------------------- */

export type Phase = 'placing' | 'resolving';

export interface Chip {
  id: number;
  wedge: number;
  actorKind: 'player' | 'npc';
  playerId: number | null;
  npcId: number | null;
  displayName: string;
  note: string | null;
  resolved: boolean;
}

export interface Player {
  id: number;
  displayName: string;
  /** null when withheld from this viewer during blind placement */
  chipsPlaced: number | null;
  locked: boolean;
  connected: boolean;
}

export interface Npc {
  id: number;
  name: string;
}

export interface GameState {
  round: number;
  phase: Phase;
  entryWedge: number | null;
  /** 0..WEDGE_COUNT — equal to WEDGE_COUNT means the rotation is complete */
  stepIndex: number;
  revealed: boolean;
  players: Player[];
  npcs: Npc[];
  /** redacted per viewer while placement is blind */
  chips: Chip[];
  /** how many chips this viewer is not being shown */
  hiddenChipCount: number;
  previousNpcNames: string[];
}

export const EMPTY_STATE: GameState = {
  round: 1,
  phase: 'placing',
  entryWedge: null,
  stepIndex: 0,
  revealed: false,
  players: [],
  npcs: [],
  chips: [],
  hiddenChipCount: 0,
  previousNpcNames: [],
};

export interface SelfInfo {
  playerId?: number;
  isDm: boolean;
  sessionId: string;
}

/* --------------------------- payloads ---------------------------- */

export interface HelloPayload {
  name?: string;
  role: 'dm' | 'player';
  sessionId?: string;
}

export interface HelloAck {
  ok: boolean;
  sessionId: string;
  playerId?: number;
  isDm: boolean;
  state: GameState;
  version: number;
  message?: string;
}

export interface ChipPlacePayload {
  wedge: number;
  note?: string;
}

export interface DmChipPlacePayload {
  wedge: number;
  npcId?: number;
  playerId?: number;
  note?: string;
}

export interface ChipRemovePayload {
  chipId: number;
}

export interface NpcAddPayload {
  name: string;
  count?: number;
}

export interface NpcRemovePayload {
  npcId: number;
}

export interface SetEntryPayload {
  wedge: number;
}

export interface AckPayload {
  ok: boolean;
  message?: string;
}

export interface StateUpdatePayload {
  state: GameState;
  version: number;
}

export interface RoundNewPayload {
  round: number;
}

export interface WedgeReachedPayload {
  wedge: number;
  type: WedgeType;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

/* ---------------------------- events ----------------------------- */

export const C2S = {
  HELLO: 'hello',

  PLAYER_CHIP_PLACE: 'player:chip:place',
  PLAYER_CHIP_REMOVE: 'player:chip:remove',
  PLAYER_LOCK_IN: 'player:lockIn',
  PLAYER_UNLOCK: 'player:unlock',

  DM_CHIP_PLACE: 'dm:chip:place',
  DM_CHIP_REMOVE: 'dm:chip:remove',
  DM_NPC_ADD: 'dm:npc:add',
  DM_NPC_REMOVE: 'dm:npc:remove',
  DM_COPY_PREVIOUS_NPCS: 'dm:copyPreviousNpcs',
  DM_REVEAL: 'dm:reveal',
  DM_ROLL_ENTRY: 'dm:rollEntry',
  DM_SET_ENTRY: 'dm:setEntry',
  DM_ADVANCE: 'dm:advance',
  DM_BACK: 'dm:back',
  DM_END_ROUND: 'dm:endRound',
  DM_NEW_COMBAT: 'dm:newCombat',
  DM_NEW_SESSION: 'dm:newSession',
  DM_UNDO: 'dm:undo',
} as const;

export const S2C = {
  STATE_UPDATE: 'state:update',
  ROUND_NEW: 'round:new',
  SELF_UPDATE: 'self:update',
  YOUR_WEDGE: 'your:wedge',
  WEDGE_REACHED: 'wedge:reached',
  SESSION_RESET: 'session:reset',
  ERROR: 'error',
} as const;
