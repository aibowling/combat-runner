# The Wheel — port notes

Replaces the ordered initiative-token queue with the ten-wedge rotation.

## Wheel layout (fixed)

| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|----|
| player | enemy | **STATUS** | enemy | player | enemy | player | **ENVIRON** | player | enemy |

Enemies sit either side of Status; players sit either side of Environment. The
two specials are five wedges apart. Only the entry point moves — the layout
itself never changes, so this is hardcoded in `shared/types.ts`.

## Round shape

1. **placing** — everyone drops chips on their own wedges, blind.
2. Every connected player locks in → chips reveal automatically. The DM can
   force a reveal if someone has wandered off.
3. DM rolls a d10 for the entry wedge (or types the number if they rolled a
   real die). Phase flips to **resolving**.
4. DM steps clockwise through all ten wedges. Each wedge's chips are marked
   resolved as the pointer leaves it. Back-stepping un-resolves.
5. End round → chips cleared, everyone unlocked, round counter up, entry
   wedge cleared. Nothing carries over.

## The two rules, enforced server-side

- **One chip per actor per wedge** — unique partial indexes
  `uq_chip_player_wedge` and `uq_chip_npc_wedge`, plus an explicit check in
  `placeChip`. Not trusted to the UI.
- **Blind placement** — `redactState()` in `server/src/state.ts` filters state
  per recipient. While `revealed` is false, a player's socket receives only
  their own chips; everyone else's never leave the server. Other players'
  `chipsPlaced` comes through as `null` rather than a number, so the count
  can't be used to infer anything either. `emitStateObject()` loops sockets
  and sends each one its own view.

## What was removed

- `initiative_tokens`, `reaction_boxes` (dropped in migration 005)
- Reaction Boxes entirely — the reroll-under-10 mechanic isn't in the current
  rules. `ReactionBox.tsx`, `ReactionBoxEditor.tsx`, `Queue.tsx` deleted.
- `main`/`custom`/`bonus` token kinds and their per-round counters.

## What was kept

Sessions and cookie/localStorage fallback, DM takeover, name takeover and
auto-suffixing, the single-snapshot undo, the per-session rate limiter, the
single-service static hosting, and the server-authoritative mutate/broadcast
pattern.

## Fixed in passing

- `registerDmHandlers` / `registerPlayerHandlers` ran on every `hello` without
  clearing old listeners, so a reconnect stacked duplicate handlers and one
  click fired the mutation twice. Both now `removeAllListeners` first.
- `hello` as DM did `io.emit(SELF_UPDATE, { isDm: true })`, telling *every*
  connected client it was the DM. Now `socket.emit`.
- A socket that helloed as DM and later as a player kept `isDm: true`, and vice
  versa. Both flags are now reset on each hello.
- The client dropped any state update whose version equalled the current one,
  which silently discarded the refresh broadcast sent just after `hello`.

## Migration

`005_wheel.sql` runs automatically on boot. It **drops** `initiative_tokens`
and `reaction_boxes` — any in-progress combat in the live database is gone.
Run it between sessions, not during one.
