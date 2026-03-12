import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/components/utils';
import { CheckCircle2, X, Gauge, Edit2, Lock, Clock, Mail } from 'lucide-react';

const BANNER_CONFIGS = {
  access_updated: {
    message: 'Your entity access has been updated successfully.',
    color: 'bg-green-50 border-green-200 text-green-800',
    iconColor: 'text-green-600',
    closeColor: 'text-green-500 hover:text-green-700',
    title: 'Access updated',
  },
  claim_submitted: {
    message: 'Your claim request has been submitted for review.',
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    iconColor: 'text-amber-600',
    closeColor: 'text-amber-500 hover:text-amber-700',
    title: 'Claim submitted',
    Icon: Clock,
  },
  claim_approved: {
    message: 'Your claim was approved and your entity access is now active.',
    color: 'bg-green-50 border-green-200 text-green-800',
    iconColor: 'text-green-600',
    closeColor: 'text-green-500 hover:text-green-700',
    title: 'Claim approved',
  },
  invitation_sent: {
    message: 'Invitation sent successfully.',
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    iconColor: 'text-blue-600',
    closeColor: 'text-blue-500 hover:text-blue-700',
    title: 'Invitation sent',
    Icon: Mail,
  },
};

export default function AccessSuccessBanner({ raceCoreTarget, primaryEntity, buildRaceCoreLaunchUrl, buildEditorUrl }) {
  const [activeBanner, setActiveBanner] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    for (const key of Object.keys(BANNER_CONFIGS)) {
      if (urlParams.get(key) === '1') {
        setActiveBanner(key);
        const url = new URL(window.location.href);
        url.searchParams.delete(key);
        window.history.replaceState({}, '', url.toString());
        const timer = setTimeout(() => setActiveBanner(null), 8000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (!activeBanner) return null;

  const cfg = BANNER_CONFIGS[activeBanner];
  const BannerIcon = cfg.Icon || CheckCircle2;
  const showActions = (activeBanner === 'access_updated' || activeBanner === 'claim_approved') && (raceCoreTarget || primaryEntity);

  return (
    <div className={`px-4 py-3 border rounded-xl space-y-2 ${cfg.color}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BannerIcon className={`w-4 h-4 flex-shrink-0 ${cfg.iconColor}`} />
          <div>
            <span className="text-sm font-semibold">{cfg.title}. </span>
            <span className="text-sm">{cfg.message}</span>
          </div>
        </div>
        <button onClick={() => setActiveBanner(null)} className={`flex-shrink-0 ${cfg.closeColor}`}>
          <X className="w-4 h-4" />
        </button>
      </div>
      {showActions && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {raceCoreTarget && buildRaceCoreLaunchUrl && (
            <Link to={buildRaceCoreLaunchUrl(raceCoreTarget)}>
              <Button size="sm" className="text-xs gap-1.5 bg-green-700 hover:bg-green-800 text-white">
                <Gauge className="w-3.5 h-3.5" /> Open Race Core
              </Button>
            </Link>
          )}
          {primaryEntity && buildEditorUrl && (
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