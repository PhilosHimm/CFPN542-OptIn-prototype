# OptIn — Product Strategy Session

**Date:** 2026-08-17
**Facilitator:** `product-strategy-session` workflow (Product-Manager-Skills), guided mode
**Knowledge base:** `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`, `docs/BACKLOG.md`, `guidelines/Guidelines.md`
**Strategic question:** *Does OptIn stay pickup-sports, or widen to all group events?*

---

## Strategy Context

| Input | Answer |
|---|---|
| Ambition | A real product. Post-course, OptIn goes after real users and is meant to keep existing. |
| Capacity | Solo, with heavy AI leverage as the implementation team. |
| Evidence on hand | Own group (n=1) + informal conversations. **No usage data, no metrics, no revenue.** |
| Reported pain shape | The coordination failure showed up identically for non-sports plans — dinners, study sessions, trips. |
| Success in 6 months | **One real group (not yours) runs proposal → confirmed → played with zero follow-up messages from the host.** |
| Prioritization framework | ICE, learning-weighted. RICE is ruled out — Reach and Confidence would be invented numbers. |
| Validation stance | Cheap discovery first: 5–8 conversations before committing to the widening. |

**What already exists (real, per `PRODUCT.md`):** a deployed app on a live Supabase project, 17 tracked migrations plus a verified baseline, a complete demo dataset covering every lifecycle state, PWA manifest and icons. **What does not exist and must never be claimed:** users, metrics, retention, testimonials, press, pricing, revenue, partnerships, security audit, uptime record.

---

## Target Customer

### Persona 1 — Maya, the reluctant organizer *(primary, carried from `PRODUCT.md`)*

A player, not an admin. Got stuck coordinating because nobody else would. Coordinates from a phone, one-handed, while doing something else. Her job is not "schedule a game" — it is **stop asking**.

### Persona 2 — Dev, the invited player *(secondary, carried from `PRODUCT.md`)*

Interaction budget: a few seconds. Will answer a specific question about a specific plan. Will never open a scheduling app to "manage his availability." **This persona is the majority of all sessions**, which is why the vote control is the product.

### Persona 3 — Sam, the recurring-group steward *(new hypothesis, unvalidated)*

Runs the same thing on roughly the same cadence — Thursday ball, Sunday dinner, the monthly board-game night. Has effectively the same job as Maya but repeated, so the cost of nagging compounds. **If this persona is real, it is the retention story**; a one-off organizer has no reason to come back. Flagged for the discovery round.

### Jobs to be Done

1. *When my group wants to do something this week, help me get to one committed time, so I can stop chasing people.*
2. *When someone asks me to commit, help me answer in seconds without opening a scheduling app.* (Dev)
3. *When the plan isn't going to work, help me find that out early without being the one who kills it.* (The auto-cancel job — the least obvious and most differentiated.)
4. *When we do this every week, help me not restart the whole conversation each time.* (Sam — hypothesis.)

---

## Problem Framing

**Problem statement.** Recreational groups routinely fail to convert real, existing willingness into a committed plan, because the only coordination surface they have — a group chat — collects answers but cannot resolve them. Somebody has to read forty messages, decide what won, announce it, and chase the non-responders. That somebody is a participant, not an administrator, and the cost falls entirely on them. The result is a thread with forty messages and no game.

**How Might We** resolve a group's plan without any participant having to interpret, announce, or chase?

**Why now.** The mechanism that answers this already exists and is deployed. `auto_transition_game` / `auto_transition_all_games` run the lifecycle `proposal → confirmed | cancelled → completed` as `SECURITY DEFINER` Postgres functions. The strategy problem is no longer *can we build the differentiator* — it is *does anyone ever experience it*.

### The uncomfortable finding

`docs/BACKLOG.md` and `CLAUDE.md` both record that **`pg_cron` is not installed**. Nothing sweeps game state on a schedule; transitions run only when a user opens the app and the client fires `auto_transition_all_games` fire-and-forget.

This is not a bug in the backlog. It is a **hole in the positioning**. The entire claim — "the decision is enforced by the database, not by a person" — is currently true in the schema and false in the experience. An invited player who does not open the app never learns the game was confirmed. A host who does not open the app is still, functionally, the thing that makes the decision happen. The product's one defensible idea does not currently reach anyone.

Everything below is sequenced around that.

---

## Positioning

**Current (implicit, `PRODUCT.md`):** consensus-based scheduling for recreational pickup sports.

**Proposed:**

> For the person in a group who ended up responsible for making a plan happen, OptIn turns scattered availability into one committed time without anyone having to nag. Unlike group chats and poll tools — which collect answers and hand the result back to a human to interpret and announce — OptIn resolves the decision itself at a deadline: it confirms a clear winner, cancels what didn't reach quorum, and routes a tie back to the host as an explicit call.

**The strategic insight this exposes:** the differentiator is the **resolution mechanism**, not the sport. Nothing in "a deadline that closes voting and commits the group" is basketball-shaped. That is why the widening question is coherent at all, and it is the strongest argument in its favour.

**The counter-argument, which is real and must be answered by discovery, not by reasoning:** the sports-shaped parts of the product are also the parts that make the mechanism *matter*. Quorum (`min_players`), auto-cancel, and cost-splitting have stakes precisely because a basketball game with four people is not a basketball game. A dinner for four is still a dinner. Widen carelessly and you keep the mechanism while deleting the reason anyone needed it — you become a nicer Doodle, and Doodle's problem was never the UI.

**Therefore the positioning bet is:** OptIn is for **plans that fail below a threshold**, whatever they are. Not "all group events." That framing keeps quorum, auto-cancel, and cost-splitting load-bearing while opening well past sports — a carpool, a study group that needs four, a rented cottage that needs six to be affordable, a board-game night that needs five.

---

## Opportunity Solution Tree

**Desired outcome:** one real group, not yours, completes proposal → confirmed → played with zero host follow-up messages.

### Opportunity 1 — The decision the database makes never reaches anyone

Nothing runs unless someone opens the app, and nothing tells anyone when it does. *(This is the positioning hole above.)*

- **S1.1** — Scheduled resolution: enable `pg_cron`, or a Vercel cron route calling `auto_transition_all_games` on a schedule.
- **S1.2** — Web Push on the three moments that matter: confirmed, cancelled, tie-needs-you.
- **S1.3** — A pre-deadline nudge to anyone who hasn't voted. *(Careful: this is the host's nag, automated. It is on-thesis only because the app sends it, not the host.)*

### Opportunity 2 — The host can't get OptIn in front of their group without asking everyone to install something

The cold-start problem. Every invitee is a signup before they are a vote.

- **S2.1** — Accountless vote link: an invitee opens a link, picks a name, votes. No account until they want one.
- **S2.2** — A share card built for the group chat: rich preview showing the options, the tally, and the deadline, so the chat carries the state and the link carries the decision.
- **S2.3** — Roster import from a pasted list.

### Opportunity 3 — A group that uses OptIn for a game won't use it for the other 80% of their plans

The widening opportunity. Without it, OptIn is a tool you open eight times a year.

- **S3.1** — `event_type` as a hybrid: curated list plus the "Other / Custom…" escape hatch `CreateGameScreen` already has. Quorum becomes optional per event type rather than deleted.
- **S3.2** — The string pass: `player` → attendee/going (~120 live occurrences), ~290 sport strings, ~45 UI labels.
- **S3.3** — Recurring events: "same group, same time next week," which is the retention mechanic if Persona 3 is real.

### POC recommendation

**Opportunity 1, solutions S1.1 + S1.2.**

Rationale: it is the smallest change that makes the positioning *true*; it is required for the success metric regardless of which way the pivot goes; and without it a "clean end-to-end run with zero host follow-up" is not merely unlikely, it is **impossible by construction** — the host would have to open the app to make the confirm fire, and then message the group to tell them, which is precisely the behaviour the product exists to eliminate.

---

## Epic Hypotheses

| ID | Epic | Hypothesis |
|---|---|---|
| **E1** | Scheduled resolution | *If* game transitions run on a schedule rather than on app-open, *then* a game will resolve at its deadline without any participant acting, *measured by* a confirm/cancel timestamp within minutes of `voting_deadline` on a game nobody opened. |
| **E2** | Out-of-app notification | *If* invitees receive a push on confirm / cancel / tie, *then* the host will stop needing to announce the outcome, *measured by* zero host messages in the group chat after the deadline. |
| **E3** | Accountless voting | *If* an invitee can vote from a link without creating an account, *then* per-game vote coverage will rise, *measured by* % of invitees who vote before the deadline. |
| **E4** | Chat-native share card | *If* the shared link renders the options and deadline inline in the group chat, *then* more invitees will open it, *measured by* link-open rate per invite. |
| **E5** | Generalize to threshold events | *If* OptIn covers any plan that fails below a threshold, *then* the same group will run more than one plan through it, *measured by* events per group per month. |
| **E6** | Recurring events | *If* a group can repeat a plan without rebuilding it, *then* stewards will return, *measured by* repeat rate at week 4. |

---

## Prioritization — ICE (learning-weighted)

*Impact scored as movement toward the single success metric. Confidence scored honestly against zero usage data. Ease scored for solo-with-AI-leverage. Score = (I + C + E) / 3.*

| Epic | Impact | Confidence | Ease | **ICE** | Note |
|---|---|---|---|---|---|
| **E1** Scheduled resolution | 8 | 9 | 8 | **8.3** | Highest confidence in the set — the function already exists and is tested. This is wiring, not invention. |
| **E2** Out-of-app notification | 9 | 7 | 5 | **7.0** | Highest impact. Permission prompts and iOS PWA push are the real risk, not the code. |
| **E4** Chat-native share card | 6 | 7 | 8 | **7.0** | Cheap. Meets the group where `PRODUCT.md` already says the group lives. |
| **E3** Accountless voting | 9 | 6 | 4 | **6.3** | Impact is high but it cuts across RLS (`020` made every policy `TO authenticated`) — a real architectural decision, not a feature. |
| **E6** Recurring events | 4 | 5 | 6 | **5.0** | Gated on Persona 3 being real. |
| **E5** Generalize to threshold events | 5 | 3 | 4 | **4.0** | **Confidence is the problem, not effort.** Scored at 3 deliberately: the entire case rests on one group's experience. Discovery moves this number or kills the epic. |

**Read this table as an argument, not a ranking.** E5 scores last not because widening is wrong but because it is the only epic whose *premise* is unverified. The other five are true whichever way the pivot goes — which is exactly why they should be built first.

---

## Roadmap — Now / Next / Later

### Now (weeks 1–3) — make the positioning true, and go find out if it generalizes

**Track A — build (true regardless of the pivot)**
- **E1** Scheduled resolution. Per `CLAUDE.md`, verify any migration **both** ways: `npx supabase start` against empty, and `begin; … rollback;` against the real project. If `pg_cron` can't be enabled on the plan, a Vercel cron route calling the RPC is an equivalent outcome.
- **E4** Chat-native share card. Cheap, and it makes every subsequent test easier to run.

**Track B — discovery (gates E5)**
- 5–8 conversations with people who organize things for a group. **Deliberately mixed: sports and non-sports.** See the guide below.

**Do not touch the ~290 sport strings during this phase.** That work is irreversible-ish and gated on Track B.

### Next (weeks 4–8) — attempt the one clean run

- **E2** Out-of-app notification.
- **E3** Accountless voting — *if* discovery confirms that installation is the drop-off point rather than a guess.
- **The actual test:** one real group, one real plan, host instructed explicitly not to follow up. Instrument it. Whatever happens is the first real evidence this product has ever had.

### Later (gated on discovery)

- **E5** Generalize to threshold events — only if discovery supports it, and only via the three decisions `docs/BACKLOG.md` already names as blocking. **Answer all three before writing any code**, because the compiler will not help: `gameData.ts` writes `game_type` through a binary ternary, so any third value silently collapses to `"Competitive"` and `npm run typecheck` will not catch it.
  1. What replaces `game_type` Casual/Competitive?
  2. Is `event_type` curated or free text? *(Recommendation: hybrid — the `CreateGameScreen` escape hatch already implies it.)*
  3. What replaces the word "player"? ~120 occurrences. Pick once.
- **E6** Recurring events — only if Persona 3 shows up in discovery.

**Standing constraint on every item:** per `CLAUDE.md`, demo mode is cross-cutting and is **how the app is presented and evaluated**. Every new data path needs its `isDemoMode()` branch, or the thing you demo breaks silently.

---

## Discovery Guide (Track B)

**Recruit:** 5–8 people who are the one who organizes something for a group. Mix sports and non-sports on purpose — the whole point is to test whether the pain generalizes, and recruiting only athletes guarantees the answer you already believe.

**Ask about the last real instance, never about the concept.** The failure mode here is asking "would you use an app that…" and getting a polite yes from everyone.

1. Tell me about the last time you got a group together for something. Walk me through it from the first message.
2. How many messages did it take? Who didn't answer? What did you do about them?
3. Has a plan ever just died in the thread? What happened — did someone call it off, or did it fade?
4. Has something ever gone ahead with too few people? What did that feel like?
5. Do you do this same thing repeatedly, or was it one-off? *(Persona 3 probe.)*
6. Has money ever been part of it — court fee, tickets, splitting a rental? Did that change how people answered?
7. What do you use now, and what happened the last time you tried something else?

**What would confirm the widening:** unprompted non-sports examples with the same nagging pattern, *and* a real threshold — a number below which the plan wasn't worth doing.

**What would kill it:** non-sports plans that fail differently (nobody cares if only three show up), or organizers who say the group chat is fine for dinner and only breaks for games. That result is good news — it means sharpen, not widen, and you saved yourself a 290-string refactor.

---

## Success Metrics

**Primary (6 months):** one real group, not yours, completes proposal → confirmed → played with **zero host follow-up messages**.

**Leading indicators**
- % of invitees who vote before the deadline *(the E3/E4 metric)*
- Time from invite sent → vote cast *(Principle 2: a voter's whole interaction is a few seconds)*
- Games resolving at their deadline without anyone opening the app *(the E1 metric — currently 0% by construction)*
- Host messages sent outside the app after the deadline *(target: 0 — this is the promise, stated as a number)*

**Counter-metrics — things that would mean you won wrong**
- Auto-cancel rate climbing: if games routinely die at the deadline, the deadline is set wrong, not the group.
- Host manually overriding the resolution: means the group doesn't trust the mechanism, which is the whole product.
- Notification opt-out rate: E2 is load-bearing; if people mute it, the positioning hole reopens.

---

## Risks

1. **Widening dilutes the wedge.** Quorum, auto-cancel and cost-splitting are the sports-shaped parts *and* the parts that give the mechanism stakes. The "threshold events" framing is designed to keep them load-bearing; discovery has to confirm the threshold is real outside sports.
2. **The positioning hole persists.** If E1/E2 slip, every claim about database-enforced decisions stays aspirational — and it is the only claim OptIn has that a competitor can't copy.
3. **`docs/BACKLOG.md` warns its own snapshots have been wrong twice.** Query the live database before reasoning about production behaviour. Do not plan against a file's claim about the schema.
4. **Accountless voting (E3) cuts across RLS.** Migration `020` moved all 31 policies to `TO authenticated` precisely so logged-out callers can read nothing. E3 needs a deliberate, scoped exception — a signed per-option token, not a policy rollback.
5. **The 4-vs-5 bottom-nav conflict is still open.** `Guidelines.md` and `CLAUDE.md` say 4; `BottomNav.tsx` ships 5. It has been correctly recorded as unresolved rather than silently decided, but the widening (which adds surfaces) will force it. Decide it deliberately.
6. **Solo-with-AI-leverage compresses build time, not discovery time.** Track B takes a week of calendar regardless of how fast you can ship. Start it first; it is the long pole.

---

## Assumptions to Validate

| # | Assumption | Currently rests on | Killed by |
|---|---|---|---|
| A1 | The nagging pain generalizes beyond sports | One group + informal conversations | Discovery Q1–Q4 producing only sports examples |
| A2 | A meaningful threshold exists for non-sports plans | Inference from the sports case | Organizers saying a smaller turnout is simply fine |
| A3 | Installation is the drop-off, not disinterest | Reasoning, not observation | Invitees who install and still don't vote |
| A4 | Push notification is acceptable to this audience | Untested | Opt-out rate in the first real run |
| A5 | Persona 3 (recurring steward) exists | Hypothesis introduced in this session | Discovery Q5 finding only one-off organizers |
| A6 | A host will actually refrain from following up | Untested — it is the behaviour change the whole product asks for | The first real run, where they message the group anyway |

**A6 is the one to watch.** Every other assumption is about the market. A6 is about whether the product's core promise is something a human will actually let happen — and it is testable in exactly one clean run, which is precisely the success metric chosen.

---

## Next Steps

1. **This week:** recruit 5–8 discovery conversations, mixed sports and non-sports. This is the long pole — start it before any build work.
2. **In parallel:** ship **E1** (scheduled resolution), verified both ways per `CLAUDE.md`'s migration protocol.
3. **Then:** ship **E4** (share card) while discovery runs.
4. **At the discovery readout:** answer the three `event_type` decisions or explicitly defer them — do not let them stay ambient.
5. **Weeks 4–8:** ship **E2**, and run the one clean end-to-end test with a real group.
6. **Do not update `PRODUCT.md`'s "Evidence on Hand" section until the run happens.** That section's discipline about what does not exist is the most valuable thing in the repo; the first real evidence should be earned, then written down.
