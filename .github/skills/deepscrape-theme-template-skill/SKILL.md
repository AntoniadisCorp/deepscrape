---
name: deepscrape-theme-template-skill
description: This skill should be used when creating or modifying UI in this repository so designs stay aligned with deepscrape's existing Angular Material and Tailwind theme system.
version: 1.0.0
author: proko
---

# deepscrape-theme-template-skill

## Purpose

This skill enforces theme consistency for deepscrape UI work.

Use this skill before producing new page layouts, components, or visual redesigns so generated UI follows the current repository style system instead of generic defaults.

## When to use this skill

Use this skill when the request involves:
- Building new UI pages or components
- Restyling an existing screen
- Introducing new color usage or visual states
- Creating design templates for future implementation
- Generating Tailwind or Angular Material markup/styles

## Mandatory theme-first discovery

Before generating UI code, inspect these files:
- `src/styles.scss`
- `src/scss/_mat-theme.scss`
- `tailwind.config.js`
- `.github/copilot-instructions.md`

If any of these conflict, prefer repository instructions in `.github/copilot-instructions.md`.

## Deepscrape visual contract

### Design stack
- Angular 20 standalone components
- Angular Material v20 theme mixins
- TailwindCSS v3 utilities
- `@material-tailwind/html` integration
- `darkMode: 'class'`

### Color direction
- Material primary palette: cyan
- Material tertiary palette: rose
- Dark and light themes both defined
- Tailwind custom neutral ramp: `gray1` through `gray7`
- Current repo trend for interaction accents favors cyan/rose over blue in updated admin surfaces
- For admin console dark-mode surfaces, a neutral-first direction (`gray1..gray7`) is valid and preferred when explicitly requested

### Typography direction
- Primary sans: `sofia-pro`
- Body fallback: sans-serif
- Serif support: `Roboto Slab`
- Display support: `cubano`
- Code font: `attribute-mono`

### Styling rules from repo policy
- Tailwind first for spacing/layout
- Reuse global tokens/utilities from `src/styles.scss`
- Avoid introducing new UI frameworks
- Keep component-specific styles in component scss files
- Keep global overrides in `src/styles.scss`

## Output requirements for generated UI

For each UI response, provide:
1. A short summary of how the design matches deepscrape theme
2. Tailwind/Material classes using existing palette tokens
3. Dark mode compatible classes when relevant
4. WCAG AA-conscious contrast choices
5. No hard-coded random color palettes that ignore current tokens

## Theme-safe class guidance

Prefer:
- `text-cyan-*`, `bg-cyan-*`, `ring-rose-*` for interaction emphasis where appropriate
- `text-gray6 dark:text-white` for strong text hierarchy
- `bg-slate-50/30 dark:bg-gray7/80` and related existing neutral surfaces
- Existing utility patterns such as loading surfaces when skeleton states are needed
- `border-gray*`, `bg-gray*`, `text-gray*` for dark/neutral admin variants

Avoid:
- New brand color systems unrelated to repo tokens
- Purple-heavy defaults unless the feature already uses prose/code styles
- Hardcoded inline styles when utility classes or theme tokens exist

## Implementation flow

1. Read theme source files.
2. Identify current component context (admin analytics, dashboard, marketing, etc.).
3. Map requested visual change onto existing cyan/rose + gray system.
4. Generate responsive Tailwind markup and minimal scoped scss only if needed.
5. Verify light/dark parity and contrast.
6. Return concise rationale and implementation-ready output.

## Quality checklist

Before finalizing UI output, ensure:
- Theme tokens align with current repository definitions
- No new framework added
- Color choices fit the deepscrape palette direction
- Dark mode classes are not missing for major surfaces and text
- Accessibility contrast is acceptable
- Output is practical for Angular standalone components

## Bundled resources

See:
- `references/current-theme-map.md` for the concrete token map and examples
- `examples/before-after-ui-snippets.md` for concrete before/after implementation snippets
- `scripts/validate-theme-drift.js` for doc-to-source drift validation

## Drift check command

Use this command after editing any theme documentation in this skill:

```bash
bun .github/skills/deepscrape-theme-template-skill/scripts/validate-theme-drift.js
```
