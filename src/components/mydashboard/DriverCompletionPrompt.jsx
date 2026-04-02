import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

function isMissingFields(driver) {
  if (!driver) return false;
  const missing = [];
  if (!driver.bio) missing.push('bio');
  if (!driver.profile_image_url) missing.push('profile photo');
  if (!driver.primary_discipline) missing.push('discipline');
  return missing;
}

export default function DriverCompletionPrompt({ user }) {
  const { data: drivers = [] } = useQuery({
    queryKey: ['driver_primary', user?.primary_entity_id],
    queryFn: () => base44.entities.Driver.filter({ id: user.primary_entity_id }),
    enabled: !!user?.primary_entity_id,
    staleTime: 60_000,
  });

  const driver = drivers[0];
  if (!driver) return null;

  const missing = isMissingFields(driver);
  if (!missing || missing.length === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 sm:mt-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">Your driver profile is incomplete</p>
        <p className="text-xs text-amber-700 mt-0.5">
          Missing: {missing.join(', ')}. Add these to get discovered by fans and teams.
        </p>
      </div>
      <Link to={createPageUrl('DriverProfileSetup') + `?driver_id=${driver.id}`} className="flex-shrink-0">
        <Button size="sm" className="bg-amber-700 hover:bg-amber-800 text-white text-xs gap-1.5 whitespace-nowrap">
          Complete Profile →
        </Button>
      </Link>
    </div>
  );
}