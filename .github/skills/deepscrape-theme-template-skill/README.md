# Design System Inspired by deepscrape

Category: Angular Material + Tailwind enterprise application system. Dark-capable, token-driven UI language with cyan signal accents, rose tertiary support, and strict neutral ramp discipline for production dashboards and product surfaces.

## 0. Theme Compatibility Checkpoints

These statements are non-negotiable and must remain true in generated UI output and skill docs:

- Material primary: cyan
- Material tertiary: rose
- Tailwind dark mode: class strategy

Primary sources used by this skill:

- src/styles.scss
- src/scss/_mat-theme.scss
- tailwind.config.js
- .github/copilot-instructions.md

## 1. Visual Theme & Atmosphere

deepscrape follows a practical, production-focused visual system optimized for clarity under data density. The UI should feel precise, fast, and operational rather than decorative.

Visual style:

- product-first, analytics-ready, dark-capable
- clean module hierarchy with predictable spacing
- interaction emphasis through cyan family accents, not rainbow palettes

Design intent:

- keep outputs recognizable to deepscrape's current Angular Material and Tailwind language
- prioritize readability and state clarity over visual novelty
- preserve consistency across light and dark surfaces

## 2. Color

### Core role map

- Primary signal: cyan family (Material primary palette)
- Tertiary support: rose family (Material tertiary palette)
- Neutral surfaces: gray1 to gray7 ramp from tailwind.config.js
- Strong body text: gray6 in light mode, white in dark mode

### Neutral tokens in active use

- gray1: #f8f8f8
- gray2: #dbe1e8
- gray3: #b2becd
- gray4: #6c7983
- gray5: #454e56
- gray6: #2a2e35
- gray7: #12181b

### Usage rules

- Use cyan-family accents for CTA, focus, active, and selected states.
- Use rose-family accents for tertiary emphasis only.
- Use neutral surfaces first; color should clarify hierarchy, not replace it.
- Keep copy on high-contrast text pairings:
  - light mode: text-gray6 on light neutrals
  - dark mode: text-white or gray2 on gray7 surfaces

## 3. Typography

Families from current theme config:

- primary sans: sofia-pro
- serif support: Roboto Slab
- display support: cubano
- mono/code: attribute-mono

Typography behavior:

- headings should be concise and assertive
- body text should optimize scanability and contrast
- avoid decorative type stacking when one family solves the hierarchy cleanly

Suggested operational scale for UI output:

- 12, 14, 16, 20, 24, 32

## 4. Spacing & Grid

Preferred spacing rhythm:

- 4, 8, 12, 16, 24, 32

Layout rules:

- keep vertical rhythm consistent across sections
- align modules to a stable column structure
- separate concerns with whitespace before introducing borders or effects

## 5. Layout & Composition

- favor clear content blocks with consistent internal padding
- maintain obvious hierarchy: headline -> support text -> primary action
- keep component shells predictable between pages
- do not introduce ad-hoc offsets that break scan patterns

## 6. Components

Buttons:

- primary actions use cyan-family emphasis
- secondary actions stay neutral unless a semantic state is required

Inputs:

- clear labels and explicit error messaging
- visible focus states in both light and dark themes

Cards and sections:

- keep radius, border, elevation, and spacing consistent per page
- rely on neutral layering for depth, not aggressive shadows

## 7. Motion & Interaction

- default to short, purposeful transitions (150ms to 250ms)
- use interaction color cues through cyan emphasis
- ensure hover, focus-visible, active, disabled, and loading states are explicit
- prefer utility-driven motion patterns already present in the stack

## 8. Voice & Brand

Tone should match the visual system:

- concise, confident, and product-specific
- action-oriented microcopy
- no generic filler or vague marketing language inside product UI

## 9. Anti-patterns

- do not introduce off-palette colors when existing tokens solve the problem
- do not flatten hierarchy by reusing the same type size/weight everywhere
- do not add decorative effects that reduce readability or accessibility
- do not mix unrelated visual metaphors in one interface
- do not ship light-only styles for components that appear in dark mode

## 10. Agent Prompt Guide

Quick prompt:

Create UI using the deepscrape theme template. Read current token sources first, then generate Angular Material plus Tailwind markup aligned to cyan primary, rose tertiary, gray1-gray7 neutrals, and class-based dark mode.

Component prompt examples:

- Build a dashboard card grid using gray1/gray7 surfaces, cyan primary actions, and explicit loading/empty/error states.
- Create a form section with neutral containers, high-contrast labels, cyan focus-visible treatment, and dark mode parity.
- Design a toolbar with clear hierarchy, concise copy, and restrained cyan interaction highlights.

## 11. Concrete Examples

See examples/before-after-ui-snippets.md for practical before/after snippets showing:

- off-theme generic output
- corrected deepscrape-aligned output
- rationale for each correction

## 12. Theme Drift Validation

Run this check whenever theme docs are edited:

```bash
bun .github/skills/deepscrape-theme-template-skill/scripts/validate-theme-drift.js
```

The script validates:

- Material palette mapping in src/scss/_mat-theme.scss (cyan primary, rose tertiary)
- Tailwind dark mode strategy in tailwind.config.js (class)
- required theme statements in skill docs

## 13. Directory Structure

- SKILL.md: main behavior and rules
- references/current-theme-map.md: concrete palette/type mapping
- examples/before-after-ui-snippets.md: practical before/after snippets
- scripts/validate-theme-drift.js: doc-to-source drift validator
