# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**OptIn** — a mobile-first PWA for scheduling recreational pickup sports games by group consensus voting. Coursework for CFPN542; originated as a Figma Make export. React 18 + Vite + Tailwind v4 + Supabase.

## Commands

```bash
npm run dev        # Vite dev server (port 5173)
npm run typecheck  # tsc --noEmit
npm run build      # tsc --noEmit && vite build
```

There is no test suite and no linter configured. `npm run typecheck` is the only gate; CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs typecheck + build and nothing else.

## Environment

`.env.local` holds `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_ENV`.

`VITE_APP_ENV` is `demo | development | production`, defaulting to `production`. Setting it to `demo` (or omitting Supabase credentials) makes [supabase.ts](src/lib/supabase.ts) export a `null` client and puts the whole app into **demo mode**. CI builds with `VITE_APP_ENV=demo` so missing credentials never break the build; Vercel injects the real values.

## Demo mode is a cross-cutting concern

Every data function begins with an `isDemoMode()` check and returns hardcoded mock data instead of hitting Supabase. `AuthProvider` short-circuits to a `DEMO_PROFILE` and skips all auth. Mock data lives in [DEMO_GAMES](src/app/components/gameData.ts) and [data/games.ts](src/app/data/games.ts).

Any new data-fetching function must follow this pattern, or demo mode silently breaks:

```ts
if (isDemoMode()) return mockThing;
if (!supabase) return [];   // supabase is `SupabaseClient | null` — always narrow it
```

## Architecture

**Routing** — [routes.tsx](src/app/routes.tsx) builds a `createBrowserRouter` tree: `AuthRoot` (wraps `AuthProvider` + `Suspense`) → public routes (`/login`, `/signup`, `/onboarding`) and `Layout` → the four tab screens plus `/game/:id`. Screens are `lazy()`-imported for code splitting; `ChatsScreen` is eager.

**[Layout.tsx](src/app/components/Layout.tsx)** is the app shell and the auth gate in one: it redirects unauthenticated non-demo users to `/login`, redirects real users without a `profile.username` to `/onboarding`, renders the offline / session-expired / demo banners, constrains the viewport to `max-w-[430px]`, and mounts `BottomNav`.

**Auth** — [AuthContext.tsx](src/app/contexts/AuthContext.tsx) owns session, profile, demo-mode toggling, and a 60s interval that refreshes the Supabase token and sets `sessionExpired` on failure. It also lazily creates a `profiles` row for new Google OAuth users when the fetch returns `PGRST116`. Consume via `useAuth()`.

### Two parallel data layers — know which one you're in

This is the single biggest source of confusion in the codebase:

- **[components/gameData.ts](src/app/components/gameData.ts)** — the layer the *live* game screens use (`HomeScreen`, `CalendarScreen`, `CreateGameScreen`, `GameViewScreen`). Its `Game` type uses `timeOptions`, `roster`, `splitCost`, `gameType: "casual" | "competitive"`.
- **[services/*.service.ts](src/app/services/)** — `games`, `messages`, `profiles`, `friendships`. Chat, friends, and profile features use these. Its `Game` type ([data/games.ts](src/app/data/games.ts)) uses `options`, `perPersonCost`, `gameType: "Casual" | "Competitive"`.

The two `Game` shapes are **not** interchangeable. Some screens import from both (e.g. `GameViewScreen` uses `gameData` for game state and `games.service` for invites). Follow the imports of the file you are editing rather than assuming.

**[src/app/pages/](src/app/pages/) now contains only the three routed auth screens** — `Login`, `Signup`, `Onboarding`. The unreachable duplicates (`Home`, `Calendar`, `CreateGame`, `GamePage`, `Messages`, `Profile`) and `SportIcon.tsx` were deleted on 2026-07-27 (~3,000 lines). All screen work happens in the `components/*Screen.tsx` files.

Note this removed the only consumers of the `services/*` + [data/games.ts](src/app/data/games.ts) `Game` shape for *game* screens; `games.service.ts` is still live for invites and notifications, and `messages`/`profiles`/`friendships` services are still used throughout.

### Supabase / game state machine

**A Supabase GitHub integration is linked to this repo** (it shows up as the "Supabase Preview" check on pull requests) and compares [supabase/migrations/](supabase/migrations/) against `supabase_migrations.schema_migrations` on the linked project. That folder must contain **exactly one file per applied remote version**, named `<version>_<name>.sql` — nothing else, no subfolders. Discovered the hard way: consolidating history into a single baseline file broke this the moment the branch reached `main`, producing `Remote migration versions not found in local migrations directory.` Reconciled on 2026-07-27 — see [supabase/archive/README.md](supabase/archive/README.md) for the full story.

**[supabase/000_baseline_schema.sql](supabase/000_baseline_schema.sql)** (note: outside `migrations/`, deliberately) is the full schema in one file, for standing up a **new** project by hand (dashboard or Supabase MCP) — generated on 2026-07-27 from the live schema of project `iokxjsvlpqlekptexjxy` and verified object-for-object (77/77 constraints, functions, indexes, triggers). It is kept out of `migrations/` specifically so the GitHub integration never scans it.

[supabase/archive/](supabase/archive/) holds 7 migrations that were **never applied to production at all** — `001` (aborted partway; a policy referenced `conversation_members` before that table existed, which is also why the realtime publication at the end of the file was never applied), `002`, `003`, `008`, `009`, `010`, `013`. Never replay them or move them into `migrations/`; `009` in particular would re-add an `end_time > start_time` CHECK that is wrong on text columns.

The Supabase CLI is a devDependency (`npx supabase`) but has never been linked locally (no `config.toml`, no project ref). New migrations should use `supabase migration new <name>` once linked, or otherwise follow the `<timestamp>_name.sql` convention by hand — matching the real CLI/integration format is now load-bearing, not cosmetic.

Tables: `profiles`, `groups`/`group_members`, `games`, `game_options`, `votes`, `game_players`, `conversations`/`conversation_members`/`messages`, `friend_requests`/`friendships`.

Game lifecycle is `proposal → confirmed | cancelled → completed`, and the transitions are enforced **in Postgres, not in the client** — `auto_transition_game(uuid)` and `auto_transition_all_games()` are `SECURITY DEFINER` functions (migration 015) that close voting past `voting_deadline`, auto-confirm a unique winning option among `status = 'approved'` options, cancel when nobody voted "in" or `min_players` is unmet, record ties for the host to break, and mark past confirmed games completed. The client fires `auto_transition_all_games` fire-and-forget on load. Change status logic in a migration, not in TS.

`pg_cron` is **not** installed, so nothing runs the sweep unless a user opens the app. Game creation goes through the `create_game_with_options` RPC (migration 016), which is transactional and takes `created_by` from `auth.uid()`.

Visibility (`Public` / `Group Only` / `Private`) is enforced by RLS on `games` (migration 009), and `getGames` additionally filters client-side so users see only games they created or explicitly joined — `game_players.status = 'invited'` rows are deliberately excluded from the main list and surface in the notifications panel instead.

Realtime subscriptions (`postgres_changes`) are used for invites, votes, roster changes, and chat; always `supabase.removeChannel(channel)` in the effect cleanup.

### Styling

Tailwind v4, CSS-first config — no `tailwind.config.js`. [styles/index.css](src/styles/index.css) imports fonts → tailwind → theme. [theme.css](src/styles/theme.css) declares MD3 color roles as CSS custom properties and re-exports them through `@theme inline`, which is what produces the utility classes: `bg-surface`, `text-on-surface-variant`, `bg-primary-container`, `rounded-md3-large`, `text-title-lg`, `text-body-md`. **Use these tokens rather than hardcoded hex or raw Tailwind palette colors.**

[constants/md3.ts](src/app/constants/md3.ts) exports the same roles as a JS object for inline styles — note its palette is blue-primary and diverges from `theme.css`'s green; `theme.css` is authoritative.

[components/ui/](src/app/components/ui/) is stock shadcn/ui over Radix. MUI and Emotion are in `package.json` but effectively unused.

Design constraints (MD3, 48dp touch targets, 4.5:1 contrast, 4-item bottom nav, 8pt grid) are documented in [guidelines/Guidelines.md](guidelines/Guidelines.md); the concrete token tables and component specs are in [design-system/MASTER.md](design-system/MASTER.md).

`@/` is aliased to `src/` (both [vite.config.ts](vite.config.ts) and [tsconfig.json](tsconfig.json)); most app-internal imports use relative paths anyway.

## Repo hygiene

The repo root previously held 38 one-off codemods and merge leftovers (`fix_*.cjs`, `patch_*.cjs`, `*.patch`, `tmp_screen.txt`, `typecheck.log`, `.orig`/`.rej`). **All were deleted on 2026-07-27** and [.gitignore](.gitignore) now blocks the patterns. Edit source files directly — do not generate scripts to rewrite them. They remain in git history if you ever need one.

Deployment is Vercel; [vercel.json](vercel.json) rewrites everything to `index.html` for client-side routing.

See [AGENTS.md](AGENTS.md) for the skills-junction setup on this machine (skills live globally at `C:\Users\philo\.agents\skills\`, not in this repo).
