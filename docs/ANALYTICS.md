# Analytics — tracking plan & governance

Owner: platform (single writer philosophy below). Last reviewed: 2026-09-10.

Scope: **our own product funnel**, not customer-facing analytics. If we ever ship analytics
to customers, this document is the wrong starting point — that is a different product.

## Pipeline (where data lives)

| Layer | Collection | Written by | Retention |
|---|---|---|---|
| Facts | `analytics_events` | `gfunctions/analytics-realtime.ts` triggers, `drainClientAnalyticsEvents` (client events), Stripe webhook (paid) | 180 days (`cleanupOldAnalytics`) |
| Day rollup | `metrics_daily/{YYYY-MM-DD}` (UTC key) | same writers as above, via `FieldValue.increment` | 365 days |
| Hour rollup | `metrics_hourly/{date-hour}` | realtime triggers | 7 days |
| Range rollup | `metrics_range/{last-7d,last-30d,last-90d}` | `computeRangeMetrics` (daily 01:00 UTC) — derived from `metrics_daily` only, no extra reads | 24h TTL per doc |
| Live | `metrics_summary/dashboard`, `presence` | `computeActiveUsersNow` (every minute) | — |

Clients never write metrics: `firestore.rules` allows `read: if isAdmin()`, `write: if false`
on every `metrics_*` and `analytics_events` document.

**Writer rule:** `gfunctions/analytics-realtime.ts` owns the rollups. There is exactly one
deliberate exception — `recordPaidFact` in `functions/src/app/stripe.ts` adds the revenue keys
(`revenueByCurrency.*`, `paymentsByCurrency.*`, `paidByPlan.*`, `paidByChannel.*`). It never
touches a key another writer owns, and it writes the fact and the counters in one batch.

## Tracking plan

Client events enter through `POST /event/analytics/event` (single) or `/batch`, are validated by
`toClientEvent` (scalars only, ≤20 props, ≤200-char values), tagged with `isBot`/`botKind` from
the request UA, buffered in the Redis list `analytics:events`, then drained into facts by the
30-minute scheduled job. Bots are stored as facts but excluded from every counter.

| Event | Properties | Trigger | Decision supported |
|---|---|---|---|
| `page_view` | `page` | `app.component.ts` NavigationEnd | Which pages are actually used |
| `login_attempt` | `method`, `success`, `browser`, `platform`, `errorMsg`, `context` | `login.component.ts` | Where login fails |
| `logout` | `method`, `withError` | `auth.service.ts` | Session hygiene |
| `crawl_started` | `taskId`, `urlCount` | `app-crawl.component.ts` (`multiCrawlEnqueue` tap) | Demand vs activation gap |
| `crawl_completed` | `taskId` | `operation-status.service.ts` terminal status | **Activation** — leading revenue indicator |
| `crawl_failed` | `taskId` | same | Product reliability |
| `guest_created` | server: browser, device, os, language, country, channel, proxyType | `onGuestCreated` trigger | Traffic composition |
| `user_registered` | server: `wasGuest` | `onUserRegistered` trigger | Conversion to account |
| `login_succeeded` | server: `provider`, `connection` | `onLoginEvent` trigger | Retention / habit |
| `paid` | `amountMinor`, `currency`, `plan`, `interval`, `source`, `reason`, `channel`, `utmMedium`, `utmCampaign`, `landingPath` | Stripe webhook: `invoice.paid` (subscriptions) and `checkout.session.completed` with `mode === "payment"` (credit packs) | **Revenue, and which channel/plan produces it** |

Naming: `object_action`, lowercase, underscores. Properties are context only — never PII, never
free text.

## Conversions

| Conversion | Event | Counting | Used by |
|---|---|---|---|
| Guest → account | `user_registered` with `isConversion: true` | Once per guest (`guests/{id}.linkedAt` guard in `onUserRegistered`) | Signup funnel step |
| Activation | `crawl_completed` | Once per task id (client-side `reportedTerminalIds` guard) | Activation funnel step |
| Purchase | `paid` | Once per payment — the fact doc id is `paid_{invoiceId \| sessionId}` and is written with `create()`, so a replayed webhook aborts the whole batch and cannot double-count | Revenue, ARPU, paid-by-channel |

Funnel steps 1–3 count **unique server facts**; activation and paid count **events**. The two
populations are not identical, which is why the dashboard labels them separately.

## UTM & attribution discipline

- Capture is first-touch, at guest creation (`buildGuestAcquisition`): `utm_*` (lowercased),
  `referrer` (hostname only), `landingPath`.
- The acquisition block is merged into `users/{uid}.analytics.acquisition` at signup; the paid
  writer reads it there and falls back to `users/{uid}.loginMetricsId` → `guests/{guestId}`.
- UTMs are **never** overwritten client-side. Use lowercase, documented values; an unnormalised
  new value silently creates a new channel bucket.
- Amounts are always currency-scoped. Never sum `revenueByCurrency` across currencies.

## Validation checklist (run before trusting a number)

1. `stripe trigger invoice.paid` twice, or `requestStripeEventRetry` on a processed event →
   exactly one `analytics_events/paid_*` document and one increment on the revenue counters.
2. Replay `POST /event/analytics/event` with `{eventType, metadata}` and with the legacy
   `{event, properties}` shape → both land under the same `clientEvents.<name>` key, never
   `clientEvents.unknown`.
3. Request with a bot UA → the fact exists, `clientEvents`/`byPage`/funnel counters unchanged.
4. After the 01:00 UTC job: `metrics_range.last-30d` carries `funnel`, `retention`, `revenue*`.
5. `functions`: `bunx tsc --noEmit`, `npx eslint <files>`, `bun run test`.
   App: `bunx tsc --noEmit -p tsconfig.app.json`, `bunx ng build --configuration development`.

## Known gaps (accepted)

- No session model, so no bounce rate / visit duration / views-per-visit. Page-level engagement
  is out of scope until a landing-page experiment needs it.
- No cross-device identity: a visitor on two devices counts twice, by design (no PII).
- `metrics_daily` prunes at 365 days; anything older is gone from the rollups.
