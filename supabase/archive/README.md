# Archive — 7 migrations that were never applied to production

These files exist only in this repo's history. **None of them has an entry in
`supabase_migrations.schema_migrations`** on project `iokxjsvlpqlekptexjxy` —
they were either superseded before being run, or never executed at all.

**Do not move these into `supabase/migrations/`.** That directory is scanned by
a Supabase GitHub integration linked to this repo (visible as the "Supabase
Preview" check on pull requests) which compares its contents against the remote
migration ledger. Files in here have no matching remote version, so if they
were dropped into `migrations/` the integration would treat them as pending and
attempt to apply them — and several of these are not safe to run against the
current schema (see below).

## Why each one was never applied

- **`001_initial_schema.sql`** — this is the file that started the whole
  investigation. Its `conversations` SELECT policy references
  `conversation_members` ten lines before that table is created, so it dies at
  statement 37 with `ERROR: relation "conversation_members" does not exist
  (SQLSTATE 42P01)`. Everything after that point in the file — including the
  `alter publication supabase_realtime` statements at the very end — never ran,
  which is why realtime subscriptions never worked in production (see backlog
  item 58). The tables and columns it defines all exist live, so someone ran an
  equivalent script by hand outside of migration tracking.
- **`002_fix_games_group_nullable.sql`**, **`003_friend_requests_and_friendships.sql`**,
  **`008_add_username_to_profiles.sql`** — same story: the corresponding
  columns/tables exist live (`games.group_id` is nullable, `friend_requests` and
  `friendships` exist, `profiles.username` exists), so these were applied by
  hand at some point, not through the tracked path.
- **`009_game_logic_improvements.sql`** — genuinely never applied. Also
  contains an `end_time > start_time` CHECK that is wrong on these columns:
  `start_time`/`end_time` are `text`, so the comparison is lexical and rejects
  every legitimate overnight slot (`22:00` → `01:00`). Do not resurrect this
  constraint until times are migrated to `timestamptz`.
- **`010_chat_messages_rls.sql`** — never applied; superseded by
  `../migrations/20260327015818_add_rls_policies_for_all_tables.sql`, which
  covers messages RLS as part of a broader pass.
- **`013_proposed_time_approval.sql`** — never applied. Its intent (a
  `status`/`proposed_by` pair on `game_options` for host-approved time
  proposals) is fully covered by
  `../migrations/20260727180057_reconcile_live_schema.sql` (migration 014).

## Where the real history lives

`../migrations/` contains 13 files, one per version in the remote ledger, named
`<version>_<name>.sql` to match what the Supabase CLI and the GitHub
integration expect. Their content was pulled directly from
`supabase_migrations.schema_migrations` (verified byte-for-byte via `md5()` for
the first 8; the last 5 — migrations 014–018 from the 2026-07-27 reconciliation
— are functionally identical to what ran but keep their original authoring
comments and an explicit `begin`/`commit` wrapper for standalone readability).

`../000_baseline_schema.sql` is the full current schema in one file, for
standing up a **new** project — it is intentionally kept outside
`migrations/` so the CLI/integration never scans or tries to reconcile it
against the ledger.
