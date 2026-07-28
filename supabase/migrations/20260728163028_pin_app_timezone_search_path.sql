-- Migration 023: pin search_path on app_timezone() — fixes a regression
-- introduced by 022. app_timezone() references no tables/schemas (just
-- returns a literal), so there's no actual privilege-escalation surface, but
-- every other function in this codebase pins search_path as a matter of
-- convention (see 017's own comment on this exact lint), and the linter
-- flagged it. Caught during a post-merge verification pass, not before —
-- 022 should have had this from the start.

begin;

create or replace function public.app_timezone()
returns text
language sql
immutable
set search_path = public
as $$ select 'America/New_York' $$;

commit;
