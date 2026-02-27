import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/components/utils';

import { DriverCoreDetailsSectionWithManagers } from '@/components/management/DriverEditor/DriverCoreDetailsSection.jsx';
import DriverCoreDetailsSection from '@/components/management/DriverEditor/DriverCoreDetailsSection.jsx';
import DriverProgramsSection from '@/components/management/DriverEditor/DriverProgramsSection.jsx';
import DriverMediaSection from '@/components/management/DriverEditor/DriverMediaSection.jsx';
import DriverProgramsList from '@/components/management/DriverManagement/DriverProgramsList';
import DriverClaimsDisplay from '@/components/drivers/DriverClaimsDisplay';

export default function DriverEditor({ driverId: propDriverId }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const driverId = propDriverId || searchParams.get('id') || searchParams.get('driverId');
  const [activeTab, setActiveTab] = useState('details');
  const isFromEntityEditor = !!propDriverId;
  const backPage = isFromEntityEditor ? 'Profile' : 'MyDashboard';



  const { data: driver, isLoading: driverLoading, error: driverError } = useQuery({
    queryKey: ['driver', driverId],
    queryFn: async () => {
      if (propDriverId) {
        // Called from EntityEditor with direct ID
        return base44.entities.Driver.get(driverId);
      }
      // Called directly with access code check
      const response = await base44.functions.invoke('getDriverWithAccess', { driverId });
      return response.data.driver;
    },
    enabled: !!driverId,
  });

  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ['driverPrograms', driverId],
    queryFn: () => base44.entities.DriverProgram.filter({ driver_id: driverId }),
    enabled: !!driverId,
  });

  const { data: media = [], isLoading: mediaLoading } = useQuery({
    queryKey: ['driverMedia', driverId],
    queryFn: () => base44.entities.DriverMedia.filter({ driver_id: driverId }),
    enabled: !!driverId,
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const isLoading = driverLoading || programsLoading || mediaLoading;

  if (!driverId) {
    return (
      <PageShell>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <p className="text-gray-500">No driver selected.</p>
          <Button onClick={() => navigate(createPageUrl(backPage))} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-6xl mx-auto px-6 py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </PageShell>
    );
  }

  if (!driver) {
    const isAccessDenied = driverError?.response?.status === 403;
    return (
      <PageShell>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <p className="text-gray-500">
            {isAccessDenied ? 'You do not have access to this driver.' : 'Driver not found.'}
          </p>
          <Button onClick={() => navigate(createPageUrl(backPage))} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </PageShell>
    );
  }



  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl(isFromEntityEditor ? 'Profile' : 'ManageDrivers'))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {isFromEntityEditor ? 'Profile' : 'Drivers'}
          </Button>
          <h1 className="text-4xl font-bold">
            {driver.first_name} {driver.last_name}
          </h1>
          <p className="text-gray-500 mt-2">Manage all driver profile information</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="results">Race Results</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <DriverCoreDetailsSectionWithManagers driver={driver} />
          </TabsContent>

          <TabsContent value="programs">
            <DriverProgramsSection driverId={driverId} programs={programs} series={series} teams={teams} />
          </TabsContent>

          <TabsContent value="results">
            <div className="space-y-6">
              <DriverProgramsList driverId={driverId} />
              <DriverClaimsDisplay driverId={driverId} />
            </div>
          </TabsContent>

          <TabsContent value="media">
            <DriverMediaSection driverId={driverId} media={media} />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}