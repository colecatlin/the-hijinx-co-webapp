import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/components/utils';
import { getUserMode, USER_MODE_LABELS, USER_MODE_COLORS } from '@/components/system/userModeResolver';
import { Gauge, Shield, Edit2, Star, Camera, Heart, KeyRound, Lock } from 'lucide-react';

const MODE_DESCRIPTIONS = {
  admin: {
    title: 'Admin Dashboard',
    body: 'Full access to all management tools, diagnostics, and platform operations.',
    bg: 'bg-purple-50 border-purple-200',
    textTitle: 'text-purple-900',
    textBody: 'text-purple-700',
  },
  entity_owner: {
    title: 'Entity Owner Dashboard',
    body: 'Manage your entities, invite editors, and launch Race Core operations.',
    bg: 'bg-[#232323] border-[#232323]',
    textTitle: 'text-white',
    textBody: 'text-gray-300',
    dark: true,
  },
  entity_editor: {
    title: 'Editor Dashboard',
    body: "You have editor access to racing entities. Some owner-only controls aren't available.",
    bg: 'bg-blue-50 border-blue-200',
    textTitle: 'text-blue-900',
    textBody: 'text-blue-700',
  },
  media_user: {
    title: 'Media Dashboard',
    body: 'Access your media portal, credentials, and deliverables.',
    bg: 'bg-teal-50 border-teal-200',
    textTitle: 'text-teal-900',
    textBody: 'text-teal-700',
  },
  fan: {
    title: 'Fan Dashboard',
    body: 'Browse motorsports, follow drivers, and link a racing entity to unlock management tools.',
    bg: 'bg-gray-50 border-gray-200',
    textTitle: 'text-gray-900',
    textBody: 'text-gray-600',
  },
};

export default function DashboardModeBanner({ user, collaborators, mediaProfile, raceCoreTarget, primaryEntity, buildRaceCoreLaunchUrl, buildEditorUrl }) {
  const mode = getUserMode({ user, collaborators, mediaProfile });
  const label = USER_MODE_LABELS[mode];
  const colorClass = USER_MODE_COLORS[mode];
  const cfg = MODE_DESCRIPTIONS[mode] || MODE_DESCRIPTIONS.fan;

  const cta = (() => {
    if (mode === 'admin') {
      return raceCoreTarget
        ? { label: 'Open Race Core', to: buildRaceCoreLaunchUrl(raceCoreTarget), primary: true }
        : { label: 'Management', to: createPageUrl('Management'), primary: true };
    }
    if (mode === 'entity_owner' || mode === 'entity_editor') {
      if (raceCoreTarget) return { label: 'Open Race Core', to: buildRaceCoreLaunchUrl(raceCoreTarget), primary: true };
      if (primaryEntity) return { label: 'Open Editor', to: buildEditorUrl(primaryEntity), primary: true };
    }
    if (mode === 'media_user') return { label: 'Media Portal', to: createPageUrl('MediaPortal'), primary: true };
    return { label: 'Link an Entity', to: createPageUrl('Profile') + '?tab=access_codes', primary: true };
  })();

  return (
    <div className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${cfg.bg}`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className={`font-semibold text-base ${cfg.textTitle}`}>{cfg.title}</h3>
          <Badge className={`text-xs px-2 py-0.5 ${colorClass} ${cfg.dark ? 'border-white/20' : ''}`}>{label}</Badge>
        </div>
        <p className={`text-sm ${cfg.textBody}`}>{cfg.body}</p>
        {mode === 'entity_editor' && (
          <div className="flex items-center gap-1.5 mt-2">
            <Edit2 className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs text-blue-600">Editor access — owner controls are not available to you.</span>
          </div>
        )}
      </div>
      <div className="flex gap-2 flex-shrink-0 flex-wrap">
        {cta && (
          <Link to={cta.to}>
            <Button size="sm" className={`gap-1.5 text-xs ${cfg.dark ? 'bg-white text-[#232323] hover:bg-gray-100 border-0' : 'bg-[#232323] hover:bg-black text-white'}`}>
              {mode === 'admin' || mode === 'entity_owner' || mode === 'entity_editor'
                ? <Gauge className="w-3.5 h-3.5" />
                : mode === 'media_user'
                ? <Camera className="w-3.5 h-3.5" />
                : <KeyRound className="w-3.5 h-3.5" />}
              {cta.label}
            </Button>
          </Link>
        )}
        {mode === 'entity_owner' && (
          <Link to={createPageUrl('Profile') + '?tab=access_codes'}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs border-white/20 text-white hover:bg-white/10">
              <Lock className="w-3.5 h-3.5" /> Manage Access
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}