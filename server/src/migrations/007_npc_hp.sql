-- Enemy hit points. Tracked by the DM and shown only on the DM's screen —
-- the party display and the players' phones never receive these numbers.
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS hp int;
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS max_hp int;
