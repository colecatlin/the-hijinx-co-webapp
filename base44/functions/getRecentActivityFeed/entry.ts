/**
 * getRecentActivityFeed
 *
 * Returns newest public ActivityFeed items.
 * Input: { limit: number (optional, default 12) }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(parseInt(body.limit) || 12, 50);

    const items = await base44.asServiceRole.entities.ActivityFeed.filter(
      { visibility: 'public' },
      '-created_at',
      limit
    );

    return Response.json({ items: items || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});