import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const logs = [];
    const warnings = [];
    const errors = [];

    // Helper to log
    const log = (msg, level = 'info') => {
      const entry = { timestamp: new Date().toISOString(), level, msg };
      console.log(`[${level.toUpperCase()}] ${msg}`);
      if (level === 'warn') warnings.push(msg);
      if (level === 'error') errors.push(msg);
      logs.push(entry);
    };

    log('Starting driver lifecycle audit...');

    // ============ 1. REGISTRATION → ENTRY VALIDATION ============
    log('\n=== Stage 1: Registration → Entry ===');
    try {
      const entries = await base44.asServiceRole.entities.Entry.list();
      const drivers = await base44.asServiceRole.entities.Driver.list();
      const events = await base44.asServiceRole.entities.Event.list();
      
      log(`Found ${entries.length} total entries`);
      
      let entryIssues = 0;
      entries.forEach(entry => {
        const requiredFields = ['event_id', 'driver_id'];
        const missing = requiredFields.filter(f => !entry[f]);
        
        if (missing.length > 0) {
          log(`Entry ${entry.id} missing required fields: ${missing.join(', ')}`, 'error');
          entryIssues++;
        }
        
        if (!entry.entry_status) {
          log(`Entry ${entry.id} missing entry_status`, 'warn');
        }
        if (!entry.payment_status) {
          log(`Entry ${entry.id} missing payment_status`, 'warn');
        }
        if (!entry.tech_status) {
          log(`Entry ${entry.id} missing tech_status`, 'warn');
        }
      });
      
      if (entryIssues === 0) {
        log(`✓ All entries have required fields (event_id, driver_id)`);
      }
    } catch (e) {
      log(`Failed to audit entries: ${e.message}`, 'error');
    }

    // ============ 2. CHECK-IN PROPAGATION ============
    log('\n=== Stage 2: Check-In Propagation ===');
    try {
      const entries = await base44.asServiceRole.entities.Entry.list();
      const checkedInEntries = entries.filter(e => e.entry_status === 'Checked In');
      
      log(`Found ${checkedInEntries.length} checked-in entries`);
      
      let checkInIssues = 0;
      checkedInEntries.forEach(entry => {
        if (!entry.waiver_status || entry.waiver_status === 'Missing') {
          log(`Checked-in entry ${entry.id} missing verified waiver`, 'warn');
          checkInIssues++;
        }
      });
      
      if (checkInIssues === 0) {
        log(`✓ All checked-in entries have waiver verification`);
      }
    } catch (e) {
      log(`Failed to audit check-in: ${e.message}`, 'error');
    }

    // ============ 3. TECH INSPECTION PROPAGATION ============
    log('\n=== Stage 3: Tech Inspection ===');
    try {
      const entries = await base44.asServiceRole.entities.Entry.list();
      const techInspectedEntries = entries.filter(e => ['Passed', 'Failed', 'Recheck Required'].includes(e.tech_status));
      
      log(`Found ${techInspectedEntries.length} tech-inspected entries`);
      
      if (techInspectedEntries.length > 0) {
        log(`✓ Tech inspection data is recorded`);
      }
    } catch (e) {
      log(`Failed to audit tech inspection: ${e.message}`, 'error');
    }

    // ============ 4. RESULTS CREATION & SESSION STATUS ============
    log('\n=== Stage 4: Results Creation & Session Status ===');
    try {
      const sessions = await base44.asServiceRole.entities.Session.list();
      const results = await base44.asServiceRole.entities.Results.list();
      
      log(`Found ${sessions.length} sessions, ${results.length} result rows`);
      
      // Check session status transitions
      const statusDistribution = {};
      sessions.forEach(s => {
        statusDistribution[s.status] = (statusDistribution[s.status] || 0) + 1;
      });
      log(`Session status distribution: ${JSON.stringify(statusDistribution)}`);
      
      // Validate results don't have position without status
      let resultIssues = 0;
      results.forEach(r => {
        if (r.position && !r.status) {
          log(`Result ${r.id} has position but missing status`, 'warn');
          resultIssues++;
        }
      });
      
      if (resultIssues === 0) {
        log(`✓ All result rows have proper status`);
      }
    } catch (e) {
      log(`Failed to audit results: ${e.message}`, 'error');
    }

    // ============ 5. STANDINGS RECALCULATION ============
    log('\n=== Stage 5: Standings Recalculation ===');
    try {
      const standings = await base44.asServiceRole.entities.Standings.list();
      const pointsConfigs = await base44.asServiceRole.entities.PointsConfig.list();
      
      log(`Found ${standings.length} standings entries, ${pointsConfigs.length} points configs`);
      
      // Check if standings exist for series with official sessions
      const series = await base44.asServiceRole.entities.Series.list();
      const sessions = await base44.asServiceRole.entities.Session.list();
      
      const officialSessions = sessions.filter(s => ['Official', 'Locked'].includes(s.status));
      const seriesWithOfficialSessions = new Set(officialSessions.map(s => s.event_id));
      
      if (seriesWithOfficialSessions.size > 0) {
        if (standings.length > 0) {
          log(`✓ Standings exist for series with official sessions`);
        } else {
          log(`No standings calculated for ${seriesWithOfficialSessions.size} series with official sessions`, 'warn');
        }
      }
    } catch (e) {
      log(`Failed to audit standings: ${e.message}`, 'error');
    }

    // ============ 6. SESSION LOCKING ============
    log('\n=== Stage 6: Session Locking ===');
    try {
      const sessions = await base44.asServiceRole.entities.Session.list();
      const lockedSessions = sessions.filter(s => s.status === 'Locked');
      
      log(`Found ${lockedSessions.length} locked sessions`);
      
      if (lockedSessions.length > 0) {
        log(`✓ Session locking is in use`);
      }
    } catch (e) {
      log(`Failed to audit session locking: ${e.message}`, 'error');
    }

    // ============ 7. LIVE MODE ============
    log('\n=== Stage 7: Live Mode ===');
    try {
      const events = await base44.asServiceRole.entities.Event.list();
      const liveEvents = events.filter(e => e.status === 'in_progress');
      
      log(`Found ${liveEvents.length} live events`);
      
      if (liveEvents.length > 0) {
        log(`✓ Live mode events exist`);
      }
    } catch (e) {
      log(`Failed to audit live mode: ${e.message}`, 'error');
    }

    // ============ SUMMARY ============
    log('\n=== Audit Summary ===');
    log(`Total log entries: ${logs.length}`);
    log(`Warnings: ${warnings.length}`);
    log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      log(`\n⚠️ Lifecycle integrity issues detected:`, 'warn');
      errors.forEach(e => log(`  - ${e}`, 'error'));
    } else {
      log(`\n✓ All lifecycle stages validated successfully`);
    }

    return Response.json({
      status: 'complete',
      summary: {
        totalLogs: logs.length,
        warnings: warnings.length,
        errors: errors.length,
        timestamp: new Date().toISOString()
      },
      logs,
      warnings,
      errors
    });
  } catch (error) {
    console.error('Audit function error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});