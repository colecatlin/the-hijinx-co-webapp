import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Displays PointsConfig resolution status for a given session.
 * Visibility only — does not modify resolution behavior.
 */
export default function PointsConfigStatusBadge({
  config,
  status,
  label,
  isLoading,
  sessionType,
  season,
  seriesClass,
}) {
  if (sessionType !== 'Final') return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Loader2 className="w-3 h-3 animate-spin" /> Checking PointsConfig…
      </div>
    );
  }

  if (status === 'class-specific') {
    return (
      <div className="flex items-start gap-2 p-2 bg-green-950/30 border border-green-800/50 rounded text-xs">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-green-300">Class-specific PointsConfig found</span>
          <p className="text-gray-500 mt-0.5">{label}{season ? ` · ${season}` : ''}{seriesClass ? ` · ${seriesClass.class_name}` : ''}</p>
        </div>
      </div>
    );
  }

  if (status === 'series-wide') {
    return (
      <div className="flex items-start gap-2 p-2 bg-amber-950/30 border border-amber-800/50 rounded text-xs">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-amber-300">Using series-wide fallback config</span>
          <p className="text-gray-500 mt-0.5">{label}{season ? ` · ${season}` : ''}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 p-2 bg-red-950/30 border border-red-800/50 rounded text-xs">
      <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <span className="text-red-300">No PointsConfig found</span>
        <p className="text-gray-500 mt-0.5">Standings will be skipped for this session{season ? ` (${season})` : ''}</p>
      </div>
    </div>
  );
}