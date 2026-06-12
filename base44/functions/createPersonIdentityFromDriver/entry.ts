/**
 * createPersonIdentityFromDriver.js
 *
 * Phase A migration: creates PersonIdentity + IdentityAlias + IdentityEvidence
 * for every existing Driver that does not yet have a PersonIdentity.
 *
 * Safe to run multiple times (idempotent — skips drivers already linked).
 * Does NOT modify Driver IDs, Results, Entries, or Standings.
 *
 * Input: { dry_run?: boolean, limit?: number }
 * Output: { created, skipped, errors, details }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Normalization (inlined) ─────────────────────────────────────────────────

function stripQuotedNicknames(name) {
  if (!name) return name;
  return name.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').replace(/\s+/g, ' ').trim();
}

function detectSurnameFirst(name) {
  if (!name) return false;
  return /^[^,]+,\s*.+$/.test(name.trim());
}

function normalizeIdentityName(name) {
  if (!name || typeof name !== 'string') return null;
  let n = name.trim();
  if (!n) return null;
  n = stripQuotedNicknames(n);
  if (detectSurnameFirst(n)) {
    const parts = n.split(',');
    n = `${parts.slice(1).join(',').trim()} ${parts[0].trim()}`;
  }
  n = n.toLowerCase();
  n = n.replace(/\b(jr\.?|sr\.?|ii|iii|iv|v)\b/g, '').trim();
  n = n.replace(/[^a-z0-9\s]/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  let prev = '';
  while (prev !== n) {
    prev = n;
    n = n.replace(/\b([a-z])\s+(?=[a-z](\s|$))/g, '$1');
  }
  return n.replace(/\s+/g, ' ').trim() || null;
}

function confidenceLevelFromData(driver) {
  if (driver.external_uid && driver.date_of_birth) return 'high';
  if (driver.external_uid || driver.date_of_birth) return 'medium';
  if (driver.normalized_name && driver.primary_number) return 'low';
  return 'unverified';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;
    const limit   = parseInt(body.limit) || 500;

    const now = new Date().toISOString();

    // ── 1. Fetch existing PersonIdentity records to find already-linked drivers ──
    const existingIdentities = await base44.asServiceRole.entities.PersonIdentity
      .list('-created_date', 5000).catch(() => []);
    const linkedDriverIds = new Set(existingIdentities.map(i => i.canonical_driver_id).filter(Boolean));
    existingIdentities.forEach(i => (i.merged_driver_ids || []).forEach(id => linkedDriverIds.add(id)));

    // ── 2. Fetch all drivers ────────────────────────────────────────────────
    const allDrivers = await base44.asServiceRole.entities.Driver
      .list('-created_date', limit).catch(() => []);

    const unlinked = allDrivers.filter(d => !linkedDriverIds.has(d.id));

    const report = {
      dry_run,
      total_drivers: allDrivers.length,
      already_linked: linkedDriverIds.size,
      to_process: unlinked.length,
      created: 0,
      skipped: 0,
      errors: [],
      details: [],
    };

    if (!unlinked.length) {
      return Response.json({ success: true, message: 'All drivers already linked to PersonIdentity.', ...report });
    }

    // ── 3. Process each unlinked driver ─────────────────────────────────────
    for (const driver of unlinked) {
      const displayName = [driver.first_name, driver.last_name].filter(Boolean).join(' ').trim()
        || driver.normalized_name || `Driver-${driver.id.slice(0, 8)}`;

      const normalizedName = normalizeIdentityName(displayName);
      const confidenceLevel = confidenceLevelFromData(driver);

      if (dry_run) {
        report.details.push({ driver_id: driver.id, display_name: displayName, action: 'would_create' });
        report.created++;
        continue;
      }

      // Create PersonIdentity
      let identity;
      try {
        identity = await base44.asServiceRole.entities.PersonIdentity.create({
          status: 'active',
          confidence_level: confidenceLevel,
          confidence_score: confidenceLevel === 'high' ? 85 : confidenceLevel === 'medium' ? 60 : 30,
          canonical_name: displayName,
          legal_name: driver.legal_name || null,
          date_of_birth: driver.date_of_birth || null,
          nationality: driver.hometown_country || null,
          hometown_city: driver.hometown_city || null,
          hometown_state: driver.hometown_state || null,
          hometown_country: driver.hometown_country || null,
          canonical_driver_id: driver.id,
          external_uid: driver.external_uid || null,
          numeric_id: driver.numeric_id || null,
          data_source: 'driver_migration',
          notes: `Migrated from Driver record ${driver.id}`,
        });
      } catch (e) {
        report.errors.push({ driver_id: driver.id, error: e.message });
        continue;
      }

      // ── Create IdentityAlias records ──────────────────────────────────────

      // 1. Primary canonical alias
      await base44.asServiceRole.entities.IdentityAlias.create({
        identity_id: identity.id,
        alias_name: displayName,
        alias_normalized: normalizedName,
        alias_type: 'source_variant',
        confidence: 70,
        source: 'driver_migration',
        source_type: 'manual_admin',
        is_primary: true,
        active: true,
      }).catch(() => {});

      // 2. normalized_name if different from display
      if (driver.normalized_name && driver.normalized_name !== normalizedName) {
        await base44.asServiceRole.entities.IdentityAlias.create({
          identity_id: identity.id,
          alias_name: driver.normalized_name,
          alias_normalized: driver.normalized_name,
          alias_type: 'source_variant',
          confidence: 50,
          source: 'driver_migration',
          source_type: 'inferred',
          is_primary: false,
          active: true,
        }).catch(() => {});
      }

      // 3. Migrate Driver.nicknames[] → IdentityAlias(type: nickname)
      const nicknames = driver.nicknames || [];
      for (const nick of nicknames) {
        if (!nick) continue;
        await base44.asServiceRole.entities.IdentityAlias.create({
          identity_id: identity.id,
          alias_name: nick,
          alias_normalized: normalizeIdentityName(nick),
          alias_type: 'nickname',
          confidence: 60,
          source: 'migrated_from_driver.nicknames',
          source_type: 'manual_admin',
          is_primary: false,
          active: true,
        }).catch(() => {});
      }

      // 4. First name only (weak alias for partial matches)
      if (driver.first_name && driver.last_name) {
        const surnameFirst = `${driver.last_name}, ${driver.first_name}`;
        await base44.asServiceRole.entities.IdentityAlias.create({
          identity_id: identity.id,
          alias_name: surnameFirst,
          alias_normalized: normalizeIdentityName(surnameFirst),
          alias_type: 'surname_first',
          confidence: 55,
          source: 'driver_migration',
          source_type: 'inferred',
          is_primary: false,
          active: true,
        }).catch(() => {});
      }

      // ── Create IdentityEvidence ───────────────────────────────────────────
      await base44.asServiceRole.entities.IdentityEvidence.create({
        identity_id: identity.id,
        status: 'attached',
        source_type: 'historical_archive',
        source_name: 'Driver migration',
        raw_driver_name: displayName,
        confidence_signals: [`migration:driver_record:${driver.id}`],
        confidence_weight: 70,
        verified: confidenceLevel === 'high',
        verified_by: user.id,
        verified_at: now,
      }).catch(() => {});

      // ── AuditLog ──────────────────────────────────────────────────────────
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'PersonIdentity',
        entity_id: identity.id,
        entity_name: displayName,
        action: 'created',
        after_data: { canonical_driver_id: driver.id, confidence_level: confidenceLevel, source: 'driver_migration' },
        performed_by: user.id,
        performed_by_name: user.full_name,
        timestamp: now,
        notes: `PersonIdentity created from Driver ${driver.id}`,
      }).catch(() => {});

      report.created++;
      report.details.push({
        driver_id: driver.id,
        identity_id: identity.id,
        display_name: displayName,
        confidence_level: confidenceLevel,
        nicknames_migrated: nicknames.length,
        action: 'created',
      });
    }

    // ── OperationLog ──────────────────────────────────────────────────────────
    if (!dry_run && report.created > 0) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'identity_migration',
        entity_name: 'PersonIdentity',
        status: 'success',
        metadata: {
          source_path: 'createPersonIdentityFromDriver',
          created: report.created,
          skipped: report.skipped,
          errors: report.errors.length,
          dry_run,
        },
      }).catch(() => {});
    }

    return Response.json({ success: true, ...report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});