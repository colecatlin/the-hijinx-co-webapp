/**
 * publishRacerProfile — the explicit admin publishing action for a racer.
 *
 * Nothing publishes automatically. Integrity is separated from completeness:
 * a missing bio, image, team, results, standings or social link never blocks
 * publication, while a broken identity/profile relationship, a missing slug or
 * display name, or a duplicate canonical identity does.
 *
 * Input:  { racer_profile_id, action?: 'publish' | 'unpublish' }
 * Output: { published, visibility, blockers, integrity_errors, completeness_notes }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { validateRacerRelationshipGraph, isPublishable } from '../../shared/racerRelationshipGraph.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const racerProfileId = body.racer_profile_id;
    const action = body.action === 'unpublish' ? 'unpublish' : 'publish';
    if (!racerProfileId) return Response.json({ error: 'racer_profile_id is required' }, { status: 400 });

    const sr = base44.asServiceRole;
    const profile = await sr.entities.RacerProfile.get(racerProfileId).catch(() => null);
    if (!profile) return Response.json({ error: 'RacerProfile not found' }, { status: 404 });

    const graph = await validateRacerRelationshipGraph(sr, { racer_profile_id: racerProfileId });

    if (action === 'unpublish') {
      await sr.entities.RacerProfile.update(racerProfileId, { visibility: 'draft' });
      await sr.entities.AuditLog.create({
        entity_type: 'RacerProfile', entity_id: racerProfileId, entity_name: profile.display_name,
        action: 'status_changed', before_data: { visibility: profile.visibility }, after_data: { visibility: 'draft' },
        performed_by: user.id, performed_by_name: user.full_name, timestamp: new Date().toISOString(),
        notes: 'Racer profile unpublished (returned to draft)',
      }).catch(() => null);
      return Response.json({ published: false, visibility: 'draft', blockers: [], integrity_errors: graph.errors, completeness_notes: [] });
    }

    const gate = isPublishable(graph);
    if (!gate.publishable) {
      return Response.json({
        published: false,
        visibility: profile.visibility || 'draft',
        blockers: gate.blockers,
        integrity_errors: graph.errors,
        completeness_notes: [],
      });
    }

    const completeness: string[] = [];
    const driver = graph.legacy_driver;
    if (!profile.bio) completeness.push('No biography yet');
    if (!profile.profile_image_url && !driver?.profile_image_url) completeness.push('No profile image yet');
    if (!profile.hero_image_url && !driver?.hero_image_url) completeness.push('No hero image yet');
    if (!profile.instagram_url && !profile.facebook_url && !profile.x_url && !profile.youtube_url && !profile.tiktok_url && !profile.website_url) completeness.push('No social links yet');
    if (graph.participations.length === 0) completeness.push('No season participation yet');
    if (graph.results.length === 0) completeness.push('No results yet');
    if (graph.standings.length === 0) completeness.push('No standings yet');

    await sr.entities.RacerProfile.update(racerProfileId, { visibility: 'live' });
    await sr.entities.AuditLog.create({
      entity_type: 'RacerProfile', entity_id: racerProfileId, entity_name: profile.display_name,
      action: 'status_changed', before_data: { visibility: profile.visibility }, after_data: { visibility: 'live' },
      performed_by: user.id, performed_by_name: user.full_name, timestamp: new Date().toISOString(),
      notes: 'Racer profile published',
    }).catch(() => null);

    return Response.json({
      published: true,
      visibility: 'live',
      slug: profile.slug,
      blockers: [],
      integrity_errors: graph.errors,
      integrity_warnings: graph.warnings,
      completeness_notes: completeness,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}