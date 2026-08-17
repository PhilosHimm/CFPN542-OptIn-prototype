import { Link } from "react-router";
import {
  CalendarDays,
  CheckCircle2,
  CircleSlash,
  Lock,
  MessagesSquare,
  Scale,
  Users,
  Vote,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { APP_NAME } from "../constants/app";

/**
 * Public marketing page at /landing.
 *
 * Deliberately outside `Layout`: no bottom nav, no auth gate, and no
 * `max-w-[430px]` phone frame — this is the one surface in the app meant to be
 * read in a desktop browser. Its palette is scoped to `.ln` in
 * [landing.css](src/styles/landing.css) rather than the MD3 tokens; see the
 * comment at the top of that file for why, and for the two-green contrast rule.
 *
 * Every claim below is drawn from PRODUCT.md's confirmed functionality. There
 * are no users, metrics, testimonials, pricing, or partnerships to cite, so the
 * page cites none.
 */

/**
 * Vote counts mirroring `DEMO_GAMES[0]` ("Tuesday Night Basketball") in
 * [gameData.ts](src/app/components/gameData.ts). Inlined rather than imported
 * so this public route doesn't pull the supabase + sonner chain into its chunk.
 * Counts only, never the demo players' invented names.
 */
const SAMPLE_OPTIONS = [
  {
    day: "Tue, Mar 25",
    time: "7:00 – 9:00 PM",
    place: "Riverside Community Courts",
    in: 5,
    maybe: 2,
    out: 1,
    leading: true,
  },
  {
    day: "Tue, Mar 25",
    time: "6:30 – 8:30 PM",
    place: "City Gym — Court B",
    in: 3,
    maybe: 3,
    out: 2,
    leading: false,
  },
  {
    day: "Wed, Mar 26",
    time: "8:00 – 10:00 PM",
    place: "Riverside Community Courts",
    in: 4,
    maybe: 1,
    out: 0,
    leading: false,
  },
];

const STEPS = [
  {
    n: "01",
    title: "Propose a few times",
    body: "Pick the sport, add two or three time-and-place options instead of one, then set a voting deadline and the minimum number of players it takes to make the game real.",
  },
  {
    n: "02",
    title: "Everyone votes per slot",
    body: "Each player taps I’m In, Maybe, or Can’t on each option independently. One specific question, a few seconds, done — no availability to manage, no calendar to sync.",
  },
  {
    n: "03",
    title: "The game resolves itself",
    body: "A clear winner is confirmed. A tie comes back to the host as an explicit choice. If nobody committed, or the minimum was never met, the game cancels itself and tells everyone.",
  },
];

const FEATURES = [
  {
    Icon: Vote,
    title: "Voting per time slot",
    body: "Players aren't asked whether they're coming — they're asked which of these slots they can make, which is the only question that resolves a schedule.",
  },
  {
    Icon: CircleSlash,
    title: "Cancellation that happens on its own",
    body: "A game that never reached quorum dies at the deadline and announces itself. Nobody has to be the person who calls it off.",
  },
  {
    Icon: Users,
    title: "Rosters and invites",
    body: "See who's in, who's still deciding, and how many spots are left. Invites are accepted or declined, and being invited isn't the same as being on the roster.",
  },
  {
    Icon: Scale,
    title: "Cost, split",
    body: "Give a game a total cost and it shows the per-person share, so committing to play and committing to pay are the same tap.",
  },
  {
    Icon: Lock,
    title: "Public, group, or private",
    body: "Every game carries a visibility setting, enforced by row-level security in the database rather than by hiding a button in the interface.",
  },
  {
    Icon: CalendarDays,
    title: "Your week, at a glance",
    body: "A week strip and a full calendar view of what's proposed, what's confirmed, and what's already been played.",
  },
];

const FAQ = [
  {
    q: "Which sports does it handle?",
    a: "Recreational pickup sports — basketball, soccer, volleyball, tennis, pickleball and similar. You name the sport when you create the game, and each one carries its own sensible minimum player count.",
  },
  {
    q: "What happens if nobody votes?",
    a: "The game cancels itself at the deadline and everyone is told. That outcome is built into the lifecycle, not left to whoever feels responsible.",
  },
  {
    q: "What if two times tie?",
    a: "A tie is recorded as its own state and handed back to the host as an explicit decision, rather than leaving the group to argue about it in a chat thread.",
  },
  {
    q: "Does it text or email people?",
    a: "No. Invites and results live in the app's own notifications panel. OptIn is meant to sit next to your group chat and carry the decision, not to replace the chat.",
  },
  {
    q: "When exactly does a game resolve?",
    a: "Resolution runs when someone opens the app, not on a background timer. A game can therefore sit briefly past its deadline until the next person looks at it.",
  },
];

function VoteBar({ inCount, maybe, out }: { inCount: number; maybe: number; out: number }) {
  const total = Math.max(inCount + maybe + out, 1);
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--ln-surface-3)]">
      <div style={{ width: pct(inCount) }} className="bg-[var(--ln-accent-text)]" />
      <div style={{ width: pct(maybe) }} className="bg-[var(--ln-border-outline)]" />
      <div style={{ width: pct(out) }} className="bg-[var(--ln-border-strong)]" />
    </div>
  );
}

export function Landing() {
  const { isDemo } = useAuth();

  return (
    <div className="ln min-h-screen">
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--ln-border)] bg-[var(--ln-bg)]/95 backdrop-blur">
        <nav
          aria-label="Primary"
          className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8"
        >
          <Link
            to="/landing"
            className="flex items-center gap-2.5 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ln-accent-text)]"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ln-accent)] text-[15px] font-bold text-white"
            >
              O
            </span>
            <span className="text-[18px] font-bold tracking-tight">{APP_NAME}</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#how" className="ln-link">
              How it works
            </a>
            <a href="#features" className="ln-link">
              Features
            </a>
            <a href="#faq" className="ln-link">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Link to={isDemo ? "/signup" : "/login"} className="ln-btn ln-btn-sm ln-btn-dark hidden sm:inline-flex">
              {isDemo ? "Sign up" : "Sign in"}
            </Link>
            <Link to="/" className="ln-btn ln-btn-sm ln-btn-primary">
              {isDemo ? "Try the demo" : "Open the app"}
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <p className="ln-eyebrow">Pickup sports, decided</p>
              <h1 className="mt-5 text-[clamp(40px,7vw,68px)] font-bold leading-[1.04] tracking-[-0.02em]">
                Your group chat can’t pick a time.
                <br className="hidden sm:block" />{" "}
                <span className="text-[var(--ln-accent-text)]">OptIn can.</span>
              </h1>
              <p className="mt-6 max-w-xl text-[17px] leading-[1.55] text-[var(--ln-text-muted)]">
                Propose a few candidate slots instead of one. Everyone votes{" "}
                <span className="font-bold text-white">I’m In</span>,{" "}
                <span className="font-bold text-white">Maybe</span>, or{" "}
                <span className="font-bold text-white">Can’t</span> on each of them. At the deadline
                the winning time confirms itself — and a game nobody committed to cancels itself.
                You never send the follow-up message.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link to="/" className="ln-btn ln-btn-primary">
                  {isDemo ? "Try the demo" : "Open the app"}
                </Link>
                <Link to="/signup" className="ln-btn ln-btn-outline">
                  Create an account
                </Link>
              </div>

              <p className="mt-5 text-[13px] leading-relaxed text-[var(--ln-text-dim)]">
                Built mobile-first. Installable as a web app — no store download.
              </p>
            </div>

            {/* Sample proposal — real demo-data counts, no invented people */}
            <div className="ln-card p-5 shadow-[var(--ln-shadow-heavy)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[2px] text-[var(--ln-text-dim)]">
                    Sample proposal
                  </p>
                  <h2 className="mt-1.5 text-[20px] font-bold leading-tight">
                    <span aria-hidden="true">🏀</span> Tuesday Night Basketball
                  </h2>
                  <p className="mt-1 text-[13px] text-[var(--ln-text-muted)]">
                    7 on the roster · 10 max · $40 split
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--ln-surface-3)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.4px] text-[var(--ln-text-muted)]">
                  Voting
                </span>
              </div>

              <ul className="mt-5 space-y-2.5">
                {SAMPLE_OPTIONS.map((o) => (
                  <li
                    key={`${o.day}-${o.time}`}
                    className={`rounded-md p-3.5 ${
                      o.leading
                        ? "bg-[var(--ln-surface-2)] ring-1 ring-[var(--ln-accent)]"
                        : "bg-[var(--ln-surface-2)]"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[15px] font-bold">
                        {o.day} · {o.time}
                      </p>
                      {o.leading && (
                        <span className="shrink-0 text-[11px] font-bold uppercase tracking-[1.4px] text-[var(--ln-accent-text)]">
                          Leading
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-[var(--ln-text-muted)]">{o.place}</p>
                    <VoteBar inCount={o.in} maybe={o.maybe} out={o.out} />
                    <p className="mt-2 text-[12px] text-[var(--ln-text-muted)]">
                      <span className="font-bold text-[var(--ln-accent-text)]">{o.in} in</span> ·{" "}
                      {o.maybe} maybe · {o.out} can’t
                    </p>
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-[12px] leading-relaxed text-[var(--ln-text-dim)]">
                Sample data from the app’s demo mode. Voting closes at the deadline and the leading
                option is confirmed automatically.
              </p>
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────────────────── */}
        <section
          id="how"
          aria-labelledby="how-heading"
          className="border-y border-[var(--ln-border)] bg-[var(--ln-surface)]"
        >
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <p className="ln-eyebrow">How it works</p>
            <h2 id="how-heading" className="mt-4 max-w-2xl text-[clamp(28px,4vw,40px)] font-bold leading-[1.12] tracking-[-0.01em]">
              Three steps, and the last one isn’t yours.
            </h2>

            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="ln-card ln-card-hover bg-[var(--ln-surface-2)] p-6">
                  <span className="ln-chip text-[15px] font-bold tracking-[1px]">{s.n}</span>
                  <h3 className="mt-5 text-[18px] font-semibold leading-[1.3]">{s.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.55] text-[var(--ln-text-muted)]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── The differentiator ─────────────────────────────────────────── */}
        <section aria-labelledby="why-heading" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <p className="ln-eyebrow">Why it actually ends the thread</p>
              <h2
                id="why-heading"
                className="mt-4 text-[clamp(28px,4vw,40px)] font-bold leading-[1.12] tracking-[-0.01em]"
              >
                The decision is enforced by the database, not by a person.
              </h2>
            </div>

            <div className="space-y-5">
              <p className="text-[16px] leading-[1.6] text-[var(--ln-text-muted)]">
                Most group scheduling tools collect availability and then hand the result back to a
                human to interpret and announce. That human is the bottleneck — and they’re the same
                person who was already tired of coordinating. OptIn takes them out of the loop: the
                lifecycle runs in Postgres, closing voting past the deadline, confirming a unique
                winner, and cancelling games that never reached their minimum.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="ln-card bg-[var(--ln-surface)] p-5">
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-6 w-6 text-[var(--ln-accent-text)]"
                    strokeWidth={2}
                  />
                  <h3 className="mt-4 text-[16px] font-bold">Cancelling is automatic</h3>
                  <p className="mt-2 text-[14px] leading-[1.5] text-[var(--ln-text-muted)]">
                    A game that missed quorum ends itself and says so. It’s a first-class outcome,
                    not an awkward message someone has to write.
                  </p>
                </div>
                <div className="ln-card bg-[var(--ln-surface)] p-5">
                  <MessagesSquare
                    aria-hidden="true"
                    className="h-6 w-6 text-[var(--ln-accent-text)]"
                    strokeWidth={2}
                  />
                  <h3 className="mt-4 text-[16px] font-bold">A tie is a defined state</h3>
                  <p className="mt-2 text-[14px] leading-[1.5] text-[var(--ln-text-muted)]">
                    When two slots draw level it’s recorded and routed to the host as a single
                    decision, instead of reopening the whole conversation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────────── */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="border-y border-[var(--ln-border)] bg-[var(--ln-surface)]"
        >
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <p className="ln-eyebrow">What’s in it</p>
            <h2
              id="features-heading"
              className="mt-4 max-w-2xl text-[clamp(28px,4vw,40px)] font-bold leading-[1.12] tracking-[-0.01em]"
            >
              Everything a pickup game needs counted.
            </h2>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ Icon, title, body }) => (
                <div key={title} className="ln-card ln-card-hover bg-[var(--ln-surface-2)] p-6">
                  <span className="ln-chip">
                    <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <h3 className="mt-5 text-[17px] font-semibold leading-[1.3]">{title}</h3>
                  <p className="mt-3 text-[14px] leading-[1.55] text-[var(--ln-text-muted)]">{body}</p>
                </div>
              ))}
            </div>

            <p className="mt-8 max-w-3xl text-[14px] leading-[1.6] text-[var(--ln-text-dim)]">
              Also in the app: friends and friend requests, per-game and direct chat, profiles with
              an avatar and identity colour, and a notifications panel where pending invites wait
              for you.
            </p>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────────── */}
        <section id="faq" aria-labelledby="faq-heading" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <p className="ln-eyebrow">Straight answers</p>
          <h2
            id="faq-heading"
            className="mt-4 text-[clamp(28px,4vw,40px)] font-bold leading-[1.12] tracking-[-0.01em]"
          >
            Questions worth asking first.
          </h2>

          <dl className="mt-12 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <dt className="text-[17px] font-bold leading-[1.3]">{q}</dt>
                <dd className="mt-2.5 text-[15px] leading-[1.6] text-[var(--ln-text-muted)]">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Closing CTA ────────────────────────────────────────────────── */}
        <section aria-labelledby="cta-heading" className="px-5 pb-20 sm:px-8">
          <div className="mx-auto max-w-6xl rounded-2xl bg-[var(--ln-surface-2)] px-6 py-14 text-center shadow-[var(--ln-shadow-heavy)] sm:px-12 sm:py-16">
            <h2
              id="cta-heading"
              className="mx-auto max-w-2xl text-[clamp(26px,4vw,38px)] font-bold leading-[1.12] tracking-[-0.01em]"
            >
              Propose a game. Then stop asking about it.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[16px] leading-[1.55] text-[var(--ln-text-muted)]">
              Open the demo to see a full week of proposals, confirmed games and cancellations, or
              create an account and put a real one in front of your group.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to="/" className="ln-btn ln-btn-primary">
                {isDemo ? "Try the demo" : "Open the app"}
              </Link>
              <Link to="/signup" className="ln-btn ln-btn-outline">
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--ln-border)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ln-accent)] text-[13px] font-bold text-white"
              >
                O
              </span>
              <span className="text-[16px] font-bold tracking-tight">{APP_NAME}</span>
            </div>
            <p className="mt-3 max-w-md text-[13px] leading-[1.6] text-[var(--ln-text-dim)]">
              A student project built for CFPN542. Every game, player and group shown here is sample
              data — no real people, and no usage claims.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-7 gap-y-3">
            <a href="#how" className="ln-link">
              How it works
            </a>
            <a href="#features" className="ln-link">
              Features
            </a>
            <a href="#faq" className="ln-link">
              FAQ
            </a>
            <Link to="/login" className="ln-link">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
