# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**OptIn** — a mobile-first PWA for scheduling any in-person plan a friend group has to agree on, by consensus voting on candidate time slots. Recreational pickup sports is the launch wedge and what the current UI and demo data are built around; the scope was widened on 2026-11-03 (see the "Scope" section of [PRODUCT.md](PRODUCT.md)). Work meetings are out of scope. Coursework for CFPN542; originated as a Figma Make export. React 18 + Vite + Tailwind v4 + Neon (Neon Auth + Data API).

## Commands

```bash
npm run dev        # Vite dev server (port 5173)
npm run typecheck  # tsc --noEmit
npm run build      # tsc --noEmit && vite build
```

There is no test suite and no linter configured. `npm run typecheck` is the only gate; CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs typecheck + build and nothing else.

## Environment

`.env.local` holds `VITE_NEON_URL` and `VITE_APP_ENV`. `VITE_NEON_URL` is the HTTPS form of the Neon host + database with no credentials (e.g. `https://ep-xxx.c-2.us-east-1.aws.neon.tech/neondb`); the SDK derives the Auth and Data API URLs from it. It is public by design.

`VITE_APP_ENV` is `demo | development | production`, defaulting to `production`. Setting it to `demo` (or omitting `VITE_NEON_URL`) makes [db.ts](src/lib/db.ts) export a `null` client and puts the whole app into **demo mode**. CI builds with `VITE_APP_ENV=demo` so missing credentials never break the build; Vercel injects the real values.

## Demo mode is a cross-cutting concern

Every data function begins with an `isDemoMode()` check and returns hardcoded mock data instead of hitting the database. `AuthProvider` short-circuits to a `DEMO_PROFILE` and skips all auth. Mock data lives in [DEMO_ACTIVITIES](src/app/components/activityData.ts) and [data/activities.ts](src/app/data/activities.ts).

Any new data-fetching function must follow this pattern, or demo mode silently breaks:

```ts
if (isDemoMode()) return mockThing;
if (!db) return [];   // db is the Neon client or `null` — always narrow it
```

## Architecture

**Routing** — [routes.tsx](src/app/routes.tsx) builds a `createBrowserRouter` tree: `AuthRoot` (wraps `AuthProvider` + `Suspense`) → public routes (`/login`, `/signup`, `/onboarding`, and `/game/:id`, which only redirects to `/activity/:id`) and `Layout` → the four tab screens plus `/activity/:id`. Screens are `lazy()`-imported for code splitting; `ChatsScreen` is eager.

**[Layout.tsx](src/app/components/Layout.tsx)** is the app shell and the auth gate in one: it redirects unauthenticated non-demo users to `/login`, redirects real users without a `profile.username` to `/onboarding`, renders the offline / session-expired / demo banners, constrains the viewport to `max-w-[430px]`, and mounts `BottomNav`.

**Auth** — [AuthContext.tsx](src/app/contexts/AuthContext.tsx) owns session, profile, demo-mode toggling, and a 60s interval that refreshes the Neon Auth session and sets `sessionExpired` on failure. It also lazily creates a `profiles` row for any user (email or Google) whose profile fetch returns `PGRST116`. Consume via `useAuth()`.

### Two parallel data layers — know which one you're in

This is the single biggest source of confusion in the codebase:

- **[components/activityData.ts](src/app/components/activityData.ts)** — the layer the *live* activity screens use (`HomeScreen`, `CalendarScreen`, `CreateActivityScreen`, `ActivityViewScreen`). Its `Activity` type uses `timeOptions`, `roster`, `splitCost`, `intensity: "casual" | "competitive"`.
- **[services/*.service.ts](src/app/services/)** — `activities`, `messages`, `profiles`, `friendships`. Chat, friends, and profile features use these. Its `Activity` type ([data/activities.ts](src/app/data/activities.ts)) uses `options`, `perPersonCost`, `intensity: "Casual" | "Competitive"`.

The two `Activity` shapes are **not** interchangeable. Some screens import from both (e.g. `ActivityViewScreen` uses `activityData` for activity state and `activities.service` for invites). Follow the imports of the file you are editing rather than assuming.

**[src/app/pages/](src/app/pages/) now contains only the three routed auth screens** — `Login`, `Signup`, `Onboarding`. The unreachable duplicates (`Home`, `Calendar`, `CreateGame`, `GamePage`, `Messages`, `Profile`) and `SportIcon.tsx` were deleted on 2026-07-27 (~3,000 lines). All screen work happens in the `components/*Screen.tsx` files.

Note this removed the only consumers of the `services/*` + [data/activities.ts](src/app/data/activities.ts) `Activity` shape for *activity* screens; `activities.service.ts` is still live for invites and notifications, and `messages`/`profiles`/`friendships` services are still used throughout.

### Neon / activity state machine

The database is **Neon** (moved from Supabase on 2026-11-03), used through two Neon features: **Neon Auth** (managed Better Auth) for sign-in, and the **Data API** (PostgREST-compatible) for every `db.from()` / `db.rpc()` call. [db.ts](src/lib/db.ts) builds the client with `createClient` from `@neon/neon-js/supabase`, which keeps supabase-js's `auth.*` method names (`signInWithPassword`, `onAuthStateChange`, …) and query builder, so most call sites didn't change. There is no server and no secret key in the browser: **RLS is the only thing enforcing access.**

The project is Neon `long-mode-22787064` ("optin", branch `main` = `br-rapid-tooth-bbbpk18h`, database `neondb`), linked to Vercel project `optin` (`prj_OItUgImRuE8JOegmg7Yl9FA7NRNm`, formerly `cfpn-542-opt-in-prototype`). Production is **https://optinapp.vercel.app**; the old `cfpn-542-opt-in-prototype.vercel.app` is attached as a 308 redirect to it. `VITE_NEON_URL` is `https://ep-sweet-snow-bbd8dgld.c-15.us-east-1.aws.neon.tech/neondb`. Neon Auth has email/password and Google (Neon's shared OAuth app) enabled. Its trusted redirect origins are `localhost`, `optinapp.vercel.app` and a list of older `optin-*` / `cfpn-542-*` deployment URLs; arbitrary Vercel **preview** URLs are not trusted, so OAuth redirects fail there unless added. Sign-in keeps the path: Layout sends signed-out visitors to `/login` with `state.from`, and Login (and Google's `redirectTo`) returns them to it. Only same-app paths starting with a single `/` are honoured.

The Neon org is **managed by Vercel** — projects are created from the Vercel dashboard (Storage → Neon), not via the Neon API/MCP, which refuses `create_project`. Everything else (SQL, Auth, Data API config) works through the Neon MCP.

**[neon/schema.sql](neon/schema.sql)** is the whole schema in one file, ported from the old Supabase baseline (see its header for each difference). It is the source of truth for a fresh database. There is no CI integration — change the schema by editing that file **and** applying the same statement to the project (Neon MCP `run_sql`). Test risky changes on a Neon branch first. When a change can't be applied by re-running `schema.sql` (column renames, changed function parameter names), also add a one-off script under [neon/migrations/](neon/migrations/) named `YYYY-MM-DD_description.sql`.

**Applied migrations** (both on 2026-11-03, each right after its matching production deploy went live): [2026-11-03_activity_vocabulary.sql](neon/migrations/2026-11-03_activity_vocabulary.sql) (sport → activity columns) and [2026-11-03_activity_noun.sql](neon/migrations/2026-11-03_activity_noun.sql) (game → activity tables, activity → type columns, game_type → intensity). Migrations that rename columns, tables or RPC parameters break whichever client version doesn't match, so ship the code and run the migration back to back. Function bodies don't follow table renames, so recreate every function, trigger and policy that touches a renamed table. The Data API (PostgREST) caches the schema, so end the transaction with `notify pgrst, 'reload schema'`.

Neon-specific rules that differ from Supabase and are easy to get wrong:
- Use `public.current_uid()` (uuid) in policies and functions, never `auth.uid()` / `auth.user_id()` directly. `authenticated` has **no USAGE on the `auth` schema**, so calling those from a policy fails with `permission denied for schema auth`; `current_uid()` is `SECURITY DEFINER` to get around that. (`auth.user_id()` also returns text, not uuid.)
- The container this repo is worked on from usually can't reach Neon hosts directly (no psql). Apply SQL through the Neon MCP (`run_sql` takes one statement; use `run_sql_transaction` for several). To test RLS as a user, `set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true)` then `set local role authenticated` inside a `do` block that ends in `raise exception` so it rolls back.
- Roles are `authenticated` and `anonymous` (not `anon`). New tables need `grant ... to authenticated` as well as RLS policies.
- Neon Auth users live in the managed `neon_auth` schema. Nothing references it: `profiles` has no FK to it, and there is no signup trigger — `AuthContext.fetchProfile` creates the `profiles` row on first sign-in (`PGRST116`).
- Old Supabase accounts and data were **not** migrated (password hashes are incompatible).

Tables: `profiles`, `groups`/`group_members`, `activities`, `activity_options`, `votes`, `activity_players`, `conversations`/`conversation_members`/`messages`, `friend_requests`/`friendships`.

**Vocabulary.** A plan is an **activity** and its kind is its **type** (decided 2026-11-03; PRODUCT.md "Scope"). Tables are `activities` / `activity_options` / `activity_players`, keyed by `activity_id`. The type lives in `activities.type` / `type_emoji` / `type_color` and `groups.type` / `type_emoji`, where `groups.type` is **nullable** because a friend group can do many things. Casual vs Competitive is `activities.intensity`. RPCs: `create_activity_with_options(p_type, p_type_emoji, p_type_color, p_intensity, …)`, `auto_transition_activity(p_activity_id)`, `auto_transition_all_activities()`; RLS helpers `user_in_activity` / `user_is_activity_host`. The TS side matches: `Activity` / `ActivityStatus` types with `type` / `typeEmoji` / `typeColor` / `intensity` fields, `TYPE_HERO_IMAGES` and `TYPE_MINIMUMS` in [activityData.ts](src/app/components/activityData.ts), the `activityTypes` list in [data/activities.ts](src/app/data/activities.ts), and the `/activity/:id` route. UI copy says "Activity" for the plan and "Type" for the picker. **Never reintroduce `game*` or `sport*` names.** The type *values* are still mostly sports (Basketball, Soccer, …) because sports is the launch wedge. A type with no entry in `TYPE_HERO_IMAGES` gets `DEFAULT_HERO_IMAGE`, a plain gray placeholder. "Players" and "roster" are still sports words and have not been replaced.

Activity lifecycle is `proposal → confirmed | cancelled → completed`, and the transitions are enforced **in Postgres, not in the client** — `auto_transition_activity(uuid)` and `auto_transition_all_activities()` are `SECURITY DEFINER` functions that close voting past `voting_deadline`, auto-confirm a unique winning option among `status = 'approved'` options, cancel when nobody voted "in" or `min_players` is unmet, record ties for the host to break, and mark past confirmed activities completed. The client fires `auto_transition_all_activities` fire-and-forget on load. Change status logic in SQL, not in TS.

`pg_cron` is **not** installed, so nothing runs the sweep unless a user opens the app. Activity creation goes through the `create_activity_with_options` RPC, which is transactional and takes `created_by` from `public.current_uid()`.

Visibility (`Public` / `Group Only` / `Private`) is enforced by RLS on `activities`, and `getActivities` additionally filters client-side so users see only activities they created or explicitly joined — `activity_players.status = 'invited'` rows are deliberately excluded from the main list and surface in the notifications panel instead.

There is no realtime. Invites, votes, roster changes and chat **poll** through `poll()` in [db.ts](src/lib/db.ts) (5s default, skipped while the tab is hidden, fires once on becoming visible). `poll()` returns a stop function — always call it in the effect cleanup.

### Styling

Tailwind v4, CSS-first config — no `tailwind.config.js`. [styles/index.css](src/styles/index.css) imports fonts → tailwind → theme. [theme.css](src/styles/theme.css) declares MD3 color roles as CSS custom properties and re-exports them through `@theme inline`, which is what produces the utility classes: `bg-surface`, `text-on-surface-variant`, `bg-primary-container`, `rounded-md3-large`, `text-title-lg`, `text-body-md`. **Use these tokens rather than hardcoded hex or raw Tailwind palette colors.**

[constants/md3.ts](src/app/constants/md3.ts) exports the same roles as a JS object for inline styles — note its palette is blue-primary and diverges from `theme.css`'s green; `theme.css` is authoritative.

[components/ui/](src/app/components/ui/) is stock shadcn/ui over Radix. MUI and Emotion are in `package.json` but effectively unused.

**[DESIGN.md](DESIGN.md) is the design system of record** — token tables, component specs, named rules, and a do/don't list that names each known token-drift site by file and line. Its companion [.impeccable/design.json](.impeccable/design.json) carries what the DESIGN.md frontmatter schema can't hold (tonal ramps, dark-mode values, shadow/motion tokens, renderable component snippets). **[PRODUCT.md](PRODUCT.md)** holds durable product truth — users, purpose, positioning, constraints, and what evidence does *not* exist and must not be fabricated. Both were written on 2026-07-28, replacing `design-system/MASTER.md`, which had drifted so far it documented the app's *previous* identity: iOS Liquid Glass, `.ios-card`, `backdrop-blur`, and screens in `pages/` that were deleted.

Two things DESIGN.md establishes that are easy to get wrong: (1) [index.html](index.html) hardcodes `class="dark"` on `<html>` and nothing toggles it, so **the `.dark` ramp is the only palette users ever see** — validate contrast and tonal separation against it, not against the light `:root` values; (2) in that ramp `--surface`, `--background`, and `--surface-container-low` are all `#1A1C19`, so `ActivityCard`'s background is tonally identical to the page.

The original coursework constraints (MD3, 48dp touch targets, 4.5:1 contrast, 4-item bottom nav, 8pt grid) remain in [guidelines/Guidelines.md](guidelines/Guidelines.md). Note that its 4-item bottom nav conflicts with the 5 items [BottomNav.tsx](src/app/components/BottomNav.tsx) actually ships; PRODUCT.md records this as unresolved rather than silently picking a winner.

`@/` is aliased to `src/` (both [vite.config.ts](vite.config.ts) and [tsconfig.json](tsconfig.json)); most app-internal imports use relative paths anyway.

## Repo hygiene

The repo root previously held 38 one-off codemods and merge leftovers (`fix_*.cjs`, `patch_*.cjs`, `*.patch`, `tmp_screen.txt`, `typecheck.log`, `.orig`/`.rej`). **All were deleted on 2026-07-27** and [.gitignore](.gitignore) now blocks the patterns. Edit source files directly — do not generate scripts to rewrite them. They remain in git history if you ever need one.

Deployment is Vercel; [vercel.json](vercel.json) 308-redirects the legacy `/game/:id` to `/activity/:id`, then rewrites everything to `index.html` for client-side routing. Keep `LegacyActivityRedirect` in [routes.tsx](src/app/routes.tsx) as well: it covers the dev server and in-app history, where `vercel.json` doesn't run.

See [AGENTS.md](AGENTS.md) for the skills-junction setup on this machine (skills live globally at `C:\Users\philo\.agents\skills\`, not in this repo).
