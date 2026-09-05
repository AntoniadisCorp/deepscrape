# Architecture Remediation Plan

## What the graphified audit surfaced

The codebase is functional, but the architecture is carrying avoidable drift:

1. Route-layer bundle leakage.
Service auth routes were loading through the broad `src/app/pages` barrel, which pulls unrelated page surfaces into the same lazy boundary.
2. Split server contracts.
`server.ts` and `server-elysia.ts` each own their own request pipeline, static handling, and security behavior instead of sharing one adapter-neutral contract.
3. Authorization policy duplication.
Frontend `AuthzService` and Functions authorization logic define the same policy matrix independently, which creates drift risk.
4. Stale upgrade debt.
The repo still carries `zone.js` in dependencies even though the app is zoneless, and some scripts still default to `npm` even though Bun is the repo standard.

## Phased plan

### Phase 1: Tighten route boundaries

Goal: stop dragging unrelated code into lazy route chunks.

Scope:
- Replace broad page barrels with direct component imports in route files.
- Keep page-level components lazy-loaded, but make the imports explicit.
- Audit remaining route barrels for the same pattern.

Success criteria:
- Service routes import only the components they render.
- No route file depends on the giant `src/app/pages` barrel.

### Phase 2: Consolidate the server contract

Goal: make Express and Elysia share one behavioral spec.

Scope:
- Extract shared middleware and security policy into a common server module.
- Keep adapter-specific bootstraps thin.
- Align cookie, CSRF, static-file, and logging behavior across both entrypoints.

Success criteria:
- One source of truth for request handling.
- No divergence between adapters for auth, security headers, or static asset policy.

### Phase 3: Unify authorization policy

Goal: remove frontend/backend policy drift.

Scope:
- Move the policy matrix into a shared domain contract.
- Generate frontend and backend checks from the same resource/action model.
- Keep strict-mode and compatibility behavior explicit.

Success criteria:
- The same resource/action combination resolves the same way on client and server.
- Cross-tenant denial tests stay green in both layers.

### Phase 4: Finish the upgrade cleanup

Goal: remove stale runtime and tooling debt.

Scope:
- Drop `zone.js` if no source import remains and Angular zoneless mode is stable.
- Convert remaining local scripts to Bun-first commands where they are still using `npm`.
- Trim any obsolete compatibility dependencies only after build verification.

Success criteria:
- Build and test commands use the repo-standard runtime.
- No dead dependencies remain in the application shell.

## Current execution status

- Phase 1: started
- Phase 2: planned
- Phase 3: planned
- Phase 4: planned

## Notes

The route import cleanup is the first safe win because it improves chunk boundaries without changing behavior. The server and authz work should be staged after that, because both are cross-cutting and deserve a shared contract before any larger refactor.