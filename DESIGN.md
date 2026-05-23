# DataDay — Design System

## Aesthetic Direction

**Operations Cockpit** — the UI of a tool people use seriously, every day. Inspired by Linear, Stripe Sigma, and Vercel's dashboard. Dark-first. Dense but breathable. Every pixel earns its place.

The app manages money and membership records for sports clubs. The interface should feel like a well-maintained instrument panel: information is legible at a glance, controls are exactly where you expect them, nothing decorates for its own sake.

---

## Color Tokens

```css
/* Dark (default) */
--bg:         #0A0D14   /* void: deepest background */
--bg-elev:    #0F131C   /* sidebar, topbar surface */
--surface:    #141926   /* cards, panels */
--surface-2:  #1A2032   /* elevated cards, hover states */
--line:       rgba(255,255,255,0.06)  /* default border */
--line-2:     rgba(255,255,255,0.10)  /* emphasized border */

--text:       #E7ECF3   /* primary text */
--text-dim:   #8B94A8   /* labels, placeholders */
--text-faint: #5B6478   /* disabled, meta */

--accent:     #FF6B2C   /* orange — used sparingly: CTAs, active states */
--accent-dim: rgba(255,107,44,0.12)
--accent-glow: rgba(255,107,44,0.20)

--cyan:       #5EE0D6   /* secondary accent: links, info */
--violet:     #8D7DFF   /* tertiary: headings, highlights */

--good:       #3EE08F   /* paid, active, success */
--warn:       #FFB84A   /* upcoming, warning */
--bad:        #FF5D7A   /* overdue, error, danger */

--good-dim:   rgba(62,224,143,0.12)
--warn-dim:   rgba(255,184,74,0.12)
--bad-dim:    rgba(255,93,122,0.12)
```

```css
/* Light theme overrides */
--bg:        #F7F8FB
--bg-elev:   #FFFFFF
--surface:   #F0F2F7
--surface-2: #E8EBF2
--line:      rgba(0,0,0,0.06)
--line-2:    rgba(0,0,0,0.10)
--text:      #0A0D14
--text-dim:  #4A5568
--text-faint:#8896A8
```

---

## Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Display / headings | Space Grotesk | 600–700 | 1.4rem+ |
| Body / UI labels | Inter | 400–500 | 0.875–1rem |
| Numbers / mono | JetBrains Mono | 500 | match context |
| Eyebrow / caps label | Inter | 600 | 0.7rem, tracking 0.1em |

- Letter-spacing: headings −0.02em, body 0, caps +0.08–0.12em
- Line-height: headings 1.1–1.2, body 1.5–1.6

---

## Spacing

Base unit: **8px**

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | icon gaps, tight badges |
| sm | 8px | internal component padding |
| md | 16px | card padding, item gaps |
| lg | 24px | section gaps |
| xl | 32px | page-level spacing |
| 2xl | 48px | hero sections |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| radius-xs | 4px | chips, tags, inputs |
| radius-sm | 6px | buttons |
| radius-md | 8px | small cards, dropdowns |
| radius-lg | 12px | cards |
| radius-xl | 16px | panels, large surfaces |

**No pill buttons.** No border-radius > 16px on interactive elements.

---

## Component Rules

### Sidebar (220px)
- Solid `--bg-elev` background, 1px right border `--line`
- Active nav item: 2px left border `--accent`, bg `rgba(255,107,44,0.08)`
- Hover: bg `rgba(255,255,255,0.04)`
- Brand area at top, logout at bottom
- Section label in caps 0.65rem tracking 0.12em `--text-faint`

### Topbar
- Solid `--bg-elev`, 1px bottom border `--line`
- Height: ~60px
- Club switcher: flat badge (no pill), 8px radius
- Theme toggle: icon-only, 32px square

### Stat Cards (KPI)
- `--surface` background, 1px border `--line`
- 12px radius
- Value: JetBrains Mono, 1.75rem, `--text`
- Label: Inter 0.75rem caps, `--text-dim`
- Trend: small delta indicator with semantic color
- Accent variant: 2px top border `--accent`

### Cards / Section Cards
- `--surface` background, 1px border `--line`
- 12px radius, 20px padding
- Header: label in caps + action buttons right-aligned

### Buttons
- **Primary**: `--accent` bg, white text, 6px radius, 10px 20px padding
- **Secondary**: transparent, 1px border `--line-2`, `--text-dim` text
- **Danger**: `--bad-dim` bg, `--bad` text, 1px border `--bad-dim`
- No gradients on buttons. No box-shadow on buttons.
- Hover: 8% opacity overlay (darken primary, lighten secondary)

### Inputs
- `--bg` background (not surface — creates depth contrast)
- 1px border `--line-2`, focus: `--accent` border
- 8px radius, 10px 14px padding
- Placeholder: `--text-faint`
- No inner glow, no shadow

### Status Badges
- `good`: `--good-dim` bg, `--good` text
- `warn`: `--warn-dim` bg, `--warn` text
- `bad`: `--bad-dim` bg, `--bad` text
- 4px radius, 5px 10px padding, 0.7rem weight 600

### Tables
- Row hover: bg `rgba(255,255,255,0.03)`
- Row border-bottom: `--line`
- Header: `--text-faint`, caps, 0.7rem, tracking 0.08em
- No outer border on table (container handles it)

---

## What NOT to Do

- No `backdrop-filter: blur()` — kills performance on low-end devices
- No complex multi-stop gradients as card backgrounds
- No `border-radius > 16px` on UI elements
- No shadows heavier than `0 4px 16px rgba(0,0,0,0.32)`
- No `--accent` (orange) on more than 10% of any screen
- No uppercase text that isn't a label or eyebrow
- No animations on hover that change layout (transform: scale, translateY > 2px)
- No `transition: all` — always list specific properties
