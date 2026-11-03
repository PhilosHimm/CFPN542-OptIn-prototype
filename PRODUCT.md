# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: the reluctant organizer.** One person in a group of friends who wants to get something on the calendar this week (a pickup game, a dinner, a board-game night, a hike) and has ended up responsible for making it happen. They are not a league administrator, a coach, or a facility manager. They are a player who got stuck with the coordinating because nobody else would, and they do it from a phone, usually one-handed, usually while doing something else.

Their job is not "schedule a game." Their job is **stop asking.** They know roughly who wants to play and roughly when everyone is free. What they lack is a way to turn that into a committed time without personally chasing eight people across a group chat and then re-chasing the three who never answered.

**Secondary: the invited player.** Everyone else in the group. Their entire interaction budget is a few seconds: see the proposed times, tap the one that works, get told what won. They will not open a scheduling app to "manage their availability." They will respond to a specific question about a specific game and nothing more.

The audience is **friend groups making any in-person plan together**, in groups small enough that everyone roughly knows everyone. Work meetings and committee scheduling are out of scope (see [Scope](#scope-any-in-person-group-plan-sports-first)). Recreational adult pickup sports (basketball, soccer, volleyball, tennis, pickleball and similar) is the **launch wedge**: the first and best-supported use case, and the one the current UI, data model and demo data are built around. Age 18–45 was the stated target of the originating coursework brief.

## Scope: any in-person group plan, sports first

*Decided 2026-11-03.*

OptIn is a scheduling tool for **any in-person plan a friend group has to agree on**, not a sports app. Pickup sports, dinners, board-game nights, hikes, study sessions, a birthday drink: the shape of the problem is the same. Someone wants it to happen, a handful of people have to agree on when, and the group chat can't produce a decision. The mechanism (several candidate slots, per-slot `In` / `Maybe` / `Can't`, a deadline, a minimum headcount, automatic confirm or cancel) has nothing to do with sport.

- **In scope:** casual, in-person plans among people who already know each other, where turnout matters and someone would otherwise have to chase.
- **Out of scope:** work meetings, club or committee admin, and anything where a calendar-availability tool (Doodle, When2meet) is the honest fit. OptIn is about *will enough of us show up*, not *when is everyone's calendar free*.
- **Sports stays the wedge.** It is where the stakes are sharpest: a court costs money, a game needs a minimum headcount, and a no-show hurts everyone. Sports keeps priority in demo data, onboarding and the default UI. Other activities come in by generalizing, not by forking.
- The coursework brief does **not** bind the product to sports, so this is current product truth, not a post-coursework plan.

**Why, in market terms.** Sports-specific competitors such as OpenRun (Humble Rhino Inc., iOS/Android, reviewed 2026-11-03 from its public website and Terms of Service) are venue-first marketplaces: the host books a court for a fixed time, uploads the receipt, and strangers join and pay through Stripe. OpenRun's flow has no step for deciding *when*. That is the upstream decision OptIn owns, and it is not specific to sport. Competing on discovery, payments, leagues or venues would put OptIn against a funded, broader product. Widening the activity scope moves OptIn away from that fight and toward the general problem only it solves. This is market context, not evidence about OptIn's users (see [Evidence on Hand](#evidence-on-hand)).

**What the pivot implies, in order of cost:**

1. **Copy and vocabulary.** "Game", "sport", "players" and "roster" are wrong for a dinner. Agree on a neutral noun (plan, event or meetup are candidates, still **undecided**), and keep sport words only where a sport is chosen.
2. **Activity as data, not sport as schema.** `games.sport`, `sport_emoji`, `sport_color`, `game_type` (`Casual` / `Competitive`) and `groups.sport` (`not null`) are all sport-shaped, as are `SPORT_HERO_IMAGES` and the two `gameType` unions in [gameData.ts](src/app/components/gameData.ts) and [data/games.ts](src/app/data/games.ts). Generalizing to an activity type with sports as one category is a schema change in [neon/schema.sql](neon/schema.sql) and the `create_game_with_options` RPC, not just a UI change.
3. **Groups become central.** A friend group spans many activities, so `groups.sport` being required is the clearest place the current model contradicts the new scope. Groups should be the durable unit, with activities proposed inside them.
4. **Fields that only make sense for some activities** (max players, cost split, competitive or casual, location as a venue) become optional per activity type rather than always shown.

## Product Purpose

OptIn turns a group's scattered availability into one committed game time, without anyone having to nag.

A host proposes a game with **several candidate time slots** rather than one. Everyone votes `In` / `Maybe` / `Can't` on each slot independently. At a voting deadline the game resolves itself: the option with a clear win is confirmed, a tie is handed back to the host to break, and a game that nobody committed to or that failed to reach its minimum player count is cancelled outright.

Success is that a game reaches `confirmed` with enough real players, and that the host never had to send a follow-up message to make it happen. The failure the product exists to prevent is the group chat that generates forty messages and no game.

## Positioning

**The decision is enforced by the database, not by a person.**

Most group scheduling tools collect availability and then hand the result back to a human to interpret and announce. That human is the bottleneck, and they are the same person already tired of coordinating. OptIn removes them from the loop: the game lifecycle `proposal → confirmed | cancelled → completed` runs as `SECURITY DEFINER` Postgres functions (`auto_transition_game`, `auto_transition_all_games`), which close voting past the deadline, confirm a unique winner among approved options, cancel when nobody voted in or `min_players` is unmet, and mark past confirmed games completed.

Two consequences a neighbouring product could not copy without adopting the same mechanism:

- **Cancellation is a first-class, automatic outcome.** A game that failed to reach quorum dies on its own and tells everyone. Nobody has to be the person who calls it off.
- **A tie is a defined state, not an ambiguity.** It is recorded and routed to the host as an explicit decision, rather than leaving the group to argue.

The voting unit is also deliberately per-option rather than per-game. A player is not asked "are you coming?" — they are asked which of these specific slots they can make, which is the only question that actually resolves a schedule.

## Operating Context

- **Phone, in the gaps.** Standing courtside, on transit, half-watching something else. The viewport is constrained to a phone width by design (`max-w-[430px]`, widening to `sm:max-w-lg`); there is no desktop layout and no tablet layout.
- **Adjacent to a group chat, not replacing it.** OptIn carries the decision; the banter stays wherever it already lives. In-app chat exists per game and per conversation, but it is a support surface, not the reason anyone opens the app.
- **Deadline-shaped.** Every proposal carries a `voting_deadline`. The pressure that makes voting happen is time, so anything that communicates remaining time is functionally load-bearing.
- **Money is part of the ask.** Games can carry a total cost and a per-person split. Committing to a game can mean committing to pay, which raises the stakes of the `I'm In` tap.
- **Invites are not memberships.** A `game_players` row with `status = 'invited'` is deliberately excluded from the main games list and surfaces in the notifications panel instead. Being invited to a game is not the same as having a game.

## Capabilities and Constraints

**Confirmed functionality** (still sports-shaped; see [Scope](#scope-any-in-person-group-plan-sports-first))

- Create a game with multiple time/location options, a sport, a max player count, an optional cost with per-person split, and a visibility setting (`Public` / `Group Only` / `Private`).
- Vote `In` / `Maybe` / `Can't` per time option; the creator is auto-voted in on their earliest option.
- Automatic lifecycle resolution at the deadline, including auto-cancel and host-resolved ties.
- Rosters, invites with accept/decline, friends and friend requests, per-game and direct chat, profiles with avatar and identity colour.
- A week-strip schedule view, a calendar view, and a notifications panel for pending invites.

**Technical constraints that bind design**

- React 18 + Vite + Tailwind v4 (CSS-first, no `tailwind.config.js`) + Neon (Neon Auth + Data API). Deployed on Vercel.
- **Demo mode is cross-cutting.** With `VITE_APP_ENV=demo` or an absent `VITE_NEON_URL` the client is `null`, auth is skipped, and every data function returns hardcoded mock data. Any new data path must handle this or demo mode silently breaks. This is also how the app is presented and evaluated, so demo mode must always look like the real product.
- **`pg_cron` is not installed.** Nothing sweeps game state on a schedule; transitions only run when a user opens the app and the client fires `auto_transition_all_games` fire-and-forget. A game can therefore be visibly stale for as long as nobody looks at it. Any UI that implies real-time authority over deadlines is overpromising.
- Status logic lives in migrations, not in TypeScript. Visibility is enforced by RLS.
- Realtime subscriptions back invites, votes, roster changes, and chat, so multi-user state can change under the user mid-screen.
- `npm run typecheck` is the only automated gate. There is no test suite and no linter.

**Explicitly undecided**

- **Bottom navigation item count.** [guidelines/Guidelines.md](guidelines/Guidelines.md) and [CLAUDE.md](CLAUDE.md) both specify exactly 4 items; [BottomNav.tsx](src/app/components/BottomNav.tsx) ships 5 (Home, Calendar, Create, Chats, Profile). The implementation and the written constraint disagree and neither has been retired.
- Whether OptIn ever serves groups large enough that "everyone knows everyone" stops holding. Nothing in the product currently assumes strangers.
- **The neutral noun for a plan.** "Game" is sports vocabulary. The replacement (plan / event / meetup / something else) is not chosen. Until it is, keep "game" in the UI rather than mixing terms.
- **The activity taxonomy.** Which activity types exist, whether they are a fixed list or free text, and which fields each one shows.
- **Sports-specific brand commitments** (Turf Green as a "playing-surface" primary, per-sport hero photography). Both are **under review** after the 2026-11-03 scope decision. Nothing has been changed or retired.
- Notification delivery outside the app (push, email, SMS) does not exist and has not been decided against.

## Brand Commitments

- **Name:** OptIn. Held as a constant in [src/app/constants/app.ts](src/app/constants/app.ts) (`APP_NAME`); use it rather than a literal string. The name is the product thesis in one word — the ask is always opt-*in*, never opt-out.
- **Turf Green `#2D7A3A`** is the committed brand primary, named as such in the originating brief. It is a playing-surface green, not a generic success green. *Under review (2026-11-03):* its sports framing predates the wider activity scope. It stays in force until a decision is recorded here.
- **Roboto** is the committed typeface, following the Material Design 3 requirement.
- **Material Design 3 is a binding design language**, not a starting point. This originated as a CFPN542 coursework brief that mandated strict M3 adherence, and the codebase has since committed to it thoroughly enough that it is now genuine product truth: M3 tokens, type scale, state layers, and shape scale are the implemented system.
- Originated as a Figma Make export from [the OptIn Sports Scheduling App file](https://www.figma.com/design/57X7yG2Cw5m7OFi8GXyRw4/OptIn-Sports-Scheduling-App).
- Voice, as implemented: direct, second person, no exclamation-mark enthusiasm. `I'm In` / `Maybe` / `Can't` — the vote labels are how a player would actually answer, not `Accept` / `Tentative` / `Decline`.

## Evidence on Hand

**Real:**

- A working, deployed application backed by a Neon project (Neon Auth + Data API) with a complete schema in [neon/schema.sql](neon/schema.sql). Moved from Supabase on 2026-11-03; existing Supabase accounts and data were not carried over.
- A substantial demo dataset in [gameData.ts](src/app/components/gameData.ts) (`DEMO_GAMES`) and [data/games.ts](src/app/data/games.ts) covering every lifecycle state — proposals, confirmed, completed, cancelled — across basketball, soccer, volleyball, tennis and pickleball. This is the honest thing to demonstrate with.
- Sport hero photography sourced from Unsplash, keyed by sport in `SPORT_HERO_IMAGES`. *Under review (2026-11-03):* there is no imagery for non-sport activities, and whether per-activity photography stays part of the identity is undecided.
- App icons at [public/icon-192.svg](public/icon-192.svg) and [public/icon-512.svg](public/icon-512.svg), plus a PWA manifest.
- Attribution records in [ATTRIBUTIONS.md](ATTRIBUTIONS.md).

**Absent — do not fabricate:**

- No real users, no usage metrics, no retention or engagement data.
- No testimonials, reviews, case studies, or press.
- No pricing, no paying customers, no revenue model. Cost-splitting inside a game is not monetisation.
- No partnerships, facility integrations, or league affiliations.
- No security audit, uptime record, or availability commitment.

Player names, avatars, and groups in the demo data are invented and must never be presented as real people.

## Product Principles

1. **The organizer's job is to stop asking.** Any feature that requires the host to follow up, remind, or chase has failed the core promise, regardless of how well it works.
2. **A voter's whole interaction is a few seconds.** The invited player is the majority of all sessions. If casting a vote is not immediate and immediately legible, nothing else in the product matters.
3. **State resolves itself, visibly.** Confirmed, cancelled, tied — the app is responsible for reaching an outcome and for making that outcome unmissable. Ambiguity is the failure mode being designed against.
4. **Count things.** Votes, players, spots left, time remaining, cost each. This product's substance is quantities a group can act on; showing them plainly is the design work, not decoration around it.
5. **Committing must feel like commitment.** `I'm In` may cost money and may be what tips a game past quorum. It should never feel as casual as a like.

## Accessibility & Inclusion

Established requirements, carried from the originating brief and honoured in the implementation:

- **Minimum 4.5:1 text contrast** throughout.
- **Minimum 48×48dp touch targets** on every interactive element. This is stricter than the WCAG 2.5.5 44×44 baseline and is treated as binding.
- **`prefers-reduced-motion: reduce` is honoured globally**, collapsing transitions and animations to `0.01ms` ([tailwind.css](src/styles/tailwind.css)).
- Icon-only controls carry `aria-label`; the active navigation item carries `aria-current="page"`; toggles carry `aria-pressed` / `aria-checked`; dialogs carry `role="dialog"` with `aria-modal`.
- One-handed phone use on a narrow viewport is the assumed physical context, which makes reach and target size an accessibility concern rather than a nicety.

Not yet established: screen-reader testing on the voting flow, and whether colour alone ever distinguishes a vote state (a real risk given `In` / `Maybe` / `Can't` map to green / neutral / red).
