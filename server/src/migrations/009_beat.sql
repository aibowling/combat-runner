-- Where the Beat falls this round, as wedge numbers. Rolled by the Bard from
-- the class hub and shown on the clock everyone is looking at, so it lives on
-- the server rather than in one phone's local storage.
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS beat int[] NOT NULL DEFAULT '{}';
