---
name: OptIn
description: Material Design 3 for pickup sports scheduling — tonal, countable, and built so a group decision resolves in one tap.
colors:
  primary: "#2D7A3A"
  on-primary: "#FFFFFF"
  primary-container: "#ADF3B0"
  on-primary-container: "#002106"
  secondary: "#52634F"
  on-secondary: "#FFFFFF"
  secondary-container: "#D5E8CF"
  on-secondary-container: "#111F0F"
  tertiary: "#38656A"
  on-tertiary: "#FFFFFF"
  tertiary-container: "#BCEBF0"
  on-tertiary-container: "#002023"
  error: "#BA1A1A"
  on-error: "#FFFFFF"
  error-container: "#FFDAD6"
  on-error-container: "#410002"
  surface: "#FBFDF7"
  on-surface: "#1A1C19"
  surface-variant: "#DEE5D8"
  on-surface-variant: "#424940"
  surface-container-lowest: "#FFFFFF"
  surface-container-low: "#F3F4EE"
  surface-container: "#EDEEE9"
  surface-container-high: "#E7E9E3"
  surface-container-highest: "#E2E3DE"
  outline: "#72796F"
  outline-variant: "#C2C8BD"
  inverse-surface: "#2F312C"
  inverse-on-surface: "#F0F1EB"
typography:
  display:
    fontFamily: "Roboto, sans-serif"
    fontSize: "57px"
    fontWeight: 400
    lineHeight: "64px"
    letterSpacing: "-0.25px"
  headline:
    fontFamily: "Roboto, sans-serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: "40px"
    letterSpacing: "0px"
  title:
    fontFamily: "Roboto, sans-serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: "28px"
    letterSpacing: "0px"
  title-md:
    fontFamily: "Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "24px"
    letterSpacing: "0.15px"
  body:
    fontFamily: "Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0.5px"
  body-md:
    fontFamily: "Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "0.25px"
  label:
    fontFamily: "Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
    letterSpacing: "0.1px"
  label-md:
    fontFamily: "Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.5px"
  label-sm:
    fontFamily: "Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.5px"
rounded:
  none: "0px"
  extra-small: "4px"
  small: "8px"
  medium: "12px"
  large: "16px"
  extra-large: "28px"
  full: "9999px"
spacing:
  hair: "4px"
  tight: "8px"
  snug: "12px"
  gutter: "16px"
  section: "24px"
  nav-clearance: "88px"
components:
  button-filled:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "40px"
  button-filled-disabled:
    backgroundColor: "{colors.surface-variant}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: "40px"
  button-tonal:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "10px 24px"
  activity-card:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.medium}"
    padding: "16px"
    width: "100%"
  option-card:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.large}"
    padding: "16px"
  option-card-winner:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.large}"
    padding: "16px"
  vote-button-in:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    typography: "{typography.label-md}"
    rounded: "{rounded.medium}"
    padding: "10px 0"
    height: "48px"
  vote-button-in-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.medium}"
    height: "48px"
  status-chip-voting:
    backgroundColor: "{colors.tertiary-container}"
    textColor: "{colors.on-tertiary-container}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  status-chip-confirmed:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  text-field-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.extra-small}"
    padding: "16px"
    height: "56px"
  nav-item-active:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    width: "64px"
    height: "32px"
  message-bubble-own:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.large}"
    padding: "10px 16px"
---

# Design System: OptIn

## Overview

**Creative North Star: "The Group Chat With a Scoreboard"**

OptIn looks like somewhere friends talk and behaves like somewhere a decision gets made. The surface language is warm, low-ceremony, tonal — rounded containers in soft greens and greys, nothing that reads as enterprise software or as a league management console. But underneath every screen there is a running tally, and the interface never lets you forget it. `7 In`. `7/10 players`. `Option 2 — Winner`. `3 spots left`. The product's entire substance is quantities a group can act on, so the design's job is to keep those quantities in front of people while making the act of contributing to them feel like tapping a message, not filing a form.

The system is **Material Design 3, implemented properly rather than approximated.** That is not a default; it is the committed language, and the codebase honours it more thoroughly than most M3-flavoured products do — the full tonal role set, the real type scale with per-role letter-spacing, ripple-equivalent state layers as `::after` overlays at 8% hover and 12% pressed, the seven-step shape scale, M3's emphasized and standard easing curves. Depth comes from tone before it comes from shadow. A card is a different surface tone, not a floating slab.

Green carries a specific meaning here and it is not "brand." Green is the colour of **consensus reached.** Turf Green fills the button that commits you, the border of the option that won, the dot on a confirmed date, the bubble of the message you sent. Teal-tertiary means *still deciding*. Muted olive-secondary means *maybe*. Red-error means *can't* and *cancelled*. The palette is a state machine, and using an accent decoratively breaks the one thing the user is reading the screen for.

The rejections are just as load-bearing. This product was once styled as iOS Liquid Glass — translucent white cards, `backdrop-blur`, iOS system blue `#007AFF`, `.ios-card`. That world was replaced deliberately and only fragments remain. **Glassmorphism, blur-based depth, and iOS system colour are anti-references, not options.** So is decorative sport imagery inside decision UI: hero photography exists per sport, but it never sits behind a vote.

**Key Characteristics:**

- Tonal-first depth: surface containers do the layering, shadows only lift what floats
- The palette is a state machine — every accent is an activity state, never decoration
- Pill and rounded-rectangle geometry throughout; no hard corners anywhere
- Counts are visible at rest, never behind a tap
- 430px phone viewport is the only layout; there is no desktop composition
- Roboto at 500 does almost all the work — weight is hierarchy, not size

## Colors

A single-hue system — a whole family of greens from turf to olive to sage — interrupted only where a state genuinely differs: teal for undecided, red for refused.

**The palette declares two full ramps and ships one.** [theme.css](src/styles/theme.css) defines a light `:root` set and a `.dark` override, and [index.html](index.html) hardcodes `class="dark"` on `<html>` with nothing in the app to toggle it. In practice every user sees the dark ramp: `#ADF3B0` primary on `#1A1C19` surface (13.4:1), not `#2D7A3A` on white (5.2:1). The frontmatter above is normative for the token *names* and carries the light `:root` values; the dark values are in [.impeccable/design.json](.impeccable/design.json) as `darkValue` per role. Both ramps pass 4.5:1 on their own ground — but any claim about "how OptIn looks" that describes the light theme is describing something nobody has seen.

### Primary

- **Turf Green** (`#2D7A3A` light / `#ADF3B0` dark): the committed brand green, named for a playing surface. It appears on exactly three kinds of thing: the button that commits you to an activity, the state that means *decided*, and your own voice in chat. It is the scarcest colour on any screen and that scarcity is the point.
- **Turf Container** (`#ADF3B0` light / `#125124` dark): the resting state of the `I'm In` vote button, the confirmed-date chip in the week strip, and the app's loading mark. A tonal invitation to commit, before commitment.

### Secondary

- **Field Olive** (`#52634F` light / `#B9CCB4` dark): the *maybe*. Desaturated to near-neutral on purpose — it must read as adjacent to green without competing with it, because "maybe" is a real answer that is not a yes.
- **Olive Container** (`#D5E8CF` light / `#3B4B38` dark): the resting `Maybe` vote button, the `Confirmed` status chip, and the active pill behind the bottom-nav icon. Note the double duty: confirmed activities and hesitant votes share a container tone, which is the one place the state-machine reading of the palette is imprecise.

### Tertiary

- **Deliberation Teal** (`#38656A` light / `#A0CFD4` dark): the only hue that leaves the green family, reserved for *voting is still open*. Its distance from the primary is functional — an open proposal must never be mistaken at a glance for a confirmed activity.
- **Teal Container** (`#BCEBF0` light / `#1E4D52` dark): the `Voting Phase` status chip and proposal days in the week strip.

### Neutral

- **Newsprint Surface** (`#FBFDF7` light / `#1A1C19` dark): the page. Faintly green-tinted rather than pure white or pure black, so the accent family never looks pasted on.
- **Ink** (`#1A1C19` light / `#E2E3DE` dark): primary text — titles, values, anything countable.
- **Quiet Ink** (`#424940` light / `#C2C8BD` dark): secondary text, metadata rows, inactive icons, all leading icons in a detail list. Passes 4.5:1 in both ramps (9.2:1 light, 10.1:1 dark), so it is a legitimate text colour, not a whisper.
- **Surface Container ramp** (`#FFFFFF` → `#E2E3DE` light / `#0F110E` → `#333532` dark): five steps of tonal elevation. `lowest` is the highest-emphasis card, `low` is the standard list card, `container` is the nav bar and inline panels, `high` is a received chat bubble.
- **Outline** (`#72796F` light / `#8C9388` dark) and **Outline Variant** (`#C2C8BD` light / `#424940` dark): text-field strokes and the global divider colour respectively.

### Error

- **Refusal Red** (`#BA1A1A` light / `#FFB4AB` dark) and its container (`#FFDAD6` / `#93000A`): `Can't`, `Cancelled`, and the unread-invite dot. Never used for form validation styling alone — an error state must also say what is wrong in words.

### Named Rules

**The State Machine Rule.** Every accent colour in this system means an activity state: green is *decided*, teal is *deciding*, olive is *maybe*, red is *refused*. Using an accent for emphasis, decoration, or variety puts a lie on the screen. If a thing is not an activity state, it is a neutral.

**The One Commit Rule.** At most one filled-primary control is visible per card and per screen region. If two things on a card are both filled green, neither reads as the commitment.

**The Tonal Separation Rule.** A card must differ from what it sits on by at least one step of the surface-container ramp. In the dark ramp `--surface`, `--background`, and `--surface-container-low` are all `#1A1C19`, so `ActivityCard`'s `bg-surface-container-low` has *zero* tonal separation from the page and survives on `shadow-md3-1` alone. That is a defect to fix, not a pattern to copy — reach for `surface-container` or higher when a card must read as a card in the shipped theme.

## Typography

**Display / Body / Label Font:** Roboto (with `sans-serif`), loaded at weights 400, 500, 700 from Google Fonts.

**Character:** One family, doing everything, which is exactly right for a product where reading speed matters more than voice. The personality comes from the scale rather than the letterforms: M3's per-role letter-spacing is implemented properly — negative on Display, `0.5px` on Body Large and Labels — so small text opens up and large text tightens. That single detail is most of what separates this from a Roboto default.

**Weight is the hierarchy, not size.** `500` (medium) is the workhorse: it carries every title, every label, every count, every button. `400` carries body copy and metadata. `700` is available and essentially unused. Two adjacent elements at 14px read as different ranks because one is 500 and one is 400 — which is what lets a 430px-wide screen hold this much information without shouting.

### Hierarchy

- **Display Large** (400, 57px/64px, `-0.25px`): declared in the scale, not currently used. Available for a genuine hero moment.
- **Headline Large** (400, 32px/40px): auth and onboarding screens only.
- **Title Large** (500, 22px/28px): the app-bar greeting, panel titles, and the date numeral in the week strip. The largest thing on a normal screen.
- **Title Medium** (500, 16px/24px, `0.15px`): section headers (`Upcoming Activities`, `Schedule`) and activity-card titles. The most consequential role in the system — it is how a scanning user finds their activity.
- **Body Large** (400, 16px/24px, `0.5px`): text-field input and label text, empty-state headlines. The 16px floor also prevents iOS zoom-on-focus.
- **Body Medium** (400, 14px/20px, `0.25px`): every metadata row — date, time, location, chat message text.
- **Label Large** (500, 14px/20px, `0.1px`): all button text, `View all` links, player counts.
- **Label Medium** (500, 12px/16px, `0.5px`): status chips, vote-button labels, nav item labels, vote tallies.
- **Label Small** (500, 11px/16px, `0.5px`): timestamps, day-of-week abbreviations, helper text, `See who voted`.

### Named Rules

**The Countable Emphasis Rule.** Any number a user acts on — vote tally, roster count, spots left, cost each — is set at 500 minimum and never at Label Small. Numbers are this product's content; they do not get the timestamp treatment.

**The Sixteen Floor Rule.** Interactive text inputs are Body Large (16px) and never smaller, on every screen, without exception. Below 16px iOS zooms the viewport on focus and breaks the fixed 430px layout.

**The Uppercase Exception.** All-caps appears exactly once, on the `GAME INVITE` eyebrow in the notifications panel, at Label Small with `tracking-wider`. It is an eyebrow label, not a style. Do not uppercase buttons, chips, section headers, or nav labels — M3 does not, and this system does not.

## Layout

**One viewport, phone-shaped.** [Layout.tsx](src/app/components/Layout.tsx) constrains the app shell to `max-w-[430px]`, widening to `sm:max-w-lg` (512px) above the `sm` breakpoint, centred on a `bg-surface` field. There is no desktop layout, no tablet layout, and no multi-column composition anywhere. Design for 430px and let the shell handle the rest.

**8pt grid, 16px gutter.** Screen padding is `px-4` (16px) on every screen — not 24px, despite what older documentation claimed. The rhythm inside a screen is: `gap-3` (12px) between sibling cards, `gap-6` / `mb-6` (24px) between sections, `gap-1.5` (6px) between an icon and its label, `gap-2` (8px) between chips. Card interior padding is a flat `p-4` (16px); prominent surfaces such as the notifications sheet take `p-6` (24px).

**Two fixed chrome elements bracket every screen.** A sticky top app bar (`pt-[48px] pb-4` on `bg-surface`, sitting under the status bar) and a fixed bottom nav 80px tall, centred with `left-1/2 -translate-x-1/2` and padded by `env(safe-area-inset-bottom)`. Scrolling content clears the nav with `pb-[88px]` on the outlet wrapper. Any new fixed element must use the same `left-1/2 -translate-x-1/2` centring — `left-0 right-0` with auto margins does not centre inside a constrained shell.

**Horizontal scroll is a deliberate device, used twice.** The week strip on Home and the sport selector in Create are `overflow-x-auto` with `scrollbar-hide` and a `-mx-4 px-4` negative-margin bleed so items run to the physical screen edge. This signals "there is more, sideways" without spending vertical space. It is not a general-purpose escape hatch for overflowing content.

**Bottom sheets over navigation.** Secondary surfaces — notifications, voter lists, visibility pickers — slide up as sheets anchored to the bottom of the shell (`rounded-t-3xl`, `fixed bottom-0`, scrim at `bg-black/50`) rather than pushing a new route. The user stays anchored to the activity they were looking at.

### Named Rules

**The Thumb Reach Rule.** Every interactive element is at least 48×48px, including elements that only *look* smaller — the 40px notification bell is wrapped to `min-w-[48px] min-h-[48px]`, and inline text links get `min-h-[48px]`. 48 is the floor, not 44.

## Elevation & Depth

**Tonal first, shadow second.** Depth in this system is primarily a change in surface tone: the five-step `surface-container` ramp separates page from card from nav from bubble without a single pixel of shadow. Shadows are then applied sparingly, and only to say *this floats above the page* rather than *this is a distinct region*.

The vocabulary is M3's five-level elevation set, of which the system meaningfully uses two. `shadow-md3-1` is by far the dominant token (29 uses) — it lifts activity cards and filled buttons. `shadow-md3-5` (10 uses) is reserved for genuinely floating chrome. Levels 2, 3 and 4 are declared and nearly unused, which is fine: an elevation scale with two well-chosen steps beats one with five interchangeable ones.

Depth is **static, not interactive.** Nothing in this system raises on hover. State change is communicated by the M3 state-layer overlays (`md3-state-surface`, `md3-state-primary`) — a translucent `::after` at 8% opacity on hover and 12% on press, tinted `on-surface` for tonal elements and `on-primary` for filled ones, transitioning over 0.15s. That is the correct M3 behaviour and it is implemented properly; do not add `hover:shadow-lg` on top of it.

### Shadow Vocabulary

- **Level 1** (`0px 1px 2px 0px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)`): resting elevation for activity cards and filled buttons. The default when something needs to lift at all.
- **Level 5** (`0px 4px 4px 0px rgba(0,0,0,0.3), 0px 8px 12px 6px rgba(0,0,0,0.15)`): floating chrome — sticky action bars and elements that overlay scrolling content.
- **Switch thumb** (`0px 1px 2px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)`): the one component-local shadow, matching Level 1, applied to the M3 switch handle.

### Named Rules

**The Tone-Before-Shadow Rule.** Before adding a shadow, ask whether a step on the surface-container ramp says the same thing. It usually does, and it survives the dark ramp better. Shadows on a `#1A1C19` background are nearly invisible; tone is not.

**The No Blur Rule.** No `backdrop-filter`, no translucent-white surfaces, no glass. Exactly one `backdrop-blur-sm` survives in the codebase, in [StatusBar.tsx](src/app/components/StatusBar.tsx), and it is a leftover from the replaced iOS Liquid Glass identity. Depth is tone and shadow. Nothing here is frosted.

## Shapes

**Everything is rounded and nothing is sharp.** The system uses M3's seven-step shape scale (`0 / 4 / 8 / 12 / 16 / 28 / 9999px`), exposed as `rounded-md3-*`. The distribution is deliberate and worth internalising:

- **Full (`9999px`)** is the most-used radius in the entire app. Every button, every chip, every avatar, every status badge, the nav active-indicator pill, the step-progress bars. If a thing is an action or a label, it is a pill.
- **Large (16px)** is the container radius for anything a user reads and decides on: vote option cards, week-strip day tiles, list rows in chat.
- **Medium (12px)** is the standard card radius — activity cards and vote buttons.
- **Extra-small (4px)** belongs to text fields alone. The near-square field is what distinguishes *type here* from *tap here* in a screen that is otherwise all pills.
- **Extra-large (28px)** is for full-bleed auth surfaces and hero panels.
- **None (0px)** is not used anywhere in app UI.

The resulting form language is a screen of soft rectangles punctuated by hard-edged pills — the shape does the affordance work that colour alone could not.

**Borders carry decision weight.** The system is largely borderless: `outline-variant` supplies hairline dividers and that is usually all. But the vote-option card and the vote buttons use a deliberate **2px** border, and that heavier stroke is precisely where a choice is being made. A 2px `border-primary` on a card is how the winning option announces itself, and a 2px border on an unselected vote button is how it stays legible as a target while remaining unchosen. Text fields do the same thing in miniature: 1px `outline` at rest, thickening to 2px `primary` on focus with padding compensated by 1px so nothing shifts.

**Chat bubbles break their own corner.** A sent bubble is `rounded-2xl` with `rounded-br-sm`; a received bubble is `rounded-2xl` with `rounded-bl-sm`. The clipped corner points at the speaker. It is the one asymmetric shape in the system and the only place the geometry is expressive rather than functional.

### Named Rules

**The Pill-or-Card Rule.** If it performs an action or labels a state, it is fully rounded. If it contains content, it takes 12px or 16px. There is no third shape.

**The Two-Pixel Decision Rule.** A 2px border means a choice lives here. Use it for vote controls and for the option that won; do not spend it on decoration, because it is the strongest non-colour signal the system has.

## Components

### Buttons

- **Shape:** fully rounded pill (`9999px`), universally.
- **Filled (primary):** Turf Green fill with `on-primary` text, Label Large at 500, 40px tall, `px-6` horizontal padding, `shadow-md3-1`. Carries `md3-state-primary` for its state layer. This is the commit action — `Vote Now`, `Create Activity`, `Accept`, `Confirm`.
- **Disabled:** `bg-surface-variant` with `on-surface-variant` text at `opacity-38` (M3's disabled opacity) and `cursor-not-allowed`. The shadow is dropped — a disabled control must not float.
- **Tonal (secondary):** `secondary-container` fill with `on-secondary-container` text, no shadow. `View Details`, `Decline`, and every alternative action.
- **Text:** primary-coloured Label Large with a trailing `ChevronRight`, wrapped to `min-h-[48px]`. Used for `View all` / `See all` section links.
- **Icon-only:** 40×40 circle on `surface-container-low`, wrapped to a 48px minimum target, always carrying `aria-label`.
- **Hover / Focus / Press:** state layers via `md3-state-*` at 8% / 12%; `focus-visible:ring-2 ring-primary/50` with `outline-none`. Transitions are `transition-colors` — no scale, no lift.

### Chips

- **Style:** fully rounded, `px-3 py-1`, Label Medium at 500, container-tone background with matching `on-*-container` text. No border.
- **Status semantics:** `Voting Phase` → tertiary container (teal); `Confirmed` → secondary container (olive); `Completed` → surface-variant; `Cancelled` → error container. These four mappings are the visual contract of the activity lifecycle and must not be reassigned.

### Cards / Containers

- **Activity card** ([ActivityCard.tsx](src/app/components/ActivityCard.tsx)): the workhorse. 12px radius, `surface-container-low`, `p-4`, `shadow-md3-1`, `md3-state-surface`, and the whole card is a single `<button>` — no nested interactive elements, so the entire surface is the target. Internal order is fixed and worth preserving: status chip + open/full marker, then title at Title Medium, then a three-row metadata stack (calendar / clock / pin, each a 16px `on-surface-variant` icon beside Body Medium text), then a bottom row pairing the player count against one action pill.
- **Vote option card** — see Signature Component below.
- **Bottom sheet:** `rounded-t-3xl` on `bg-surface`, `p-6`, `shadow-2xl`, over a `bg-black/50` scrim, with `role="dialog"`, `aria-modal`, Escape-to-close and autofocus.

### Inputs / Fields

- **Style:** M3 outlined text field, implemented as real CSS in [theme.css](src/styles/theme.css) rather than assembled from utilities. 56px tall, 4px radius, transparent background, 1px `outline` stroke, Body Large text, 16px padding.
- **Floating label:** starts vertically centred at Body Large in `on-surface-variant`, then rises to the top border at Body Small in `primary` on focus or when filled, riding a `0.15s cubic-bezier(0.2, 0, 0, 1)` transition. The label sits on a `background: var(--surface)` chip that punches through the stroke.
- **Focus:** the stroke goes 2px `primary` and padding drops to 15px so no content shifts. Icon and prefix variants shift the label's left offset to match.
- **Disabled / read-only:** the `mock` variant renders a non-interactive div with the label pinned up, for review screens.

### Navigation

- **Bottom nav** ([BottomNav.tsx](src/app/components/BottomNav.tsx)): fixed, 80px tall, `bg-surface-container` with a `border-t border-outline-variant`, safe-area padded. Five destinations (Home, Calendar, Create, Chats, Profile) — note this conflicts with the 4-item constraint recorded in [PRODUCT.md](PRODUCT.md) and the written guidelines.
- **Active state** does three things at once: a 64×32 `secondary-container` pill appears behind the icon, the icon shifts to `on-secondary-container` and thickens from 1.8 to 2.2 stroke weight, and the label goes `on-surface` at 500. Inactive is `on-surface-variant` throughout. Active items carry `aria-current="page"`.
- **Step progress** ([CreateActivityScreen.tsx](src/app/components/CreateActivityScreen.tsx)): five equal 4px pill segments with labels beneath, filling `primary` as steps complete over `duration-300`. Not a percentage bar — a named-stage indicator.

### Signature Component: the Vote Option Card

The one component that is genuinely OptIn's own, and the screen everything else exists to deliver a user to. It is a 16px-radius card on `surface-container-lowest` with a **2px border** whose colour is the entire state readout:

- **Open** — `border-outline`, full opacity. A live candidate.
- **Winner** — `border-primary` with a `bg-primary/5` wash, a Trophy in a 20px filled-primary circle, and the header text reading `Option 2 — Winner`.
- **Lost** — `border-outline-variant` on `surface-container-low` at `opacity-60`. Dimmed, still readable, not removed. The group can see what it turned down.

Inside: an `Option N` header at Label Large in primary, with the live `N In` tally right-aligned; the same three-row date / time / location stack the activity card uses; a stack of avatars of everyone who voted in; and the three-way vote control.

**The vote buttons are the product.** Three equal-width buttons, 12px radius, 2px border, 48px minimum height, each stacking icon over label over count. Unselected, each sits in its own container tone with a matching solid border — `I'm In` in primary container, `Maybe` in secondary container, `Can't` in error container. Selected, it inverts to the solid role colour with `border-transparent`. The user's choice is legible from across a room, the two alternatives stay fully legible as targets, and every button shows its own running count so the group's state is visible while you decide.

Cards animate in on a `motion` layout transition — `opacity 0→1`, `y 12→0`, 0.4s on M3's emphasized-decelerate curve `[0.05, 0.7, 0.1, 1.0]`, staggered 60ms per index. Reordering is a `layout` animation, so an option that wins visibly moves.

### Message Bubbles

`rounded-2xl` with the speaker-side bottom corner clipped to `rounded-br-sm` / `rounded-bl-sm`, `px-4 py-2.5`, capped at 75% width. Sent bubbles are filled `primary` on `on-primary`; received are `surface-container-high` on `on-surface`, preceded by the sender's name at Label Small. System messages centre themselves in a `surface-container` bubble at 85% width with no tail.

### Avatars

Initials — up to two characters, uppercase, `text-white` at 500 — on a solid per-user colour, or a cover-fit image when one exists. The colour is user-chosen at onboarding from a fixed eight-swatch set and is that person's identity across rosters, chat, and vote stacks. It is data, not theme.

## Do's and Don'ts

### Do:

- **Do** use the MD3 token utilities for everything: `bg-surface-container-low`, `text-on-surface-variant`, `rounded-md3-large`, `shadow-md3-1`, `text-title-md`. [theme.css](src/styles/theme.css) is the only source of truth for colour, type, shape and elevation.
- **Do** treat accent colour as activity state — green *decided*, teal *deciding*, olive *maybe*, red *refused* — and reach for a neutral whenever the thing being coloured is not an activity state.
- **Do** reach for a surface-container step before reaching for a shadow, and verify the result against the dark ramp, since that is the ramp that ships.
- **Do** give every interactive element a 48×48px minimum target, wrapping visually smaller controls in `min-w-[48px] min-h-[48px]` rather than growing them.
- **Do** keep interactive text at Body Large (16px) so iOS does not zoom the viewport on focus.
- **Do** use `md3-state-surface` / `md3-state-primary` for interaction feedback, and `transition-colors` for state changes.
- **Do** centre fixed elements with `left-1/2 -translate-x-1/2` inside the 430px shell.
- **Do** put secondary surfaces in a bottom sheet over the current screen rather than routing away from the activity the user is looking at.
- **Do** keep the counts visible at rest — tallies, `7/10 players`, spots left, cost each. They are the content.
- **Do** clean up drift when you touch a file. The known sites are listed below; each is a small, safe, local fix.

### Don't:

- **Don't** introduce raw Tailwind palette colours. Current violations to migrate: the offline / session-expired / demo banners in [Layout.tsx:48-80](src/app/components/Layout.tsx#L48-L80) (`bg-gray-900`, `bg-rose-50`, `bg-amber-50`), the tie-break panel in [ActivityViewScreen.tsx:1297-1361](src/app/components/ActivityViewScreen.tsx#L1297-L1361) (twelve `amber-*` utilities), and the demo-mode row in [ProfileScreen.tsx:243-259](src/app/components/ProfileScreen.tsx#L243-L259). Every one of these has an exact token equivalent — `inverse-surface`, `error-container`, `tertiary-container`.
- **Don't** ship iOS system blue. `#007AFF` survives as the default profile colour in [AuthContext.tsx:44](src/app/contexts/AuthContext.tsx#L44), four times in [ChatsScreen.tsx](src/app/components/ChatsScreen.tsx), and as `theme_color` in both [index.html](index.html) and [public/manifest.json](public/manifest.json) — where it sets the browser and install-prompt chrome to a competitor's brand colour. It is a leftover from the replaced identity, not a token.
- **Don't** mix raw Tailwind radii into token-styled screens. `rounded-xl` / `rounded-3xl` appear roughly forty times in [ActivityViewScreen.tsx](src/app/components/ActivityViewScreen.tsx) and [ProfileScreen.tsx](src/app/components/ProfileScreen.tsx) alongside `rounded-md3-*`, producing 12px and 16px radii that look right by luck and drift on any scale change. Use `rounded-md3-medium` and `rounded-md3-large`.
- **Don't** use glassmorphism, `backdrop-filter`, or translucent white cards. That identity was replaced; the surviving `backdrop-blur-sm` in [StatusBar.tsx](src/app/components/StatusBar.tsx) is debt.
- **Don't** import design tokens from [constants/md3.ts](src/app/constants/md3.ts). It exports a **blue-primary** M3 palette that contradicts `theme.css` on every colour role. It is stale and will silently produce off-brand UI.
- **Don't** raise elements on hover or add `hover:shadow-*`. State layers handle interaction; elevation is static.
- **Don't** uppercase buttons, chips, section headers, or nav labels. The single all-caps eyebrow in the notifications panel is the exception that defines the rule.
- **Don't** put more than one filled-primary button in a card or screen region.
- **Don't** carry the shadcn/ui vocabulary in [components/ui/](src/app/components/ui/) into app screens. Those files are stock Radix wrappers using `rounded-md`, `rounded-lg` and their own colour variables; they are not the OptIn system. MUI and Emotion are installed and unused — do not start using them.
- **Don't** hardcode dates or times. Every displayed date derives from real timestamps.
- **Don't** rely on colour alone to distinguish `In` / `Maybe` / `Can't`. Each vote control carries an icon and a text label for exactly this reason; keep all three.
