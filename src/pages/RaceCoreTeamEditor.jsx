import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ManagementLayout from '@/components/management/ManagementLayout';
import { createPageUrl } from '@/components/utils';
import { toast } from 'sonner';
import { useEntityEditPermission } from '@/components/access/entityEditPermission';
import AdminOverridePanel from '@/components/management/AdminOverridePanel';
import TeamCoreDetailsSection from '@/components/management/TeamManagement/TeamCoreDetailsSection';
import TeamProgramsSection from '@/components/management/TeamManagement/TeamProgramsSection';
import TeamVehiclesSection from '@/components/management/TeamManagement/TeamVehiclesSection';
import TeamRosterSection from '@/components/management/TeamManagement/TeamRosterSection';
import TeamPerformanceSection from '@/components/management/TeamManagement/TeamPerformanceSection';
import TeamPartnersSection from '@/components/management/TeamManagement/TeamPartnersSection';
import TeamMediaSection from '@/components/management/TeamManagement/TeamMediaSection';
import TeamOperationsSection from '@/components/management/TeamManagement/TeamOperationsSection';
import TeamCommunitySection from '@/components/management/TeamManagement/TeamCommunitySection';

export default function RaceCoreTeamEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => base44.entities.Team.get(id),
    enabled: !isNew && !!id,
  });

  const { canEditManagement } = useEntityEditPermission('Team', isNew ? null : id, team);

  const handleTeamCreated = (newTeam) => {
    toast.success('Team created successfully!');
    navigate('/race-core/teams/' + newTeam.id);
  };

  if (!isNew && isLoading) {
    return (
      <ManagementLayout currentPage="RaceCoreTeamEditor">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </ManagementLayout>
    );
  }

  const hasCore = team?.name && team?.headquarters_city;
  const tabsLocked = isNew || !hasCore;

  return (
    <ManagementLayout currentPage="RaceCoreTeamEditor">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('ManageTeams'))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Race Core / Teams</p>
            <h1 className="text-4xl font-black mb-1">{team?.name || 'New Team'}</h1>
            <p className="text-gray-500 text-sm">{isNew ? 'Create a new team' : 'Manage all team data'}</p>
          </div>
        </div>

        {tabsLocked && !isNew && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Complete core details first to unlock all sections
          </div>
        )}

        <Tabs defaultValue="core" className="w-full">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="core">Core</TabsTrigger>
            <TabsTrigger value="programs" disabled={tabsLocked}>Programs</TabsTrigger>
            <TabsTrigger value="vehicles" disabled={tabsLocked}>Vehicles</TabsTrigger>
            <TabsTrigger value="roster" disabled={tabsLocked}>Roster</TabsTrigger>
            <TabsTrigger value="performance" disabled={tabsLocked}>Performance</TabsTrigger>
            <TabsTrigger value="partners" disabled={tabsLocked}>Partners</TabsTrigger>
            <TabsTrigger value="media" disabled={tabsLocked}>Media</TabsTrigger>
            <TabsTrigger value="operations" disabled={tabsLocked}>Operations</TabsTrigger>
            <TabsTrigger value="community" disabled={tabsLocked}>Community</TabsTrigger>
            {isAdmin && <TabsTrigger value="override">⚙ Override</TabsTrigger>}
          </TabsList>

          <TabsContent value="core" className="mt-6">
            <TeamCoreDetailsSection
              teamId={isNew ? 'new' : id}
              onTeamCreated={handleTeamCreated}
              isReadOnly={!isNew && !canEditManagement}
            />
          </TabsContent>
          <TabsContent value="programs" className="mt-6"><TeamProgramsSection teamId={id} /></TabsContent>
          <TabsContent value="vehicles" className="mt-6"><TeamVehiclesSection teamId={id} /></TabsContent>
          <TabsContent value="roster" className="mt-6"><TeamRosterSection teamId={id} /></TabsContent>
          <TabsContent value="performance" className="mt-6"><TeamPerformanceSection teamId={id} /></TabsContent>
          <TabsContent value="partners" className="mt-6"><TeamPartnersSection teamId={id} /></TabsContent>
          <TabsContent value="media" className="mt-6"><TeamMediaSection teamId={id} /></TabsContent>
          <TabsContent value="operations" className="mt-6"><TeamOperationsSection teamId={id} /></TabsContent>
          <TabsContent value="community" className="mt-6"><TeamCommunitySection teamId={id} /></TabsContent>
          {isAdmin && (
            <TabsContent value="override" className="mt-6">
              <AdminOverridePanel
                entityType="Team"
                entityId={id}
                entityRecord={team}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ['team', id] })}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ManagementLayout>
  );
}