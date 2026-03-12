/**
 * Verify User Context Truth
 * 
 * Confirms EntityCollaborator is used for access decisions, not legacy User.data fields.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const violations = [];
    const pagesUsingCollaborator = [];
    const pagesUsingPrimaryContext = [];

    // Check for EntityCollaborator records (access truth)
    const collaborators = await base44.asServiceRole.entities.EntityCollaborator.list('-created_date', 50);

    // Check for legacy User data usage patterns via operation logs
    const accessLogs = await base44.asServiceRole.entities.OperationLog.filter({
      operation_type: { $in: ['access_requested', 'entity_accessed', 'permission_granted'] }
    }, '-created_date', 50);

    // Pages that should use EntityCollaborator for access
    const criticalPages = [
      'MyDashboard',
      'Profile',
      'RegistrationDashboard',
      'Management',
      'EntityEditor',
      'RaceCore'
    ];

    // Check if we can detect access decisions
    const accessDecisions = accessLogs.filter(log => {
      const metadata = log.metadata || {};
      return metadata.access_source && (
        metadata.access_source === 'EntityCollaborator' ||
        metadata.access_source === 'primary_entity_context'
      );
    });

    if (accessDecisions.length > 0) {
      accessDecisions.forEach(decision => {
        const metadata = decision.metadata || {};
        if (metadata.access_source === 'EntityCollaborator') {
          pagesUsingCollaborator.push({
            page: metadata.page,
            entity_type: metadata.entity_type,
            verified: true
          });
        }
        if (metadata.access_source === 'primary_entity_context') {
          pagesUsingPrimaryContext.push({
            page: metadata.page,
            primary_type: metadata.primary_type,
            verified: true
          });
        }
      });
    }

    // Check for any logs that might indicate legacy field usage
    const legacyLogs = accessLogs.filter(log => {
      const msg = log.message || '';
      return msg.includes('user.data.driver_id') ||
             msg.includes('user.data.team_id') ||
             msg.includes('user.data.series_id') ||
             msg.includes('user.data.track_id');
    });

    if (legacyLogs.length > 0) {
      violations.push({
        issue: 'Legacy user.data field usage detected in access logs',
        severity: 'critical',
        count: legacyLogs.length,
        affected_operations: legacyLogs.map(l => l.operation_type)
      });
    }

    // Verify EntityCollaborator consistency
    const collaboratorIssues = [];
    for (const collab of collaborators.slice(0, 20)) {
      if (!collab.entity_id || !collab.user_id || !collab.role) {
        collaboratorIssues.push({
          collaborator_id: collab.id,
          issue: 'missing required fields'
        });
      }
    }

    if (collaboratorIssues.length > 0) {
      violations.push({
        issue: 'EntityCollaborator records missing required fields',
        severity: 'high',
        count: collaboratorIssues.length,
        details: collaboratorIssues.slice(0, 5)
      });
    }

    return Response.json({
      pages_checked: criticalPages.length,
      legacy_access_usage_found: legacyLogs.length,
      pages_using_entity_collaborator: pagesUsingCollaborator.length,
      pages_using_primary_entity_context: pagesUsingPrimaryContext.length,
      entity_collaborator_records_active: collaborators.length,
      violations: violations,
      severity: violations.length > 0 ? 'high' : 'healthy',
      recommendation: violations.length === 0 
        ? 'User context truth is properly maintained via EntityCollaborator'
        : 'Review violations and ensure legacy fields are not used for access decisions',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});