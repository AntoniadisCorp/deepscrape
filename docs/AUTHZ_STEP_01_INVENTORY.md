# Authorization Step 1 - Route and Policy Inventory Baseline

Date: 2026-03-28
Status: Completed
Source of truth files:
- [functions/src/infrastructure/syncaiapi.ts](functions/src/infrastructure/syncaiapi.ts)
- [src/app/routes/user/main.route.ts](src/app/routes/user/main.route.ts)
- [src/app/routes/user/settings.route.ts](src/app/routes/user/settings.route.ts)

## Backend API Inventory (Sync API)

| Method | Path | Billing Gate | Policy Gate | Resource/Action | Status |
|---|---|---|---|---|---|
| GET | /orgs | No | No | N/A | Gap (should be explicitly gated to org read scope) |
| GET | /orgs/:orgId | No | Yes | organization/read | Covered |
| GET | /orgs/:orgId/members | No | Yes | organization/read | Covered |
| GET | /orgs/invitations/me | No | No | N/A | Gap (authn-only behavior is implicit) |
| GET | /jina/:url | Yes | Yes | ai/execute | Covered |
| GET | /machines/machine/:id | Yes | Yes | machine/read | Covered |
| GET | /machines/check-image | Yes | Yes | machine/read | Covered |
| GET | /machines/machine/waitforstate/:machineId | Yes | Yes | machine/read | Covered |
| POST | /orgs | No | Yes | organization/manage | Covered |
| POST | /orgs/:orgId/invitations | No | Yes | organization/invite | Covered |
| POST | /orgs/invitations/:invitationId/accept | No | No | N/A | Gap (implicit checks in handler only) |
| POST | /anthropic/messages | Yes | Yes | ai/execute | Covered |
| POST | /openai/chat/completions | Yes | Yes | ai/execute | Covered |
| POST | /groq/chat/completions | Yes | Yes | ai/execute | Covered |
| POST | /crawl | Yes | Yes | crawl/execute | Covered |
| POST | /machines/deploy | Yes | Yes | machine/deploy | Covered |
| PUT | /machines/machine/:machineId/start | Yes | Yes | machine/update | Covered |
| PUT | /machines/machine/:machineId/suspend | Yes | Yes | machine/update | Covered |
| PUT | /machines/machine/:machineId/stop | Yes | Yes | machine/update | Covered |
| DELETE | /orgs/:orgId/members/:userId | No | Yes | organization/manage | Covered |
| DELETE | /machines/machine/:machineId | Yes | Yes | machine/delete | Covered |

## Frontend Route Inventory (User Area)

| Route | Guarding | Policy Metadata | Status |
|---|---|---|---|
| /dashboard | authGuard only | None | Gap (not mapped to explicit resource/action) |
| /playground | authGuard only | None | Gap (not mapped to explicit resource/action) |
| /crawlpack | paywallGuard + authzGuard | crawl/execute | Covered |
| /operations | paywallGuard + authzGuard | crawl/execute | Covered |
| /billing | authGuard only | None | Gap (billing read/manage policy metadata missing) |
| /settings | authGuard only | None | Partial (container ungated by policy) |
| /settings/workspace | authzGuard | organization/read | Covered |
| /admin | AdminGuard | None | Separate admin model (outside ReBAC mapping) |

## Baseline Security Gaps Captured by Step 1

1. Missing explicit policy middleware for org listing and invitation self-scope endpoints.
2. Invitation acceptance relies on handler logic but not explicit requirePermission middleware.
3. Frontend route policy coverage is partial outside crawl and workspace flows.
4. Billing UI routes are not yet mapped to explicit authz metadata.

## Step 2 Inputs

This baseline unblocks Step 2 (backend enforcement completion) with the following target set:
1. Add explicit policy checks to API gaps listed above.
2. Normalize authn/authz behavior so sensitive org endpoints are middleware-enforced first.
3. Keep backward-compatible behavior for self-owned and invitation acceptance flows.
