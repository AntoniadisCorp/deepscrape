/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/*
https://medium.com/@unravel-technologies/angular-loading-performance-deploying-ssr-ssg-to-firebase-2a48d4cc7fc5
*/
import * as app from "./server"
import * as auth from "./app/auth"
import * as stripe from "./app/stripe"
import * as analyticsRealtime from "./gfunctions/analytics-realtime"
import * as sessions from "./gfunctions/sessions"
// import path, { join } from "node:path"
// import { fileURLToPath } from "node:url"


// Get the current file's directory fileURLToPath
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = dirname(__filename)


// Export the Firebase deepscrape SPA app
// https://firebase.google.com/docs/functions/networking
export const deepscrape = app.deepscrape

/* Auth - Functions */
// User Management - Functions
export const linkGuestToUser = auth.linkGuestToUser
export const getMyLoginSessions = auth.getMyLoginSessions
export const revokeMyLoginSession = auth.revokeMyLoginSession
export const getMyLoginSessionStatus = auth.getMyLoginSessionStatus
export const enableTotpMfa = auth.enableTotpMfa

// ADMIN USER MANAGEMENT - Function TRIGGERS
export const setDefaultAdminRole = auth.setDefaultAdminRole
export const setDefaultRole = auth.setDefaultRole
export const createDefaultOrganization = auth.createDefaultOrganization


// STRIPE Functions
export const newStripeCustomer = stripe.newStripeCustomer
export const createPaymentIntent = stripe.createPaymentIntent
export const createSetupIntent = stripe.createSetupIntent
export const startSubscription = stripe.startSubscription
export const updateUsage = stripe.updateUsage
export const getBillingCatalog = stripe.getBillingCatalog
export const getMyEntitlements = stripe.getMyEntitlements
export const startTrial = stripe.startTrial
export const submitEnterprisePlanRequest = stripe.submitEnterprisePlanRequest
export const validateStripeCatalog = stripe.validateStripeCatalog
export const createCheckoutSession = stripe.createCheckoutSession
export const createBillingPortalSession = stripe.createBillingPortalSession
export const resumeSubscriptionCancellation = stripe.resumeSubscriptionCancellation
export const verifyCheckoutSession = stripe.verifyCheckoutSession
export const getBillingUsage = stripe.getBillingUsage
export const stripeWebhook = stripe.stripeWebhook
export const grantPromotionalCredits = stripe.grantPromotionalCredits
export const expireTrialsToFree = stripe.expireTrialsToFree


// API SECRET KEYS - Functions
export const createMyApiKey = auth.createMyApiKey
export const retrieveMyApiKeysPaging = auth.retrieveMyApiKeysPaging
export const getApiKeyDoVisible = auth.getApiKeyDoVisible
export const deleteMyApiKey = auth.deleteMyApiKey


// CRAWL OPERATIONS - Function TRIGGERS
// export const enqueueCrawlOperation = auth.enqueueCrawlOperation
export const getOperationsPaging = auth.getOperationsPaging


// CRAWL PACK CONFIGURATIONS - Function TRIGGERS
export const getBrowserProfilesPaging = auth.getBrowserProfilesPaging
export const getCrawlConfigsPaging = auth.getCrawlConfigsPaging
export const getCrawlResultConfigsPaging = auth.getCrawlResultConfigsPaging


// MACHINE LOGGERS - Function TRIGGERS
// export const receiveLogs = auth.receiveLogs


// MACHINES - Function TRIGGERS
export const getMachinesPaging = auth.getMachinesPaging

// ANALYTICS - Function TRIGGERS & SCHEDULED (Optimized Real-time System)
export const onGuestCreated = analyticsRealtime.onGuestCreated
export const onUserCreated = analyticsRealtime.onUserRegistered
export const onUserLogin = analyticsRealtime.onLoginEvent
export const backfillDashboardSummary = analyticsRealtime.backfillDashboardSummary
export const computeDailyTrends = analyticsRealtime.computeDailyTrends
export const computeRangeMetrics = analyticsRealtime.computeRangeMetrics
export const cleanupOldMetrics = analyticsRealtime.cleanupOldAnalytics

// SESSION MANAGEMENT - Functions (Callable)
export const createLoginSession = sessions.createLoginSession
export const signOutLoginSession = sessions.signOutLoginSession
export const recordLogoutMetrics = sessions.recordLogoutMetrics
export const validateSessionCookie = sessions.validateSessionCookie
export const cleanupExpiredSessions = sessions.cleanupExpiredSessions
export const onLoginHistoryCreated = sessions.onLoginHistoryCreated

// PHASE 4.2: DEVICE VERIFICATION - Functions
export const sendDeviceVerificationCode = sessions.sendDeviceVerificationCode
export const verifyAndTrustDevice = sessions.verifyAndTrustDevice
export const isDeviceTrusted = sessions.isDeviceTrusted
export const getTrustedDevices = sessions.getTrustedDevices
export const removeTrustedDevice = sessions.removeTrustedDevice
