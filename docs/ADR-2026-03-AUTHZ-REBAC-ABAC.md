# ADR-2026-03: Authorization Architecture with ReBAC + ABAC

## Status
Accepted for rollout (implementation in progress)

## Context
The platform needs production-grade authorization with tenant boundaries, invitation flows, machine/crawl controls, and billing-aware execution paths. Classic RBAC is not sufficient for per-resource relationships and organization-scoped access.

## Decision
Adopt Relationship-Based Access Control (ReBAC) with ABAC conditions:
- ReBAC source of truth: organizations, memberships, invitations.
- ABAC context: orgId, ownerId, billing mode, request path/action, platform-admin claim.
- Policy decision core: [functions/src/domain/authz.domain.ts](functions/src/domain/authz.domain.ts).
- Server enforcement: [functions/src/infrastructure/authz.middleware.ts](functions/src/infrastructure/authz.middleware.ts), [functions/src/infrastructure/syncaiapi.ts](functions/src/infrastructure/syncaiapi.ts).
- Client enforcement: [src/app/core/services/authz.service.ts](src/app/core/services/authz.service.ts), [src/app/core/guards/authz.guard.ts](src/app/core/guards/authz.guard.ts), [src/app/core/directives/if-authorized.directive.ts](src/app/core/directives/if-authorized.directive.ts).
- Data-layer boundary: [firestore.rules](firestore.rules).

## Alternatives Considered
1. Classic RBAC only: rejected due to weak tenant/resource relationship modeling.
2. ACLs embedded in every resource document: rejected due to duplication and update complexity.
3. Hardcoded endpoint checks only: rejected due to drift and low auditability.

## Backward Compatibility
- Self-owned fallback remains available for migration continuity.
- Strict org mode feature flag supports controlled cutover.

## Rollback
- Disable strict org mode.
- Keep existing relationship documents.
- Continue compatibility-mode enforcement while fixes are deployed.

## Observability
- Structured authorization decision events emitted by middleware.
- Decision schema and logging pipeline tracked in closure checklist.

## Consequences
Positive:
- Explicit policy model and enforcement consistency across stack.
- Better tenant isolation and auditability.

Trade-offs:
- More policy metadata required in routes and handlers.
- Requires ongoing policy/test governance to prevent drift.
