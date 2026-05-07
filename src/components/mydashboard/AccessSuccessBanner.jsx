import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { CheckCircle2, X, Gauge, Edit2, Lock, Clock, Mail } from 'lucide-react';

const TEAL = '#1DA1A1';

const BANNER_CONFIGS = {
  access_updated: {
    title: 'Access updated',
    message: 'Your entity access has been updated successfully.',
    bg: 'rgba(29,161,161,0.1)',
    border: 'rgba(29,161,161,0.25)',
    iconColor: TEAL,
    textColor: '#00FFDA',
    Icon: CheckCircle2,
  },
  claim_submitted: {
    title: 'Claim submitted',
    message: 'Your claim request has been submitted for review.',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.25)',
    iconColor: '#fbbf24',
    textColor: '#fbbf24',
    Icon: Clock,
  },
  claim_approved: {
    title: 'Claim approved',
    message: 'Your claim was approved and your entity access is now active.',
    bg: 'rgba(29,161,161,0.1)',
    border: 'rgba(29,161,161,0.25)',
    iconColor: TEAL,
    textColor: '#00FFDA',
    Icon: CheckCircle2,
  },
  invitation_sent: {
    title: 'Invitation sent',
    message: 'Invitation sent successfully.',
    bg: 'rgba(100,160,255,0.08)',
    border: 'rgba(100,160,255,0.2)',
    iconColor: '#7eb8ff',
    textColor: '#7eb8ff',
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
  const BannerIcon = cfg.Icon;
  const showActions = (activeBanner === 'access_updated' || activeBanner === 'claim_approved') && (raceCoreTarget || primaryEntity);

  return (
    <div className="px-4 py-3 rounded-xl space-y-2"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <BannerIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: cfg.iconColor }} />
          <div>
            <span className="text-sm font-bold" style={{ color: cfg.textColor }}>{cfg.title}. </span>
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{cfg.message}</span>
          </div>
        </div>
        <button onClick={() => setActiveBanner(null)} className="flex-shrink-0 transition-colors mt-0.5"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showActions && (
        <div className="flex flex-wrap gap-2 pt-0.5 pl-6">
          {raceCoreTarget && buildRaceCoreLaunchUrl && (
            <Link to={buildRaceCoreLaunchUrl(raceCoreTarget)}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-white transition-all"
                style={{ background: TEAL }}
                onMouseEnter={e => e.currentTarget.style.background = '#158080'}
                onMouseLeave={e => e.currentTarget.style.background = TEAL}
              >
                <Gauge className="w-3.5 h-3.5" /> Open Race Core
              </button>
            </Link>
          )}
          {primaryEntity && buildEditorUrl && (
            <Link to={buildEditorUrl(primaryEntity)}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
              >
                <Edit2 className="w-3.5 h-3.5" /> Open Editor
              </button>
            </Link>
          )}
          <Link to={createPageUrl('Profile') + '?tab=access_codes'}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            >
              <Lock className="w-3.5 h-3.5" /> Manage Access
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}