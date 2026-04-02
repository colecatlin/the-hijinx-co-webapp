import React, { useState } from 'react';
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
import DriverCoreDetailsSection from '@/components/management/DriverManagement/DriverCoreDetailsSection.jsx';
import DriverBrandingSection from '@/components/management/DriverManagement/DriverBrandingSection.jsx';
import DriverCareerManager from '@/components/management/DriverManagement/DriverCareerManager.jsx';
import DriverSponsorManager from '@/components/management/DriverManagement/DriverSponsorManager.jsx';
import DriverProgramsList from '@/components/management/DriverManagement/DriverProgramsList.jsx';
import DriverResultsSection from '@/components/management/DriverManagement/DriverResultsSection.jsx';
import DriverMediaSection from '@/components/management/DriverEditor/DriverMediaSection.jsx';
import DriverStatsManagement from '@/components/management/DriverManagement/DriverStatsManagement.jsx';
import DriverAccessSection from '@/components/management/DriverManagement/DriverAccessSection.jsx';
import DriverClaimsDisplay from '@/components/drivers/DriverClaimsDisplay.jsx';

export default function RaceCoreDriverEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => base44.entities.Driver.get(id),
    enabled: !isNew && !!id,
  });

  const { canEditManagement } = useEntityEditPermission('Driver', isNew ? null : id, driver);

  const handleSaveSuccess = (newDriverId) => {
    if (newDriverId && isNew) {
      toast.success('Driver created successfully!');
      navigate('/race-core/drivers/' + newDriverId);
    } else {
      toast.success('Driver updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['driver', id] });
    }
  };

  if (!isNew && isLoading) {
    return (
      <ManagementLayout currentPage="RaceCoreDriverEditor">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </ManagementLayout>
    );
  }

  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'New Driver';

  return (
    <ManagementLayout currentPage="RaceCoreDriverEditor">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('ManageDrivers'))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Race Core / Drivers</p>
            <h1 className="text-4xl font-black mb-1">{driverName}</h1>
            <p className="text-gray-500 text-sm">{isNew ? 'Create a new driver profile' : 'Manage all driver data'}</p>
          </div>
        </div>

        <Tabs defaultValue="core" className="mt-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="core">Core Details</TabsTrigger>
            {!isNew && <>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="career">Career History</TabsTrigger>
              <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
              <TabsTrigger value="programs">Programs</TabsTrigger>
              <TabsTrigger value="results">Race Results</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="access">Access</TabsTrigger>
              {isAdmin && <TabsTrigger value="override">⚙ Override</TabsTrigger>}
            </>}
          </TabsList>

          <TabsContent value="core" className="mt-6">
            <DriverCoreDetailsSection
              driverId={isNew ? 'new' : id}
              onSaveSuccess={handleSaveSuccess}
              isReadOnly={!isNew && !canEditManagement}
              isAdmin={isAdmin}
            />
          </TabsContent>

          {!isNew && <>
            <TabsContent value="branding" className="mt-6">
              <DriverBrandingSection driverId={id} driver={driver} onSaveSuccess={handleSaveSuccess} />
            </TabsContent>
            <TabsContent value="career" className="mt-6">
              <DriverCareerManager driverId={id} />
            </TabsContent>
            <TabsContent value="sponsors" className="mt-6">
              <DriverSponsorManager driverId={id} />
            </TabsContent>
            <TabsContent value="programs" className="mt-6">
              <DriverProgramsList driverId={id} />
            </TabsContent>
            <TabsContent value="results" className="mt-6">
              <div className="space-y-6">
                <DriverResultsSection driverId={id} />
                <DriverClaimsDisplay driverId={id} />
              </div>
            </TabsContent>
            <TabsContent value="media" className="mt-6">
              <DriverMediaSection driverId={id} />
            </TabsContent>
            <TabsContent value="stats" className="mt-6">
              <DriverStatsManagement driverId={id} />
            </TabsContent>
            <TabsContent value="access" className="mt-6">
              <DriverAccessSection driverId={id} />
            </TabsContent>
            {isAdmin && (
              <TabsContent value="override" className="mt-6">
                <AdminOverridePanel
                  entityType="Driver"
                  entityId={id}
                  entityRecord={driver}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ['driver', id] })}
                />
              </TabsContent>
            )}
          </>}
        </Tabs>
      </div>
    </ManagementLayout>
  );
}