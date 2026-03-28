/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
import {NextFunction, Request, Response} from "express"
import {db} from "../app/config"
import {
  AuthAction,
  AuthData,
  AuthResource,
  AuthorizationSubject,
  OrgRole,
  canPerform,
} from "../domain/authz.domain"
import {env} from "../config"

type RequirePermissionOptions<Resource extends AuthResource> = {
    getData?: (req: Request) => Partial<AuthData<Resource>>
}

type LocalsWithAuthz = {
    authzSubject?: AuthorizationSubject
    authzDecisionEvent?: AuthorizationDecisionEvent
}

const AUTHZ_STRICT_ORG_MODE = env.AUTHZ_STRICT_ORG_MODE === "true"

type AuthorizationDecisionEvent = {
    version: "v1"
    timestamp: number
    correlationId: string
    subjectUid: string
    isPlatformAdmin: boolean
    resource: string
    action: string
    result: "allow" | "deny"
    reasonCode: string
    orgId?: string
    ownerId?: string
    source: "middleware"
    mode: "strict" | "compat"
}

function getCorrelationId(req: Request): string {
  const requestId = req.headers["x-request-id"]
  if (typeof requestId === "string" && requestId.trim().length > 0) {
    return requestId.trim()
  }

  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function buildDecisionEvent<Resource extends AuthResource>(
  req: Request,
  subject: AuthorizationSubject,
  resource: Resource,
  action: AuthAction<Resource>,
  data: AuthData<Resource>,
  result: "allow" | "deny",
  reasonCode: string
): AuthorizationDecisionEvent {
  return {
    version: "v1",
    timestamp: Date.now(),
    correlationId: getCorrelationId(req),
    subjectUid: subject.uid,
    isPlatformAdmin: subject.isPlatformAdmin,
    resource,
    action,
    result,
    reasonCode,
    orgId: data.orgId,
    ownerId: data.ownerId,
    source: "middleware",
    mode: AUTHZ_STRICT_ORG_MODE ? "strict" : "compat",
  }
}

function emitAuthorizationDecision(event: AuthorizationDecisionEvent): void {
  console.info("[authz-decision]", JSON.stringify(event))
}

async function loadMemberships(uid: string): Promise<Record<string, OrgRole>> {
  const snapshot = await db.collection("memberships")
    .where("userId", "==", uid)
    .limit(100)
    .get()

  const memberships: Record<string, OrgRole> = {}

  for (const doc of snapshot.docs) {
    const data = doc.data() as { orgId?: string; role?: OrgRole }
    if (!data.orgId || !data.role) {
      continue
    }

    memberships[data.orgId] = data.role
  }

  return memberships
}

function getOrgIdFromRequest(req: Request): string | undefined {
  if (typeof req.params?.orgId === "string" && req.params.orgId.trim().length > 0) {
    return req.params.orgId.trim()
  }

  const headerOrgId = req.headers["x-org-id"]
  if (typeof headerOrgId === "string" && headerOrgId.trim().length > 0) {
    return headerOrgId.trim()
  }

  if (typeof req.body?.orgId === "string" && req.body.orgId.trim().length > 0) {
    return req.body.orgId.trim()
  }

  if (typeof req.query?.orgId === "string" && req.query.orgId.trim().length > 0) {
    return req.query.orgId.trim()
  }

  return undefined
}

function getOwnerIdFromRequest(req: Request): string | undefined {
  if (typeof req.params?.ownerId === "string" && req.params.ownerId.trim().length > 0) {
    return req.params.ownerId.trim()
  }

  if (typeof req.body?.ownerId === "string" && req.body.ownerId.trim().length > 0) {
    return req.body.ownerId.trim()
  }

  if (typeof req.query?.ownerId === "string" && req.query.ownerId.trim().length > 0) {
    return req.query.ownerId.trim()
  }

  return undefined
}

async function buildSubject(req: Request, res: Response): Promise<AuthorizationSubject | null> {
  const uid = req.user?.uid
  if (!uid) {
    return null
  }

  const locals = res.locals as LocalsWithAuthz
  if (locals.authzSubject) {
    return locals.authzSubject
  }

  const role = (req.user as Record<string, unknown> | undefined)?.["role"]
  const subject: AuthorizationSubject = {
    uid,
    isPlatformAdmin: role === "admin",
    memberships: await loadMemberships(uid),
    claims: req.user,
  }

  locals.authzSubject = subject
  return subject
}

export function requirePermission<Resource extends AuthResource>(
  resource: Resource,
  action: AuthAction<Resource>,
  options: RequirePermissionOptions<Resource> = {}
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subject = await buildSubject(req, res)
      const locals = res.locals as LocalsWithAuthz
      if (!subject) {
        res.status(401).json({error: "unauthorized", code: "unauthorized"})
        return
      }

      const inferredOrgId = getOrgIdFromRequest(req)
      const explicitOwnerId = getOwnerIdFromRequest(req)

      const inferredData: Partial<AuthData<Resource>> = {
        orgId: inferredOrgId,
        ownerId: explicitOwnerId ?? (inferredOrgId ? undefined : (AUTHZ_STRICT_ORG_MODE ? undefined : subject.uid)),
      } as Partial<AuthData<Resource>>

      const extraData = options.getData?.(req) ?? {}
      const data = {
        ...inferredData,
        ...extraData,
      } as AuthData<Resource>

      const allowed = canPerform(subject, resource, action, data)
      locals.authzDecisionEvent = buildDecisionEvent(
        req,
        subject,
        resource,
        action,
        data,
        allowed ? "allow" : "deny",
        allowed ? "policy_allow" : "policy_deny",
      )
      emitAuthorizationDecision(locals.authzDecisionEvent)

      if (!allowed) {
        res.status(403).json({error: "forbidden", code: "forbidden"})
        return
      }

      next()
    } catch (error) {
      console.error("Authorization middleware failed:", error)
      res.status(500).json({error: "internal", code: "internal"})
    }
  }
}
