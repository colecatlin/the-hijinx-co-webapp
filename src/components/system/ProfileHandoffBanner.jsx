import React, { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  checkDriverCompleteness,
  checkTeamCompleteness,
  checkTrackCompleteness,
  checkSeriesCompleteness,
  checkEventCompleteness,
} from './profileCompleteness';

const checkers = {
  Driver: checkDriverCompleteness,
  Team: checkTeamCompleteness,
  Track: checkTrackCompleteness,
  Series: checkSeriesCompleteness,
  Event: checkEventCompleteness,
};

const managementPaths = {
  Driver: (id) => `/race-core/drivers/${id}?tab=branding`,
  Team: (id) => `/race-core/teams/${id}?tab=media`,
  Track: (id) => `/race-core/tracks/${id}`,
  Series: (id) => `/race-core/series/${id}?tab=media`,
  Event: (id) => `/race-core/events/${id}`,
};

const handoffMessages = {
  Driver: 'Add a profile image and bio to make this driver public-ready.',
  Team: 'Add a logo and team description to complete the public profile.',
  Track: 'Add a track image and description to improve public visibility.',
  Series: 'Add a logo and series description to complete the public profile.',
  Event: 'Add track, series, and cover image to finish event setup.',
};

export default function ProfileHandoffBanner({ entityType, entityId, record }) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (!record || !entityId || dismissed) return null;
  const check = checkers[entityType];
  if (!check) return null;

  const { level, missingRecommended, missingRequired } = check(record);

  // Only show when core is done but profile is incomplete
  if (level === 'public_ready' || missingRequired.length > 0) return null;

  const allMissing = missingRecommended;
  if (allMissing.length === 0) return null;

  return (
    <div className="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-blue-900 mb-0.5">Profile setup recommended</p>
        <p className="text-xs text-blue-700">{handoffMessages[entityType]}</p>
        <p className="text-xs text-blue-500 mt-1">Missing: {allMissing.join(', ')}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate(managementPaths[entityType](entityId))}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline"
        >
          Complete profile <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setDismissed(true)} className="text-blue-400 hover:text-blue-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}