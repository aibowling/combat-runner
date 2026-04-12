ALTER TABLE initiative_tokens ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS round_started boolean NOT NULL DEFAULT false;
