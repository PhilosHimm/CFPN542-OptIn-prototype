# OptIn backend audit — fix backlog

Audit date: **2026-07-27**. Verified against the live Supabase project
`iokxjsvlpqlekptexjxy` ("CFPN542 OptIn prototype") *and* the source tree.

Status key: `DONE` · `APPLIED` (live on the database) · `TODO` · `DECISION` (needs a product call first)

> **Migrations 014, 015, 016, 017 and 018 were applied to production on 2026-07-27.**
> Verified afterwards: vote-counter drift is zero, all four state-machine decision
> paths pass, the capacity trigger rejects over-capacity joins, the creation RPC
> rejects unauthenticated callers, and the security advisor dropped from 26 lints
> to 8 (the remaining 7 SECURITY DEFINER warnings are intentional, plus one
> dashboard Auth setting). `pg_cron` is still **not** installed, so transitions
> run only when a user opens the app.

> ## Read this first
> **A Supabase GitHub integration is linked to this repo** — the "Supabase
> Preview" check on pull requests. It does two things to `supabase/migrations/`,
> in order: (1) checks the folder has one file per version already recorded in
> `supabase_migrations.schema_migrations` on the linked project, then (2)
> provisions a **fresh, empty preview database per PR** and replays the entire
> directory against it from scratch. None of this was known when the
> migrations were first consolidated into a single baseline file, and it broke
> in three rounds:
>
> 1. Consolidating into one file failed check 1 immediately:
>    `Remote migration versions not found in local migrations directory.`
> 2. Restoring exactly the 13 ledger-tracked versions passed check 1, then
>    failed check 2: `relation "public.conversations" does not exist` — none
>    of those 13 files create a single table, since production's foundational
>    tables were created by hand, outside CLI tracking, with no ledger entry.
> 3. Restoring the 4 table-creating files (`001`–`003`, `008`, versioned to
>    sort first) fixed that, but `001`'s own ~25 policies collided with (and in
>    non-colliding cases would have silently undermined) later ones — caught
>    by actually running `npx supabase start` locally before pushing a third
>    time, not by CI.
>
> Reconciled on 2026-07-27:
> - **`supabase/migrations/`** now holds **17 files**: the 13 ledger-tracked
>   versions plus the 4 foundational ones. `001` was rewritten to contain only
>   tables and `enable row level security` — no policies — since later files
>   are the authoritative policy source. Verified via full local replay: 17/17
>   apply cleanly against an empty database, and the result matches
>   production's 77 tracked objects (constraints, functions, indexes,
>   triggers) plus 16 harmless extras from `001`'s original audit
>   trigger/indexes that never made it to production.
> - **`supabase/000_baseline_schema.sql`** — the full schema in one file,
>   verified 77/77 against the live database — stays **outside** `migrations/`
>   so the integration never scans it. Still the right file for standing up a
>   new project by hand.
> - **`supabase/archive/`** — also outside `migrations/` — holds the 3
>   migrations that are neither ledger-tracked nor required to build the
>   schema. See `archive/README.md` for why each is excluded.
> - **`supabase/config.toml`** now exists, added for **local validation only**
>   (`npx supabase start`, needs Docker) — not linked to the real project, and
>   this is exactly how round 3's bug was caught before a third failed push.
>
> Query the live database before reasoning about production behaviour; the
> migration *files* are trustworthy again as of this reconciliation, but the
> live schema is still the ground truth.

Markers: **[live]** verified against the running DB · **[code]** verified in source ·
**[latent]** real in the files but currently neutralized by live RLS

---

## P0 — production broken, data corrupting, or open

| # | Item | Status |
|---|---|---|
| 1 | **Schema drift** — 009/013 unapplied, RLS hand-edited, nullability differs **[live]** | `APPLIED` — `014_reconcile_live_schema.sql` |
| 2 | **State machine never runs** — `auto_transition_all_games` does not exist; client RPC 404s silently, so nothing ever auto-confirms/cancels/completes **[live]** | `APPLIED` — `015_restore_state_machine.sql` |
| 3 | **Vote counters drift** — no `fn_sync_vote_counts`, and live `game_options` UPDATE is host-only so non-host votes can't write them. 2 of 3 live rows unreflected **[live]** | `APPLIED` — 015 adds trigger + one-time repair |
| 4 | **Anyone can add anyone to any game** — `game_players` INSERT is `WITH CHECK (auth.uid() IS NOT NULL)`, no `user_id` predicate **[live]** | `APPLIED` — 014 §6 |
| 5 | **Visibility non-functional** — live SELECT policy never reads `visibility`, *and* `gameData.ts` double-mapped it so every game is stored `'Group Only'` **[live+code]** | client `DONE`; RLS `APPLIED` — 014 §9 ⚠️ read expansion, review |
| 6 | **Propose-a-time crashes** — `game_options` has no `status`/`proposed_by` **[live]** | `APPLIED` — 014 §1 |
| 7 | **Paid games render "Free"** — per-player pricing writes `total_cost=0`; mapper derived everything from `total_cost` **[code]** | `DONE` |
| 8 | **Stale `useCallback` writes wrong money** — deps omitted `costType`/`perPlayerCost`/`perPersonCost` **[code]** | `DONE` |
| 9 | **Silent success on RLS-filtered writes** — `!error` is true for zero-row writes **[live+code]** | `DONE` — data layer checks affected rows; all six `GameViewScreen` handlers branch on the returned boolean |
| 10 | **Votes from non-members, never locked** — no membership/deadline/status check **[live]** | `APPLIED` — 014 §8 |

## P1 — integrity, data loss, broken core flows

| # | Item | Status |
|---|---|---|
| 11 | `confirmed_option_id` has no FK — host can delete the confirmed option **[live]** | `APPLIED` — 014 §2; client also blocks deleting the confirmed option |
| 12 | `games.created_by` nullable — every write policy is `created_by = auth.uid()`, so null rows are unhostable **[live]** | `APPLIED` — 014 §2 |
| 13 | Capacity unenforced — no trigger/constraint; `joinGame` is a bare upsert; no waitlist **[live]** | `APPLIED` — 015 §2 |
| 14 | `voting_deadline` inverted from its own UI copy — `now()+N` ignores proposed times, so defaults land *after* the game **[code]** | `DONE` — `computeVotingDeadline()` |
| 15 | Non-atomic creation — 3 unwrapped round-trips; partial failure orphans a game and discards the id **[code]** | `APPLIED` — `016_atomic_game_creation.sql`; `saveGame()` calls the RPC only, legacy path removed |
| 16 | Account deletion permanently blocked — `games`/`game_players`/`votes` lost `ON DELETE` **[live]** | `APPLIED` — 014 §3 ⚠️ CASCADE vs SET NULL is a product call |
| 17 | Tie: no `ELSE` branch, and the tie-break gate compares a refetch against itself (always true) **[code]** | gate `DONE`; SQL tie recording in 015 §3 |
| 18 | `min_players` client-only — server would confirm on one vote while the host's Confirm refuses **[live]** | `APPLIED` — 014 §4 adds column, 015 §3 honours it |
| 19 | Two contradictory per-person formulas — capacity vs actual attendees **[code]** | `TODO` |
| 20 | `completeGame` never recorded attendance — profile UPDATE is `auth.uid() = id` **[code]** | loop removed `DONE`; server-side impl `TODO` |
| 21 | `current_players` has two writers counting different things **[live]** | `TODO` |
| 22 | Leaving doesn't revoke access — sets `declined`; SELECT policy ignores status **[live]** | `TODO` |

## P2 — correctness, timezone, validation

| # | Item | Status |
|---|---|---|
| 23 | UTC vs local date — `go.date::date < CURRENT_DATE` flips games to completed mid-game; client mirror disagrees | `TODO` |
| 24 | Dates/times stored as `text`, no zone; `end_time > start_time` is lexical, rejects midnight-crossing | `TODO` — **now blocking a constraint.** Live option `bd1d6495` (game "golf") is start `22:00` / end `12:00`. Adding the CHECK (even `NOT VALID`) made that row unwritable, because `NOT VALID` still re-checks on UPDATE. Migrate to `timestamptz`, resolve that row, then add the constraint |
| 25 | Duplicate options are a shipped feature, no unique constraint → guaranteed tie | `APPLIED` — 014 §4 |
| 26 | Negative costs and negative voting hours accepted | `DONE` — 014 §4 constrains cost; `computeVotingDeadline()` rejects non-positive hours |
| 27 | `end_time: o.endTime \|\| o.startTime` makes `end == start` | partly `DONE` — 014 makes `end_time` nullable and the RPC stores blank as NULL. **No DB `end > start` constraint**: it was attempted, froze a live row, and is semantically wrong on text columns — see item 24 |
| 28 | Zero-option games writable — `saveGame` lacks the check the services layer has; `every()` is true for `[]` | `DONE` — validated client-side and in the RPC |
| 29 | No double-submit guard on Create — N taps, N games | `DONE` — in-flight ref + disabled button |
| 30 | Demo mode diverges both ways — `saveGame` always errors; `createGame` fakes success with no validation | `TODO` |
| 31 | `database.types.ts` stale, and `createClient` is called without `<Database>` so it does nothing | `TODO` |
| 32 | `maxPlayers` declared non-null but nullable in DB → "5/null" in Calendar | `DONE` |
| 33 | `unconfirmGame` left a stale deadline → next sweep instantly re-decides | `DONE` |
| 34 | `weeks_played`/`attendance_rate` read by UI, written by nothing | `TODO` |
| 35 | `012_optional_max_players.sql` is one line of literal `\n` escapes — unrunnable | `DONE` — rewritten with real newlines, idempotent, history documented |
| 36 | `getGroups()` has no membership filter → `assignedGroup` is the first group in the entire DB **[latent]** | `DONE` — inner-joined to `group_members`; no auto-select; `group_id` sent only for Group Only |
| 37 | `game_options` SELECT `using(true)` — enumerate every option id | `APPLIED` — 014 §7 |
| 38 | Recursive `game_players` SELECT policy in `004` **[latent]** — don't reintroduce during reconciliation | 014 adds `SECURITY DEFINER` helpers to avoid it |
| 39 | `maybe` votes collected then discarded — not counted, not used as tiebreak | `TODO` |
| 40 | `v_max_in = 0` conflated "nobody voted" with "all out" | `APPLIED` — 015 §3 distinguishes them |
| 41 | Solo games always self-cancel — creator auto-joined but never auto-voted | `TODO` |
| 42 | Past dates accepted — no `min` on the input, no server check | `TODO` |
| 43 | Float rounding residual on cost split; divisor fixed at creation | `TODO` |
| 44 | Host can leave and orphan their own roster, keeping host powers | `TODO` |
| 45 | Empty roster shows the full total as the per-person price (hero badge unguarded) | `TODO` |

## P3 — hygiene and hardening

| # | Item | Status |
|---|---|---|
| 46 | Advisors: `user_in_conversation` mutable `search_path`; all `SECURITY DEFINER` fns `EXECUTE`-able by `anon`; leaked-password protection off | 015 §5 revokes for the 4 game fns; `user_in_conversation` + auth setting `TODO` |
| 47 | `subscribeToVotes` subscribes to the whole `votes` table, filters client-side | `TODO` |
| 48 | `costType` never persisted — "Free" and "$0/player" indistinguishable | `TODO` |
| 49 | `games.service.ts` discards option/invite insert errors, returns `{error:null}` | `TODO` |
| 50 | `display_date` written raw ISO in one path, locale string in another; frozen in creator's locale | `TODO` |
| 51 | One malformed date row would abort the whole sweep | `APPLIED` — 015 §4 per-game exception handling |
| 52 | `012` duplicate numbering with an ordering dependency on `009` | `TODO` |
| 53 | Dead code: `persistTransitions`, `SportIcon.tsx`, `.orig`/`.rej` leftovers, root-level codemods, `src/app/pages/` | `TODO` |
| 54 | No `APP_NAME` constant — 39 hardcoded "OptIn" strings across 16 files; `robots.txt`/`sitemap.xml` hardcode `optin.app` | `TODO` |
| 55 | **New (found 2026-07-27):** `getGroups()` returns `mockGroups` on a query error in the *non-demo* path, so a real user sees fabricated groups after a network failure. Same shape elsewhere in `games.service.ts` — audit every `return mock*` outside an `isDemoMode()` branch | `TODO` |
| 56 | **UPDATE policies had no `WITH CHECK`** — 8 of 9. An UPDATE policy's `USING` picks which rows you may change; `WITH CHECK` picks what you may turn them into. Without it, `game_players` let a member move their row's `game_id` to any game, **bypassing the INSERT hardening in 014 §6**; a host could move an option into a game they don't own, or reassign `games.created_by` and orphan the game | `APPLIED` — `018_update_policy_with_check.sql`. Verified: `game_id`/`user_id` reassignment rejected, invite-accept still works |
| 57 | **`game_players`, `profiles`, `groups`, `group_members` are readable by `anon`** — SELECT policies are `USING (true)` and `TO public`, so unauthenticated callers can enumerate rosters and every user's name and email over the Data API. 31 policies total are still `TO public` | `TODO` — task #17. ⚠️ fixing it restricts anonymous reads, so confirm intent first. The baseline already scopes these `TO authenticated` |
| 58 | **Realtime has never worked.** No `public` table is in any publication — only Realtime's internal `realtime.messages_*` partitions. So every `postgres_changes` subscription (invites, votes, roster, chat) silently never fires. Root cause: `001`'s `alter publication` statements sit at line 287, after the statement-37 abort. The baseline includes them; **production still needs them applied** | `TODO` — highest-value remaining fix. `alter publication supabase_realtime add table public.games;` and the six sibling tables |
| 59 | **`conversation_members` has two overlapping SELECT policies** — the one `011` added via `user_in_conversation()` *and* the original self-referential one that queries `conversation_members` from its own policy. Permissive policies OR together, so `011` never removed the recursion risk (`42P17`). Not reproduced in the baseline | `TODO` — drop `"Users can read own conversation memberships"` in production |
| 60 | **A Supabase GitHub integration tracks `supabase/migrations/`** — undocumented until it broke, three ways in sequence: (a) consolidating history into one baseline file removed the per-version files the ledger-comparison stage expects (`Remote migration versions not found...`); (b) fixing that to exactly the 13 ledger-tracked versions then failed the *next* stage — the integration provisions a fresh empty preview DB per PR and replays the whole directory (`relation "public.conversations" does not exist`), since none of those 13 files create a table; (c) restoring the 4 table-creating files (`001`–`003`, `008`) then hit a duplicate-policy error from `001`'s own ~25 policies colliding with later ones — caught locally, not in CI, by actually running `npx supabase start` before pushing a third time **[live]** | `DONE` — `migrations/` now holds 17 files (13 ledger + 4 foundational); `001` rewritten to contain only tables/RLS-enable, no policies, since Postgres OR's permissive policies together and leaving them would have silently undone every later restriction. Verified via full local replay: 17/17 apply cleanly, 77/77 tracked objects match production plus 16 harmless extras from `001` |

---

## Pivot: sports → general group events

The DB is barely sports-coupled: **no enums anywhere**, and no skill-level,
position, team-count, court, field or venue columns. It reduces to 5 columns and
3 CHECK constraints. `games.sport` is already free text with no CHECK.

Only two things actively *reject* non-sports data: `game_type CHECK ('Casual','Competitive')`
and `max_players >= 2` (already contradicted by `SPORT_MINIMUMS.Golf = 1`; relaxed in 014 §4).

**Do not rename the tables.** `games`/`game_options`/`game_players` are referenced by
8+ RLS policies, every `SECURITY DEFINER` function, 3 triggers and the realtime
publication. `sport`/`sport_emoji`/`sport_color` are referenced by no function and
no policy — renaming *those* is free.

Backfill is lossless: every existing row genuinely is a sports game, so
`event_type text NOT NULL DEFAULT 'sports'` needs no `UPDATE`. Category-specific
fields belong in `metadata jsonb`, not a nullable column per category.

Real cost: ~290 sport-name strings (247 of them in the two mock-data files),
~45 UI labels, 39 "OptIn" occurrences.

### `DECISION` — these three gate everything, and the compiler will not help

1. **What replaces `game_type` Casual/Competitive?** Meaningless for a dinner.
   Delete / keep nullable and sports-only / replace with a universal axis.
2. **Is `event_type` a curated list or free text?** `CreateGameScreen` already has
   an `"Other / Custom..."` escape hatch, suggesting a hybrid.
3. **What replaces the word "player"?** ~120 live occurrences. Pick once —
   getting it wrong means redoing the whole string pass.

⚠️ `gameData.ts` writes `game_type` via a **binary ternary**: any third value
silently collapses to `"Competitive"`. `npm run typecheck` will **not** catch this.

Secondary decisions: what replaces the 15 sport hero photos (a content-sourcing
task, easy to under-scope); whether the minimum-attendee gate survives per
category; whether `groups` stays single-category.

Freebies: `ProfileScreen`'s "Preferred Sports" and "Skill Level" are unpersisted
local state, and `SportIcon.tsx` is only imported by the unrouted `pages/` graveyard.
Both are delete-not-generalize.

---

## Applying the staged migrations

`014`, `015` and `016` are **written but not applied**. All are idempotent and
wrapped in transactions. Apply in order — `015` and `016` both depend on `014`.

`saveGame()` calls the `016` RPC and falls back to the old three-insert path when
the function is absent, so the app works either side of the migration. **Delete
that fallback once `016` is applied** (task #10).

Preconditions were verified against live data before writing (all returned 0):
null `created_by`/`status`, null `game_id`, dangling `confirmed_option_id`,
negative costs, duplicate `(game_id, date, start_time)`, orphan `game_players`.
**Re-check these before applying to any other environment.**

Three things in them are deliberate behaviour changes needing sign-off:
- **014 §9** makes `Public` games readable by any authenticated user (today nothing
  is discoverable). No row becomes public retroactively, since the double-mapping
  bug stored everything as `'Group Only'`.
- **014 §3** uses `ON DELETE CASCADE` on `games.created_by`, so deleting a user
  deletes their games and other people's participation in them. `SET NULL` is the
  alternative.
- **015 §6** documents the `pg_cron` schedule but does not enable the extension —
  without it, transitions still only run when someone opens the app.

Recommended: test on a Supabase branch before touching production.
