# Archived migrations — history only, do not replay

These 19 files are the migration history up to 2026-07-27. They have been
**superseded by `../000_baseline_schema.sql`**, which is generated from the live
schema and is the only file needed to stand up a new project.

They are kept for provenance — the reasoning in `014`–`018` explains *why* the
current schema looks the way it does, which the baseline can only summarise.

## Why you must not run these

**`001`–`013` never described the database.**

- **`001` aborted partway.** The `conversations` SELECT policy referenced
  `conversation_members` ten lines before that table was created, so it failed
  with `ERROR: relation "conversation_members" does not exist (SQLSTATE 42P01)`
  at statement 37. (Fixed in the archived copy, but see below.) Everything after
  that point never ran — including the `alter publication supabase_realtime`
  statements at the end, which is why realtime subscriptions never worked in
  production.
- **`009` and `013` were never applied at all.** The remote migration ledger has
  no entry for either.
- **Several policies were hand-edited in the dashboard**, so live policy names
  appear in no file here.
- **`012` is used twice** (`012_allow_game_delete`, `012_optional_max_players`),
  and the latter was committed as a single line containing literal `\n` escape
  sequences rather than newlines. It could never have parsed as written.

## The specific trap

Replaying `009` would **re-add the `end_time > start_time` CHECK constraint**.
That constraint is wrong on these columns:

- `start_time` / `end_time` are `text`, so the comparison is lexical — it
  rejects every legitimate overnight slot (`22:00` → `01:00`).
- Added `NOT VALID` it is still worse than useless: `NOT VALID` skips the initial
  table scan but **re-checks any row that is later UPDATEd**, so an existing
  violating row becomes permanently unwritable. This happened during the 2026-07-27
  reconciliation — a live row (`22:00` → `12:00`) blocked the vote-count repair.

The constraint was deliberately dropped. Re-add it only after migrating times to
`timestamptz`.

## Which of these are actually live

Applied to production, per the remote ledger:
`004`(as `add_rls_policies_for_all_tables`), `005`, `006`, `007`, `011`,
`012_allow_game_delete`, `012_optional_max_players`, and `014`–`018`.

Not in the ledger: `001`, `002`, `003`, `008`, `009`, `010`, `013`.
`001`'s tables plainly exist, so it was run in pieces by hand; `009` and `013`
were genuinely skipped, and `014` was written to cover what `013` intended.
