/**
 * VehicleHistoryPanel.jsx — Phase 10
 *
 * Renders automatically-generated vehicle history from computed experience
 * data. Shows vehicle timeline, manufacturer, and performance.
 * No duplicated storage.
 */
import React from 'react';
import { Car, Trophy } from 'lucide-react';

export default function VehicleHistoryPanel({ vehicleHistory = [] }) {
  if (!vehicleHistory || vehicleHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <Car className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No vehicle history yet. Vehicles are tracked automatically from race entries.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {vehicleHistory.map(vehicle => (
        <div key={vehicle.vehicle_id} className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Car className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-[#232323] truncate">{vehicle.vehicle_name}</div>
              <div className="text-xs text-gray-400">
                {[vehicle.manufacturer, vehicle.model, vehicle.year].filter(Boolean).join(' · ') || 'Vehicle details not set'}
              </div>
            </div>
          </div>
          {vehicle.team_name && (
            <div className="text-xs text-gray-500 mb-2">Team: {vehicle.team_name}</div>
          )}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-lg py-1.5">
              <div className="text-sm font-black text-[#232323]">{vehicle.starts}</div>
              <div className="text-[9px] text-gray-400 uppercase">Starts</div>
            </div>
            <div className="bg-gray-50 rounded-lg py-1.5">
              <div className="text-sm font-black text-[#232323]">{vehicle.wins}</div>
              <div className="text-[9px] text-gray-400 uppercase">Wins</div>
            </div>
            <div className="bg-gray-50 rounded-lg py-1.5">
              <div className="text-sm font-black text-[#232323]">{vehicle.best_finish ? `P${vehicle.best_finish}` : '—'}</div>
              <div className="text-[9px] text-gray-400 uppercase">Best</div>
            </div>
          </div>
          {vehicle.wins > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600">
              <Trophy className="w-3 h-3" /> {vehicle.wins} Win{vehicle.wins > 1 ? 's' : ''}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}