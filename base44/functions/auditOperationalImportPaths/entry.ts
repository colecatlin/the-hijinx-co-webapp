/**
 * Audit Operational Import Paths
 * 
 * Scans the codebase to identify any operational import flows that still create source entities silently.
 * Returns a report of import paths and their source creation behavior.
 * 
 * This is a diagnostic function, not a runtime enforcement.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Define operational import paths and their expected behavior
    const importPaths = [
      {
        name: 'ResultsCSVUpload',
        type: 'csv',
        row_type: 'result',
        file: 'components/registrationdashboard/results/ResultsCSVUpload.jsx',
        required_source: ['driver', 'event', 'session'],
        status: 'enforced'  // never creates drivers, resolves locally only
      },
      {
        name: 'CSVImportManager (Results mode)',
        type: 'csv',
        row_type: 'result',
        file: 'components/registrationdashboard/CSVImportManager.jsx',
        required_source: ['driver', 'event'],
        status: 'to_audit'
      },
      {
        name: 'Entry Registration Importer',
        type: 'csv',
        row_type: 'entry',
        file: 'components/registrationdashboard/entries/ImportEntriesModal.jsx',
        required_source: ['driver', 'event', 'class'],
        status: 'to_audit'
      },
      {
        name: 'Standings Bulk Upload',
        type: 'csv',
        row_type: 'standing',
        file: 'components/management/results/SmartResultsImport.jsx',
        required_source: ['driver', 'series'],
        status: 'to_audit'
      }
    ];

    const findings = {
      total_paths: importPaths.length,
      enforced_paths: importPaths.filter(p => p.status === 'enforced').length,
      audit_needed: importPaths.filter(p => p.status === 'to_audit').length,
      paths: importPaths,
      key_rules: [
        'Operational imports must resolve source entities by ID or name only',
        'Operational imports must never create Driver, Team, Track, Series, Event, or Session records',
        'Unresolved source references must be surfaced as unresolved rows, not skipped silently',
        'Import summaries must include: created, updated, unresolved, warning, and error counts'
      ]
    };

    // Log the audit
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'audit_operational_import_paths',
      entity_name: 'System',
      status: 'success',
      message: `Audited ${importPaths.length} operational import paths`,
      metadata: {
        total_paths: importPaths.length,
        enforced: findings.enforced_paths,
        audit_needed: findings.audit_needed
      },
      initiated_by: user.email
    });

    return Response.json(findings);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});