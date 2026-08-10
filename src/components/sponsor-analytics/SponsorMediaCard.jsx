import React from 'react';
import { Image, FileText, MousePointer, BarChart3 } from 'lucide-react';

function MediaStat({ label, metric }) {
  if (!metric) return null;
  const { value, classification, reason } = metric;
  return (
    <div className="rounded-lg p-3" style={{ background: 'hsl(var(--surface-elevated))' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-50 mb-1">{label}</p>
      <p className="text-lg font-bold font-mono">
        {classification === 'Unavailable' ? '—' : value != null ? value : '—'}
      </p>
      <p className="text-[9px] font-mono uppercase opacity-40">{classification}</p>
      {reason && <p className="text-[9px] opacity-40 mt-0.5">{reason}</p>}
    </div>
  );
}

export default function SponsorMediaCard({ media, advertisements }) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'hsl(var(--divider))', background: 'hsl(var(--surface))' }}>
      <div className="flex items-center gap-2 mb-4">
        <Image className="w-4 h-4 opacity-60" />
        <h3 className="text-sm font-bold uppercase tracking-wide">Media & Advertisement Metrics</h3>
      </div>

      {/* Media metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        <MediaStat label="Assignments" metric={media?.media_assignment_count} />
        <MediaStat label="Advertisements" metric={media?.advertisement_count} />
        <MediaStat label="Published Stories" metric={media?.published_story_count} />
      </div>

      {/* Advertisement analytics (if available) */}
      {advertisements && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2 mt-4">Ad Analytics</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MediaStat label="Impressions" metric={advertisements.total_impressions} />
            <MediaStat label="Clicks" metric={advertisements.total_clicks} />
            <MediaStat label="Conversions" metric={advertisements.total_conversions} />
            <MediaStat label="CTR" metric={advertisements.ctr} />
          </div>
          {advertisements.total_impressions?.reason && (
            <p className="text-[10px] opacity-40 mt-2 font-mono">{advertisements.total_impressions.reason}</p>
          )}
        </>
      )}

      {media?.media_value?.reason && (
        <p className="text-[10px] opacity-40 mt-3 font-mono">Media Value: {media.media_value.reason}</p>
      )}
    </div>
  );
}