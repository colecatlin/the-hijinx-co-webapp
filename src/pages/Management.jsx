import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import CommandPalette from '@/components/management/CommandPalette';
import DataHealthPanel from '@/components/management/DataHealthPanel';
import { Button } from '@/components/ui/button';
import {
  ShieldOff, ArrowRight, AlertCircle, FileText, ListChecks,
  Handshake, ShoppingBag, BarChart3, MonitorPlay, Users,
} from 'lucide-react';

export default function Management() {
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const enabled = !userLoading && !!user && user.role === 'admin';

  // Platform-only data queries — no racing entities
  const { data: driverClaims = [] } = useQuery({
    queryKey: ['mgmt_driver_claims'],
    queryFn: () => base44.entities.DriverClaim.filter({ status: 'pending' }),
    enabled,
  });

  const { data: entityClaims = [] } = useQuery({
    queryKey: ['mgmt_entity_claims'],
    queryFn: () => base44.entities.EntityClaimRequest.filter({ status: 'pending' }),
    enabled,
  });

  const { data: mediaApplications = [] } = useQuery({
    queryKey: ['mgmt_media_apps_pending'],
    queryFn: () => base44.entities.MediaApplication.filter({ status: 'pending' }),
    enabled,
  });

  const { data: storySubmissions = [] } = useQuery({
    queryKey: ['mgmt_story_submissions'],
    queryFn: () => base44.entities.StorySubmission.filter({ status: 'pending' }),
    enabled,
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ['mgmt_recent_orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 20),
    enabled,
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

  const pendingOrders = recentOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const totalClaims = driverClaims.length + entityClaims.length;

  return (
    <>
      <CommandPalette />
      <ManagementLayout currentPage="Management">
        <ManagementShell
          title="Management"
          subtitle="Platform administration — website, content, store, access control, and diagnostics"
          maxWidth="max-w-5xl"
        >

          {/* RaceCore primary link */}
          <div className="mb-8 flex items-start gap-3 p-4 rounded-lg border border-teal-800/40 bg-teal-950/20">
            <MonitorPlay className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-black">Motorsports Operations → RaceCore</p>
              <p className="text-xs text-black/70 mt-0.5 leading-snug">
                Drivers, Teams, Series, Tracks, Events, Results, Standings, Media, and Data tools all live in RaceCore.
              </p>
            </div>
            <Link
              to="/racecore"
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-teal-700/60 bg-teal-900/30 text-teal-300 hover:bg-teal-900/50 transition-colors"
            >
              Open RaceCore <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Admin quick actions */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Review Queue',   to: createPageUrl('management/editorial/review-queue'), icon: ListChecks },
                { label: 'Driver Claims',  to: createPageUrl('ManageDriverClaims'),                icon: AlertCircle },
                { label: 'Entity Claims',  to: createPageUrl('ManageEntityClaims'),                icon: FileText },
                { label: 'Access Mgmt',   to: createPageUrl('ManageAccess'),                       icon: Handshake },
                { label: 'Analytics',     to: createPageUrl('AnalyticsDashboard'),                 icon: BarChart3 },
                { label: 'Storefront',    to: '/admin/storefront',                                  icon: ShoppingBag },
              ].map(({ label, to, icon: ItemIcon }) => (
                <Link
                  key={label}
                  to={to}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <ItemIcon className="w-3 h-3" /> {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Platform admin widgets */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Platform Overview</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

              {/* Access Control */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                      <Handshake className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Access Control</p>
                  </div>
                  <Link to={createPageUrl('ManageAccess')} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5">
                    Manage <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xl font-black text-gray-900">{driverClaims.length}</p>
                    <p className="text-xs text-gray-400">Driver claims</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900">{entityClaims.length}</p>
                    <p className="text-xs text-gray-400">Entity claims</p>
                  </div>
                </div>
                {totalClaims > 0 && (
                  <Link to={createPageUrl('ManageDriverClaims')} className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> {totalClaims} claim{totalClaims !== 1 ? 's' : ''} need review
                  </Link>
                )}
              </div>

              {/* Editorial */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Editorial</p>
                  </div>
                  <Link to={createPageUrl('ManageStories')} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5">
                    Manage <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xl font-black text-gray-900">{storySubmissions.length}</p>
                    <p className="text-xs text-gray-400">Pending submissions</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900">{mediaApplications.length}</p>
                    <p className="text-xs text-gray-400">Media applications</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 mt-3">
                  <Link to={createPageUrl('management/editorial/review-queue')} className="text-xs text-blue-600 hover:underline">→ Review Queue</Link>
                  <Link to={createPageUrl('management/editorial/story-radar')} className="text-xs text-blue-600 hover:underline">→ Story Radar</Link>
                </div>
              </div>

              {/* Store */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                      <ShoppingBag className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Store</p>
                  </div>
                  <Link to="/admin/storefront" className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5">
                    Manage <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xl font-black text-gray-900">{recentOrders.length}</p>
                    <p className="text-xs text-gray-400">Recent orders</p>
                  </div>
                  <div>
                    <p className={`text-xl font-black ${pendingOrders > 0 ? 'text-amber-500' : 'text-gray-900'}`}>{pendingOrders}</p>
                    <p className="text-xs text-gray-400">Needs action</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 mt-3">
                  <Link to="/admin/products" className="text-xs text-blue-600 hover:underline">→ Products</Link>
                  <Link to="/admin/orders" className="text-xs text-blue-600 hover:underline">→ Orders</Link>
                </div>
              </div>

            </div>
          </div>

          {/* Data health */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Data Health</p>
            <DataHealthPanel />
          </div>

        </ManagementShell>
      </ManagementLayout>
    </>
  );
}