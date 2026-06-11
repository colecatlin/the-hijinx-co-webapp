/**
 * R9CQ — useEventAlerts
 * Derived-only alert engine. No entity writes.
 * Computes alerts from existing loaded event data.
 */
import { useMemo, useState, useCallback } from 'react';

const SEVERITY_ORDER = { CRITICAL: 0, WARNING: 1, INFO: 2 };

export function useEventAlerts({
  entries = [],
  sessions = [],
  results = [],
  incidents = [],
  penalties = [],
  protests = [],
  officials = [],
  standingsDirty = false,
  mediaApplications = [],
}) {
  // R9CR: Persist dismissed WARNING/INFO alerts in sessionStorage. CRITICAL cannot be dismissed.
  const [dismissed, setDismissed] = useState(() => {
    try {
      const stored = sessionStorage.getItem('rc_dismissed_alerts');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const dismiss = useCallback((id) => {
    setDismissed(prev => {
      const next = new Set([...prev, id]);
      try { sessionStorage.setItem('rc_dismissed_alerts', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const alerts = useMemo(() => {
    const now = Date.now();
    const raw = [];

    // ── CRITICAL ──────────────────────────────────────────────────────────────
    const failedTech = entries.filter(e => e.tech_status === 'Failed');
    if (failedTech.length > 0) {
      raw.push({
        id: 'tech_failed',
        severity: 'CRITICAL',
        message: `${failedTech.length} ${failedTech.length === 1 ? 'entry' : 'entries'} failed tech inspection`,
        target: 'compliance',
        dismissible: false,
      });
    }

    const openIncidents = incidents.filter(i => ['Open', 'Under Review'].includes(i.status));
    if (openIncidents.length > 0) {
      raw.push({
        id: 'open_incidents',
        severity: 'CRITICAL',
        message: `${openIncidents.length} active ${openIncidents.length === 1 ? 'incident' : 'incidents'}`,
        target: 'race_control',
        dismissible: false,
      });
    }

    const activeProtests = protests.filter(p => ['Filed', 'Under Review', 'Hearing Scheduled'].includes(p.status));
    if (activeProtests.length > 0) {
      raw.push({
        id: 'active_protests',
        severity: 'CRITICAL',
        message: `${activeProtests.length} active ${activeProtests.length === 1 ? 'protest' : 'protests'}`,
        target: 'race_control',
        dismissible: false,
      });
    }

    // ── WARNING ───────────────────────────────────────────────────────────────
    const missingPayment = entries.filter(e => e.payment_status === 'Unpaid');
    if (missingPayment.length > 0) {
      raw.push({
        id: 'missing_payment',
        severity: 'WARNING',
        message: `${missingPayment.length} ${missingPayment.length === 1 ? 'entry' : 'entries'} missing payment`,
        target: 'entries',
        dismissible: true,
      });
    }

    const missingWaiver = entries.filter(e => !e.waiver_verified);
    if (missingWaiver.length > 0) {
      raw.push({
        id: 'missing_waiver',
        severity: 'WARNING',
        message: `${missingWaiver.length} ${missingWaiver.length === 1 ? 'entry' : 'entries'} missing waiver`,
        target: 'compliance',
        dismissible: true,
      });
    }

    const missingTransponder = entries.filter(e => !e.transponder_id);
    if (missingTransponder.length > 0) {
      raw.push({
        id: 'missing_transponder',
        severity: 'WARNING',
        message: `${missingTransponder.length} ${missingTransponder.length === 1 ? 'entry' : 'entries'} missing transponder`,
        target: 'checkin',
        dismissible: true,
      });
    }

    const sessionsWithoutResults = sessions.filter(
      s => ['Completed', 'Official', 'Locked'].includes(s.status) &&
      !results.some(r => r.session_id === s.id)
    );
    if (sessionsWithoutResults.length > 0) {
      raw.push({
        id: 'sessions_missing_results',
        severity: 'WARNING',
        message: `${sessionsWithoutResults.length} ${sessionsWithoutResults.length === 1 ? 'session' : 'sessions'} missing results`,
        target: 'results',
        dismissible: true,
      });
    }

    const provisionalResults = results.filter(r => r.status_state === 'Provisional');
    if (provisionalResults.length > 0) {
      raw.push({
        id: 'provisional_results',
        severity: 'WARNING',
        message: `${provisionalResults.length} provisional result${provisionalResults.length > 1 ? 's' : ''} not yet official`,
        target: 'results',
        dismissible: true,
      });
    }

    const pendingPenalties = penalties.filter(p => p.status === 'Proposed');
    if (pendingPenalties.length > 0) {
      raw.push({
        id: 'pending_penalties',
        severity: 'WARNING',
        message: `${pendingPenalties.length} ${pendingPenalties.length === 1 ? 'penalty' : 'penalties'} pending approval`,
        target: 'race_control',
        dismissible: true,
      });
    }

    if (standingsDirty) {
      raw.push({
        id: 'standings_stale',
        severity: 'WARNING',
        message: 'Standings stale — recalculation required',
        target: 'standings',
        dismissible: true,
      });
    }

    // ── CRITICAL: Missing Race Director ───────────────────────────────────────
    const hasRaceDirector = officials.some(o => o.role === 'Race Director' && o.status !== 'Withdrawn');
    if (!hasRaceDirector && officials.length >= 0) {
      raw.push({
        id: 'missing_race_director',
        severity: 'CRITICAL',
        message: 'No Race Director assigned to this event',
        target: 'officials',
        dismissible: false,
        timestamp: now,
      });
    }

    // ── INFO ──────────────────────────────────────────────────────────────────
    const pendingMedia = mediaApplications.filter(a =>
      ['Pending', 'Submitted', 'Applied'].includes(a.status)
    );
    if (pendingMedia.length > 0) {
      raw.push({
        id: 'media_pending',
        severity: 'INFO',
        message: `${pendingMedia.length} media ${pendingMedia.length === 1 ? 'application' : 'applications'} pending review`,
        target: 'media',
        dismissible: true,
      });
    }

    // Add timestamps to all alerts
    raw.forEach(a => { if (!a.timestamp) a.timestamp = now; });

    // Sort by severity, filter dismissed (CRITICAL never filtered)
    return raw
      .filter(a => a.severity === 'CRITICAL' ? !a.dismissible || !dismissed.has(a.id) : !dismissed.has(a.id))
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [entries, sessions, results, incidents, penalties, protests, officials, standingsDirty, mediaApplications, dismissed]);

  return { alerts, dismiss };
}