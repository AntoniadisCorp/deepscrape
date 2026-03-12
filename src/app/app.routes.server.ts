import { RenderMode, ServerRoute } from '@angular/ssr';
import type { BillingPlanTier } from './core/types';

const BILLING_PLAN_TIERS: BillingPlanTier[] = ['free', 'trial', 'starter', 'pro', 'enterprise'];

export const serverRoutes: ServerRoute[] = [
    {
        path: 'billing/plans/:planId',
        renderMode: RenderMode.Prerender,
        getPrerenderParams: async () => BILLING_PLAN_TIERS.map((planId) => ({ planId })),
    },
    { path: '**', renderMode: RenderMode.Prerender },
];
