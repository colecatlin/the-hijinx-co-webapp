import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';

/**
 * Admin-only: seeds the four default SubscriptionTier records (Free, Core, Pro, Elite)
 * if they don't already exist. Idempotent — safe to run multiple times.
 * Admins edit prices and stripe_price_id live afterward from ManageMemberships.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const TIER_DEFAULTS = [
      {
        tier_key: 'free',
        display_name: 'Free',
        description: 'Public site access — browse the directory, stories, and profiles.',
        price_cents: 0, currency: 'usd', interval: 'month',
        features: [], is_active: true, display_order: 0, stripe_price_id: null, highlight: false,
      },
      {
        tier_key: 'core',
        display_name: 'Core',
        description: 'RaceCore operational access for racers and teams.',
        price_cents: 0, currency: 'usd', interval: 'month',
        features: ['racecore:access', 'racecore:registration', 'media:portal'],
        is_active: true, display_order: 1, stripe_price_id: null, highlight: true,
      },
      {
        tier_key: 'pro',
        display_name: 'Pro',
        description: 'Full event management, results, tech, and editorial tools.',
        price_cents: 0, currency: 'usd', interval: 'month',
        features: [
          'racecore:access', 'racecore:registration', 'racecore:manage_events',
          'racecore:publish_results', 'racecore:tech',
          'media:portal', 'editorial:workspace', 'editorial:radar',
        ],
        is_active: true, display_order: 2, stripe_price_id: null, highlight: false,
      },
      {
        tier_key: 'elite',
        display_name: 'Elite',
        description: 'Everything — race control, standings, governance, and sponsor analytics.',
        price_cents: 0, currency: 'usd', interval: 'month',
        features: [
          'racecore:access', 'racecore:registration', 'racecore:manage_events',
          'racecore:publish_results', 'racecore:tech', 'racecore:race_control',
          'racecore:standings', 'racecore:imports', 'racecore:governance',
          'media:portal', 'media:credentials',
          'editorial:workspace', 'editorial:radar',
          'sponsorship:manage', 'sponsorship:analytics',
        ],
        is_active: true, display_order: 3, stripe_price_id: null, highlight: false,
      },
    ];

    const existing = await base44.asServiceRole.entities.SubscriptionTier.list();
    const existingKeys = new Set((existing || []).map(t => t.tier_key));
    const toCreate = TIER_DEFAULTS.filter(t => !existingKeys.has(t.tier_key));

    let created = 0;
    for (const tier of toCreate) {
      await base44.asServiceRole.entities.SubscriptionTier.create(tier);
      created++;
    }

    return Response.json({
      created,
      existing: existingKeys.size,
      message: created > 0 ? `Seeded ${created} tier(s)` : 'All tiers already exist',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}