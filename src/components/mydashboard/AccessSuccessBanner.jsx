import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/components/utils';
import { CheckCircle2, X, Gauge, Edit2, Lock } from 'lucide-react';

/**
 * Shows a green success banner when ?access_updated=1 is in the URL.
 * Accepts optional raceCoreTarget and primaryEntity to show relevant action CTAs.
 */
export default function AccessSuccessBanner({ raceCoreTarget, primaryEntity, buildRaceCoreLaunchUrl, buildEditorUrl }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('access_updated') === '1') {
      setVisible(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('access_updated');
      window.history.replaceState({}, '', url.toString());
      const timer = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const hasRaceCore = !!raceCoreTarget && buildRaceCoreLaunchUrl;
  const hasEditor = !!primaryEntity && buildEditorUrl;

  return (
    <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-800">You now have entity access. Your dashboard has been updated.</p>
        </div>
        <button onClick={() => setVisible(false)} className="text-green-500 hover:text-green-700 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
      {(hasRaceCore || hasEditor) && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {hasRaceCore && (
            <Link to={buildRaceCoreLaunchUrl(raceCoreTarget)}>
              <Button size="sm" className="text-xs gap-1.5 bg-green-700 hover:bg-green-800 text-white">
                <Gauge className="w-3.5 h-3.5" /> Open Race Core
              </Button>
            </Link>
          )}
          {hasEditor && (
            <Link to={buildEditorUrl(primaryEntity)}>
              <Button size="sm" variant="outline" className="text-xs gap-1.5 border-green-300 text-green-800 hover:bg-green-100">
                <Edit2 className="w-3.5 h-3.5" /> Open Editor
              </Button>
            </Link>
          )}
          <Link to={createPageUrl('Profile') + '?tab=access_codes'}>
            <Button size="sm" variant="outline" className="text-xs gap-1.5 border-green-300 text-green-800 hover:bg-green-100">
              <Lock className="w-3.5 h-3.5" /> Manage Access
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}