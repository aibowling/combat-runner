CREATE TABLE IF NOT EXISTS game_state (
  id               int PRIMARY KEY CHECK (id = 1),
  current_turn     int NOT NULL DEFAULT 1,
  dm_session_id    text,
  round_ended      boolean NOT NULL DEFAULT false,
  version          int NOT NULL DEFAULT 0
);
INSERT INTO game_state (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS reaction_boxes (
  id              serial PRIMARY KEY,
  label           text NOT NULL,
  values          int[] NOT NULL DEFAULT '{}',
  previous_values int[] NOT NULL DEFAULT '{}',
  position        int NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id                  serial PRIMARY KEY,
  display_name        text UNIQUE NOT NULL,
  session_id          text UNIQUE NOT NULL,
  main_tokens_used    int NOT NULL DEFAULT 0,
  custom_tokens_used  int NOT NULL DEFAULT 0,
  last_seen_turn      int NOT NULL DEFAULT 0,
  last_seen           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS initiative_tokens (
  id           serial PRIMARY KEY,
  display_name text NOT NULL,
  player_id    int REFERENCES players(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('main','custom','bonus','reaction','held','npc')),
  position     int NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tokens_position ON initiative_tokens (position);
