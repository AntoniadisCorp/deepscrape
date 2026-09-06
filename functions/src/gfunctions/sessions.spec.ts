import {describe, it} from "node:test"
import assert from "node:assert/strict"
import {
  evaluateMfaDisabledNotification,
  getDefaultPrimaryMethod,
  getDefaultSecondaryMethod,
  readMfaPreferences,
} from "./sessions"

describe("sessions mfa preferences", () => {
  it("normalizes invalid preferences to available defaults", () => {
    const available = {totp: true, sms: true, email: true}

    const prefs = readMfaPreferences(
      {
        settings: {
          security: {
            mfa: {
              primaryMethod: "garbage",
              secondaryMethod: "totp",
              riskEmailNotifications: false,
            },
          },
        },
      },
      available,
    )

    assert.equal(prefs.primaryMethod, "totp")
    assert.equal(prefs.secondaryMethod, "sms")
    assert.equal(prefs.riskEmailNotifications, false)
  })

  it("applies default factor ordering as totp > sms > email", () => {
    assert.equal(
      getDefaultPrimaryMethod({totp: true, sms: true, email: true}),
      "totp",
    )
    assert.equal(
      getDefaultPrimaryMethod({totp: false, sms: true, email: true}),
      "sms",
    )
    assert.equal(
      getDefaultPrimaryMethod({totp: false, sms: false, email: true}),
      "email",
    )

    assert.equal(
      getDefaultSecondaryMethod({totp: true, sms: true, email: true}, "totp"),
      "sms",
    )
    assert.equal(
      getDefaultSecondaryMethod({totp: true, sms: false, email: true}, "email"),
      "totp",
    )
  })

  it("evaluates mfa_disabled notification conditions", () => {
    const stillEnabled = evaluateMfaDisabledNotification({
      hasEnrolledMfa: true,
      riskEmailNotifications: true,
      hasEmail: true,
    })
    assert.equal(stillEnabled.shouldNotify, false)
    assert.equal(stillEnabled.reason, "mfa_still_enabled")

    const notificationsOff = evaluateMfaDisabledNotification({
      hasEnrolledMfa: false,
      riskEmailNotifications: false,
      hasEmail: true,
    })
    assert.equal(notificationsOff.shouldNotify, false)
    assert.equal(notificationsOff.reason, "risk_email_notifications_disabled")

    const missingEmail = evaluateMfaDisabledNotification({
      hasEnrolledMfa: false,
      riskEmailNotifications: true,
      hasEmail: false,
    })
    assert.equal(missingEmail.shouldNotify, false)
    assert.equal(missingEmail.reason, "missing_email")

    const shouldNotify = evaluateMfaDisabledNotification({
      hasEnrolledMfa: false,
      riskEmailNotifications: true,
      hasEmail: true,
    })
    assert.equal(shouldNotify.shouldNotify, true)
    assert.equal(shouldNotify.reason, "notify")
  })
})
