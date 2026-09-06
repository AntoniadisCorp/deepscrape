# Authorization Migration Signoff Checklist

## Change Window
- Target branch: authz/rebac-abac-rollout-next
- Scope: ReBAC + ABAC rollout for user/API/organization flows

## Pre-Deployment Gates
1. Route inventory frozen and approved.
2. Backend sensitive routes have explicit requirePermission middleware.
3. Frontend protected routes include authz metadata where required.
4. Firestore rules reviewed for org/membership/invitation boundaries.
5. Compatibility mode and strict mode behavior documented.

## Test Gates
1. Policy unit tests green.
2. Middleware denial tests green (401/403/allow).
3. Cross-tenant boundary policy tests green.
4. No new compile or lint errors in touched modules.

## Observability Gates
1. Decision event schema present.
2. Structured authz decision logs emitted.
3. Correlation id fields present in decisions.

## Rollback Gates
1. Strict mode disable path verified.
2. Compatibility mode behavior validated post-toggle.
3. Incident response runbook linked.

## Signoff
- Security Lead: Pending
- API Lead: Pending
- Frontend Lead: Pending
- QA Lead: Pending
- Release Manager: Pending
