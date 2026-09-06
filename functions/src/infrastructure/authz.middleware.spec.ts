/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
import assert from "node:assert/strict"
import test from "node:test"
import {requirePermission} from "./authz.middleware"
import {AuthorizationSubject} from "../domain/authz.domain"

type MockResponse = {
  locals: Record<string, unknown>
  statusCode?: number
  body?: unknown
  status: (code: number) => MockResponse
  json: (payload: unknown) => void
}

function createMockResponse(): MockResponse {
  return {
    locals: {},
    statusCode: undefined,
    body: undefined,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
    },
  }
}

test("requirePermission returns 401 when request has no authenticated user", async () => {
  const middleware = requirePermission("organization", "read")

  const req = {
    headers: {},
    params: {},
    body: {},
    query: {},
  } as never

  const res = createMockResponse() as never
  let nextCalled = false

  await middleware(req, res, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, false)
  assert.equal((res as unknown as MockResponse).statusCode, 401)
})

test("requirePermission returns 403 for denied org read context", async () => {
  const middleware = requirePermission("organization", "read")

  const subject: AuthorizationSubject = {
    uid: "u_denied",
    isPlatformAdmin: false,
    memberships: {},
  }

  const req = {
    user: {uid: "u_denied"},
    headers: {},
    params: {orgId: "org_forbidden"},
    body: {},
    query: {},
  } as never

  const res = createMockResponse()
  res.locals.authzSubject = subject

  let nextCalled = false

  await middleware(req, res as never, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, false)
  assert.equal(res.statusCode, 403)
})

test("requirePermission calls next for allowed org read context", async () => {
  const middleware = requirePermission("organization", "read")

  const subject: AuthorizationSubject = {
    uid: "u_allowed",
    isPlatformAdmin: false,
    memberships: {org_allowed: "owner"},
  }

  const req = {
    user: {uid: "u_allowed"},
    headers: {},
    params: {orgId: "org_allowed"},
    body: {},
    query: {},
  } as never

  const res = createMockResponse()
  res.locals.authzSubject = subject

  let nextCalled = false

  await middleware(req, res as never, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, true)
  assert.equal(res.statusCode, undefined)
})
