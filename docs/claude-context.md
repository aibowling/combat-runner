# Claude's Memory & Context Dump

_Generated 2026-07-26 by Claude Code, at the request of the repo owner._

This document is a snapshot of everything Claude has persistently "remembered" about
this project, exported so it lives in the repo rather than only in Claude's local
memory files.

## What this contains (and what it doesn't)

**What I have:**
- My persistent project memory — 3 files stored locally at
  `~/.claude/projects/-Users-mike-Projects--1--Kahoot-but-for-Drew-s-System/memory/`.
  These are distilled, point-in-time notes, not a live transcript.

**What I don't have:**
- The original conversation that built this project. My memories were created in
  session `333c5bbb-1b39-4da4-88fa-79323c9c36d3` (around 2026-04-11), but that
  session's chat transcript is **not** stored on disk anymore. I can only recover
  what got distilled into the memory files below — not the full back-and-forth.
- Any other past chats. The only session transcript currently on disk is the one
  from *this* conversation.

> ⚠️ These memories were written ~2026-04-11 and are point-in-time observations.
> Some details (file layout, exact behavior) may have drifted from the current code.
> Treat them as intent/context, and verify against the code before relying on them.

---

## Memory index (`MEMORY.md`)

The one-line index Claude loads at the start of every session:

- **Project overview** — D&D initiative/reaction tracker; single-game scope; Railway + GitHub details inside
- **Tech stack** — Node/TS + Fastify + Socket.IO + Postgres + React (Vite); single Railway service

---

## Memory: Project overview

> _type: project · created in session `333c5bbb…` · ~2026-04-11_

Web app for the user's D&D group (~5 friends) to run sessions using a custom system
designed by "Drew". Kahoot-style: one DM interface + simple player interfaces on
phones, all synced in real time.

**Two core mechanics:**
1. **Initiative token queue** — shared turn order; top = active turn; empties trigger
   "new turn".
2. **Reaction Boxes** — DM-configurable labeled boxes containing integer Reaction
   Values. On new turn, any value `< 10` auto-rerolls to `randint(1, 20)`.

Players can throw in up to 4 "main action" tokens + up to 4 custom-named tokens per
turn. Counters reset each turn. Player-added tokens show as `"PlayerName"` for main
and `"PlayerName - CustomName"` for custom. NPC bulk-add is DM-only, typed each time
(no persistent roster).

**Single-game scope:** only one game runs at a time, no room codes. Landing screen
asks "DM or Player?"; player name collisions get auto-suffixed. DM has no password
(small trusted group). Adding tokens is strictly a player action — the DM cannot add
on behalf of players.

**Why:** Small trusted friend group, so auth is minimal and simplicity wins over
robustness.

**How to apply:** Resist adding multi-room, accounts, or DM-delegation features.
Keep the surface area small.

**Deployment:** Railway project name is "Kahoot but for Drew's System". Single web
service + Postgres.

**GitHub repo:** https://github.com/mike-seoasis/kahoot-but-for-drews-system.git

---

## Memory: Tech stack decisions

> _type: project · created in session `333c5bbb…` · ~2026-04-11_

**Stack:** Node + TypeScript, Fastify + Socket.IO, Postgres, React (Vite) frontend.
Single Railway web service serves both the API and the built frontend.

**Why:** User had no stack preference; Node/TS is fast to scaffold, Socket.IO handles
real-time sync trivially, and Railway deploys Node + Postgres with zero config. A
single service keeps Railway costs minimal for a hobby project.

**How to apply:** When extending, prefer Socket.IO events over HTTP polling. The
server owns all state mutations — clients emit intents, the server validates and
broadcasts authoritative state. Keep the Postgres schema singleton-style (one game at
a time) rather than multi-tenant.

**Token-limit enforcement:** Server-side per-turn caps (4 main + 4 custom per player)
are the primary spam defense. A per-IP rate limiter is a secondary layer.

---

## Session / chat log inventory

| Session ID | Role | Transcript on disk? |
|---|---|---|
| `333c5bbb-1b39-4da4-88fa-79323c9c36d3` | Origin session that created the memories above | ❌ No longer present |
| `a05c117d-8936-4d92-9774-12e09e49d881` | This session (generated this doc) | ✅ Yes |

Recent git history captures more of the project's evolution than my memory does — the
commit log is the better record of what actually shipped:

```
2f9f76f Split NPC entity from NPC token; add per-NPC token list
138b0e7 Restrict turns-remaining table to DM, sort alphabetically
48bf1c1 Name takeover, New Session reset, auto-box per NPC
9afe953 Post-playtest fixes: rename, reroll, queue UX, light theme
65b5e9c Add NPC bonus/armor, previous NPC copy, simplified player actions
```
