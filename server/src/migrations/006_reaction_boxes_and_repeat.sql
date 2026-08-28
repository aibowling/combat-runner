-- Reaction boxes come back. They were dropped in 005 along with the token
-- queue, but the d20 mechanic was never part of the queue — it just happened
-- to live next to it. Same shape as before: a label, a handful of d20 values,
-- last round's values for comparison, and an optional bonus/armor.
CREATE TABLE IF NOT EXISTS reaction_boxes (
  id              serial PRIMARY KEY,
  label           text NOT NULL,
  values          int[] NOT NULL DEFAULT '{}',
  previous_values int[] NOT NULL DEFAULT '{}',
  bonus           int,
  armor           int,
  is_npc          boolean NOT NULL DEFAULT false,
  position        int NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_boxes_position ON reaction_boxes (position);

-- Last round's chip layout, kept so the DM can drop the same spread back onto
-- the clock in one click instead of re-placing every enemy by hand.
ALTER TABLE game_state
  ADD COLUMN IF NOT EXISTS previous_chips jsonb NOT NULL DEFAULT '[]'::jsonb;

-- This release also re-cuts the wedge layout so an enemy acts straight after
-- Status and Environment. Chips on the board were placed against the old
-- layout, so a player could be left sitting on what is now an enemy wedge —
-- clear the board and let the round be re-placed.
DELETE FROM wheel_chips;
UPDATE game_state
   SET entry_wedge = NULL, step_index = 0, phase = 'placing', revealed = false
 WHERE id = 1;
UPDATE players SET locked = false;
