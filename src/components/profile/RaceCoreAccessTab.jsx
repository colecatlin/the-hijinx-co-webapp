import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, CheckCircle2, Rocket, Info } from 'lucide-react';
import {
  getResolvedManagedEntities,
  getRaceCoreEntities,
  buildRaceCoreLaunchUrl,
  buildEditorUrl,
} from '@/components/entities/entityResolver';

const ENTITY_TYPE_COLORS = {
  Track: 'bg-teal-50 text-teal-700 border-teal-200',
  Series: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

const ROLE_COLORS = {
  owner: 'bg-gray-900 text-white',
  editor: 'bg-gray-100 text-gray-700',
};

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

  if (!userProp && !userLoading && !user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-gray-500 mb-4">Sign in to access Race Core tools.</p>
          <Button
            onClick={() => base44.auth.redirectToLogin(createPageUrl('Profile'))}
            className="bg-[#232323] text-white hover:bg-black"
          >
            Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {/* Section 1: Quick Launch */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="w-4 h-4" /> Quick Launch
          </CardTitle>
          <CardDescription>Open Race Core directly for each Track or Series you manage.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : raceCoreEntities.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-gray-200">
              <p className="font-semibold text-gray-800 text-sm mb-1">
                You do not manage a Track or Series yet, so Race Core is unavailable.
              </p>
              <p className="text-xs text-gray-500 mt-1">Link a Track or Series using an access code to unlock Race Core tools.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {raceCoreEntities.map(entity => (
                <div
                  key={entity.collaboration_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-gray-100 rounded-xl bg-slate-50 hover:bg-white transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{entity.entity_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-xs border px-2 py-0.5 ${ENTITY_TYPE_COLORS[entity.entity_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {entity.entity_type}
                      </Badge>
                      <Badge className={`text-xs px-2 py-0.5 ${ROLE_COLORS[entity.role] || 'bg-gray-100 text-gray-700'}`}>
                        {entity.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs"
                      onClick={() => window.location.href = buildRaceCoreLaunchUrl(entity)}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Race Core
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => window.location.href = buildEditorUrl(entity)}
                    >
                      Open Editor
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: What you can do */}
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
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                {cap}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Section 3: Access Tips */}
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
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

    </div>
  );
}