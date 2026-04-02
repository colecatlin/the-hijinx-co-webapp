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
import SeriesCoreDetailsSection from '@/components/management/SeriesManagement/SeriesCoreDetailsSection';
import SeriesFormatSection from '@/components/management/SeriesManagement/SeriesFormatSection';
import SeriesClassesSection from '@/components/management/SeriesManagement/SeriesClassesSection';
import SeriesEventsSection from '@/components/management/SeriesManagement/SeriesEventsSection';
import SeriesMediaSection from '@/components/management/SeriesManagement/SeriesMediaSection';
import SeriesGovernanceSection from '@/components/management/SeriesManagement/SeriesGovernanceSection';
import SeriesTracksSection from '@/components/management/SeriesManagement/SeriesTracksSection';
import SeriesDriversSection from '@/components/management/SeriesManagement/SeriesDriversSection';
import SeriesTeamsSection from '@/components/management/SeriesManagement/SeriesTeamsSection';

export default function RaceCoreSeriesEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: series, isLoading } = useQuery({
    queryKey: ['series', id],
    queryFn: () => base44.entities.Series.get(id),
    enabled: !isNew && !!id,
  });

  const { canEditManagement } = useEntityEditPermission('Series', isNew ? null : id, series);

  const handleNavigateToDriver = (driver) => navigate(createPageUrl(`ManageDrivers?driverId=${driver.id}`));
  const handleNavigateToTeam = (team) => navigate(createPageUrl(`ManageTeams?teamId=${team.id}`));

  if (!isNew && isLoading) {
    return (
      <ManagementLayout currentPage="RaceCoreSeriesEditor">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout currentPage="RaceCoreSeriesEditor">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('ManageSeries'))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Race Core / Series</p>
            <h1 className="text-4xl font-black mb-1">{series?.name || 'New Series'}</h1>
            <p className="text-gray-500 text-sm">{isNew ? 'Create a new series' : 'Manage all series data'}</p>
          </div>
        </div>

        <Tabs defaultValue="core" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="core" className="text-xs">Core</TabsTrigger>
            {!isNew && <>
              <TabsTrigger value="format" className="text-xs">Format</TabsTrigger>
              <TabsTrigger value="classes" className="text-xs">Classes</TabsTrigger>
              <TabsTrigger value="calendar" className="text-xs">Calendar</TabsTrigger>
              <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
              <TabsTrigger value="governance" className="text-xs">Governance</TabsTrigger>
              <TabsTrigger value="teams" className="text-xs">Teams</TabsTrigger>
              <TabsTrigger value="drivers" className="text-xs">Drivers</TabsTrigger>
              <TabsTrigger value="tracks" className="text-xs">Tracks</TabsTrigger>
              {isAdmin && <TabsTrigger value="override" className="text-xs">⚙ Override</TabsTrigger>}
            </>}
          </TabsList>

          <TabsContent value="core" className="mt-6">
            <SeriesCoreDetailsSection
              seriesId={isNew ? 'new' : id}
              isReadOnly={!isNew && !canEditManagement}
            />
          </TabsContent>
          {!isNew && <>
            <TabsContent value="format" className="mt-6"><SeriesFormatSection seriesId={id} /></TabsContent>
            <TabsContent value="classes" className="mt-6"><SeriesClassesSection seriesId={id} userRole="admin" /></TabsContent>
            <TabsContent value="calendar" className="mt-6"><SeriesEventsSection seriesId={id} series={series} /></TabsContent>
            <TabsContent value="media" className="mt-6"><SeriesMediaSection seriesId={id} /></TabsContent>
            <TabsContent value="governance" className="mt-6"><SeriesGovernanceSection seriesId={id} /></TabsContent>
            <TabsContent value="teams" className="mt-6"><SeriesTeamsSection seriesId={id} seriesName={series?.name} /></TabsContent>
            <TabsContent value="drivers" className="mt-6">
              <SeriesDriversSection
                seriesId={id}
                seriesName={series?.name}
                onNavigateToDriver={handleNavigateToDriver}
                onNavigateToTeam={handleNavigateToTeam}
              />
            </TabsContent>
            <TabsContent value="tracks" className="mt-6"><SeriesTracksSection seriesId={id} seriesName={series?.name} /></TabsContent>
            {isAdmin && (
              <TabsContent value="override" className="mt-6">
                <AdminOverridePanel
                  entityType="Series"
                  entityId={id}
                  entityRecord={series}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ['series', id] })}
                />
              </TabsContent>
            )}
          </>}
        </Tabs>
      </div>
    </ManagementLayout>
  );
}