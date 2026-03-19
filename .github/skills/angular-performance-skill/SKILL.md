---
name: angular-performance
description: Ruthless Angular performance workflow for auditing and fixing bottlenecks in change detection, async waterfalls, bundle size, rendering, and SSR/hydration.
---

# Angular Performance Skill

Use this skill when you want measurable Angular performance improvements, not vague best-practice talk.

## Outcome

Produce a prioritized performance report and an implementation plan with concrete code changes that improve:
- Render speed
- JavaScript bundle size
- Time-to-interactive
- SSR and hydration quality

## Scope

Apply to:
- New Angular features before merge
- Existing pages/components with slow UX
- PR reviews that touch routing, templates, state, or data fetching
- SSR/hydration regressions

Do not use for:
- Pure visual styling requests with no performance impact
- Backend-only changes unrelated to Angular runtime behavior

## Performance Workflow

### 1. Baseline and classify
Collect baseline metrics before changing code:
- Route-level bundle/chunk sizes
- Largest components by render cost
- Network waterfall for critical route
- SSR vs client-hydrated behavior

Classify bottlenecks by category:
1. Change detection
2. Async waterfalls
3. Bundle optimization
4. Rendering performance
5. SSR/hydration
6. Template inefficiencies
7. State over-rendering
8. Memory/subscription leaks

### 2. Triage by impact
Prioritize issues with this order:
1. Critical: user-visible stalls, route-level JS bloat, nested async waterfalls
2. High: list rendering thrash, hydration delays, repeated expensive template work
3. Medium: architectural cleanup that reduces future regressions

Fix highest-impact first. Ignore low-value micro-optimizations until critical/high are done.

### 3. Apply targeted fixes

#### Change detection
- Enforce `ChangeDetectionStrategy.OnPush`.
- Prefer `signal`, `computed`, and `input` over mutable fields.
- Keep zoneless-safe patterns; avoid zone-dependent manual checks.

#### Async/waterfall elimination
- Replace nested subscriptions with `switchMap`, `mergeMap`, `combineLatest`, or `forkJoin`.
- Move critical route data to resolvers where SSR-first rendering matters.

#### Bundle optimization
- Lazy-load routes/components with `loadChildren` or `loadComponent`.
- Use `@defer` for non-critical heavy UI.
- Prefer direct imports over broad barrel imports that hurt tree-shaking.
- Dynamically import heavy third-party libraries where possible.

#### Rendering optimization
- Use `@for` with stable identity tracking (`track item.id`).
- Add virtualization for large lists.
- Replace expensive template methods with pure pipes or `computed` signals.

#### SSR and hydration
- Ensure hydration config is correct for the app strategy.
- Defer below-the-fold regions with hydrate triggers when appropriate.
- Use `TransferState` for server-fetched data to avoid duplicate client fetches.

#### Memory hygiene
- Prefer `toSignal` for observable consumption in templates.
- Use `takeUntilDestroyed` for imperative subscriptions.

### 4. Validate and compare
After each fix group:
- Verify behavior parity (no functional regressions).
- Compare before/after metrics.
- Keep only changes with measurable impact or clear maintainability gains.

### 5. Final report
Return:
1. Ranked findings by severity and impact
2. Exact files/symbols changed
3. Measured or expected performance deltas
4. Remaining risks and follow-up tasks

## Decision Logic

If page is slow but JS chunk size is normal:
- Investigate change detection and rendering patterns first.

If first load is slow and chunks are large:
- Prioritize route splitting, defer, and dynamic imports.

If SSR exists but page still flashes or refetches on load:
- Audit hydration and `TransferState` usage.

If list interactions are laggy:
- Fix tracking identities, remove template methods, evaluate virtualization.

If data appears late due to dependency chain:
- Flatten async flow and parallelize requests.

## Quality Gates

Mark work complete only when all are true:
- Every new/modified component is standalone and `OnPush`.
- No nested subscription waterfalls in touched code.
- Lists use stable track expressions.
- Heavy non-critical UI is lazy/deferred.
- SSR/hydration path does not duplicate critical fetches.
- Subscription cleanup is deterministic.
- Performance claim is supported by measurements or explicit estimate assumptions.

## Output Format

Use this structure in responses:
1. Findings (ordered by severity)
2. Proposed/implemented fixes
3. Validation steps and results
4. Risks and next steps

## Example Prompts

- Audit this Angular route for render and bundle bottlenecks, then apply fixes in priority order.
- Refactor this component to remove waterfall fetching and template recomputation.
- Review this PR strictly for Angular performance regressions and missing lazy/defer opportunities.
- Optimize SSR hydration for this page and remove duplicate client fetches.
