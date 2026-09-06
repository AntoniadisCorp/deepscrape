# deepscrape current theme map

This reference captures the active UI theme choices observed in repository source files.

## Authoritative files

- `src/scss/_mat-theme.scss`
- `src/styles.scss`
- `tailwind.config.js`
- `.github/copilot-instructions.md`

## Angular Material theme

Material theme config defines:
- light theme primary: `mat.$cyan-palette`
- light theme tertiary: `mat.$rose-palette`
- dark theme primary: `mat.$cyan-palette`
- dark theme tertiary: `mat.$rose-palette`

## Tailwind theme and design tokens

Tailwind config includes:
- dark mode strategy: `class`
- custom font families:
  - sans: `sofia-pro`
  - serif: `Roboto Slab`
  - display: `cubano`
  - code: `attribute-mono`
- custom neutral tokens:
  - `gray1` `#f8f8f8`
  - `gray2` `#dbe1e8`
  - `gray3` `#b2becd`
  - `gray4` `#6c7983`
  - `gray5` `#454e56`
  - `gray6` `#2a2e35`
  - `gray7` `#12181b`

## Existing class patterns in styles

Observed shared utility patterns include:
- `bg-slate-50/30 dark:bg-gray7/80` surfaces
- `text-gray6 dark:text-white` strong text
- loading surface utilities for skeleton states

## Repository styling policy constraints

From project instructions:
- Tailwind first for layout and spacing
- Reuse CSS variables/design tokens from global styles
- No new UI frameworks beyond Angular Material + Tailwind + material-tailwind
- Prefer motion utilities from `tailwindcss-motion` over ad-hoc keyframes where practical

## Practical guidance

When creating new UI:

### Accent use
- Primary interaction emphasis: cyan shades
- Secondary contrast accents: rose shades (prefer rose over emerald for new UI updates)
- Neutral-first admin mode: use `gray1..gray7` with subtle grayscale gradients and shadows when requested
- Do not import another design system
