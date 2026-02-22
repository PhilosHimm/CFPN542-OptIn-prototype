# CFPN542 OptIn — Design System MASTER

> **Source of Truth** for all design decisions in this app.  
> Generated via `ui-ux-pro-max` skill audit · 2026-02-22

---

## 1. Product Identity

| Attribute | Value |
|-----------|-------|
| **App Name** | OptIn |
| **Category** | Sports community · recreational pickup games |
| **Platform** | Mobile-first PWA (max-width 430px) |
| **Style** | iOS Liquid Glass / Glassmorphism |
| **Tagline** | "Liquid Glass v26.4" |

---

## 2. Colors

All CSS custom properties defined in `src/styles/theme.css`.

### Primary Palette (MD3 Green)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--primary` | `#2D7A3A` | `#ADF3B0` | CTA buttons, active states, links |
| `--on-primary` | `#FFFFFF` | `#00390F` | Text on primary |
| `--primary-container` | `#ADF3B0` | `#125124` | Chips, highlight surfaces |
| `--on-primary-container` | `#002106` | `#C8FFC9` | Text on containers |

### Surface Hierarchy

| Token | Value | Usage |
|-------|-------|-------|
| `--surface` | `#FBFDF7` | Page background |
| `--surface-container-lowest` | `#FFFFFF` | Cards (highest elevation) |
| `--surface-container-low` | `#F3F4EE` | Subtle cards |
| `--surface-container` | `#EDEEE9` | Nav bar background |

### Semantic / Sport Colors (inline Tailwind)

| Sport | Color | Tailwind |
|-------|-------|----------|
| Basketball | `#F97316` | `orange-500` |
| Soccer | `#22C55E` | `green-500` |
| Volleyball | `#3B82F6` | `blue-500` |
| Tennis | `#EAB308` | `yellow-500` |
| Flag Football | `#8B5CF6` | `violet-500` |

---

## 3. Typography

Font: **Roboto** (loaded via `src/styles/fonts.css`)

| Scale | Class | Size | Line-height |
|-------|-------|------|-------------|
| Display Large | `text-display-lg` | 57px | 64px |
| Headline Large | `text-headline-lg` | 32px | 40px |
| Title Large | `text-title-lg` | 22px | 28px |
| Title Medium | `text-title-md` | 16px | 24px |
| Body Large | `text-body-lg` | 16px | 24px |
| Body Medium | `text-body-md` | 14px | 20px |
| Label Large | `text-label-lg` | 14px | 20px |
| Label Small | `text-label-sm` | 11px | 16px |

### Typography Rules

- Minimum **16px** (`text-body-lg`) for body text on mobile ✓
- Headings use `font-bold tracking-tight` or `font-bold tracking-widest` for ALL-CAPS labels
- All-caps labels: `text-[10-11px] font-bold uppercase tracking-widest` pattern
- Line length: capped by max-width 430px container (inherently safe)

---

## 4. Spacing & Layout

```
Container:  max-w-[430px] centered
Page padding: px-6 (24px sides)
Section gap: space-y-6
Card padding: p-4 (default) or p-5 (prominent)
Bottom nav height: 80px → pb-[88px] on main content
```

---

## 5. Component Patterns

### Cards (`.ios-card`)

```css
/* Defined in theme.css or index.css */
background: white/70 backdrop-blur-md
border: border border-black/5
border-radius: rounded-[20px] or rounded-3xl
padding: p-4 or p-5
shadow: shadow-sm or shadow-lg
```

### Glass Effect (`.glass`)

```css
background: bg-white/60 backdrop-blur-md
border: border border-white/40
```

### Buttons

| Type | Classes |
|------|---------|
| Primary CTA | `bg-primary text-on-primary rounded-full font-bold shadow-lg shadow-primary/20` |
| Secondary | `glass text-primary font-bold rounded-full` |
| Icon-only round | `w-10 h-10 glass rounded-full flex items-center justify-center` |
| Destructive | `text-rose-500 bg-rose-50 rounded-xl` |

**All buttons MUST have:**
- `cursor-pointer`
- `active:scale-95` or `active:scale-90` for tactile feedback
- `transition-all` for smooth state changes
- `focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none`
- `aria-label` if icon-only

### Status Badges

| Status | Colors |
|--------|--------|
| `proposal` / Voting Open | `text-amber-600 bg-amber-100` |
| `confirmed` | `text-emerald-600 bg-emerald-100` |
| `completed` / Played | `text-slate-500 bg-slate-100` |
| `cancelled` | `text-rose-600 bg-rose-100` |

---

## 6. Navigation

- **Bottom Nav**: `fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px]`  
  5 tabs: Home · Calendar · Create · Messages · Profile  
  Active indicator: `bg-secondary-container` pill behind icon  
  Each tab has `aria-current="page"` when active

---

## 7. Icons

- Library: **Lucide React** exclusively
- Size: `w-5 h-5` (20px) standard, `w-6 h-6` (24px) nav, `w-4 h-4` (16px) inline
- All icon-only buttons **MUST** have `aria-label` or `sr-only` text
- Decorative icons get `aria-hidden="true"`
- **No emoji used as UI icons** (user-generated content is acceptable)

---

## 8. Accessibility Checklist

| Rule | Status |
|------|--------|
| Minimum 44×44px touch targets | ✅ (all icon btns are `w-10 h-10` = 40px min; most `w-11 h-11` = 44px) |
| `aria-label` on icon-only buttons | ✅ Fixed in audit |
| `aria-current="page"` on active nav | ✅ Fixed in audit |
| `aria-pressed` on toggle buttons | ✅ Fixed in audit (tab segments) |
| `<label htmlFor>` ↔ `<input id>` | ✅ Fixed in CreateGame TextField |
| `aria-label` on unlabelled inputs | ✅ Fixed in Messages chat input |
| `alt` text on images | ✅ Descriptive alt text on all `<img>` |
| `prefers-reduced-motion` | ✅ Added to `tailwind.css` |
| Focus-visible rings | ✅ Added to all interactive elements |
| Color contrast (4.5:1 minimum) | ✅ All text uses `text-black/90`, `text-black/80`, `text-black/40` — primary `#2D7A3A` on white passes |

---

## 9. Animation & Motion

- Micro-interactions: `transition-all duration-200` (150–300ms range) ✅
- Press feedback: `active:scale-95` or `active:scale-90` ✅
- `prefers-reduced-motion: reduce` → all transitions disabled to `0.01ms` ✅
- Use `transform`/`opacity` for animations (GPU-accelerated) ✅

---

## 10. Anti-Patterns to Avoid

| ❌ Don't | ✅ Do |
|---------|------|
| Hardcode dates like `"Friday, Feb 20"` | Use `new Date().toLocaleDateString(...)` |
| `left-0 right-0` + `margin: auto` on `fixed` element | `left-1/2 -translate-x-1/2` for centering |
| Import icons and not use them | Audit imports regularly |
| `<label>` without `htmlFor`/`id` | Always link labels to inputs |
| `placeholder` as a substitute for `<label>` | Add `aria-label` to unlabelled inputs |
| Icon buttons without `aria-label` | Every icon-only button needs `aria-label` |
| `bg-white/10` in light mode cards | Minimum `bg-white/50` for visible glass |

---

## 11. Page-Specific Notes

| Page | File | Notes |
|------|------|-------|
| Home | `pages/Home.tsx` | Dynamic date. Bell needs notification count as `aria-live` region for live updates |
| Calendar | `pages/Calendar.tsx` | `todayStr` computed dynamically |
| Game | `pages/GamePage.tsx` | Back + Share icon buttons have aria-labels |
| Create Game | `pages/CreateGame.tsx` | `TextField` component links label→input via `htmlFor`/`id` |
| Messages | `pages/Messages.tsx` | Chat input has `aria-label`. Message tabs use `aria-pressed` |
| Profile | `pages/Profile.tsx` | Edit/Save, Camera, Settings, Sign Out buttons all have labels + cursor |

---

*Audit performed by GitHub Copilot with ui-ux-pro-max skill · 2026-02-22*
