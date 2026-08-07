import React from 'react';
import { Wrench, Calendar, Trophy, Flag } from 'lucide-react';

export default function VehicleChassisHistory({ chassis }) {
  if (!chassis || (!chassis.chassis_id && !chassis.builder && !chassis.build_year)) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No chassis history available. Add a chassis ID and builder to enable chassis tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chassis.chassis_id && (
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Chassis ID</div>
              <div className="text-base font-semibold text-[#232323]">{chassis.chassis_id}</div>
            </div>
          )}
          {chassis.builder && (
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Builder</div>
              <div className="text-base font-semibold text-[#232323]">{chassis.builder}</div>
            </div>
          )}
          {chassis.model && (
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Model</div>
              <div className="text-base font-semibold text-[#232323]">{chassis.model}</div>
            </div>
          )}
          {chassis.build_year && (
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Build Year</div>
              <div className="text-base font-semibold text-[#232323]">{chassis.build_year}</div>
            </div>
          )}
        </div>
        {chassis.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Notes</div>
            <p className="text-sm text-gray-700">{chassis.notes}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <Flag className="w-5 h-5 text-[#00BFA5] mx-auto mb-2" />
          <div className="text-2xl font-black text-[#232323]">{chassis.starts ?? 0}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total Starts</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <Trophy className="w-5 h-5 text-[#FFD700] mx-auto mb-2" />
          <div className="text-2xl font-black text-[#232323]">{chassis.championships ?? 0}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Championships</div>
        </div>
      </div>

      {chassis.timeline && chassis.timeline.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">Championship Timeline</h3>
          <div className="space-y-2">
            {chassis.timeline.map((event, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#FFD700]/10 to-transparent rounded-lg border border-[#FFD700]/30">
                <Trophy className="w-5 h-5 text-[#FFD700]" />
                <div className="flex-1">
                  <div className="font-semibold text-[#232323] text-sm">{event.event_name || "Event"}</div>
                  <div className="text-xs text-gray-500">{[event.track_name, event.series_name].filter(Boolean).join(' · ')}</div>
                </div>
                <span className="text-xs text-gray-400">{event.date ? new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}