export type TokenKind = 'main' | 'custom' | 'bonus' | 'reaction' | 'held' | 'npc';

export type PlayerTokenKind = Exclude<TokenKind, 'npc'>;

export interface ReactionBox {
  id: number;
  label: string;
  values: number[];
  previousValues: number[];
  position: number;
}

export interface Player {
  id: number;
  displayName: string;
  mainTokensUsed: number;
  customTokensUsed: number;
  connected: boolean;
}

export interface QueueToken {
  id: number;
  displayName: string;
  kind: TokenKind;
  playerId: number | null;
  completed: boolean;
}

export interface GameState {
  currentTurn: number;
  roundEnded: boolean;
  roundStarted: boolean;
  reactionBoxes: ReactionBox[];
  players: Player[];
  queue: QueueToken[];
}

export interface SelfInfo {
  playerId?: number;
  isDm: boolean;
  sessionId: string;
}

// Client → Server events

export interface HelloPayload {
  name?: string;
  role: 'dm' | 'player';
  sessionId?: string; // localStorage fallback
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

export interface BoxCreatePayload {
  label: string;
}

export interface BoxUpdatePayload {
  boxId: number;
  label?: string;
  values?: number[];
}

export interface BoxDeletePayload {
  boxId: number;
}

export interface AddNpcPayload {
  name: string;
  count: number;
}

export interface AddForPlayerPayload {
  playerId: number;
  kind: PlayerTokenKind;
  name?: string;
}

export interface TokenRemovePayload {
  tokenId: number;
}

export interface PlayerTokenAddPayload {
  kind: PlayerTokenKind;
  name?: string;
}

export interface AckPayload {
  ok: boolean;
  message?: string;
}

export interface StateUpdatePayload {
  state: GameState;
  version: number;
}

export interface TurnNewPayload {
  turn: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

// Event name constants
export const C2S = {
  HELLO: 'hello',
  DM_BOX_CREATE: 'dm:box:create',
  DM_BOX_UPDATE: 'dm:box:update',
  DM_BOX_DELETE: 'dm:box:delete',
  DM_TOKEN_ADD_NPC: 'dm:token:addNpc',
  DM_TOKEN_ADD_FOR_PLAYER: 'dm:token:addForPlayer',
  DM_ADVANCE: 'dm:advance',
  DM_TOKEN_REMOVE: 'dm:token:remove',
  DM_END_ROUND: 'dm:endRound',
  DM_START_ROUND: 'dm:startRound',
  DM_NEW_COMBAT: 'dm:newCombat',
  DM_UNDO: 'dm:undo',
  PLAYER_TOKEN_ADD: 'player:token:add',
  PLAYER_TOKEN_REMOVE: 'player:token:remove',
} as const;

export const S2C = {
  STATE_UPDATE: 'state:update',
  TURN_NEW: 'turn:new',
  SELF_UPDATE: 'self:update',
  YOUR_TURN: 'your:turn',
  ERROR: 'error',
} as const;

export const MAX_MAIN_TOKENS = 4;
export const MAX_CUSTOM_TOKENS = 4;
export const MAX_NPC_BATCH = 20;
export const MAX_NAME_LENGTH = 40;
