import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/components/utils';
import MyEntriesSection from '@/components/mydashboard/MyEntriesSection';
import {
  User, Users, MapPin, Trophy, ChevronRight,
  Shield, Edit, Plus, KeyRound, LayoutDashboard, ExternalLink, Star
} from 'lucide-react';

const ENTITY_ICONS = {
  Driver: User,
  Team: Users,
  Track: MapPin,
  Series: Trophy,
};

const ENTITY_COLORS = {
  Driver: 'bg-blue-50 border-blue-200 text-blue-700',
  Team: 'bg-purple-50 border-purple-200 text-purple-700',
  Track: 'bg-green-50 border-green-200 text-green-700',
  Series: 'bg-orange-50 border-orange-200 text-orange-700',
};

const EDITOR_PAGES = {
  Driver: 'DriverEditor',
  Team: 'EntityEditor',
  Track: 'EntityEditor',
  Series: 'EntityEditor',
};

function EntityCard({ collaborator, onManage }) {
  const Icon = ENTITY_ICONS[collaborator.entity_type] || User;
  const colorClass = ENTITY_COLORS[collaborator.entity_type] || 'bg-gray-50 border-gray-200 text-gray-700';
  const isOwner = collaborator.role === 'owner';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between hover:shadow-md transition-shadow group">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-base">{collaborator.entity_name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`text-xs px-2 py-0.5 border ${colorClass}`}>
              {collaborator.entity_type}
            </Badge>
            <Badge
              className={`text-xs px-2 py-0.5 ${isOwner ? 'bg-[#232323] text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {isOwner ? (
                <><Shield className="w-3 h-3 mr-1 inline" />Owner</>
              ) : (
                <><Edit className="w-3 h-3 mr-1 inline" />Editor</>
              )}
            </Badge>
          </div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onManage(collaborator)}
        className="gap-2 group-hover:bg-[#232323] group-hover:text-white group-hover:border-[#232323] transition-colors"
      >
        {collaborator.entity_type === 'Driver' ? 'Edit Profile' : 'Open Console'}
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function EmptyState({ onEnterCode }) {
  return (
    <div className="text-center py-16 px-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
      <div className="w-16 h-16 bg-white rounded-2xl border border-gray-200 flex items-center justify-center mx-auto mb-4">
        <LayoutDashboard className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">No entities yet</h3>
      <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
        You don't have any profiles assigned to your account. Enter an access code to link your driver, team, track, or series.
      </p>
      <Button
        onClick={onEnterCode}
        className="bg-[#232323] hover:bg-[#1A3249] text-white gap-2"
      >
        <KeyRound className="w-4 h-4" />
        Enter Access Code
      </Button>
    </div>
  );
}

export default function MyDashboard() {
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: collaborators = [], isLoading: collabLoading } = useQuery({
    queryKey: ['entityCollaborators', user?.email],
    queryFn: () => base44.entities.EntityCollaborator.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const isLoading = userLoading || collabLoading;

  // Group by entity type
  const grouped = useMemo(() => {
    return collaborators.reduce((acc, collab) => {
      const type = collab.entity_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(collab);
      return acc;
    }, {});
  }, [collaborators]);

  const handleManage = (collaborator) => {
    if (collaborator.entity_type === 'Driver') {
      navigate(createPageUrl('DriverEditor') + `?id=${collaborator.entity_id}`);
    } else {
      navigate(createPageUrl('EntityEditor') + `?id=${collaborator.access_code}`);
    }
  };

  const handleEnterCode = () => {
    navigate(createPageUrl('Profile') + '?tab=access');
  };

  if (!userLoading && !user) {
    base44.auth.redirectToLogin(createPageUrl('MyDashboard'));
    return null;
  }

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12">
         {/* Header */}
         <div className="mb-10">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 bg-[#232323] rounded-xl flex items-center justify-center">
               <LayoutDashboard className="w-5 h-5 text-white" />
             </div>
             <div>
               <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
               {user && (
                 <p className="text-sm text-gray-500">
                   Welcome back, {user.full_name || user.email}
                 </p>
               )}
             </div>
           </div>
         </div>

         {/* My Entries Section */}
         <div className="mb-12">
           <MyEntriesSection user={user} isLoading={userLoading} />
         </div>

         {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : collaborators.length === 0 ? (
          <EmptyState onEnterCode={handleEnterCode} />
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([entityType, items]) => {
              const Icon = ENTITY_ICONS[entityType] || User;
              return (
                <div key={entityType}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      {entityType}s
                    </h2>
                    <span className="text-xs text-gray-400">({items.length})</span>
                  </div>
                  <div className="space-y-3">
                    {items.map(collab => (
                      <EntityCard
                        key={collab.id}
                        collaborator={collab}
                        onManage={handleManage}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Footer action */}
            <div className="pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handleEnterCode}
                className="gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Link Another Profile
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}