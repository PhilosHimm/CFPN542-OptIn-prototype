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
  after the table it depends on. That abort is also why the
  `alter publication supabase_realtime` statements at the end of `001` never
  ran, which is the root cause of backlog item 58 (realtime never worked in
  production).
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

Post-replay, the resulting schema matches production's 77 tracked objects
(constraints, functions, indexes, triggers) exactly, plus 16 extra harmless
ones that come from `001`'s original `update_updated_at()` audit trigger, its
4 table triggers, 9 indexes, and 2 `unique(...)` constraints — none of which
exist on the live project, consistent with `001` never having run to
completion there either. They don't affect security posture or break
anything; left in place rather than risk further edits chasing cosmetic
parity with a production schema that itself doesn't perfectly match this
file's history.

To re-verify after any future change to `migrations/`:
```bash
npx supabase start   # first run pulls several GB of container images
```
Watch for `Applying migration ...` lines with no error between them.
