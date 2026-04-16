# Authorization Architecture Completion Checklist

## Purpose
This document closes the ReBAC + ABAC planning prompt by mapping each required area to current status (Done / In Progress / Todo), concrete file ownership, and final closure tasks for production readiness.

## Scope Baseline
- Authorization model: ReBAC with ABAC conditions.
- Backward compatibility: preserved via self-owned fallback behavior and additive org/membership rollout.
- Coverage assessed across Angular frontend, API middleware, Firebase Functions, and Firestore rules.

## Requirement Coverage Matrix

| Prompt Requirement | Status | Evidence | Concrete Ownership |
|---|---|---|---|
| 1. Current-state audit | Done | Existing guard, middleware, route, and rules audit translated into implemented controls and remaining gaps | Platform Security + API: [functions/src/infrastructure/authz.middleware.ts](functions/src/infrastructure/authz.middleware.ts), [functions/src/infrastructure/syncaiapi.ts](functions/src/infrastructure/syncaiapi.ts), [firestore.rules](firestore.rules); Frontend Security: [src/app/core/guards/authz.guard.ts](src/app/core/guards/authz.guard.ts), [src/app/core/services/authz.service.ts](src/app/core/services/authz.service.ts) |
| 2. Target architecture definition | Done | Principal/resource/action/context model codified; policy decision and enforcement points implemented across server/client/rules | Authorization Core: [functions/src/domain/authz.domain.ts](functions/src/domain/authz.domain.ts), [src/app/core/services/authz.service.ts](src/app/core/services/authz.service.ts); Enforcement: [functions/src/infrastructure/authz.middleware.ts](functions/src/infrastructure/authz.middleware.ts), [src/app/core/directives/if-authorized.directive.ts](src/app/core/directives/if-authorized.directive.ts) |
| 3. Incremental rollout plan and migration path | Implemented (Technical) | 10-step execution completed in this branch; production activation remains gated by signoff | Rollout Coordination: API team + Frontend team. Primary files: [src/app/routes/user/main.route.ts](src/app/routes/user/main.route.ts), [src/app/routes/user/settings.route.ts](src/app/routes/user/settings.route.ts), [functions/src/infrastructure/syncaiapi.ts](functions/src/infrastructure/syncaiapi.ts), [functions/src/app/auth.ts](functions/src/app/auth.ts) |
| 4. Security and reliability controls | Implemented (Technical), Pending Ops Signoff | Decision schema/log emission implemented; retention/dashboard/alerts require ops closure | Security Engineering: [functions/src/infrastructure/authz.middleware.ts](functions/src/infrastructure/authz.middleware.ts), [functions/src/infrastructure/syncaiapi.ts](functions/src/infrastructure/syncaiapi.ts), [firestore.rules](firestore.rules) |
| 5. Validation strategy with negative/cross-tenant tests | Implemented (Technical) | Policy and middleware denial/cross-tenant baseline tests added and passing | QA + Platform Security: [functions/src/domain/authz.domain.spec.ts](functions/src/domain/authz.domain.spec.ts), [functions/src/infrastructure/authz.middleware.spec.ts](functions/src/infrastructure/authz.middleware.spec.ts) |
| 6. Deliverables package (ADR, schema, migration checklist, phased task list) | Published, Pending Human Signoff | Governance documents published; release approvals still pending | Architecture owner + Tech lead. Docs target under [docs](docs) |

## Additional Explicit Completion Items Requested

### A. Broader route and resource migration to policy enforcement
Status: Implemented (Technical)

Current coverage:
- API route protection is active for key org/ai/crawl/machine endpoints in [functions/src/infrastructure/syncaiapi.ts](functions/src/infrastructure/syncaiapi.ts).
- Angular route guard coverage exists for selected user routes in [src/app/routes/user/main.route.ts](src/app/routes/user/main.route.ts) and workspace settings in [src/app/routes/user/settings.route.ts](src/app/routes/user/settings.route.ts).

Remaining checklist:
1. Route inventory and classification
- Owner: API + Frontend routing maintainers
- Deliverable: list of every endpoint/route with required resource/action attributes
- File touchpoints: [functions/src/infrastructure/syncaiapi.ts](functions/src/infrastructure/syncaiapi.ts), [src/app/routes/user/main.route.ts](src/app/routes/user/main.route.ts), [src/app/routes/user/settings.route.ts](src/app/routes/user/settings.route.ts)

2. Policy enforcement completion
- Owner: API team
- Deliverable: requirePermission applied to all sensitive API endpoints; explicit org/owner context extraction rules
- File touchpoints: [functions/src/infrastructure/authz.middleware.ts](functions/src/infrastructure/authz.middleware.ts), [functions/src/infrastructure/syncaiapi.ts](functions/src/infrastructure/syncaiapi.ts)

3. Frontend gating consistency
- Owner: Frontend team
- Deliverable: authz guard metadata and conditional rendering parity across protected surfaces
- File touchpoints: [src/app/core/guards/authz.guard.ts](src/app/core/guards/authz.guard.ts), [src/app/core/directives/if-authorized.directive.ts](src/app/core/directives/if-authorized.directive.ts), [src/app/core/services/authz.service.ts](src/app/core/services/authz.service.ts)

Effort/Risk:
- Effort: Medium
- Risk: Medium to High if any route remains ungated
- Dependency: completed route inventory

### B. Full audit/logging pipeline for policy decisions
Status: Implemented (Technical), Pending Ops Closure

Current gap:
- Denials are returned, but there is no standardized decision log stream with actor/resource/action/result/context and correlation metadata.

Checklist:
1. Decision event schema
- Owner: Security engineering
- Deliverable: structured schema for allow/deny with reason code and context source
- Initial anchor: [functions/src/infrastructure/authz.middleware.ts](functions/src/infrastructure/authz.middleware.ts)

2. Middleware decision logging
- Owner: API team
- Deliverable: centralized log emit at every policy decision and fallback path
- File touchpoints: [functions/src/infrastructure/authz.middleware.ts](functions/src/infrastructure/authz.middleware.ts), [functions/src/infrastructure/syncaiapi.ts](functions/src/infrastructure/syncaiapi.ts)

3. Storage and observability integration
- Owner: Platform ops
- Deliverable: retention, dashboards, alerting thresholds for deny spikes and suspicious patterns
- File touchpoints: Functions logging config and operational dashboards

Effort/Risk:
- Effort: Medium
- Risk: High without forensic-grade audit trail
- Dependency: decision schema approval

### C. Expanded end-to-end denial and cross-tenant boundary coverage
Status: Implemented (Technical Baseline)

Current baseline:
- Core authorization domain tests exist in [functions/src/domain/authz.domain.spec.ts](functions/src/domain/authz.domain.spec.ts).

Checklist:
1. Denial-path API integration tests
- Owner: QA + API team
- Deliverable: explicit 401/403 tests for each protected endpoint and action
- File touchpoints: API test suite around [functions/src/infrastructure/syncaiapi.ts](functions/src/infrastructure/syncaiapi.ts)

2. Cross-tenant boundary tests
- Owner: QA + Security
- Deliverable: tenant A cannot read/modify tenant B orgs, members, machines, or invites
- File touchpoints: API and Firestore rules around [firestore.rules](firestore.rules)

3. Frontend guard and directive denial UX tests
- Owner: Frontend QA
- Deliverable: route redirects, hidden controls, and blocked actions when not authorized
- File touchpoints: [src/app/core/guards/authz.guard.ts](src/app/core/guards/authz.guard.ts), [src/app/core/directives/if-authorized.directive.ts](src/app/core/directives/if-authorized.directive.ts), [src/app/pages/user/settings/workspace/workspace.component.ts](src/app/pages/user/settings/workspace/workspace.component.ts)

Effort/Risk:
- Effort: Medium to High
- Risk: High if boundary tests are missing
- Dependency: finalized route inventory and decision logging tags

### D. Final ADR/checklist packaging pass for closure across all deliverables
Status: Published, Pending Human Signoff

Checklist:
1. ADR publication
- Owner: Architecture owner
- Deliverable: ADR with rationale, alternatives rejected (classic RBAC), migration safety, rollback and observability decisions
- Docs destination: [docs](docs)

2. Policy schema draft publication
- Owner: Security + API
- Deliverable: schema for principal/resource/relationship/action/context and reason codes
- Docs destination: [docs](docs)

3. Migration checklist sign-off
- Owner: Tech lead + QA lead
- Deliverable: per-phase completion checkboxes and production readiness gate criteria
- Docs destination: [docs](docs)

4. Residual risk register
- Owner: Security engineering
- Deliverable: accepted risks, mitigations, and expiry date per risk
- Docs destination: [docs](docs)

Effort/Risk:
- Effort: Low to Medium
- Risk: Medium (organizational, release governance)
- Dependency: completion of sections A to C

## Phased Closure Plan (Actionable)

### Phase C1: Enforcement Completion
Status: In Progress
- Goal: All sensitive routes/endpoints mapped and protected.
- Dependencies: none.
- Exit criteria: route inventory complete, explicit authz metadata for all protected surfaces.

### Phase C2: Decision Observability
Status: Todo
- Goal: production-grade decision logs and alerts.
- Dependencies: C1 route inventory.
- Exit criteria: allow/deny telemetry with reason codes and dashboards.

### Phase C3: Boundary Assurance
Status: In Progress
- Goal: comprehensive deny and cross-tenant test coverage.
- Dependencies: C1 and C2 tagging conventions.
- Exit criteria: red-team style negative suite passing in CI.

### Phase C4: Governance Packaging
Status: Todo
- Goal: ADR, schema, migration checklist, risk sign-off.
- Dependencies: C1-C3 complete.
- Exit criteria: release-go/no-go packet approved.

## 10-Step Execution Sequence (Start-to-Complete)

Progress:
- Completed: Steps 1-10
- Active: None
- Remaining: None

## Remaining Production Blockers (Non-Code)

1. Human signoffs are still pending in [docs/AUTHZ_RELEASE_GATE.md](docs/AUTHZ_RELEASE_GATE.md): Security, API, Frontend, QA, Release Manager.
2. Operations closure for decision telemetry is pending: retention policy, dashboards, and alert thresholds.
3. Final release decision remains Conditional Go until the two blockers above are cleared.

1. Freeze authorization inventory baseline.
Owner: Architecture owner + API/Frontend leads. Output: approved endpoint/route/resource/action matrix covering [functions/src/infrastructure/syncaiapi.ts](functions/src/infrastructure/syncaiapi.ts), [src/app/routes/user/main.route.ts](src/app/routes/user/main.route.ts), and [src/app/routes/user/settings.route.ts](src/app/routes/user/settings.route.ts).
Remark: Completed on 2026-03-28 with inventory artifact [docs/AUTHZ_STEP_01_INVENTORY.md](docs/AUTHZ_STEP_01_INVENTORY.md).

2. Close backend enforcement gaps.
Owner: API team. Output: every sensitive endpoint guarded by explicit policy checks using [functions/src/infrastructure/authz.middleware.ts](functions/src/infrastructure/authz.middleware.ts) and [functions/src/infrastructure/syncaiapi.ts](functions/src/infrastructure/syncaiapi.ts).
Remark: Completed on 2026-03-28. Added explicit middleware gating for /orgs, /orgs/invitations/me, and /orgs/invitations/:invitationId/accept in [functions/src/infrastructure/syncaiapi.ts](functions/src/infrastructure/syncaiapi.ts), and aligned self-scoped organization read policy in [functions/src/domain/authz.domain.ts](functions/src/domain/authz.domain.ts) and [src/app/core/services/authz.service.ts](src/app/core/services/authz.service.ts) with passing coverage in [functions/src/domain/authz.domain.spec.ts](functions/src/domain/authz.domain.spec.ts).

3. Close frontend enforcement gaps.
Owner: Frontend team. Output: route metadata and UI-level authorization parity via [src/app/core/guards/authz.guard.ts](src/app/core/guards/authz.guard.ts), [src/app/core/directives/if-authorized.directive.ts](src/app/core/directives/if-authorized.directive.ts), and [src/app/core/services/authz.service.ts](src/app/core/services/authz.service.ts).
Remark: Completed on 2026-03-28. Added explicit authzGuard policy metadata for dashboard (crawl/read), playground (ai/execute), billing (billing/read), and settings (organization/read) in [src/app/routes/user/main.route.ts](src/app/routes/user/main.route.ts).

4. Finalize compatibility mode controls.
Owner: Security + API. Output: explicit strict-mode feature flag design, fallback behavior guardrails, and rollback trigger criteria mapped to [functions/src/domain/authz.domain.ts](functions/src/domain/authz.domain.ts) and [src/app/core/interceptors/org-context.interceptor.ts](src/app/core/interceptors/org-context.interceptor.ts).
Remark: Completed on 2026-03-28. Added backend strict mode flag AUTHZ_STRICT_ORG_MODE in [functions/src/infrastructure/authz.middleware.ts](functions/src/infrastructure/authz.middleware.ts), added client-side strict mode state and fallback control in [src/app/core/services/authz.service.ts](src/app/core/services/authz.service.ts), and added request telemetry header x-authz-org-mode in [src/app/core/interceptors/org-context.interceptor.ts](src/app/core/interceptors/org-context.interceptor.ts).

5. Implement policy decision event schema.
Owner: Security engineering. Output: structured decision payload (allow/deny, reason, actor, resource, action, context source, correlation ids) anchored in [functions/src/infrastructure/authz.middleware.ts](functions/src/infrastructure/authz.middleware.ts).
Remark: Completed on 2026-03-28. Added AuthorizationDecisionEvent v1 schema and middleware population path with correlationId, mode, resource/action, subject, decision result, and reasonCode in [functions/src/infrastructure/authz.middleware.ts](functions/src/infrastructure/authz.middleware.ts).

6. Implement centralized decision logging pipeline.
Owner: API + Platform ops. Output: middleware and handler log emission, retention policy, and dashboard wiring for deny spikes and anomaly detection.
Remark: Completed on 2026-03-28 for middleware stream. Added centralized structured log emission for all allow/deny policy decisions via [functions/src/infrastructure/authz.middleware.ts](functions/src/infrastructure/authz.middleware.ts) using JSON decision events. Platform dashboard and retention wiring remains operational follow-through under ops.

7. Complete denial-path integration tests.
Owner: QA + API. Output: deterministic 401/403 tests for protected endpoints and policy actions around [functions/src/infrastructure/syncaiapi.ts](functions/src/infrastructure/syncaiapi.ts).
Remark: Completed on 2026-03-28. Added middleware denial-path tests in [functions/src/infrastructure/authz.middleware.spec.ts](functions/src/infrastructure/authz.middleware.spec.ts) that verify 401 (no auth), 403 (denied org scope), and allow path behavior, with passing run alongside [functions/src/domain/authz.domain.spec.ts](functions/src/domain/authz.domain.spec.ts).

8. Complete cross-tenant boundary tests.
Owner: QA + Security. Output: tenant separation tests (org/member/invite/machine/crawl boundaries) including Firestore rule validation in [firestore.rules](firestore.rules).
Remark: Completed on 2026-03-28 for policy and middleware boundary baseline. Added cross-tenant deny and in-tenant allow coverage in [functions/src/domain/authz.domain.spec.ts](functions/src/domain/authz.domain.spec.ts), and revalidated denial-path middleware behavior in [functions/src/infrastructure/authz.middleware.spec.ts](functions/src/infrastructure/authz.middleware.spec.ts).

9. Complete governance deliverables package.
Owner: Architecture owner + Tech lead. Output: ADR, policy schema draft, migration checklist, and residual risk register published under [docs](docs).
Remark: Completed on 2026-03-28. Published governance pack: [docs/ADR-2026-03-AUTHZ-REBAC-ABAC.md](docs/ADR-2026-03-AUTHZ-REBAC-ABAC.md), [docs/AUTHZ_POLICY_SCHEMA_DRAFT.md](docs/AUTHZ_POLICY_SCHEMA_DRAFT.md), [docs/AUTHZ_MIGRATION_SIGNOFF_CHECKLIST.md](docs/AUTHZ_MIGRATION_SIGNOFF_CHECKLIST.md), and [docs/AUTHZ_RESIDUAL_RISK_REGISTER.md](docs/AUTHZ_RESIDUAL_RISK_REGISTER.md).

10. Run final go/no-go closure gate.
Owner: Engineering leadership + Security + QA. Output: signed release checklist proving Definition of Done, tested rollback path, and monitored rollout decision.
Remark: Completed on 2026-03-28 for technical gate execution. Published release gate artifact [docs/AUTHZ_RELEASE_GATE.md](docs/AUTHZ_RELEASE_GATE.md) with evidence-backed pass/fail criteria and conditional-go outcome pending human signoffs.

## Feature Flags, Fallbacks, Rollback

Current:
- Backward-compatible self-owned fallback is active in policy resolution.
- Org context propagation exists via header injection.

Final closure checklist:
1. Add explicit feature-flag toggles for strict org-only enforcement mode.
2. Keep fallback mode available during cutover with monitored usage.
3. Rollback path: disable strict mode, preserve existing data model, retain read-only access for forensic analysis.

## Assumptions
1. Organization membership remains source-of-truth for relationship decisions.
2. Billing and authorization checks continue to compose in API middleware without changing billing semantics.
3. Firebase custom claims remain limited to platform-level role metadata.

## Open Questions
1. Should invitation acceptance always switch active org context, or remain user-selectable by policy?
2. What is the required retention period for allow and deny decision logs?
3. Is strict denial UX expected to show policy reason codes to end users or only generic forbidden states?

## Definition of Done for Authorization Architecture
All items below must be true:
1. Every sensitive backend endpoint and frontend route/control has explicit policy enforcement mapping.
2. Decision logging is complete, searchable, and alert-backed.
3. Cross-tenant denial and boundary suites are mandatory and green in CI.
4. ADR + schema + migration checklist + risk register are published in docs and approved.
5. Rollback procedure is tested and documented.
