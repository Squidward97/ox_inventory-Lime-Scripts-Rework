# UI style guide: "tactical street" NUI

The visual language built for `squid_gangs`. Use it for any new screen in this project and as the starting point for future FiveM NUIs. Every value below is taken from the working code (`web/tailwind.config.js`, `web/src/index.css`, `web/src/features/**`).

**Stack:** React 19, Tailwind 3, `motion/react`, Iconify (`tabler:` icons only), fonts bundled with `@fontsource` (no CDN in NUI).

---

## 1. The feel

- **A game menu, not a web dashboard.** Think GTA pause menu crossed with a tactical HUD: big italic type, slanted shapes, hard corners, one sharp accent colour on near-black.
- **Open layouts over boxes.** Content sits directly on the dark background, separated by hairlines, gradients and spacing. Cards and rounded panels look "AI-made" and were rejected.
- **Restraint.** One accent, few effects. When something felt busy (glows, double frames, badges, pulses all at once), the fix was always removing layers, not tuning them.
- **Every element is legible over a moving game.** Text sits on darkened or gradient-faded backgrounds, never straight on bright scenery.

---

## 2. Tokens

### Colour

| Role | Value | Use |
|---|---|---|
| Accent | `#c8f02c` (`text-accent`, `bg-accent`) | Active tab, primary button, eyebrows, success, "you", lit keys. The only bright colour in the chrome. |
| Accent hover | `#d9f86a` | Primary button hover |
| Base dark | `#0b0d09` | Drawers, tooltips, HUD cards (at `/90`–`/95`) |
| Deepest dark | `#070906` / `#050604` | Window background, erase fills |
| Scrim dark | `rgb(6 8 5 / …)` | Gradients, vignettes, page overlays |
| Text strong | `text-white`, `text-zinc-100` | Titles, values |
| Text body | `text-zinc-200` / `text-zinc-300` | Lines of content |
| Text muted | `text-zinc-400` / `text-zinc-500` | Descriptions, labels |
| Text faint | `text-zinc-600` / `text-zinc-700` | Indexes, empty states, disabled |
| Hairlines | `white/[0.06]`, `white/10`, `white/15` | Dividers, borders, inactive segments (`white/[0.08]`) |
| Danger | `red-400` text, `red-500` fills and edges | Attacks, losses, deletes, overdue |
| Warning | `amber-300` | Validation and soft warnings |
| Info / peace | `#7dd3fc` (`sky-300`) | Peace timers and shields |
| Neutral world grey | `#a1a1aa` | Unclaimed map blocks |
| Neutral world light | `#e4e4e7` | Unclaimed cores, removal progress |

**Entity colours** (a gang's colour) are data, not theme: use them for a small colour bar, a backdrop glow, a progress fill or a map fill. Never for chrome like buttons or tabs.

### Type

- **Display/UI:** `Chakra Petch` (400/500/600/700, 700 italic), set on `body`.
- **Numbers, ids, coordinates, times, money:** `JetBrains Mono` (`font-mono`).

### Shape

- **Radius is capped.** Tailwind's `borderRadius` is overridden: everything from `sm` to `2xl` is 1–3px. `rounded-full` stays for dots and avatars only. Don't add big radii back.
- **Clipped corners instead of rounded:** `.cut` (14px), `.cut-sm` (8px), `.cut-xs` (5px). Top-right and bottom-left are cut at 45°.
- **The slant: `-skew-x-[14deg]`.** It's used on tabs, colour bars, swatches, dividers, progress segments, map pins and the zone-label bar. Inside a skewed container, counter-skew the content with `skew-x-[14deg]` so text stays upright (`.tab > *` does this).

---

## 3. Typography scale

| Element | Classes |
|---|---|
| Page title | `text-7xl font-bold uppercase italic leading-[0.85]` |
| Drawer title | `text-3xl font-bold uppercase italic leading-none` |
| Section heading | `text-lg font-bold uppercase italic text-zinc-300` with `border-b border-white/15 pb-2`, plus an optional mono count `font-mono text-[11px] text-zinc-600` |
| Sub-nav item | `text-2xl font-bold uppercase italic leading-none`; inactive `text-zinc-600`, active `text-white` with a skewed accent underline `h-[3px] -skew-x-[14deg] bg-accent` |
| Big figure | `text-5xl` (or `text-7xl`) `font-bold italic leading-[0.85]`, white or accent |
| Eyebrow | `.eyebrow`: 11px, semibold, uppercase, `tracking-[0.32em]`, accent, with a 24×2px accent dash in front |
| Field / figure label | `text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500` |
| Body | `text-sm text-zinc-200`; descriptions `text-xs text-zinc-400/500` |
| Caps helper | `.caps` (uppercase, `tracking-[0.08em]`) for small UI text |
| Hints | `text-[11px] text-zinc-500` |

**Conventions**
- Uppercase italic bold is for names and titles; sentence case is for anything you read.
- Pad small counts to two digits (`04`, `12`) in figures and lists.
- Separate meta with ` · ` (middle dot) or a dim slash `text-zinc-600 /`.
- Write labels as short verbs or nouns ("Place", "Here", "Deposit"). Explain consequences in the hint line under the control, not in the label.

---

## 4. Surfaces and layering

- **Base screen:** a full-bleed background (the map, or the game in windowed mode) with a vignette: `bg-[linear-gradient(180deg,rgb(6_8_5/0.75),transparent_18%,transparent_82%,rgb(6_8_5/0.8))]` and `shadow-[inset_0_0_220px_60px_rgb(6_8_5/0.8)]`.
- **Side column without a box:** `.scrim-right`, a 270° gradient from `rgb(6 8 5 / 0.94)` to transparent, with content on top. Don't add a bordered panel.
- **Page overlay** (non-map tabs): `bg-[radial-gradient(ellipse_at_top_left,rgb(200_240_44/0.07),transparent_55%),linear-gradient(rgb(6_8_5/0.72),rgb(6_8_5/0.72))] backdrop-blur-sm`, with page padding `px-10 pt-24 pb-16`.
- **Floating panel over a map** (zone editor, loading): `.panel`, a dark gradient plus a 1px white/7 border, blur and a soft shadow. It's the only "boxed" surface, kept for tool panels.
- **Drawer** (forms and details): slides in from the right.
  - Box: `w-[27rem]` (wide variant `w-[46rem]`), `bg-[#0b0d09]/95 border-l border-accent/30`, a black/40 scrim behind.
  - Content: eyebrow plus italic title, padding `px-8`, footer actions right-aligned over a hairline.
- **Lists:** `.divided` (hairline between items) on a plain `ul`. For selectable rows use `.row` / `.row-active`: an accent wash from the left, a 3px inset accent bar, and an accent border.
- **Fading gradient instead of a box** for small overlays (HUD cards, zone labels): solid dark at the anchored edge, fading to transparent, e.g. `bg-[linear-gradient(270deg,rgb(6_8_5/0.9),rgb(6_8_5/0.65)_45%,rgb(6_8_5/0))]` anchored right. Use no border and no edge bar (both were removed on request).
- **Identity backdrop** (`GangBackdrop`) behind a header:
  - diagonal stripes in the entity colour at 16% opacity, masked to fade right
  - a blurred colour glow top-left
  - a giant faint watermark of the tag (`text-white/[0.035]`)
- **Tactical texture** over maps (keep it barely visible):
  - a world-aligned grid in accent at 4–12% opacity, under the content layer
  - scanlines `repeating-linear-gradient(to bottom, rgb(200 240 44 / 0.03) 0 1px, transparent 1px 4px)`

---

## 5. Components

**Top bar** (`absolute inset-x-10 top-8`), in order:
1. A close tab with a caret.
2. A `Q` keycap.
3. Skewed `.tab` buttons, with `.tab-active` for the current one.
4. An `E` keycap.
5. Pushed to the right with `ml-auto`, the identity block: role/tag eyebrow, italic name, a skewed colour bar, and the avatar in `.cut-sm` with `drop-shadow(0 0 12px <color>66)`.

Keep the top bar clean: no extra icon buttons (a layout toggle button was removed; it lives on a key instead).

**Key-hint footer** (`absolute inset-x-10 bottom-5`): a faint label on the left, hints on the right. Each hint is a `.keycap` or `MouseGlyph` plus `text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400`, separated by `h-4 w-px -skew-x-[14deg] bg-white/15`. Every key the screen responds to gets a hint here.

**Buttons**
- `.btn .btn-primary`: accent fill, `.cut-sm`, dark text.
- `.btn .btn-ghost`: text only, turns accent on hover.
- `.btn .btn-danger`: red fill, `.cut-sm`.
- Bold uppercase `text-xs tracking-[0.14em]`. Icons are `text-sm` before the label. Disabled state is `opacity-35`.

**Inputs**
- `.field`: no box, only an underline (`border-b white/15`) that turns accent on focus. 15px text, mono for numbers.
- Wrap each input in `Field` (label above, hint below). Strip invalid characters as the user types (`replace(/\D/g, "")`).

**Figures:** a row of `Figure` (big italic value plus a small label) separated by `FigureDivider` (`h-12 w-px -skew-x-[14deg] bg-white/15`).

**Colour bar ("slash"):** `h-5 w-1.5 -skew-x-[14deg]` in the entity colour, next to a name. Smaller versions are `h-2 w-1.5` inline and `h-4 w-1` in lists.

**Segmented progress:** a flex row of `flex-1 -skew-x-[14deg]` segments (`h-1.5`–`h-2`, `gap-[3px]`). Filled segments use the entity colour or accent; empty ones are `rgb(255 255 255 / 0.08)`. Use 14–30 segments, never a smooth rounded bar.

**Avatar:** `GangAvatar`, the logo or the tag on `color + 40` (hex alpha) with the colour as text and `ring-1 ring-white/15`, inside `.cut`/`.cut-sm`.

**Chips and filters:** small `.tab` buttons (`px-3 py-1.5 text-[11px]`), with `.tab-active` for the selected one.

**Tooltip (follows the cursor):**
- Box: `cut-sm fixed w-64 bg-[#0b0d09]/95` with a big soft shadow and a 3px left edge in the relevant colour.
- Content, top to bottom:
  1. an eyebrow row: kind, slash, context, and mono meta on the right
  2. an italic name with a colour slash
  3. a status section over a hairline with `bg-white/[0.02]`

**Toast:** `.panel caps` centred near the bottom, with an accent check icon and an inset 3px accent bar. Auto-hides after about 2.2 s.

**HUD card (in-game, menu closed):**
- Placement: fixed top-right, flush with the screen edge, using the fading gradient from section 4.
- Content: right-aligned text, a mono timer, a segmented bar, and a result line for 4 s after it ends.
- Under attack: `red-400` text with an alert icon.
- Hidden while the menu is open.

**Window frame (windowed layout):**
- A centred `.cut` box on a dimmed game, with a hairline border and two lime L-brackets on the uncut corners.
- Centre it with flex, not transforms, so `fixed` children such as tooltips stay screen-relative.

**Map pins and labels:**
- **Pins:** skewed 30px squares, dark fill, 2px entity-colour border, filled on hover.
- **Zone labels:** a left-anchored fading gradient with a skewed colour bar, an italic name, and a tiny letter-spaced meta line.

---

## 6. Layout

- Full screen by default. A windowed mode at 80% × 84% of the screen with a 45% dim is the player's choice (toggled with **V**, stored in localStorage).
- Outer gutters `inset-x-10` / `px-10`. Content starts below the top bar at about `pt-24`.
- Pages are two-column where useful: content plus a `25rem` side column (`grid-cols-[minmax(0,1fr)_25rem] gap-14`).
- List rows use CSS grid with fixed metric columns (e.g. `4.5rem` per figure). Row actions appear on hover (`opacity-0 group-hover:opacity-100`).
- Confirmations happen inline, as a row expanding under the item with a coloured left border (`border-l-2 border-accent` or `border-red-500`), not as modal dialogs.

---

## 7. Motion

- `motion/react` with springs: `{ type: "spring", bounce: 0, duration: 0.35–0.42 }`.
- Fades `0.18–0.2 s easeOut`. Drawers slide on x, list items enter from `x: 28`. The menu opens with opacity plus `scale 0.97 → 1`.
- **Ambient animation** (pulsing open blocks, marching dashes for activity) is for meaningful state only, and is switched off under `prefers-reduced-motion`.
- No decorative loops (breathing glows, beacons): they were tried and removed as "too much".

---

## 8. Do and don't (from feedback)

**Do**
- Use big italic uppercase headings, small letter-spaced labels, and a mono font for numbers.
- Separate with hairlines, gradients and whitespace.
- Use the slant and clipped corners consistently.
- Fade overlays from their anchored edge.
- Keep the accent for "active / primary / yours / success".
- Make every key visible in the hint footer.

**Don't**
- Rounded cards, boxed sidebars or "dashboard" panels: rejected as boxy and AI-ish.
- Stacked decoration on one element (glow plus inner frame plus badge plus pulse): rejected as "too much"; keep the original simple shape.
- Yellow as a UI colour: removed. Neutral grey and white mark special-but-unowned things.
- Extra icon buttons in the top bar.
- Coloured edge bars on HUD gradients.
- Merging map shapes into unions ("vector union"): reverted. Blocks stay separate rounded squares.

**When tuning brightness or opacity:** the user judges by eye and converges in halves ("too dark", "too light", "in between"). Change one value at a time and say which.

---

## 9. NUI specifics

- The page is transparent outside the menu. Overlays that must stay visible while the menu is closed (the HUD) render outside the visibility wrapper, with `pointer-events-none`.
- Don't use `transform` or `filter` on ancestors of `fixed` elements (tooltips): it changes their containing block.
- Lua sends empty tables as `[]` and drops `nil` fields. Normalize every server payload with `asArray`, `asRecord` and `?? null` before use.
- Leaflet maps: watch the container with a `ResizeObserver` and call `invalidateSize`, so layout changes don't break them.
- Fonts and icons must be local or bundled. Iconify icons are fetched once; use only `tabler:` names.
