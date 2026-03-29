import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import CommandPalette from '@/components/management/CommandPalette';
import StatsBar from '@/components/management/StatsBar';
import DataHealthPanel from '@/components/management/DataHealthPanel';
import { Button } from '@/components/ui/button';
import { ShieldOff, Gauge, ArrowRight, User, Calendar, Trophy, FileText, Users, MapPin, AlertCircle, ImageOff, Clock } from 'lucide-react';

export default function Management() {
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const enabled = !userLoading && !!user && user.role === 'admin';

  const { data: drivers = [] } = useQuery({
    queryKey: ['mgmt_drivers'],
    queryFn: () => base44.entities.Driver.list(),
    enabled,
  });
  const { data: driverClaims = [] } = useQuery({
    queryKey: ['mgmt_driver_claims'],
    queryFn: () => base44.entities.DriverClaim.filter({ status: 'pending' }),
    enabled,
  });
  const { data: events = [] } = useQuery({
    queryKey: ['mgmt_events'],
    queryFn: () => base44.entities.Event.list(),
    enabled,
  });
  const { data: series = [] } = useQuery({
    queryKey: ['mgmt_series'],
    queryFn: () => base44.entities.Series.list(),
    enabled,
  });
  const { data: teams = [] } = useQuery({
    queryKey: ['mgmt_teams'],
    queryFn: () => base44.entities.Team.list(),
    enabled,
  });
  const { data: tracks = [] } = useQuery({
    queryKey: ['mgmt_tracks'],
    queryFn: () => base44.entities.Track.list(),
    enabled,
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentDrivers = drivers.filter(d => d.updated_date > sevenDaysAgo).length;
  const missingImages = drivers.filter(d => !d.profile_image_url && !d.hero_image_url).length;
  const upcomingEvents = events.filter(e => e.event_date >= new Date().toISOString().slice(0, 10) && ['Published', 'Draft'].includes(e.status)).length;
  const liveEvents = events.filter(e => e.status === 'Live').length;
  const activeTeams = teams.filter(t => t.status === 'Active').length;
  const activeTracks = tracks.filter(t => t.status === 'Active').length;

  if (userLoading) return null;

  if (!user) {
    base44.auth.redirectToLogin(createPageUrl('Management'));
    return null;
  }

  if (user.role !== 'admin') {
    return (
      <ManagementLayout currentPage="Management">
        <ManagementShell title="Access Denied" subtitle="">
          <div className="py-24 flex flex-col items-center gap-4 text-center">
            <ShieldOff className="w-10 h-10 text-gray-300" />
            <p className="text-gray-600 font-medium">Access denied</p>
            <p className="text-gray-400 text-sm max-w-sm">You do not currently have permission to access this area.</p>
            <Button size="sm" onClick={() => navigate(createPageUrl('MyDashboard'))}>Go to My Dashboard</Button>
          </div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  return (
    <>
      <CommandPalette />
      <ManagementLayout currentPage="Management">
        <ManagementShell title="Management" subtitle="Admin control center" maxWidth="max-w-5xl">

          {/* Platform stats */}
          <StatsBar />

          {/* Race Core primary action */}
          <div className="mt-8">
            <Link
              to={createPageUrl('RegistrationDashboard')}
              className="group flex items-start gap-3 p-5 rounded-lg border bg-gray-900 border-gray-900 hover:bg-gray-800 text-white transition-all"
            >
              <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-white/10">
                <Gauge className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Race Core Ops</p>
                <p className="text-xs mt-0.5 leading-snug text-white/60">Event workspace, entries, results, live ops</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-white" />
            </Link>
          </div>

          {/* Operational summary cards */}
          <div className="mt-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Operational Summary</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

              {/* Drivers */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Drivers</p>
                  </div>
                  <Link to={createPageUrl('ManageDrivers')} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5">Manage <ArrowRight className="w-3 h-3" /></Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xl font-black text-gray-900">{drivers.length}</p>
                    <p className="text-xs text-gray-400">Total profiles</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900">{driverClaims.length}</p>
                    <p className="text-xs text-gray-400">Pending claims</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900">{recentDrivers}</p>
                    <p className="text-xs text-gray-400">Updated this week</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-orange-500">{missingImages}</p>
                    <p className="text-xs text-gray-400">Missing images</p>
                  </div>
                </div>
                {driverClaims.length > 0 && (
                  <Link to={createPageUrl('ManageDriverClaims')} className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> {driverClaims.length} claim{driverClaims.length !== 1 ? 's' : ''} need review
                  </Link>
                )}
              </div>

              {/* Events */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Events</p>
                  </div>
                  <Link to={createPageUrl('ManageEvents')} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5">Manage <ArrowRight className="w-3 h-3" /></Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xl font-black text-gray-900">{events.length}</p>
                    <p className="text-xs text-gray-400">Total events</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-green-600">{liveEvents}</p>
                    <p className="text-xs text-gray-400">Live now</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-blue-600">{upcomingEvents}</p>
                    <p className="text-xs text-gray-400">Upcoming</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900">{events.filter(e => e.status === 'Completed').length}</p>
                    <p className="text-xs text-gray-400">Completed</p>
                  </div>
                </div>
              </div>

              {/* Series */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                      <Trophy className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Series</p>
                  </div>
                  <Link to={createPageUrl('ManageSeries')} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5">Manage <ArrowRight className="w-3 h-3" /></Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xl font-black text-gray-900">{series.length}</p>
                    <p className="text-xs text-gray-400">Total series</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-green-600">{series.filter(s => s.status === 'Active').length}</p>
                    <p className="text-xs text-gray-400">Active</p>
                  </div>
                </div>
              </div>

              {/* Teams */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Teams</p>
                  </div>
                  <Link to={createPageUrl('ManageTeams')} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5">Manage <ArrowRight className="w-3 h-3" /></Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xl font-black text-gray-900">{teams.length}</p>
                    <p className="text-xs text-gray-400">Total teams</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-green-600">{activeTeams}</p>
                    <p className="text-xs text-gray-400">Active</p>
                  </div>
                </div>
              </div>

              {/* Tracks */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                      <MapPin className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Tracks</p>
                  </div>
                  <Link to={createPageUrl('ManageTracks')} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5">Manage <ArrowRight className="w-3 h-3" /></Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xl font-black text-gray-900">{tracks.length}</p>
                    <p className="text-xs text-gray-400">Total tracks</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-green-600">{activeTracks}</p>
                    <p className="text-xs text-gray-400">Active</p>
                  </div>
                </div>
              </div>

              {/* Stories */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Content</p>
                  </div>
                  <Link to={createPageUrl('ManageStories')} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5">Manage <ArrowRight className="w-3 h-3" /></Link>
                </div>
                <p className="text-xs text-gray-500 leading-snug">Publish stories, manage issues, and review editorial submissions.</p>
                <div className="flex flex-col gap-1 mt-3">
                  <Link to={createPageUrl('management/editorial/review-queue')} className="text-xs text-blue-600 hover:underline">→ Review Queue</Link>
                  <Link to={createPageUrl('management/editorial/story-radar')} className="text-xs text-blue-600 hover:underline">→ Story Radar</Link>
                </div>
              </div>

            </div>
          </div>

          {/* Data health */}
          <div className="mt-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Data Health</p>
            <DataHealthPanel />
          </div>

        </ManagementShell>
      </ManagementLayout>
    </>
  );
}