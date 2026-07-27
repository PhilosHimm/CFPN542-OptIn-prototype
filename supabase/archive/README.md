# Archive — 3 migrations that were never applied and are not needed

These 3 files exist only in this repo's history. **None has an entry in
`supabase_migrations.schema_migrations`** on project `iokxjsvlpqlekptexjxy`,
and — unlike `001`/`002`/`003`/`008` (see below) — nothing in
`supabase/migrations/` depends on anything they create, so they are not
required to build a working schema from scratch either.

**Do not move these into `supabase/migrations/`.**

## Why each one is excluded

- **`009_game_logic_improvements.sql`** — never applied. Contains an
  `end_time > start_time` CHECK that is wrong on these columns:
  `start_time`/`end_time` are `text`, so the comparison is lexical and rejects
  every legitimate overnight slot (`22:00` → `01:00`). Its other changes
  (`min_players`, the vote-count trigger, `auto_transition_game`) are all
  superseded by `20260727180057_reconcile_live_schema.sql` and
  `20260727180227_restore_state_machine.sql` (migrations 014–015), which
  `add column if not exists` / `create or replace` their way to the same end
  state without the bad constraint.
- **`010_chat_messages_rls.sql`** — never applied, and cannot be replayed
  as-is: it `CREATE POLICY`s three policies whose names are already created by
  `20260327015818_add_rls_policies_for_all_tables.sql` (e.g. "Authenticated
  users can create conversations"). `CREATE POLICY` has no `IF NOT EXISTS`, so
  including this file would fail every fresh build with a duplicate-policy
  error.
- **`013_proposed_time_approval.sql`** — never applied. Its intent (a
  `status`/`proposed_by` pair on `game_options` for host-approved time
  proposals) is fully covered by
  `20260727180057_reconcile_live_schema.sql` (migration 014), which adds the
  same columns with `add column if not exists`.

## What's actually in `supabase/migrations/` now, and why

17 files, not 13. Two lessons from getting this wrong twice:

1. **`supabase/migrations/` isn't just diffed against a persistent ledger.**
   The linked Supabase GitHub integration ("Supabase Preview" check) provisions
   a **fresh, empty preview database per pull request** and replays the
   *entire* directory against it from scratch — it is not comparing against
   the long-lived production project at `iokxjsvlpqlekptexjxy`.
2. Because of (1), the directory needs every migration that **creates**
   something later files assume exists — not just the ones the production
   project's ledger happens to record, since production's foundational tables
   were created by hand outside CLI tracking and therefore have no ledger
   entry at all.

That surfaced in two rounds:

- **Round 1** replaced the whole directory with a single consolidated
  baseline file. Failed immediately with `Remote migration versions not found
  in local migrations directory` — the ledger-comparison stage runs first, and
  it requires one file per already-applied remote version.
- **Round 2** fixed that by restoring exactly the 13 ledger-tracked versions,
  each named `<version>_<name>.sql`. Passed the ledger check, then failed the
  *next* stage — building the fresh preview database — with `ERROR: relation
  "public.conversations" does not exist`, because none of those 13 files
  create a single table; they all assume tables that were created by hand in
  production and never went through CLI tracking.

**Round 3** (current): restored `001_initial_schema.sql` (fixed — see below),
`002_fix_games_group_nullable.sql`, `003_friend_requests_and_friendships.sql`,
and `008_add_username_to_profiles.sql` into `migrations/`, versioned to sort
before the earliest real ledger entry (`20260327015818`). None of these four
has a remote ledger entry either, but each creates something a later file
needs:

- **`001`** creates every base table. Confirmed to be the file whose ordering
  bug (a policy on `conversations` referenced `conversation_members` ten lines
  before that table existed) caused the original statement-37 abort that
  started this whole investigation — fixed in place: the policy now lives
  after the table it depends on. Backlog item 58 claimed that abort meant the
  `alter publication supabase_realtime` statements at the end of `001` never
  ran anywhere, ever — **that claim is false, corrected during round 4 below**:
  a live check found 3 of the 3 tables `001` tries to add (`messages`,
  `votes`, `game_players`) are already members of the publication on the real
  project, meaning someone added them by hand at some point after item 58 was
  written, and the claim was carried forward into this file without
  re-checking it.
- **`002`** makes `games.group_id` nullable and adds the profile
  auto-creation trigger.
- **`003`** creates `friend_requests` and `friendships` —
  `20260727182918_update_policy_with_check.sql` (migration 018) drops and
  recreates a policy on `friend_requests`, so this table must exist first.
- **`008`** adds `profiles.username` — not a hard prerequisite for any later
  file's SQL to parse, but part of the real schema (production has this
  column), so a preview branch built without it would be missing something the
  app depends on.

**Verified locally, not assumed.** `supabase start` (which requires Docker —
now that `supabase/config.toml` exists, run it from the repo root) replays this
exact 17-file directory against a brand-new empty database and all 17 applied
cleanly. That run initially hit a THIRD failure mode before this file reached
its current state: `001`'s own `create policy` statements (~25 of them, mostly
`using (true)`) collided by name with 5 policies created later, and — more
importantly — would have stayed active alongside every later, more restrictive
policy even where names didn't collide, since Postgres OR's permissive
policies together. `001` was rewritten to keep only table/RLS-enable/index/
trigger statements; every policy now comes from `20260327015818_...` onward.

Post-replay, the resulting schema matched production's 77 tracked objects
(constraints, functions, indexes, triggers) plus what looked like 16 extra
harmless ones — **that "16 harmless extras, none exist on production" claim
was also wrong**, and cost a failed push to `main` to find out.

## Round 4: passed CI, then failed again on `main` — because two different databases

Round 3 passed the "Supabase Preview" check (a fresh, empty PR preview branch)
and got merged. The very next push to `main` failed:

```
ERROR: policy "Users can read own friend requests" for table "friend_requests"
already exists (SQLSTATE 42710)
```

**A PR preview and a push to `main` hit two different databases.** Previews
get a throwaway empty branch; pushing to `main` applies migrations directly to
the real, already-populated project (`iokxjsvlpqlekptexjxy`). `npx supabase
start` against a local empty database — the round-3 verification — proves the
directory works *from empty*. It says nothing about whether the same
statements are safe to replay against a database that already has these
objects. They weren't, in three places, and this is exactly what falsified the
"16 harmless extras" claim above:

- `001`'s 4 `create trigger ..._updated_at` statements — `profiles_updated_at`
  already exists on production.
- `001`'s 3 `alter publication supabase_realtime add table ...` statements —
  all 3 tables are already members (see the `001` bullet above; this directly
  contradicts backlog item 58's "realtime has never worked").
- `003`'s 5 `create policy` statements — `friend_requests`/`friendships`
  already have all 5 policies live.

None of `001`/`003`'s non-idempotent statements would ever have been *caught*
by the empty-database test, because `drop-if-exists`-vs-`if-not-exists` only
matters when the target isn't empty. Fixed by making every one of them safe to
re-run regardless of starting state: `drop trigger if exists` before each
trigger, a `do $$ ... if not exists (select from pg_publication_tables) $$`
guard before each publication add, and `drop policy if exists` before each of
`003`'s 5 policies (which — unlike `001`'s policies — could not simply be
deleted: nothing later re-establishes RLS on `friend_requests`/`friendships`
the way `20260327015818_...` does for every other table, so `003` remains
their only policy source).

**Verified against the real database this time, not just a local empty
copy.** The full `001`+`002`+`003`+`008` sequence was run directly against
`iokxjsvlpqlekptexjxy` inside a `begin; ... rollback;` transaction — proving it
completes with no error — and a follow-up query after the rollback confirmed
the transaction left no trace (trigger, publication membership, and policy
count all unchanged from before the test).

**The lesson, stated plainly so it doesn't need re-learning a third time:**
this file has now contained two confidently-stated, wrong claims about
production state in the same afternoon (item 58's realtime claim, and the "16
harmless extras" claim above). Both were true of a *snapshot*, taken once and
never re-checked, and both were then repeated as fact. Treat any claim in this
repo about "what's live on production" as **provisional** until you've
re-queried it yourself — including this sentence, eventually.

## Re-verifying after a future change

Two different checks, because they catch different bugs:

```bash
npx supabase start   # first run pulls several GB of container images
```
Replays the whole directory against an empty database — proves it works from
scratch (what a PR preview does). Watch for `Applying migration ...` lines
with no error between them.

For whether it's *also* safe against a database that already has these
objects (what a `main` push does), there's no equivalent local command — you'd
need a Postgres instance seeded with a copy of production's actual state. In
this repo, that verification was done directly against the real project via
Supabase MCP, wrapped in `begin; ... rollback;` so nothing was actually
changed. Do the same before trusting a change to `001`, `002`, `003`, or `008`
again — the 13 ledger-tracked files don't need this, since the integration
skips versions it already has recorded as applied.
