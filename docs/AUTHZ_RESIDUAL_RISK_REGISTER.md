# Authorization Residual Risk Register

## Scale
- Likelihood: Low | Medium | High
- Impact: Low | Medium | High

| Risk ID | Risk | Likelihood | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-01 | Ungated endpoint introduced in future changes | Medium | High | Route inventory CI check and code review gate on requirePermission/authz metadata | API Lead | Open |
| R-02 | Cross-tenant leakage via query mistakes | Medium | High | Boundary tests + orgId ownerId extraction hardening | Security + QA | Open |
| R-03 | Over-permissive compatibility fallback remains too long | Medium | Medium | Strict mode rollout schedule and telemetry threshold | Security Lead | Open |
| R-04 | Insufficient decision log retention for forensics | Medium | High | Define retention and archive policy before production signoff | Platform Ops | Open |
| R-05 | Frontend UI exposes actions not allowed by policy | Medium | Medium | Directive and guard parity tests for denied states | Frontend Lead | Open |
| R-06 | Firestore rule drift from middleware policy | Low | High | Periodic rule-policy drift review with test fixtures | Security Engineering | Open |

## Review Cadence
- Weekly during migration
- Monthly after production stabilization

## Exit Criteria
- All High impact open risks must have active mitigations and an approved owner.
- No unowned risk entries.
