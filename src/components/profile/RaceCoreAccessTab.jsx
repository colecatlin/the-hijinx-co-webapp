import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, CheckCircle2, Info, Star, Gauge } from 'lucide-react';
import {
  getResolvedManagedEntities,
  getRaceCoreEntities,
  buildRaceCoreLaunchUrl,
  buildEditorUrl,
} from '@/components/entities/entityResolver';
import { getValidPrimaryEntity } from '@/components/entities/entityPrimary';

const ENTITY_TYPE_COLORS = {
  Track: 'bg-teal-50 text-teal-700 border-teal-200',
  Series: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};
const ROLE_COLORS = { owner: 'bg-gray-900 text-white', editor: 'bg-gray-100 text-gray-700' };

const CAPABILITIES = [
  'Create and manage events',
  'Manage entries and check in',
  'Handle compliance and tech inspection',
  'Import results, publish official, export data',
  'View audit logs and operations history',
];

const ACCESS_TIPS = [
  'Owners can invite editors and revoke access',
  'Editors can manage assigned entities only',
  'Some tabs are restricted based on entity and role',
];

export default function RaceCoreAccessTab({ user: userProp }) {
  const { data: fetchedUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !userProp,
  });

  const user = userProp || fetchedUser;

  const { data: resolvedEntities = [], isLoading: resolvedLoading } = useQuery({
    queryKey: ['resolvedEntities', user?.id],
    queryFn: () => getResolvedManagedEntities(user),
    enabled: !!user?.id,
  });

  const isLoading = (!userProp && userLoading) || resolvedLoading;
  const raceCoreEntities = getRaceCoreEntities(resolvedEntities);
  const primaryEntity = getValidPrimaryEntity(user, resolvedEntities);
  const primaryRaceCoreEntity = primaryEntity?.is_racecore_entity ? primaryEntity : null;

  if (!userProp && !userLoading && !user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-gray-500 mb-4">Sign in to access Race Core tools.</p>
          <Button onClick={() => base44.auth.redirectToLogin(createPageUrl('Profile'))} className="bg-[#232323] text-white hover:bg-black">
            Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">

      {/* Primary Race Core Entity callout */}
      {!isLoading && primaryRaceCoreEntity && (
        <Card className="border-2 border-[#232323]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" /> Primary Race Core Entity
            </CardTitle>
            <CardDescription>This entity is your default Race Core launch target.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{primaryRaceCoreEntity.entity_name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge className={`text-xs border px-2 py-0.5 ${ENTITY_TYPE_COLORS[primaryRaceCoreEntity.entity_type] || ''}`}>
                    {primaryRaceCoreEntity.entity_type}
                  </Badge>
                  <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200">
                    <Star className="w-3 h-3 mr-1 inline" />Primary
                  </Badge>
                  <Badge className={`text-xs px-2 py-0.5 ${ROLE_COLORS[primaryRaceCoreEntity.role] || ''}`}>
                    {primaryRaceCoreEntity.role}
                  </Badge>
                </div>
              </div>
              <Button type="button" size="sm" className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs flex-shrink-0"
                onClick={() => window.location.href = buildRaceCoreLaunchUrl(primaryRaceCoreEntity)}>
                <Gauge className="w-3 h-3" /> Open Race Core
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Launch */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Quick Launch
          </CardTitle>
          <CardDescription>Open Race Core directly for each Track or Series you manage.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : raceCoreEntities.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-gray-200 space-y-2">
              <Gauge className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="font-semibold text-gray-700 text-sm">Race Core is not available yet.</p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">Race Core becomes available when you manage a track or series. Link one using an access code or register a new one.</p>
              <div className="pt-1">
                <Button size="sm" variant="outline" className="text-xs gap-1.5"
                  onClick={() => window.location.href = createPageUrl('Profile') + '?tab=access_codes'}>
                  <Info className="w-3.5 h-3.5" /> Enter Access Code
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {raceCoreEntities.map(entity => {
                const isThisPrimary = entity.entity_id === primaryRaceCoreEntity?.entity_id;
                return (
                  <div key={entity.collaboration_id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-xl transition-colors ${isThisPrimary ? 'border-gray-300 bg-white' : 'border-gray-100 bg-slate-50 hover:bg-white'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{entity.entity_name}</p>
                        {isThisPrimary && (
                          <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200">
                            <Star className="w-3 h-3 mr-1 inline" />Primary
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs border px-2 py-0.5 ${ENTITY_TYPE_COLORS[entity.entity_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                          {entity.entity_type}
                        </Badge>
                        <Badge className={`text-xs px-2 py-0.5 ${ROLE_COLORS[entity.role] || 'bg-gray-100 text-gray-700'}`}>
                          {entity.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 flex-wrap">
                      <Button type="button" size="sm" className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs"
                        onClick={() => window.location.href = buildRaceCoreLaunchUrl(entity)}>
                        <ExternalLink className="w-3 h-3" /> Open Race Core
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs"
                        onClick={() => window.location.href = buildEditorUrl(entity)}>
                        Open Editor
                      </Button>
                      {entity.role === 'owner' && (
                        <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-xs text-gray-500"
                          onClick={() => window.location.href = createPageUrl('Profile') + '?tab=access_codes'}>
                          Manage Access
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" /> What You Can Do
          </CardTitle>
          <CardDescription>Race Core gives you full operational control of your entities.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {CAPABILITIES.map((cap, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />{cap}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Access Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" /> Access Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {ACCESS_TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />{tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

    </div>
  );
}