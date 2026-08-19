import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { CheckCircle2, X, Gauge, Edit2, Lock, Clock, Mail } from 'lucide-react';

const MOTION = 'hsl(var(--motion))';
const MOTION_HOVER = 'hsl(var(--motion-hover))';
const WARNING = 'hsl(var(--warning))';
const DANGER = 'hsl(var(--danger))';

const BANNER_CONFIGS = {
  access_updated: {
    title: 'Access updated',
    message: 'Your entity access has been updated successfully.',
    bg: `hsl(var(--motion) / 0.1)`,
    border: `hsl(var(--motion) / 0.25)`,
    iconColor: MOTION,
    textColor: MOTION,
    Icon: CheckCircle2,
  },
  claim_submitted: {
    title: 'Claim submitted',
    message: 'Your claim request has been submitted for review.',
    bg: `hsl(var(--warning) / 0.1)`,
    border: `hsl(var(--warning) / 0.25)`,
    iconColor: WARNING,
    textColor: WARNING,
    Icon: Clock,
  },
  claim_approved: {
    title: 'Claim approved',
    message: 'Your claim was approved and your entity access is now active.',
    bg: `hsl(var(--motion) / 0.1)`,
    border: `hsl(var(--motion) / 0.25)`,
    iconColor: MOTION,
    textColor: MOTION,
    Icon: CheckCircle2,
  },
  invitation_sent: {
    title: 'Invitation sent',
    message: 'Invitation sent successfully.',
    bg: `hsl(var(--motion) / 0.08)`,
    border: `hsl(var(--motion) / 0.2)`,
    iconColor: MOTION,
    textColor: MOTION,
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
            <span className="text-sm" style={{ color: 'hsl(var(--foreground-secondary))' }}>{cfg.message}</span>
          </div>
        </div>
        <button onClick={() => setActiveBanner(null)} className="flex-shrink-0 transition-colors mt-0.5"
          style={{ color: 'hsl(var(--foreground-quiet))' }}
          onMouseEnter={e => e.currentTarget.style.color = 'hsl(var(--foreground))'}
          onMouseLeave={e => e.currentTarget.style.color = 'hsl(var(--foreground-quiet))'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showActions && (
        <div className="flex flex-wrap gap-2 pt-0.5 pl-6">
          {raceCoreTarget && buildRaceCoreLaunchUrl && (
            <Link to={buildRaceCoreLaunchUrl(raceCoreTarget)}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                style={{ background: MOTION, color: 'hsl(var(--canvas))' }}
                onMouseEnter={e => e.currentTarget.style.background = MOTION_HOVER}
                onMouseLeave={e => e.currentTarget.style.background = MOTION}
              >
                <Gauge className="w-3.5 h-3.5" /> Open Race Core
              </button>
            </Link>
          )}
          {primaryEntity && buildEditorUrl && (
            <Link to={buildEditorUrl(primaryEntity)}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                style={{ background: 'hsl(var(--surface-interactive) / 0.5)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'hsl(var(--surface-interactive))'; e.currentTarget.style.color = 'hsl(var(--foreground))'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.5)'; e.currentTarget.style.color = 'hsl(var(--foreground-secondary))'; }}
              >
                <Edit2 className="w-3.5 h-3.5" /> Open Editor
              </button>
            </Link>
          )}
          <Link to={createPageUrl('Profile') + '?tab=access_codes'}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
              style={{ background: 'hsl(var(--surface-interactive) / 0.5)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'hsl(var(--surface-interactive))'; e.currentTarget.style.color = 'hsl(var(--foreground))'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.5)'; e.currentTarget.style.color = 'hsl(var(--foreground-secondary))'; }}
            >
              <Lock className="w-3.5 h-3.5" /> Manage Access
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}