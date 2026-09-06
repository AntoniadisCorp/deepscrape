# Before/After UI snippets (theme alignment)

Use these examples to quickly spot what is off-theme versus aligned with deepscrape's current design system.

## Example 1: Surface + text hierarchy

### Before (generic and off-theme)

```html
<section class="rounded-xl bg-white p-6 shadow-lg">
  <h2 class="text-2xl font-bold text-purple-700">Analytics Overview</h2>
  <p class="mt-2 text-gray-500">Performance data for this period.</p>
</section>
```

Problems:
- Uses purple brand accents not mapped to current theme direction.
- Light mode only; no dark mode pairing.
- Uses generic gray hierarchy instead of repo neutral tokens.

### After (deepscrape-aligned)

```html
<section class="rounded-xl bg-slate-50/30 p-6 shadow-lg dark:bg-gray7/80">
  <h2 class="text-2xl font-bold text-cyan-700 dark:text-cyan-300">Analytics Overview</h2>
  <p class="mt-2 text-gray6 dark:text-gray2">Performance data for this period.</p>
</section>
```

Why better:
- Uses cyan interaction emphasis consistent with current theme direction.
- Keeps surface and text readable in light and dark modes.
- Reuses the repository neutral token vocabulary.

## Example 2: Action buttons

### Before (hard-coded, inconsistent)

```html
<button class="rounded-md bg-blue-600 px-4 py-2 text-white">Run Report</button>
<button class="rounded-md border border-blue-600 px-4 py-2 text-blue-600">Export CSV</button>
```

### After (theme-aware and state-friendly)

```html
<button
  class="rounded-md bg-cyan-600 px-4 py-2 text-white transition hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
>
  Run Report
</button>
<button
  class="rounded-md border border-cyan-600 px-4 py-2 text-cyan-700 transition hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-950/40"
>
  Export CSV
</button>
```

Why better:
- Uses cyan system accents and consistent hover/focus behavior.
- Adds explicit interactive states for accessibility and clarity.
- Includes dark mode compatibility.

## Example 3: Status accents (tertiary usage)

### Before (accent overload)

```html
<span class="rounded-full bg-pink-200 px-3 py-1 text-xs font-semibold text-pink-800">Warning</span>
```

### After (controlled tertiary semantics)

```html
<span class="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
  Warning
</span>
```

Why better:
- Uses rose as a restrained tertiary accent rather than a primary identity color.
- Preserves readability in both color schemes.
