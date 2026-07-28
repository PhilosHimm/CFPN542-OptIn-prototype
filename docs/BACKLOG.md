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
>
> **Migration 019 was applied to production on 2026-07-28**, closing out most of
> the remaining P1/P2/P3 backlog: leaving a game now actually revokes access
> (`user_in_game` excludes `declined`), `maybe` votes are used as a tiebreak,
> attendance stats (`games_played`/`weeks_played`/`attendance_rate`) are now
> recorded server-side via a trigger on `games`, `cost_type` is persisted,
> `create_game_with_options` rejects past dates, the duplicate
> `conversation_members` SELECT policy is gone, and `update_updated_at` is
> pinned to `search_path = public`. Verified the same two ways as every
> migration since item 61: `npx supabase start` against an empty database, and
> a `begin;...rollback;` dry run directly against the real, populated
> project — both clean — before applying for real. Advisor count: still 8 (the
> `function_search_path_mutable` warning is gone, replaced numerically by
> nothing — `create_game_with_options` now has one more `SECURITY DEFINER`
> parameter but is still the same single advisor line).
> `database.types.ts` was also regenerated from the live schema (item #31) and
> `createClient<Database>(...)` is now actually typed — see item #31 for the
> fallout that surfaced and was fixed.
>
> **New failure mode, 2026-07-28: applying via the Supabase MCP `apply_migration`
> tool renames your migration for you.** 019 was created locally with
> `npx supabase migration new` (timestamp `20260728023210`), tested, then
> applied to production directly via the MCP tool rather than `supabase db
> push`. The PR's "Supabase Preview" check then failed at stage 1 —
> `Remote migration versions not found in local migrations directory` —
> because `apply_migration` recorded the migration in
> `schema_migrations` under its own timestamp (`20260728024524`, the moment it
> actually ran), not the filename's. The two diverged by about 13 minutes of
> local testing in between. Fixed by renaming the local file to match the
> remote-recorded version exactly. **Lesson: when applying a migration via
> `apply_migration` (not the CLI), always re-check `list_migrations`
> immediately afterward and rename the local file to match before opening the
> PR — don't trust the filename you created it with.**
>
> **Migration 020 (`restrict_reads_to_authenticated`, real version
> `20260728040022`) was applied to production on 2026-07-28**, closing item
> #57: all 31 `TO public` RLS policies are now `TO authenticated`, so
> unauthenticated (`anon`) requests can no longer read anything over the Data
> API. Verified via `npx supabase start` (empty database) and a
> `begin;...rollback;` dry run against production, plus a functional check as
> the bare `anon` role (denied outright) — same protocol as 019, and the same
> filename-mismatch lesson applied immediately this time. Along the way,
> found that `profiles`' INSERT/SELECT policies exist live but were never in
> *any* migration file, ledger-tracked or foundational — recreated verbatim
> from the live definition as part of this migration. Zero functional impact
> on the app: every `supabase.from(...)` call in `src/` is gated behind the
> auth layer or demo mode (which never touches Supabase), so nothing in the
> app ever queried these tables as `anon` in the first place.

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
> 4. Round 3 passed CI (fresh preview branch) and got merged — then **failed
>    again on `main`** with `policy "Users can read own friend requests" ...
>    already exists`. Reason: a PR preview and a `main` push hit two
>    *different* databases. Previews get a fresh empty branch; `main` applies
>    directly to the real, already-populated project. The local `supabase
>    start` test in round 3 only proved the directory works from empty — it
>    said nothing about replaying against a database that already has these
>    objects. It didn't: `001`'s triggers and publication-adds, and `003`'s
>    policies, were all bare/unconditional and every one collided live. Fixed
>    by verifying directly against the real project in a `begin;...rollback;`
>    transaction instead of trusting the empty-database test again — see item
>    61.
>
> Reconciled on 2026-07-27:
> - **`supabase/migrations/`** now holds **17 files**: the 13 ledger-tracked
>   versions plus the 4 foundational ones. `001` was rewritten to contain only
>   tables, `enable row level security`, indexes, and now-guarded
>   triggers/publication-adds — no bare policies, no unconditional
>   already-exists-prone statements. `003` keeps its 5 policies (it's their
>   only source) but each is now preceded by `drop policy if exists`. Verified
>   two ways: `npx supabase start` replays all 17 against an empty database
>   cleanly (matches production's 77 tracked objects), **and** a rolled-back
>   transaction replaying `001`+`002`+`003`+`008` against the real,
>   already-populated production project also completes cleanly.
> - **`supabase/000_baseline_schema.sql`** — the full schema in one file,
>   verified 77/77 against the live database — stays **outside** `migrations/`
>   so the integration never scans it. Still the right file for standing up a
>   new project by hand.
> - **`supabase/archive/`** — also outside `migrations/` — holds the 3
>   migrations that are neither ledger-tracked nor required to build the
>   schema. See `archive/README.md` for why each is excluded.
> - **`supabase/config.toml`** now exists, added for **local validation only**
>   (`npx supabase start`, needs Docker) — not linked to the real project. It
>   catches the "does this work from empty" class of bug; it does **not**
>   catch the "does this work against a database that already has these
>   objects" class, which only showed up on the real project (see item 61).
>
> Query the live database before reasoning about production behaviour — this
> file has now been wrong twice in the same afternoon (item 58's realtime
> claim, and the "16 harmless extras" claim below, both corrected by item 61)
> — and the migration *files* should be considered trustworthy only as far as
> they've actually been verified against something real, not by how recently
> they were written.

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
| 19 | Two contradictory per-person formulas — capacity vs actual attendees **[code]** | `DONE` — 019 persists `games.cost_type`; `GameViewScreen`'s `perPersonCost` is now the single source of truth (branches on cost type instead of inferring from `totalCost === 0`), CreateGameScreen's capacity-based number stays a pre-creation estimate only |
| 20 | `completeGame` never recorded attendance — profile UPDATE is `auth.uid() = id` **[code]** | `APPLIED` — `019_backlog_p1_p2_p3_fixes.sql` §5, `fn_record_game_attendance` trigger on `games` (SECURITY DEFINER, fires on any path to `status = 'completed'`) |
| 21 | `current_players` has two writers counting different things **[live]** | `DONE` — removed the redundant client-side writer in `joinGame`/`leaveGame` (`games.service.ts`); it also silently no-op'd for non-hosts under the `games` UPDATE RLS policy. `fn_sync_current_players` (006) is now the only writer |
| 22 | Leaving doesn't revoke access — sets `declined`; SELECT policy ignores status **[live]** | `APPLIED` — 019 §1, `user_in_game()` now excludes `status = 'declined'` |

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
| 30 | Demo mode diverges both ways — `saveGame` always errors; `createGame` fakes success with no validation | `DONE` — `createGame` (`games.service.ts`) was dead code, unused by `CreateGameScreen`; deleted rather than fixed. `saveGame()` now validates the same as the real path (title, options, past-date) and returns a fake success id in demo mode, matching every other demo mutation |
| 31 | `database.types.ts` stale, and `createClient` is called without `<Database>` so it does nothing | `DONE` — regenerated from the live schema via the Supabase MCP `generate_typescript_types` tool; `createClient<Database>(...)` now actually types the client. Fallout was 12 nullability mismatches across `gameData.ts`/`games.service.ts`/`messages.service.ts`, all fixed; `npm run build` passes |
| 32 | `maxPlayers` declared non-null but nullable in DB → "5/null" in Calendar | `DONE` |
| 33 | `unconfirmGame` left a stale deadline → next sweep instantly re-decides | `DONE` |
| 34 | `weeks_played`/`attendance_rate` read by UI, written by nothing | `TODO` |
| 35 | `012_optional_max_players.sql` is one line of literal `\n` escapes — unrunnable | `DONE` — rewritten with real newlines, idempotent, history documented |
| 36 | `getGroups()` has no membership filter → `assignedGroup` is the first group in the entire DB **[latent]** | `DONE` — inner-joined to `group_members`; no auto-select; `group_id` sent only for Group Only |
| 37 | `game_options` SELECT `using(true)` — enumerate every option id | `APPLIED` — 014 §7 |
| 38 | Recursive `game_players` SELECT policy in `004` **[latent]** — don't reintroduce during reconciliation | 014 adds `SECURITY DEFINER` helpers to avoid it |
| 39 | `maybe` votes collected then discarded — not counted, not used as tiebreak | `APPLIED` — 019 §4: they were already counted correctly (`fn_sync_vote_counts`, 015); `auto_transition_game` now uses them as a secondary tiebreak when two or more options are tied on `in` votes |
| 40 | `v_max_in = 0` conflated "nobody voted" with "all out" | `APPLIED` — 015 §3 distinguishes them |
| 41 | Solo games always self-cancel — creator auto-joined but never auto-voted | `TODO` |
| 42 | Past dates accepted — no `min` on the input, no server check | `DONE` — `min` added to the date input; `saveGame()` rejects past dates client-side; `create_game_with_options` (019 §7) rejects them server-side too |
| 43 | Float rounding residual on cost split; divisor fixed at creation | `DONE` — the "divisor fixed at creation" half is fixed: `GameViewScreen`'s per-person figure is always recomputed live from the actual roster/confirmed votes (never a stale creation-time value) for `fixed`-cost games. The sub-cent rounding residual itself (`$10 / 3` not summing back to exactly `$10.00`) is accepted as inherent to any even split and not further addressed |
| 44 | Host can leave and orphan their own roster, keeping host powers | `DONE` — the roster-edit remove (X) button is hidden on the host's own row (`GameViewScreen.tsx`); no dedicated "Leave Game" action exists elsewhere in the app |
| 45 | Empty roster shows the full total as the per-person price (hero badge unguarded) | `DONE` — the guard now lives inside the shared `perPersonCost` memo itself (returns `"—"` when nobody's attending a `fixed`-cost game), so every consumer — hero badge included — gets it automatically |

## P3 — hygiene and hardening

| # | Item | Status |
|---|---|---|
| 46 | Advisors: `user_in_conversation` mutable `search_path`; all `SECURITY DEFINER` fns `EXECUTE`-able by `anon`; leaked-password protection off | `user_in_conversation` was actually already fixed by 017 (this line was stale — see the note at the top of this file about not trusting its own snapshots). The function still missing `search_path` was `update_updated_at`, fixed in 019 §3. `EXECUTE`-able-by-`anon` is a mix of intentional (RLS helpers/RPCs need it) and already-revoked (trigger fns); remaining 7 advisor warnings are expected, see 017's own comment. Leaked-password protection is a dashboard Auth setting — `TODO`, cannot be fixed from a migration |
| 47 | `subscribeToVotes` subscribes to the whole `votes` table, filters client-side | `TODO` |
| 48 | `costType` never persisted — "Free" and "$0/player" indistinguishable | `APPLIED` — 019 §6 adds `games.cost_type text not null check (...)`, backfilled from existing `(total_cost, per_person_cost)` data; `create_game_with_options` accepts `p_cost_type`; `saveGame()`/`CreateGameScreen` plumb it through; `Game.costType` is optional so demo-mode games (which predate the column) still fall back to the old inference |
| 49 | `games.service.ts` discards option/invite insert errors, returns `{error:null}` | `DONE` — the function this was in (`createGame`) was dead code, unused by `CreateGameScreen` (which calls `gameData.ts`'s `saveGame()` → the transactional RPC instead). Deleted rather than fixed |
| 50 | `display_date` written raw ISO in one path, locale string in another; frozen in creator's locale | `DONE` — `addGameOption`/`updateGameOption` now use a shared `formatDisplayDate()` matching the RPC's `to_char(date, 'Dy, Mon FMDD')` format; the third, divergent writer (dead `createGame` in `games.service.ts`) was deleted per item #49 |
| 51 | One malformed date row would abort the whole sweep | `APPLIED` — 015 §4 per-game exception handling |
| 52 | `012` duplicate numbering with an ordering dependency on `009` | `TODO` |
| 53 | Dead code: `persistTransitions`, `SportIcon.tsx`, `.orig`/`.rej` leftovers, root-level codemods, `src/app/pages/` | `DONE` — only `persistTransitions` (`gameData.ts`, unused) was still actually present; deleted. Everything else in this line was already cleaned up in the 2026-07-27 pass documented in CLAUDE.md, or never existed (`.orig`/`.rej`/codemod globs all return zero matches) |
| 54 | No `APP_NAME` constant — 39 hardcoded "OptIn" strings across 16 files; `robots.txt`/`sitemap.xml` hardcode `optin.app` | `TODO` |
| 55 | **New (found 2026-07-27):** `getGroups()` returns `mockGroups` on a query error in the *non-demo* path, so a real user sees fabricated groups after a network failure. Same shape elsewhere in `games.service.ts` — audit every `return mock*` outside an `isDemoMode()` branch | `DONE` — fixed all 3 confirmed non-demo occurrences (`getGameById`, `getGroups`, `getCalendarMarkers` in `games.service.ts`); each now returns an empty/null result instead of fabricated data on a real error. `profiles.service.ts` and `messages.service.ts` audited clean (every `return mock*` already gated by `isDemoMode()`) |
| 56 | **UPDATE policies had no `WITH CHECK`** — 8 of 9. An UPDATE policy's `USING` picks which rows you may change; `WITH CHECK` picks what you may turn them into. Without it, `game_players` let a member move their row's `game_id` to any game, **bypassing the INSERT hardening in 014 §6**; a host could move an option into a game they don't own, or reassign `games.created_by` and orphan the game | `APPLIED` — `018_update_policy_with_check.sql`. Verified: `game_id`/`user_id` reassignment rejected, invite-accept still works |
| 57 | **`game_players`, `profiles`, `groups`, `group_members` are readable by `anon`** — SELECT policies are `USING (true)` and `TO public`, so unauthenticated callers can enumerate rosters and every user's name and email over the Data API. 31 policies total are still `TO public` | `APPLIED` — `020_restrict_reads_to_authenticated.sql`. Confirmed with the product owner: logged-out requests should not be able to read anything over the API. All 31 policies (every table) now `TO authenticated`, matching the baseline exactly |
| 58 | ~~Realtime has never worked~~ **[stale — corrected 2026-07-27].** This claimed no `public` table was in any publication. Re-verified live while debugging item 61: `pg_publication_tables` currently shows `messages`, `votes`, and `game_players` **are** members of `supabase_realtime` — someone (or something) added them after this item was originally written, and the claim was never re-checked before being repeated in the PR that consolidated the migrations. `games`, `game_options`, `conversation_members`, `friend_requests` are still not members, so partial gaps remain, but "never worked" was wrong. **Lesson applied in item 61: don't trust a snapshot in this file over a live query, including this one — re-check before relying on it again** | `PARTIALLY TRUE` — 3/7 recommended tables are in the publication; add the remaining 4 if you want full realtime coverage: `alter publication supabase_realtime add table public.games, public.game_options, public.conversation_members, public.friend_requests;` (each guarded the way `001` now is, in case any land there before you run it) |
| 59 | **`conversation_members` has two overlapping SELECT policies** — the one `011` added via `user_in_conversation()` *and* the original self-referential one that queries `conversation_members` from its own policy. Permissive policies OR together, so `011` never removed the recursion risk (`42P17`). Not reproduced in the baseline | `APPLIED` — 019 §2 drops `"Users can read own conversation memberships"` |
| 60 | **A Supabase GitHub integration tracks `supabase/migrations/`** — undocumented until it broke, three ways in sequence: (a) consolidating history into one baseline file removed the per-version files the ledger-comparison stage expects (`Remote migration versions not found...`); (b) fixing that to exactly the 13 ledger-tracked versions then failed the *next* stage — the integration provisions a fresh empty preview DB per PR and replays the whole directory (`relation "public.conversations" does not exist`), since none of those 13 files create a table; (c) restoring the 4 table-creating files (`001`–`003`, `008`) then hit a duplicate-policy error from `001`'s own ~25 policies colliding with later ones — caught locally, not in CI, by actually running `npx supabase start` before pushing a third time **[live]** | `DONE` (superseded by item 61 for one detail) — `migrations/` holds 17 files (13 ledger + 4 foundational); `001` rewritten to contain only tables/RLS-enable, no policies. Verified via full local replay: 17/17 apply cleanly against an **empty** database, 77/77 tracked objects match production. ⚠️ That local test does not validate against an **already-populated** database — see item 61, found the hard way when this passed CI and then failed again on `main` |
| 61 | **PR previews and `main` pushes hit two different databases, and only one is empty.** A PR preview gets a fresh empty branch (item 60); pushing to `main` applies migrations directly to the real, already-populated project at `iokxjsvlpqlekptexjxy`. Item 60's local validation (`supabase start` against an empty local DB) proved the directory works from empty — it said nothing about whether the same files are safe against a database that already has these objects. They weren't: `001`'s 4 `create trigger ...updated_at` statements and its 3 `alter publication add table` statements, and `003`'s 5 `create policy` statements, are all bare/unconditional and every one of them collided live (`ERROR: trigger "profiles_updated_at" ... already exists`, `ERROR: relation "messages" is already member of publication`, `ERROR: policy "Users can read own friend requests" ... already exists`) **[live]** | `DONE` — `001`'s triggers get `drop trigger if exists` first; its publication adds are wrapped in a `do $$ ... if not exists (select 1 from pg_publication_tables ...) $$` block; `003`'s 5 policies get `drop policy if exists` first (can't be stripped like `001`'s, since `003` is friend_requests/friendships' only policy source — nothing later re-establishes them). Verified this time in a `begin; ... rollback;` transaction run directly against the real production project, not just a local empty copy — confirmed clean and confirmed the rollback left no trace |

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

**Stale as of 2026-07-28 — kept for historical context, do not act on it.**
`014`–`019` are all applied to production. `saveGame()` calls the `016` RPC
directly with no fallback path (the old three-insert path was deleted once
`016` shipped, per what used to be task #10 here). Preconditions were verified
against live data before *writing* 014–016, not as a standing invariant —
don't assume they still hold without re-checking.

Three things in 014/015 were deliberate behaviour changes that got sign-off
at the time:
- **014 §9** made `Public` games readable by any authenticated user (previously
  nothing was discoverable). No row became public retroactively, since the
  double-mapping bug had stored everything as `'Group Only'`.
- **014 §3** uses `ON DELETE CASCADE` on `games.created_by`, so deleting a user
  deletes their games and other people's participation in them. `SET NULL` was
  the alternative, not taken.
- **015 §6** documents the `pg_cron` schedule but does not enable the
  extension — without it, transitions still only run when someone opens the
  app. Still true as of 019.

Going forward: any new migration should be verified the same two ways as 019 —
`npx supabase start` against an empty database, **and** a
`begin;...rollback;` dry run directly against the real, populated production
project — before applying for real (see item 61 for why the empty-database
test alone isn't enough).
