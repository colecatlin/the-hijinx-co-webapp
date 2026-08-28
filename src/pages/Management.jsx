import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import CommandPalette from '@/components/management/CommandPalette';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShieldOff, ArrowRight, MonitorPlay,
  FileText, Users, Building2, Handshake, Image as ImageIcon,
  ShoppingBag, MessageSquare, AlertCircle,
} from 'lucide-react';
import OperationsStatCard from '@/components/management/operationsHub/OperationsStatCard';
import OperationsQuickActions from '@/components/management/operationsHub/OperationsQuickActions';
import OperationsPlatformHealth from '@/components/management/operationsHub/OperationsPlatformHealth';
import OperationsRecentActivity from '@/components/management/operationsHub/OperationsRecentActivity';
import OperationsReadiness from '@/components/management/operationsHub/OperationsReadiness';
import ContactMessagesModal from '@/components/management/operationsHub/ContactMessagesModal';

export default function Management() {
  const navigate = useNavigate();
  const [messagesOpen, setMessagesOpen] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const enabled = !userLoading && !!user && user.role === 'admin';

  // ── Platform data queries ──
  const { data: driverClaims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['mgmt_driver_claims'],
    queryFn: () => base44.entities.DriverClaim.filter({ status: 'pending' }),
    enabled,
  });

  const { data: entityClaims = [], isLoading: entityClaimsLoading } = useQuery({
    queryKey: ['mgmt_entity_claims'],
    queryFn: () => base44.entities.EntityClaimRequest.filter({ status: 'pending' }),
    enabled,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['mgmt_users_list'],
    queryFn: () => base44.entities.User.list('-created_date', 100),
    enabled,
  });

  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['mgmt_orgs_list'],
    queryFn: () => base44.entities.Organization.filter({ is_archived: { $ne: true } }),
    enabled,
  });

  const { data: mediaApps = [], isLoading: mediaAppsLoading } = useQuery({
    queryKey: ['mgmt_media_apps'],
    queryFn: () => base44.entities.MediaApplication.filter({ status: 'pending' }),
    enabled,
  });

  const { data: storySubs = [], isLoading: storySubsLoading } = useQuery({
    queryKey: ['mgmt_story_subs'],
    queryFn: () => base44.entities.StorySubmission.filter({ status: 'pending' }),
    enabled,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['mgmt_recent_orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 20),
    enabled,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['mgmt_contact_messages'],
    queryFn: () => base44.entities.ContactMessage.list('-created_date', 50),
    enabled,
  });

  if (userLoading) {
    return (
      <ManagementLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </ManagementLayout>
    );
  }

  if (!user) {
    base44.auth.redirectToLogin(createPageUrl('Management'));
    return null;
  }

  if (user.role !== 'admin') {
    return (
      <ManagementLayout currentPage="Management">
        <ManagementShell title="Access Denied" subtitle="">
          <div className="py-24 flex flex-col items-center gap-4 text-center">
            <ShieldOff className="w-10 h-10 text-foreground-quiet" />
            <p className="text-foreground-secondary font-medium">Access denied</p>
            <p className="text-foreground-quiet text-sm max-w-sm">
              You do not currently have permission to access this area.
            </p>
            <Button size="sm" onClick={() => navigate(createPageUrl('MyDashboard'))}>
              Go to My Dashboard
            </Button>
          </div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  const totalClaims = driverClaims.length + entityClaims.length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const unreadMessages = messages.filter(m => !m.read).length;

  return (
    <>
      <CommandPalette />
      <ManagementLayout currentPage="Management">
        <ManagementShell
          title="Operations Hub"
          subtitle="The operating system for Hijinx — platform status, quick actions, and administrative overview"
          maxWidth="max-w-7xl"
        >
          {/* RaceCore link */}
          <div className="mb-6 flex items-start gap-3 p-4 rounded-xl border border-motion/20 bg-motion/5">
            <MonitorPlay className="w-5 h-5 text-motion mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Race Operations → RaceCore</p>
              <p className="text-xs text-foreground-quiet mt-0.5 leading-snug">
                Drivers, Teams, Series, Tracks, Events, Results, Standings, and Data tools live in RaceCore.
              </p>
            </div>
            <Link
              to="/racecore"
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-motion/30 bg-motion/10 text-motion hover:bg-motion/20 transition-colors"
            >
              Open RaceCore <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <p className="text-xs font-bold text-foreground-quiet uppercase tracking-wider mb-3">Quick Actions</p>
            <OperationsQuickActions />
          </div>

          {/* Release Readiness */}
          <div className="mb-6">
            <OperationsReadiness />
          </div>

          {/* Platform Health */}
          <div className="mb-6">
            <OperationsPlatformHealth />
          </div>

          {/* Stat Cards Grid */}
          <div className="mb-6">
            <p className="text-xs font-bold text-foreground-quiet uppercase tracking-wider mb-3">Platform Overview</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <OperationsStatCard
                icon={FileText}
                label="Pending Claims"
                value={totalClaims}
                sublabel={`${driverClaims.length} driver · ${entityClaims.length} entity`}
                href={createPageUrl('ManageDriverClaims')}
                alert={totalClaims > 0}
                loading={claimsLoading || entityClaimsLoading}
              />
              <OperationsStatCard
                icon={Users}
                label="Users"
                value={users.length}
                sublabel={`${users.filter(u => u.role === 'admin').length} admin`}
                loading={usersLoading}
              />
              <OperationsStatCard
                icon={Building2}
                label="Organizations"
                value={orgs.length}
                sublabel="Non-archived"
                href="/Directory?cat=sponsors"
                loading={orgsLoading}
              />
              <OperationsStatCard
                icon={Handshake}
                label="Media Applications"
                value={mediaApps.length}
                sublabel="Pending review"
                href={createPageUrl('MediaPortal')}
                alert={mediaApps.length > 0}
                loading={mediaAppsLoading}
              />
              <OperationsStatCard
                icon={ImageIcon}
                label="Story Submissions"
                value={storySubs.length}
                sublabel="Pending review"
                href={createPageUrl('management/editorial/review-queue')}
                alert={storySubs.length > 0}
                loading={storySubsLoading}
              />
              <OperationsStatCard
                icon={ShoppingBag}
                label="Recent Orders"
                value={orders.length}
                sublabel={pendingOrders > 0 ? `${pendingOrders} need action` : 'All fulfilled'}
                href="/admin/orders"
                alert={pendingOrders > 0}
                loading={ordersLoading}
              />
              <OperationsStatCard
                icon={MessageSquare}
                label="Contact Messages"
                value={messages.length}
                sublabel={unreadMessages > 0 ? `${unreadMessages} unread` : 'All read'}
                onClick={() => setMessagesOpen(true)}
                alert={unreadMessages > 0}
                loading={messagesLoading}
              />
              <OperationsStatCard
                icon={AlertCircle}
                label="Bug Reports"
                value="—"
                sublabel="No reports"
                loading={false}
              />
            </div>
          </div>

          {/* Recent Activity + Secondary widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <OperationsRecentActivity />
            <div className="space-y-4">
              {/* Editorial Summary */}
              <div className="bg-surface-elevated border border-divider rounded-xl p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">Editorial Pipeline</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-secondary">Pending Submissions</span>
                    <span className="font-bold text-foreground">{storySubs.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-secondary">Media Applications</span>
                    <span className="font-bold text-foreground">{mediaApps.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-secondary">Pending Claims</span>
                    <span className="font-bold text-foreground">{totalClaims}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-divider/60 flex flex-col gap-1">
                  <Link to={createPageUrl('management/editorial/review-queue')} className="text-xs text-motion hover:underline">
                    → Review Queue
                  </Link>
                  <Link to={createPageUrl('management/editorial/story-radar')} className="text-xs text-motion hover:underline">
                    → Story Radar
                  </Link>
                </div>
              </div>

              {/* Store Summary */}
              <div className="bg-surface-elevated border border-divider rounded-xl p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">Store Summary</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-secondary">Recent Orders</span>
                    <span className="font-bold text-foreground">{orders.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-secondary">Needs Action</span>
                    <span className={`font-bold ${pendingOrders > 0 ? 'text-warning' : 'text-foreground'}`}>{pendingOrders}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-divider/60 flex flex-col gap-1">
                  <Link to="/admin/products" className="text-xs text-motion hover:underline">→ Products</Link>
                  <Link to="/admin/orders" className="text-xs text-motion hover:underline">→ Orders</Link>
                </div>
              </div>
            </div>
          </div>

        </ManagementShell>
        </ManagementLayout>
        <ContactMessagesModal open={messagesOpen} onOpenChange={setMessagesOpen} />
        </>
        );
        }