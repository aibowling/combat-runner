/* ------------------------------------------------------------------ *
 * The Clock — shared contract between server and client.
 * Ten wedges, fixed layout, clockwise from wedge 1.
 * ------------------------------------------------------------------ */

export type WedgeType = 'player' | 'enemy' | 'status' | 'environment';

export interface WedgeDef {
  wedge: number;
  type: WedgeType;
}

/**
 * Layout is fixed forever. Only the entry point moves.
 *
 * Enemies act immediately after both Status and Environment, and neither
 * special wedge is sandwiched by the same group — a player wedge leads into
 * each one, an enemy wedge leads out. That falls out of a strict alternation:
 * no two neighbouring wedges anywhere on the clock belong to the same side.
 */
export const WHEEL: readonly WedgeDef[] = [
  { wedge: 1, type: 'enemy' },
  { wedge: 2, type: 'player' },
  { wedge: 3, type: 'status' },
  { wedge: 4, type: 'enemy' },
  { wedge: 5, type: 'player' },
  { wedge: 6, type: 'enemy' },
  { wedge: 7, type: 'player' },
  { wedge: 8, type: 'environment' },
  { wedge: 9, type: 'enemy' },
  { wedge: 10, type: 'player' },
] as const;

export const WEDGE_COUNT = 10;
export const PLAYER_WEDGES = [2, 5, 7, 10];
export const ENEMY_WEDGES = [1, 4, 6, 9];
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

/* ------------------------- reaction boxes ------------------------ */

export const REACTION_DIE = 20;
/**
 * A reaction of 10 or lower was spent and rerolls when the round ends.
 * Anything above is still held and is left alone, so a good die is never
 * taken away by the turn of a round.
 */
export const REROLL_AT_OR_BELOW = 10;
export const MAX_BOX_VALUES = 12;
export const NEW_BOX_VALUES = 2;

export function rollReaction(): number {
  return Math.floor(Math.random() * REACTION_DIE) + 1;
}

/**
 * Chip faces are tiny, so a name has to survive being cut to a few characters.
 * "Goblin 3" becomes Go3 — the trailing index is the part that tells two
 * goblins apart, so it is the one piece that must never be dropped, and two
 * leading letters keep a Goblin from reading the same as a Gnoll.
 */
export function chipAbbrev(displayName: string): string {
  const name = (displayName || '').trim();
  if (!name) return '?';

  const numbered = name.match(/^(.*?)[\s#-]*(\d+)$/);
  if (numbered && numbered[1].trim()) {
    const base = numbered[1].trim();
    return base.slice(0, 2).replace(/^./, (c) => c.toUpperCase()) + numbered[2].slice(-2);
  }

  return name.slice(0, 2).replace(/^./, (c) => c.toUpperCase());
}

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
  /** null for everyone but the DM — hit points never leave the DM's screen */
  hp: number | null;
  maxHp: number | null;
}

export interface ReactionBox {
  id: number;
  label: string;
  values: number[];
  /** what this box held before the last round ended */
  previousValues: number[];
  bonus: number | null;
  armor: number | null;
  /** true when the box was created alongside an enemy and dies with it */
  isNpc: boolean;
  position: number;
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
  reactionBoxes: ReactionBox[];
  /** enemy chips placed last round, waiting to be dropped back on in one click */
  previousChipCount: number;
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
  reactionBoxes: [],
  previousChipCount: 0,
};

export interface SelfInfo {
  playerId?: number;
  isDm: boolean;
  sessionId: string;
}

/* --------------------------- payloads ---------------------------- */

/**
 * Three screens, three jobs. The DM's laptop is private and holds everything
 * secret; the party display is a shared screen everyone can see, so it must
 * never be told anything the players are not meant to know; a player's phone
 * is theirs alone and is only touched at the top of a round.
 */
export type Role = 'dm' | 'party' | 'player';

export interface HelloPayload {
  name?: string;
  role: Role;
  sessionId?: string;
}

export interface HelloAck {
  ok: boolean;
  sessionId: string;
  playerId?: number;
  isDm: boolean;
  role: Role;
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
  hp?: number | null;
}

export interface NpcRemovePayload {
  npcId: number;
}

export interface NpcSetHpPayload {
  npcId: number;
  hp?: number | null;
  maxHp?: number | null;
}

export const MAX_HP = 999;

export interface SetEntryPayload {
  wedge: number;
}

export interface BoxCreatePayload {
  label?: string;
}

export interface BoxUpdatePayload {
  boxId: number;
  label?: string;
  values?: number[];
  bonus?: number | null;
  armor?: number | null;
}

export interface BoxDeletePayload {
  boxId: number;
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
  DM_NPC_SET_HP: 'dm:npc:setHp',
  DM_COPY_PREVIOUS_NPCS: 'dm:copyPreviousNpcs',
  DM_REPEAT_CHIPS: 'dm:repeatChips',

  DM_BOX_CREATE: 'dm:box:create',
  DM_BOX_UPDATE: 'dm:box:update',
  DM_BOX_DELETE: 'dm:box:delete',
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
