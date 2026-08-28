-- The Wheel: replaces the ordered token queue with ten fixed wedges.
-- Chips belong to a wedge, not to a position in a list.

DROP TABLE IF EXISTS initiative_tokens;
DROP TABLE IF EXISTS reaction_boxes;

ALTER TABLE game_state DROP COLUMN IF EXISTS round_started;
ALTER TABLE game_state DROP COLUMN IF EXISTS round_ended;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'placing';
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS entry_wedge int;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS step_index int NOT NULL DEFAULT 0;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS revealed boolean NOT NULL DEFAULT false;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS previous_npc_names text[] NOT NULL DEFAULT '{}';

ALTER TABLE players ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;
ALTER TABLE players DROP COLUMN IF EXISTS main_tokens_used;
ALTER TABLE players DROP COLUMN IF EXISTS custom_tokens_used;

CREATE TABLE IF NOT EXISTS npcs (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  position    int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wheel_chips (
  id          serial PRIMARY KEY,
  wedge       int NOT NULL CHECK (wedge BETWEEN 1 AND 10),
  actor_kind  text NOT NULL CHECK (actor_kind IN ('player','npc')),
  player_id   int REFERENCES players(id) ON DELETE CASCADE,
  npc_id      int REFERENCES npcs(id) ON DELETE CASCADE,
  note        text,
  resolved    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chip_actor_shape CHECK (
    (actor_kind = 'player' AND player_id IS NOT NULL AND npc_id IS NULL) OR
    (actor_kind = 'npc'    AND npc_id    IS NOT NULL AND player_id IS NULL)
  )
);

-- One chip per actor per wedge. This is the rule, enforced by the database
-- rather than trusted to the client.
CREATE UNIQUE INDEX IF NOT EXISTS uq_chip_player_wedge
  ON wheel_chips (wedge, player_id) WHERE player_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_chip_npc_wedge
  ON wheel_chips (wedge, npc_id) WHERE npc_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chips_wedge ON wheel_chips (wedge);
