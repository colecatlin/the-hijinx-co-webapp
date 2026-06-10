import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useEntityEditPermission } from '@/components/access/entityEditPermission';
import RecordDrawerShell from './RecordDrawerShell';
import ProfileCompletenessIndicator from '@/components/system/ProfileCompletenessIndicator';

import DriverCoreDetailsSection    from '@/components/management/DriverManagement/DriverCoreDetailsSection.jsx';
import DriverBrandingSection        from '@/components/management/DriverManagement/DriverBrandingSection.jsx';
import DriverCareerManager          from '@/components/management/DriverManagement/DriverCareerManager.jsx';
import DriverSponsorManager         from '@/components/management/DriverManagement/DriverSponsorManager.jsx';
import DriverProgramsList           from '@/components/management/DriverManagement/DriverProgramsList.jsx';
import DriverResultsSection         from '@/components/management/DriverManagement/DriverResultsSection.jsx';
import DriverMediaSection           from '@/components/management/DriverEditor/DriverMediaSection.jsx';
import DriverStatsManagement        from '@/components/management/DriverManagement/DriverStatsManagement.jsx';
import DriverAccessSection          from '@/components/management/DriverManagement/DriverAccessSection.jsx';
import DriverClaimsDisplay          from '@/components/drivers/DriverClaimsDisplay.jsx';
import AdminOverridePanel           from '@/components/management/AdminOverridePanel';

/**
 * DriverDrawer — slide-over editor for Driver records.
 *
 * Props:
 *   driverId      — string | 'new' | null
 *   open          — boolean
 *   onOpenChange  — (open: boolean) => void
 *   onSaveSuccess — () => void  (called after create/update — triggers list refresh)
 */
export default function DriverDrawer({ driverId, open, onOpenChange, onSaveSuccess }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isNew = driverId === 'new';

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', driverId],
    queryFn: () => base44.entities.Driver.get(driverId),
    enabled: !!driverId && !isNew && open,
  });

  const { canEditManagement } = useEntityEditPermission('Driver', isNew ? null : driverId, driver);

  const handleSaveSuccess = (newDriverId) => {
    if (newDriverId && isNew) {
      toast.success('Driver created successfully!');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      // Reopen the drawer on the new record
      onOpenChange(false);
      setTimeout(() => {
        onSaveSuccess && onSaveSuccess(newDriverId);
      }, 150);
    } else {
      queryClient.invalidateQueries({ queryKey: ['driver', driverId] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      onSaveSuccess && onSaveSuccess();
    }
  };

  const driverName = driver
    ? [driver.first_name, driver.last_name].filter(Boolean).join(' ')
    : isNew ? 'New Driver' : '…';

  const tabs = [
    {
      value: 'core',
      label: 'Core',
      content: (
        <DriverCoreDetailsSection
          driverId={isNew ? 'new' : driverId}
          onSaveSuccess={handleSaveSuccess}
          isReadOnly={!isNew && !canEditManagement}
          isAdmin={isAdmin}
        />
      ),
    },
    {
      value: 'branding',
      label: 'Branding',
      hidden: isNew,
      content: <DriverBrandingSection driverId={driverId} driver={driver} onSaveSuccess={handleSaveSuccess} />,
    },
    {
      value: 'career',
      label: 'Career',
      hidden: isNew,
      content: <DriverCareerManager driverId={driverId} />,
    },
    {
      value: 'sponsors',
      label: 'Sponsors',
      hidden: isNew,
      content: <DriverSponsorManager driverId={driverId} />,
    },
    {
      value: 'programs',
      label: 'Programs',
      hidden: isNew,
      content: <DriverProgramsList driverId={driverId} />,
    },
    {
      value: 'results',
      label: 'Results',
      hidden: isNew,
      content: (
        <div className="space-y-6">
          <DriverResultsSection driverId={driverId} />
          <DriverClaimsDisplay driverId={driverId} />
        </div>
      ),
    },
    {
      value: 'media',
      label: 'Media',
      hidden: isNew,
      content: <DriverMediaSection driverId={driverId} />,
    },
    {
      value: 'stats',
      label: 'Stats',
      hidden: isNew,
      content: <DriverStatsManagement driverId={driverId} />,
    },
    {
      value: 'access',
      label: 'Access',
      hidden: isNew,
      content: <DriverAccessSection driverId={driverId} />,
    },
    {
      value: 'override',
      label: '⚙ Override',
      hidden: isNew || !isAdmin,
      content: (
        <AdminOverridePanel
          entityType="Driver"
          entityId={driverId}
          entityRecord={driver}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['driver', driverId] })}
        />
      ),
    },
  ];

  const headerActions = !isNew && driver ? (
    <ProfileCompletenessIndicator entityType="Driver" record={driver} />
  ) : null;

  return (
    <RecordDrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={driverName}
      subtitle={
        isNew
          ? 'Create a new driver profile'
          : driver
            ? [driver.hometown_city, driver.hometown_state].filter(Boolean).join(', ') || undefined
            : undefined
      }
      isLoading={!isNew && isLoading}
      width="wide"
      tabs={tabs}
      actions={headerActions}
      entityType="Driver"
    />
  );
}