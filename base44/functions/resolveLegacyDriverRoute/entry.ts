/**
 * resolveLegacyDriverRoute — resolves the /drivers/:slug compatibility route.
 *
 * The legacy Driver entity is no longer readable by public clients (it carried
 * date of birth and contact email), so this endpoint does the lookup server-side
 * and returns only what a redirect needs.
 *
 * Only a live RacerProfile produces a slug: draft profiles stay unavailable
 * publicly, exactly as they are on /racers/:slug. Admins may preview.
 *
 * Input:  { slug }
 * Output: { found, racer_profile_slug, public, driver_id, reason }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const viewer = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slug) return Response.json({ found: false, racer_profile_slug: null, public: false, driver_id: null, reason: 'slug_required' }, { status: 400 });

    const sr = base44.asServiceRole;

    const byCanonical = await sr.entities.Driver.filter({ canonical_slug: slug }).catch(() => []);
    let driver = (byCanonical || [])[0] || null;
    if (!driver) {
      const bySlug = await sr.entities.Driver.filter({ slug }).catch(() => []);
      driver = (bySlug || [])[0] || null;
    }
    if (!driver) {
      return Response.json({ found: false, racer_profile_slug: null, public: false, driver_id: null, reason: 'driver_not_found' });
    }
    if (driver.is_archived) {
      return Response.json({ found: false, racer_profile_slug: null, public: false, driver_id: driver.id, reason: 'driver_archived' });
    }

    const profiles = await sr.entities.RacerProfile
      .filter({ legacy_driver_id: driver.id, is_archived: false }).catch(() => []);
    const profile = (profiles || [])[0] || null;

    if (!profile) {
      // No canonical profile yet — the legacy page is only shown to admins so a
      // draft racer never becomes publicly visible through the old route.
      const isAdmin = !!viewer && viewer.role === 'admin';
      return Response.json({
        found: true,
        racer_profile_slug: null,
        public: isAdmin ? true : false,
        driver_id: driver.id,
        reason: isAdmin ? 'no_racer_profile_admin_preview' : 'no_racer_profile_publicly_unavailable',
      });
    }

    const isAdmin = !!viewer && viewer.role === 'admin';
    const isLive = profile.visibility === 'live' && !profile.is_archived;
    if (!isLive && !isAdmin) {
      return Response.json({ found: true, racer_profile_slug: null, public: false, driver_id: driver.id, reason: 'racer_profile_draft' });
    }

    return Response.json({
      found: true,
      racer_profile_slug: profile.slug || null,
      public: isLive,
      driver_id: driver.id,
      reason: isLive ? 'live_profile' : 'admin_preview',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}