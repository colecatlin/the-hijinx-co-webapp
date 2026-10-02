import React, { useCallback, useEffect, useState } from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import { base44 } from '@/api/base44Client';
import RacerHealthCounts from '@/components/management/racerhealth/RacerHealthCounts';
import RacerHealthActions from '@/components/management/racerhealth/RacerHealthActions';
import RacerRepairReport from '@/components/management/racerhealth/RacerRepairReport';
import RacerDraftReview from '@/components/management/racerhealth/RacerDraftReview';

/**
 * Racer Data Health — admin-only view of the canonical racer chain.
 * PersonIdentity → RacerProfile → SeasonParticipation → Entry → Results/Standings.
 *
 * Integrity (a broken relationship) is reported separately from completeness
 * (a missing bio, image, team or result), because only integrity blocks
 * publication.
 */
export default function RacerDataHealth() {
  const [counts, setCounts] = useState(null);
  const [legacy, setLegacy] = useState(null);
  const [report, setReport] = useState(null);
  const [audit, setAudit] = useState(null);
  const [drafts, setDrafts] = useState(null);
  const [draftSummary, setDraftSummary] = useState({ count: 0, publishable: 0 });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const loadCounts = useCallback(async () => {
    const response = await base44.functions.invoke('getRacerDataHealth', { mode: 'counts' });
    const data = response?.data || {};
    setCounts(data.counts || null);
    setLegacy(data.legacy || null);
  }, []);

  const loadDrafts = useCallback(async () => {
    const response = await base44.functions.invoke('getRacerDataHealth', { mode: 'drafts' });
    const data = response?.data || {};
    setDrafts(data.drafts || []);
    setDraftSummary({ count: data.draft_count || 0, publishable: data.publishable_count || 0 });
  }, []);

  useEffect(() => {
    setBusy(true);
    Promise.all([loadCounts(), loadDrafts()])
      .catch((error) => setStatus(error?.message || 'Could not load racer health data'))
      .finally(() => setBusy(false));
  }, [loadCounts, loadDrafts]);

  const withBusy = async (label, operation) => {
    setBusy(true);
    setStatus(label);
    try {
      await operation();
    } catch (error) {
      setStatus(error?.message || 'The action failed');
    } finally {
      setBusy(false);
    }
  };

  const handleAudit = () => withBusy('Running relationship audit…', async () => {
    const response = await base44.functions.invoke('getRacerDataHealth', { mode: 'audit' });
    setAudit(response?.data || null);
    setStatus('Relationship audit complete');
  });

  const runRepair = (dryRun) => withBusy(dryRun ? 'Running dry-run repair…' : 'Applying repair…', async () => {
    const response = await base44.functions.invoke('repairRacerIdentityRelationships', { dry_run: dryRun });
    setReport(response?.data || null);
    setStatus(dryRun ? 'Dry run complete — nothing was written' : 'Repair applied');
    if (!dryRun) {
      await loadCounts();
      await loadDrafts();
    }
  });

  const handleApply = () => {
    if (!report || !report.dry_run) {
      setStatus('Run a dry-run repair first, review it, then apply.');
      return;
    }
    const confirmed = window.confirm(
      'Apply the relationships reported by the dry run? Records with ambiguous or unprovable links stay untouched.',
    );
    if (confirmed) runRepair(false);
  };

  const handleRecalculate = () => withBusy('Recalculating career statistics…', async () => {
    const response = await base44.functions.invoke('getRacerDataHealth', { mode: 'drafts' });
    const candidates = (response?.data?.drafts || []).map((d) => d.racer_profile_id);
    let recalculated = 0;
    let failed = 0;
    for (const racerProfileId of candidates.slice(0, 50)) {
      try {
        const profile = await base44.functions.invoke('getRacerProfileExperience', { racer_profile_id: racerProfileId, allow_draft: true });
        const identityId = profile?.data?.page_data?.identity?.id;
        if (!identityId) continue;
        await base44.functions.invoke('recalculateDriverCareerStats', { identity_id: identityId });
        recalculated += 1;
      } catch {
        failed += 1;
      }
    }
    await loadCounts();
    setStatus(`Career statistics recalculated for ${recalculated} racer${recalculated === 1 ? '' : 's'}${failed ? ` · ${failed} failed` : ''}`);
  });

  const handlePublish = (racerProfileId) => withBusy('Publishing racer profile…', async () => {
    const response = await base44.functions.invoke('publishRacerProfile', { racer_profile_id: racerProfileId, action: 'publish' });
    const data = response?.data || {};
    if (data.published) {
      setStatus(`Published ${data.slug}. ${data.completeness_notes?.length ? 'Still incomplete: ' + data.completeness_notes.join(' · ') : 'Profile is complete.'}`);
    } else {
      setStatus('Publication blocked: ' + (data.blockers || []).join(' · '));
    }
    await loadCounts();
    await loadDrafts();
  });

  return (
    <ManagementLayout currentPage="management/platform/racer-data-health">
      <AdminGuard>
        <ManagementShell
          title="Racer Data Health"
          subtitle="The canonical racer chain — PersonIdentity → RacerProfile → SeasonParticipation → Entry → Results / Standings"
        >
          <div className="space-y-6">
            {status && (
              <div className="rounded-lg border border-divider bg-surface-elevated px-3 py-2 text-xs text-foreground-secondary">
                {status}
              </div>
            )}

            <RacerHealthActions
              busy={busy}
              onAudit={handleAudit}
              onDryRun={() => runRepair(true)}
              onApply={handleApply}
              onRecalculate={handleRecalculate}
            />

            <RacerHealthCounts counts={counts} legacy={legacy} />

            {audit && (
              <div className="rounded-xl border border-divider bg-surface p-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">
                  Relationship audit — {audit.integrity_ok ? 'no integrity errors' : 'integrity errors found'}
                </h3>
                <p className="mt-1 text-[11px] text-foreground-quiet">
                  {audit.profiles_audited} racer profiles checked · {audit.findings?.length || 0} with findings
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(audit.issue_counts || {}).map(([code, count]) => (
                    <span key={code} className="rounded-lg border border-divider bg-surface-elevated px-2.5 py-1 text-[11px] text-foreground-secondary">
                      {code.replace(/_/g, ' ')} · {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <RacerRepairReport report={report} />

            <RacerDraftReview
              drafts={drafts}
              publishableCount={draftSummary.publishable}
              onPublish={handlePublish}
              busy={busy}
            />
          </div>
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}