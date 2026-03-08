/**
 * getActiveHomepageSettings
 *
 * Returns the newest active HomepageSettings editorial record, or null.
 * Safe — never throws to the caller.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const records = await db.HomepageSettings.filter({ active: true }, '-created_date', 1);
    const settings = records?.[0] || null;

    return Response.json({ settings });
  } catch (error) {
    // Never fail the homepage — return null settings
    return Response.json({ settings: null });
  }
});