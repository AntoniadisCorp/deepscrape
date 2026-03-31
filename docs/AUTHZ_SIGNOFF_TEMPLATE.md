# Authorization Signoff Template

Date:
Release/Branch:
Scope: ReBAC + ABAC Authorization Rollout
Decision: Go | Conditional Go | No-Go

## Prerequisite Evidence

- Release gate reviewed: [docs/AUTHZ_RELEASE_GATE.md](docs/AUTHZ_RELEASE_GATE.md)
- Completion checklist reviewed: [docs/AUTHZ_COMPLETION_CHECKLIST.md](docs/AUTHZ_COMPLETION_CHECKLIST.md)
- ADR reviewed: [docs/ADR-2026-03-AUTHZ-REBAC-ABAC.md](docs/ADR-2026-03-AUTHZ-REBAC-ABAC.md)
- Policy schema reviewed: [docs/AUTHZ_POLICY_SCHEMA_DRAFT.md](docs/AUTHZ_POLICY_SCHEMA_DRAFT.md)
- Migration checklist reviewed: [docs/AUTHZ_MIGRATION_SIGNOFF_CHECKLIST.md](docs/AUTHZ_MIGRATION_SIGNOFF_CHECKLIST.md)
- Residual risk register reviewed: [docs/AUTHZ_RESIDUAL_RISK_REGISTER.md](docs/AUTHZ_RESIDUAL_RISK_REGISTER.md)

## Required Attestations

| Attestation | Yes/No | Notes |
|---|---|---|
| Sensitive backend routes are explicitly policy-gated |  |  |
| Frontend protected routes use explicit authorization metadata |  |  |
| Denial-path and cross-tenant tests are passing in CI |  |  |
| Structured policy decision logging is enabled |  |  |
| Ops telemetry closure is complete (retention/dashboard/alerts) |  |  |
| Rollback path is documented and tested |  |  |

## Approval Records

| Role | Name | Decision (Go/Conditional/No-Go) | Conditions (if any) | Signature | Date |
|---|---|---|---|---|---|
| Security Lead |  |  |  |  |  |
| API Lead |  |  |  |  |  |
| Frontend Lead |  |  |  |  |  |
| QA Lead |  |  |  |  |  |
| Release Manager |  |  |  |  |  |

## Risk Acceptance (Required for Conditional Go)

Accepted risks:

Mitigations and deadlines:

Approver:
Date:

## Final Release Decision

Final status: Go | Conditional Go | No-Go
Change window:
Owner:
