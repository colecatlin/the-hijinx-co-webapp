import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Clock, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function StatsBar() {
  const { data: drivers = [] } = useQuery({
    queryKey: ['stats-drivers'],
    queryFn: () => base44.entities.Driver.list('-updated_date', 1000),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['stats-events'],
    queryFn: () => base44.entities.Event.list('-updated_date', 1000),
  });

  const { data: results = [] } = useQuery({
    queryKey: ['stats-results'],
    queryFn: () => base44.entities.Results.list('-updated_date', 1000),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['stats-series'],
    queryFn: () => base44.entities.Series.list('-updated_date', 1000),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['stats-teams'],
    queryFn: () => base44.entities.Team.list('-updated_date', 1000),
  });

  const { data: pendingClaims = [] } = useQuery({
    queryKey: ['stats-pending-claims'],
    queryFn: () => base44.entities.EntityClaimRequest.filter({ status: 'pending' }),
    staleTime: 30_000,
  });

  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['stats-pending-invitations'],
    queryFn: () => base44.entities.Invitation.filter({ status: 'pending' }),
    staleTime: 30_000,
  });

  const stats = [
    { label: 'Drivers', count: drivers.length, color: 'bg-blue-50 text-blue-600' },
    { label: 'Events', count: events.length, color: 'bg-green-50 text-green-600' },
    { label: 'Results', count: results.length, color: 'bg-purple-50 text-purple-600' },
    { label: 'Series', count: series.length, color: 'bg-orange-50 text-orange-600' },
    { label: 'Teams', count: teams.length, color: 'bg-pink-50 text-pink-600' },
  ];

  const isLoading = [drivers, events, results, series, teams].some(d => d.length === 0);

  return (
    <div className="space-y-3 mb-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-lg p-4 ${stat.color}`}>
            <div className="text-xs font-medium opacity-75">{stat.label}</div>
            <div className="text-2xl font-bold mt-1">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : stat.count}
            </div>
          </div>
        ))}
      </div>

      {/* Pending action items */}
      {(pendingClaims.length > 0 || pendingInvitations.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {pendingClaims.length > 0 && (
            <Link to={createPageUrl('ManageEntityClaims')}
              className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              {pendingClaims.length} pending claim{pendingClaims.length !== 1 ? 's' : ''} awaiting review
            </Link>
          )}
          {pendingInvitations.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-800">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              {pendingInvitations.length} open invitation{pendingInvitations.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}