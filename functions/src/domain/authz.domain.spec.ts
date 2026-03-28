/* eslint-disable max-len */
import test from "node:test"
import assert from "node:assert/strict"
import {canPerform, AuthorizationSubject} from "./authz.domain"

const baseSubject: AuthorizationSubject = {
  uid: "u_1",
  isPlatformAdmin: false,
  memberships: {},
}

test("allows self-owned machine deploy without org membership", () => {
  const allowed = canPerform(baseSubject, "machine", "deploy", {
    ownerId: "u_1",
  })

  assert.equal(allowed, true)
})

test("denies org machine deploy for non-member", () => {
  const allowed = canPerform(baseSubject, "machine", "deploy", {
    ownerId: "u_1",
    orgId: "org_1",
  })

  assert.equal(allowed, true)

  const denied = canPerform({...baseSubject, uid: "u_2"}, "machine", "deploy", {
    ownerId: "u_1",
    orgId: "org_1",
  })

  assert.equal(denied, false)
})

test("allows org member to execute crawl in org context", () => {
  const subject: AuthorizationSubject = {
    ...baseSubject,
    memberships: {
      org_1: "member",
    },
  }

  const allowed = canPerform(subject, "crawl", "execute", {
    orgId: "org_1",
    ownerId: "u_3",
  })

  assert.equal(allowed, true)
})

test("allows platform admin bypass", () => {
  const subject: AuthorizationSubject = {
    uid: "u_admin",
    isPlatformAdmin: true,
    memberships: {},
  }

  const allowed = canPerform(subject, "organization", "manage", {
    orgId: "org_99",
    ownerId: "u_other",
  })

  assert.equal(allowed, true)
})

test("allows self to manage organization creation context", () => {
  const allowed = canPerform(baseSubject, "organization", "manage", {
    ownerId: "u_1",
  })

  assert.equal(allowed, true)
})

test("allows self to read organization in self-scoped context", () => {
  const allowed = canPerform(baseSubject, "organization", "read", {
    ownerId: "u_1",
  })

  assert.equal(allowed, true)
})

test("denies org invitation without org membership", () => {
  const denied = canPerform(baseSubject, "organization", "invite", {
    orgId: "org_1",
  })

  assert.equal(denied, false)
})

test("denies org read when scoped org has no membership and no owner fallback", () => {
  const denied = canPerform(baseSubject, "organization", "read", {
    orgId: "org_2",
  })

  assert.equal(denied, false)
})

test("denies cross-tenant machine read when membership is for a different org", () => {
  const subject: AuthorizationSubject = {
    ...baseSubject,
    memberships: {
      org_alpha: "member",
    },
  }

  const denied = canPerform(subject, "machine", "read", {
    orgId: "org_beta",
    ownerId: "u_other",
  })

  assert.equal(denied, false)
})

test("allows in-tenant machine read for member role", () => {
  const subject: AuthorizationSubject = {
    ...baseSubject,
    memberships: {
      org_alpha: "member",
    },
  }

  const allowed = canPerform(subject, "machine", "read", {
    orgId: "org_alpha",
    ownerId: "u_other",
  })

  assert.equal(allowed, true)
})
