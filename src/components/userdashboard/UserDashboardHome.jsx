import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Building2, MapPin, Radio, CalendarDays, Mail } from 'lucide-react';
import MyDriversPanel from './MyDriversPanel';
import MyTeamsPanel from './MyTeamsPanel';
import MyTracksPanel from './MyTracksPanel';
import MySeriesPanel from './MySeriesPanel';
import MyEventsPanel from './MyEventsPanel';
import MyInvitationsPanel from './MyInvitationsPanel';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-[#171717] border border-gray-800 rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export default function UserDashboardHome({ user }) {
  const { data: collaborators = [] } = useQuery({
    queryKey: ['entityCollaborators', user.id],
    queryFn: () => base44.entities.EntityCollaborator.filter({ user_id: user.id }),
    staleTime: 30000,
  });

  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['pendingInvitations', user.email],
    queryFn: () => base44.entities.Invitation.filter({ email: user.email, status: 'pending' }),
    staleTime: 30000,
  });

  const driverCollabs = collaborators.filter(c => c.entity_type === 'Driver');
  const teamCollabs = collaborators.filter(c => c.entity_type === 'Team');
  const trackCollabs = collaborators.filter(c => c.entity_type === 'Track');
  const seriesCollabs = collaborators.filter(c => c.entity_type === 'Series');
  const eventCollabs = collaborators.filter(c => c.entity_type === 'Event');

  const stats = [
    { icon: Users, label: 'Drivers Managed', value: driverCollabs.length, color: 'bg-blue-600' },
    { icon: Building2, label: 'Teams Managed', value: teamCollabs.length, color: 'bg-purple-600' },
    { icon: MapPin, label: 'Tracks Managed', value: trackCollabs.length, color: 'bg-teal-600' },
    { icon: CalendarDays, label: 'Events Accessible', value: eventCollabs.length, color: 'bg-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{user.full_name || user.email}</h1>
              <p className="text-sm text-gray-400 mt-1 capitalize">{user.role || 'user'}</p>
            </div>
            {pendingInvitations.length > 0 && (
              <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-3 py-2">
                <Mail className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-300">{pendingInvitations.length} pending invitation{pendingInvitations.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {stats.map(s => <StatCard key={s.label} {...s} />)}
          </div>
        </div>
      </div>

      {/* Panels */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Invitations first if any */}
        {pendingInvitations.length > 0 && (
          <MyInvitationsPanel user={user} invitations={pendingInvitations} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MyDriversPanel collaborators={driverCollabs} />
          <MyTeamsPanel collaborators={teamCollabs} />
          <MyTracksPanel collaborators={trackCollabs} />
          <MySeriesPanel collaborators={seriesCollabs} />
        </div>

        <MyEventsPanel user={user} eventCollabs={eventCollabs} />
      </div>
    </div>
  );
}