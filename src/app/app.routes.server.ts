import { RenderMode, ServerRoute } from '@angular/ssr';
import type { BillingPlanTier } from './core/types';

const BILLING_PLAN_TIERS: BillingPlanTier[] = ['free', 'trial', 'starter', 'pro', 'enterprise'];

export const serverRoutes: ServerRoute[] = [
    {
        path: 'billing/plans/:planId',
        renderMode: RenderMode.Prerender,
        getPrerenderParams: async () => BILLING_PLAN_TIERS.map((planId) => ({ planId })),
    },
    // ponytail: do NOT statically bake authenticated/private pages. They only
    // render a guest shell, and building them executes browser-only Firebase
    // Auth (TOTP/MFA) on the server, spamming auth/operation-not-supported.
    // Serve them per-request instead (SSR engine, CSR fallback until deployed).
    { path: 'admin/**', renderMode: RenderMode.Server },
    { path: 'settings/**', renderMode: RenderMode.Server },
    { path: 'dashboard/**', renderMode: RenderMode.Server },
    { path: 'operations/**', renderMode: RenderMode.Server },
    { path: 'user/**', renderMode: RenderMode.Server },
    { path: 'billing/**', renderMode: RenderMode.Server },
    { path: '**', renderMode: RenderMode.Prerender },
];
