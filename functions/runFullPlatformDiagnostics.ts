/**
 * runFullPlatformDiagnostics.js  (admin only)
 *
 * Calls all four audit functions and returns a combined report with
 * severity-classified issue counts.
 *
 * High   — duplicates, broken source links, missing Entity rows for collaborators,
 *           broken Event→track/series links
 * Medium — missing normalization fields, expired pending invitations, missing access codes
 * Low    — cosmetic routing gaps (missing/duplicate slug, invisible public, missing display)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [srcRes, entityRes, accessRes, routeRes] = await Promise.all([
      base44.functions.invoke('runSourceIntegrityAudit', {}),
      base44.functions.invoke('runEntityLayerAudit', {}),
      base44.functions.invoke('runAccessIntegrityAudit', {}),
      base44.functions.invoke('runPublicRouteAudit', {}),
    ]);

    const source_audit = srcRes?.data    || { error: 'audit failed' };
    const entity_audit = entityRes?.data || { error: 'audit failed' };
    const access_audit = accessRes?.data || { error: 'audit failed' };
    const route_audit  = routeRes?.data  || { error: 'audit failed' };

    const ss = source_audit.summary || {};
    const es = entity_audit.summary || {};
    const as = access_audit.summary || {};
    const rs = route_audit.summary  || {};

    const high_priority_issues =
      (ss.duplicate_count || 0) +
      (ss.broken_link_count || 0) +
      (es.source_without_entity_count || 0) +
      (es.entity_without_source_count || 0) +
      (es.broken_event_relationships_count || 0) +
      (as.collaborator_missing_source_count || 0);

    const medium_priority_issues =
      (ss.missing_normalization_count || 0) +
      (es.broken_confirmations_count || 0) +
      (as.expired_pending_invitations_count || 0) +
      (as.owner_missing_access_code_count || 0) +
      (as.invitation_entity_missing_count || 0);

    const low_priority_issues =
      (ss.broken_routing_count || 0) +
      (rs.missing_slug_count || 0) +
      (rs.duplicate_slug_count || 0) +
      (rs.invisible_public_count || 0) +
      (rs.missing_display_count || 0) +
      (as.duplicate_collaborators_count || 0);

    const total_issues = high_priority_issues + medium_priority_issues + low_priority_issues;

    const report = {
      generated_at: new Date().toISOString(),
      source_audit,
      entity_audit,
      access_audit,
      route_audit,
      summary: {
        total_issues,
        high_priority_issues,
        medium_priority_issues,
        low_priority_issues,
      },
    };

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'diagnostics_run',
      entity_name: 'Diagnostics',
      status: 'success',
      metadata: {
        audit: 'full_platform',
        total_issues,
        high_priority_issues,
        medium_priority_issues,
        low_priority_issues,
        audited_by: user.email,
      },
    }).catch(() => {});

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});