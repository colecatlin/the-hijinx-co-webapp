import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/components/utils';
import { getUserMode, USER_MODE_LABELS, USER_MODE_COLORS, USER_MODE_DESCRIPTIONS } from '@/components/system/userModeResolver';
import { Gauge, Shield, Edit2, Star, Camera, Heart } from 'lucide-react';

const MODE_ICONS = {
  admin: Shield,
  entity_owner: Star,
  entity_editor: Edit2,
  media_user: Camera,
  fan: Heart,
};

export default function AccountStatusCard({ user, collaborators, mediaProfile, primaryEntity, raceCoreTarget, buildRaceCoreLaunchUrl, buildEditorUrl }) {
  const mode = getUserMode({ user, collaborators, mediaProfile });
  const Icon = MODE_ICONS[mode] || Heart;
  const label = USER_MODE_LABELS[mode];
  const colorClass = USER_MODE_COLORS[mode];
  const description = USER_MODE_DESCRIPTIONS[mode];

  const isOwner = mode === 'entity_owner' || mode === 'admin';
  const hasRaceCore = !!raceCoreTarget;
  const hasEditor = !!primaryEntity;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">Account Type</span>
              <Badge className={`text-xs px-2 py-0.5 ${colorClass}`}>{label}</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
      </div>

      {primaryEntity && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
          <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-800 font-medium">Primary: {primaryEntity.entity_name}</span>
          <Badge className="text-xs ml-auto bg-white border border-amber-200 text-amber-700">{primaryEntity.entity_type}</Badge>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link to={createPageUrl('MyDashboard')}>
          <Button size="sm" variant="outline" className="text-xs gap-1.5">Go to Dashboard</Button>
        </Link>
        {hasRaceCore && (
          <Button size="sm" className="text-xs gap-1.5 bg-[#232323] hover:bg-black text-white"
            onClick={() => window.location.href = buildRaceCoreLaunchUrl(raceCoreTarget)}>
            <Gauge className="w-3.5 h-3.5" /> Open Race Core
          </Button>
        )}
        {hasEditor && !hasRaceCore && (
          <Button size="sm" variant="outline" className="text-xs gap-1.5"
            onClick={() => window.location.href = buildEditorUrl(primaryEntity)}>
            <Edit2 className="w-3.5 h-3.5" /> Open Editor
          </Button>
        )}
        {isOwner && (
          <Link to={createPageUrl('Profile') + '?tab=access_codes'}>
            <Button size="sm" variant="outline" className="text-xs gap-1.5">Manage Access</Button>
          </Link>
        )}
        {mode === 'media_user' && (
          <Link to={createPageUrl('MediaPortal')}>
            <Button size="sm" variant="outline" className="text-xs gap-1.5"><Camera className="w-3.5 h-3.5" /> Media Portal</Button>
          </Link>
        )}
      </div>
    </div>
  );
}