import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useEntityEditPermission } from '@/components/access/entityEditPermission';
import RecordDrawerShell from './RecordDrawerShell';
import ProfileCompletenessIndicator from '@/components/system/ProfileCompletenessIndicator';

import TeamCoreDetailsSection  from '@/components/management/TeamManagement/TeamCoreDetailsSection';
import TeamProgramsSection     from '@/components/management/TeamManagement/TeamProgramsSection';
import TeamVehiclesSection     from '@/components/management/TeamManagement/TeamVehiclesSection';
import TeamRosterSection       from '@/components/management/TeamManagement/TeamRosterSection';
import TeamPerformanceSection  from '@/components/management/TeamManagement/TeamPerformanceSection';
import TeamPartnersSection     from '@/components/management/TeamManagement/TeamPartnersSection';
import TeamMediaSection        from '@/components/management/TeamManagement/TeamMediaSection';
import TeamOperationsSection   from '@/components/management/TeamManagement/TeamOperationsSection';
import TeamCommunitySection    from '@/components/management/TeamManagement/TeamCommunitySection';
import AdminOverridePanel      from '@/components/management/AdminOverridePanel';

/**
 * TeamDrawer — slide-over editor for Team records.
 *
 * Props:
 *   teamId        — string | 'new' | null
 *   open          — boolean
 *   onOpenChange  — (open: boolean) => void
 *   onSaveSuccess — () => void
 */
export default function TeamDrawer({ teamId, open, onOpenChange, onSaveSuccess }) {
  const queryClient = useQueryClient();
  const isNew = teamId === 'new';

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => base44.entities.Team.get(teamId),
    enabled: !!teamId && !isNew && open,
  });

  const { canEditManagement } = useEntityEditPermission('Team', isNew ? null : teamId, team);

  const hasCore = team?.name && team?.headquarters_city;
  const tabsLocked = isNew || !hasCore;

  const handleTeamCreated = (newTeam) => {
    toast.success('Team created successfully!');
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    onSaveSuccess && onSaveSuccess(newTeam?.id);
    onOpenChange(false);
  };

  const handleSaveSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['team', teamId] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    onSaveSuccess && onSaveSuccess();
  };

  const tabs = [
    {
      value: 'core',
      label: 'Core',
      content: (
        <TeamCoreDetailsSection
          teamId={isNew ? 'new' : teamId}
          onTeamCreated={handleTeamCreated}
          isReadOnly={!isNew && !canEditManagement}
        />
      ),
    },
    {
      value: 'programs',
      label: 'Programs',
      disabled: tabsLocked,
      content: <TeamProgramsSection teamId={teamId} />,
    },
    {
      value: 'vehicles',
      label: 'Vehicles',
      disabled: tabsLocked,
      content: <TeamVehiclesSection teamId={teamId} />,
    },
    {
      value: 'roster',
      label: 'Roster',
      disabled: tabsLocked,
      content: <TeamRosterSection teamId={teamId} />,
    },
    {
      value: 'performance',
      label: 'Performance',
      disabled: tabsLocked,
      content: <TeamPerformanceSection teamId={teamId} />,
    },
    {
      value: 'partners',
      label: 'Partners',
      disabled: tabsLocked,
      content: <TeamPartnersSection teamId={teamId} />,
    },
    {
      value: 'media',
      label: 'Media',
      disabled: tabsLocked,
      content: <TeamMediaSection teamId={teamId} />,
    },
    {
      value: 'operations',
      label: 'Ops',
      disabled: tabsLocked,
      content: <TeamOperationsSection teamId={teamId} />,
    },
    {
      value: 'community',
      label: 'Community',
      disabled: tabsLocked,
      content: <TeamCommunitySection teamId={teamId} />,
    },
    {
      value: 'override',
      label: '⚙ Override',
      hidden: !isAdmin,
      content: (
        <AdminOverridePanel
          entityType="Team"
          entityId={teamId}
          entityRecord={team}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['team', teamId] })}
        />
      ),
    },
  ];

  const headerActions = !isNew && team ? (
    <ProfileCompletenessIndicator entityType="Team" record={team} />
  ) : null;

  return (
    <RecordDrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={team?.name || (isNew ? 'New Team' : '…')}
      subtitle={
        isNew
          ? 'Create a new team'
          : team
            ? [team.headquarters_city, team.headquarters_state].filter(Boolean).join(', ') || undefined
            : undefined
      }
      isLoading={!isNew && isLoading}
      width="wide"
      tabs={tabs}
      actions={headerActions}
      entityType="Team"
    />
  );
}