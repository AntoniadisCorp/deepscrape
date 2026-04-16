# Authorization Policy Schema Draft (ReBAC + ABAC)

## Version
v1 (draft)

## Core Entities
1. Principal
- uid: string
- isPlatformAdmin: boolean
- memberships: map<orgId, role>

2. Resource
- type: ai | crawl | machine | billing | organization
- orgId: string | null
- ownerId: string | null

3. Relationship
- organizations/{orgId}
- memberships/{uid_orgId}
- invitations/{inviteId}

4. Action
- ai: execute
- crawl: execute, read
- machine: read, deploy, update, delete
- billing: read, manage
- organization: read, manage, invite

5. Context Attributes
- timestamp
- request method/path
- x-org-id
- x-authz-org-mode
- billing access mode
- correlation id

## Decision Event Schema (Middleware)
- version: v1
- timestamp: number
- correlationId: string
- subjectUid: string
- isPlatformAdmin: boolean
- resource: string
- action: string
- result: allow | deny
- reasonCode: string
- orgId: string optional
- ownerId: string optional
- source: middleware
- mode: strict | compat

## Evaluation Rules
1. Platform admin bypass.
2. Resolve effective roles from:
- ownerId == uid -> self role
- memberships[orgId] -> org role
3. Apply resource/action policy table.
4. Deny by default.

## Compatibility Mode
- compat: owner fallback inferred for self-scoped legacy flows.
- strict: no inferred owner fallback without explicit context.

## Storage
- Policy table in code for deterministic versioned behavior.
- Relationships in Firestore documents (organizations/memberships/invitations).

## Security Invariants
1. No cross-tenant access without membership or explicit self ownership.
2. Deny if org-scoped action has no valid relationship.
3. Never trust frontend-only checks for data protection.
