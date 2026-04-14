ALTER TABLE reaction_boxes ADD COLUMN IF NOT EXISTS bonus int;
ALTER TABLE reaction_boxes ADD COLUMN IF NOT EXISTS armor int;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS previous_npc_names text[] NOT NULL DEFAULT '{}';
