import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function RacerDraftReview({ drafts, publishableCount, onPublish, busy }) {
  if (!drafts) return null;
  if (drafts.length === 0) {
    return (
      <div className="rounded-xl border border-divider bg-surface p-4 text-sm text-foreground-secondary">
        No draft racer profiles. Drafts stay unavailable publicly until an admin publishes them.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-divider bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">Review draft profiles</h3>
        <span className="text-[11px] text-foreground-quiet">
          {drafts.length} drafts · {publishableCount ?? 0} ready to publish
        </span>
      </div>

      <div className="mt-3 divide-y divide-divider/60">
        {drafts.map((draft) => (
          <div key={draft.racer_profile_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link to={`/racers/${draft.slug}`} className="text-sm font-semibold text-foreground hover:text-motion">
                  {draft.display_name || 'Unnamed racer'}
                </Link>
                {draft.racecore_id && (
                  <span className="font-mono text-[10px] tracking-widest text-foreground-quiet">{draft.racecore_id}</span>
                )}
                {draft.publishable ? (
                  <span className="rounded-md bg-success/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-success">
                    Integrity OK
                  </span>
                ) : (
                  <span className="rounded-md bg-danger/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-danger">
                    Needs fixing
                  </span>
                )}
              </div>
              {draft.blockers?.length > 0 && (
                <p className="mt-1 text-[11px] text-danger">Blocks publication: {draft.blockers.join(' · ')}</p>
              )}
              {draft.completeness_notes?.length > 0 && (
                <p className="mt-1 text-[11px] text-foreground-quiet">
                  Incomplete, publication still allowed: {draft.completeness_notes.join(' · ')}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !draft.publishable}
              onClick={() => onPublish(draft.racer_profile_id)}
            >
              Publish
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}