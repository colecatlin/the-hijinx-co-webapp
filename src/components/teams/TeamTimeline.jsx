import React from 'react';
import { Trophy, Flag, Award, Crown, Users, Camera, Calendar, MapPin } from 'lucide-react';

const ICON_MAP = {
  race_result: Trophy, championship: Crown, driver_addition: Users,
  founded: Flag, media: Camera, vehicle_change: Flag,
};

const TYPE_COLORS = {
  race_result: '#00FFDA', championship: '#FFD700', driver_addition: '#3B82F6',
  founded: '#10B981', media: '#A855F7', vehicle_change: '#F59E0B',
};

export default function TeamTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No timeline events yet. Events will appear as the team competes.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
      <div className="space-y-4">
        {timeline.map((event, idx) => {
          const Icon = ICON_MAP[event.type] || Flag;
          const color = TYPE_COLORS[event.type] || '#6B7280';
          return (
            <div key={idx} className="relative">
              <div className="absolute -left-[18px] top-1 w-4 h-4 rounded-full border-2 border-white" style={{ background: color }} />
              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-[#232323] text-sm truncate">{event.title}</h4>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {event.date ? new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>
                    {event.description && <p className="text-sm text-gray-600 mt-1">{event.description}</p>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}