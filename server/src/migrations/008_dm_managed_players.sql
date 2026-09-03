-- The DM can now add players by name from their own screen, so a player row no
-- longer implies somebody holding a phone. Postgres allows many NULLs under a
-- UNIQUE index, so the uniqueness of real session ids still holds.
ALTER TABLE players ALTER COLUMN session_id DROP NOT NULL;
