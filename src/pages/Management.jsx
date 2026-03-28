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
import { ShieldOff, Gauge, FileText, User, Calendar, Trophy, ArrowRight, Newspaper, BarChart3 } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Race Core Ops', sub: 'Event workspace, entries, results, live ops', page: 'RegistrationDashboard', Icon: Gauge, highlight: true },
  { label: 'Drivers', sub: 'Profiles, claims, programs', page: 'ManageDrivers', Icon: User },
  { label: 'Events', sub: 'Create and manage race events', page: 'ManageEvents', Icon: Calendar },
  { label: 'Series', sub: 'Championships and standings', page: 'ManageSeries', Icon: Trophy },
  { label: 'Stories', sub: 'Publish and edit content', page: 'ManageStories', Icon: Newspaper },
  { label: 'Results', sub: 'Race results and sessions', page: 'ManageResults', Icon: BarChart3 },
];

export default function Management() {
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

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

          {/* Quick actions */}
          <div className="mt-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Access</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {QUICK_ACTIONS.map(({ label, sub, page, Icon, highlight }) => (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  className={`group flex items-start gap-3 p-4 rounded-lg border transition-all ${
                    highlight
                      ? 'bg-gray-900 border-gray-900 hover:bg-gray-800 text-white'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                    highlight ? 'bg-white/10' : 'bg-gray-100 group-hover:bg-gray-200'
                  } transition-colors`}>
                    <Icon className={`w-4 h-4 ${highlight ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${highlight ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                    <p className={`text-xs mt-0.5 leading-snug ${highlight ? 'text-white/60' : 'text-gray-400'}`}>{sub}</p>
                  </div>
                  <ArrowRight className={`w-3.5 h-3.5 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${highlight ? 'text-white' : 'text-gray-400'}`} />
                </Link>
              ))}
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