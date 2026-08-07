import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Truck } from 'lucide-react';

export default function TeamRosterPanel({ roster }) {
  if (!roster) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No roster data available yet.</p>
      </div>
    );
  }

  const { current_drivers = [], past_drivers = [], vehicles = [], total_drivers = 0, total_vehicles = 0 } = roster;

  const DriverCard = ({ driver }) => (
    <Link
      to={driver.profile_url || '#'}
      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#00FFDA] transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
        {driver.profile_image_url ? (
          <img src={driver.profile_image_url} alt={driver.display_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">
            {driver.display_name?.charAt(0) || '?'}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[#232323] text-sm truncate">{driver.display_name}</div>
        {driver.car_number && <div className="text-xs text-gray-500">#{driver.car_number}</div>}
      </div>
      {driver.first_seen && (
        <div className="text-xs text-gray-400 whitespace-nowrap">
          {new Date(driver.first_seen).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
        </div>
      )}
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <Users className="w-5 h-5 text-[#00BFA5] mx-auto mb-2" />
          <div className="text-2xl font-black text-[#232323]">{total_drivers}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total Drivers</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <Truck className="w-5 h-5 text-[#00BFA5] mx-auto mb-2" />
          <div className="text-2xl font-black text-[#232323]">{total_vehicles}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Vehicles</div>
        </div>
      </div>

      {current_drivers.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">Current Drivers ({current_drivers.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {current_drivers.map(driver => <DriverCard key={driver.driver_id} driver={driver} />)}
          </div>
        </div>
      )}

      {past_drivers.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">Past Drivers ({past_drivers.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {past_drivers.map(driver => <DriverCard key={driver.driver_id} driver={driver} />)}
          </div>
        </div>
      )}

      {vehicles.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">Vehicles ({vehicles.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {vehicles.map(vehicle => (
              <div key={vehicle.vehicle_id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-gray-400" />
                  <div className="font-semibold text-[#232323] text-sm">{vehicle.name}</div>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  {vehicle.manufacturer && <div>Manufacturer: {vehicle.manufacturer}</div>}
                  {vehicle.model && <div>Model: {vehicle.model}</div>}
                  {vehicle.year && <div>Year: {vehicle.year}</div>}
                  <div>Starts: {vehicle.starts}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {current_drivers.length === 0 && past_drivers.length === 0 && vehicles.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500 text-sm">
          No roster data available yet. Drivers and vehicles will appear as the team enters events.
        </div>
      )}
    </div>
  );
}