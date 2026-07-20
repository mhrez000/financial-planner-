# Sage — Design System

**Feel:** modern, minimal, premium, calm. Finance apps usually feel like spreadsheets or casinos; Sage should feel like a well-designed bank lobby with a good coach in it.

## Principles

1. **One number first.** Every screen leads with the single figure that answers the user's question; detail is progressive disclosure below it.
2. **Calm over noise.** One accent colour. Red is reserved for genuinely negative states (over budget, price rise, late-fee risk) so it retains meaning.
3. **Motion with purpose.** 350ms fade-up on content entry, 500–700ms eased progress fills. Nothing loops, nothing bounces. `prefers-reduced-motion` disables all of it.
4. **Numbers are typography.** Tabular figures everywhere money appears; compact notation ($1.2k) only where space demands and precision doesn't matter.
5. **Never colour alone.** Every state pairs colour with a label or icon (badges say "over budget", the heat map has values on hover, charts have text legends) — colour-blind safe by construction.

## Tokens

Semantic CSS variables (see `src/app/globals.css`) consumed via Tailwind (`tailwind.config.ts`); components never hard-code colours, so light/dark is automatic.

| Token | Role | Light | Dark |
| --- | --- | --- | --- |
| `--bg` | App background | `#f8f9f7` warm off-white | `#0f1210` near-black green |
| `--surface` / `--surface-2` | Cards / insets | white / `#f1f4f0` | `#181c19` / `#212622` |
| `--ink` / `--muted` / `--faint` | Text hierarchy | 3 steps, AA+ on surface | 3 steps, AA+ on surface |
| `--accent` | Sage green — brand, positive action | `#2f855a` | `#52ba85` |
| `--positive` / `--negative` / `--warning` | Money up / money down / attention | restrained, AA on surface | lifted for dark |

**Type:** Inter (system fallback), sizes 10/11/12/13/14 for UI, 24–30 semibold for hero numbers. Tracking tight on headings.
**Radii:** 12px (inputs, list items) and 20px (cards) — soft, not bubbly. **Spacing:** 4px grid; cards pad 20px; sections gap 16px.

## Component vocabulary (`src/components/ui.tsx`)

`Card` (title/subtitle/action header), `Stat` (label + hero number + hint), `ProgressBar` (tone-aware, ARIA progressbar), `Badge` (state chips), `ScoreRing` (animated SVG gauge with ARIA label). Charts share one tooltip and read the same tokens (`src/components/charts.tsx`).

## Layout & navigation

- **Mobile-first:** single column; bottom tab bar with the five core destinations; thumb-reachable primary actions.
- **Desktop:** fixed 240px sidebar, 6xl-max content column, 2–3 column card grid.
- **Header:** date + greeting + theme toggle only. No notification spam in the chrome.

## Accessibility checklist (applies to every new screen)

- Keyboard: all interactive elements tabbable in DOM order; skip-to-content link ships in the layout.
- Screen readers: charts get `role="img"` + descriptive `aria-label`, and the underlying numbers always exist as text somewhere on the page.
- Contrast: text tokens are AA against their surfaces in both themes; the accent is only used on white text at ≥4.5:1.
- Motion: everything honours `prefers-reduced-motion`.
- Touch targets ≥ 40px on mobile.

## Voice & tone

Australian, warm, direct. "Running hot", "needs a boost", "nice!" — never "you failed", never jargon without a plain-English gloss. Celebrate direction ("trending down 18%") over absolutes.
