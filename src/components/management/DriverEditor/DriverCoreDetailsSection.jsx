
import DriverCoreDetailsSection from '../DriverManagement/DriverCoreDetailsSection';
import DriverManagersSection from './DriverManagersSection';

// Re-export from DriverManagement so both access types use the same component
export { default } from '../DriverManagement/DriverCoreDetailsSection';

export function DriverCoreDetailsSectionWithManagers({ driver }) {
  return (
    <div className="space-y-6">
      <DriverCoreDetailsSection driver={driver} />
      <DriverManagersSection driverId={driver.id} driver={driver} />
    </div>
  );
}
