import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { toast } from 'sonner';

import { isApprovedContributor, hasMediaRole } from '@/components/media/mediaPermissions';

// Tab content components
import ProfileTab from '@/components/media/portal/ProfileTab';
import ApplyTab from '@/components/media/portal/ApplyTab';
import MyRequestsTab from '@/components/media/portal/MyRequestsTab';
import MyCredentialsTab from '@/components/media/portal/MyCredentialsTab';
import MyAssetsTab from '@/components/media/portal/MyAssetsTab';
import ContributorProfileTab from '@/components/media/portal/ContributorProfileTab';
import OutletManagementTab from '@/components/media/portal/OutletManagementTab';
import MySubmissionsTab from '@/components/media/portal/MySubmissionsTab';
import ContributorStatusPanel from '@/components/media/portal/ContributorStatusPanel';
import MyAssignmentsTab from '@/components/media/portal/MyAssignmentsTab';
import MyMediaRequestsTab from '@/components/media/portal/MyMediaRequestsTab';
import MyPaymentsTab from '@/components/media/portal/MyPaymentsTab';

// Dashboard and state views
import PortalOverviewDashboard from '@/components/media/portal/PortalOverviewDashboard';
import PortalApplicationStatus from '@/components/media/portal/PortalApplicationStatus';

// ─── LOGGED-OUT LANDING ──────────────────────────────────────────────────────

function LoggedOutLanding() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <Badge className="bg-blue-900/60 text-blue-300 mb-4">Media Portal</Badge>
          <h1 className="text-4xl font-black text-white mb-4">HIJINX Media Portal</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            The internal hub for motorsports media contributors. Build your profile, manage credentials,
            submit work, and connect with outlets — all in one place.
          </p>
        </div>

        <Card className="bg-[#171717] border-gray-800 max-w-md mx-auto mb-12">
          <CardContent className="p-8 text-center">
            <Lock className="w-10 h-10 text-gray-600 mx-auto mb-4" />
            <h2 className="text-white font-bold text-lg mb-2">Sign In to Continue</h2>
            <p className="text-gray-500 text-sm mb-6">
              You must be signed in to access the contributor workspace.
            </p>
            <Button
              onClick={() => base44.auth.redirectToLogin(window.location.href)}
              className="bg-white text-black hover:bg-gray-100 w-full font-semibold"
            >
              Sign In
            </Button>
            <p className="text-gray-600 text-xs mt-4">Don't have an account? Sign up from the login page.</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Build Your Profile', desc: 'Establish your professional identity — name, portfolio, and coverage history.' },
            { title: 'Apply for Credentials', desc: 'Request event, track, and series credentials through the official workflow.' },
            { title: 'Manage Assets', desc: 'Track your uploaded photos, videos, and media with review status.' },
            { title: 'Connect with Outlets', desc: 'Affiliate with publications, creator brands, and media organizations.' },
          ].map(f => (
            <div key={f.title} className="bg-[#171717] border border-gray-800 rounded-lg p-4">
              <Camera className="w-6 h-6 text-blue-400 mb-2" />
              <h3 className="text-white text-sm font-semibold mb-1">{f.title}</h3>
              <p className="text-gray-500 text-xs">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TAB CONFIG ──────────────────────────────────────────────────────────────

function buildTabs(isContributor, isAdmin) {
  const tabs = [{ id: 'overview', label: 'Overview' }];
  if (isContributor || isAdmin) {
    tabs.push({ id: 'my_profile', label: 'My Profile' });
    tabs.push({ id: 'outlets', label: 'Outlets' });
    tabs.push({ id: 'credentials', label: 'Credentials' });
    tabs.push({ id: 'assets', label: 'Assets' });
    tabs.push({ id: 'requests', label: 'Requests' });
    tabs.push({ id: 'requests', label: 'Requests' });
    tabs.push({ id: 'assignments', label: 'Assignments' });
    tabs.push({ id: 'payments', label: 'Payments' });
    tabs.push({ id: 'status', label: 'Status' });
  }
  tabs.push({ id: 'submissions', label: 'Submissions' });
  if (!isContributor && !isAdmin) {
    tabs.push({ id: 'apply', label: 'Apply' });
    tabs.push({ id: 'media_profile', label: 'Media Profile' });
  }
  return tabs;
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function MediaPortal() {
  const [activeTab, setActiveTab] = useState('overview');

  // ── Auth ──
  const { data: isAuthenticated, isLoading: loadingAuth } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
  });

  const isContributor = isApprovedContributor(currentUser);
  const isAdmin = currentUser?.role === 'admin';
  const userHasMediaRole = (role) => hasMediaRole(currentUser, role);

  // ── Legacy MediaUser (for credentials/assets/requests tabs) ──
  const { data: mediaUser, refetch: refetchMediaUser } = useQuery({
    queryKey: ['mediaUserByEmail', currentUser?.email],
    queryFn: async () => {
      const results = await base44.entities.MediaUser.filter({ email: currentUser.email });
      if (results.length) return results[0];
      const byId = await base44.entities.MediaUser.filter({ user_id: currentUser.id });
      return byId[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  // ── Media Profile ──
  const { data: myMediaProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['myMediaProfile', currentUser?.id],
    queryFn: async () => {
      const results = await base44.entities.MediaProfile.filter({ user_id: currentUser.id }, '-created_date', 1);
      return results[0] || null;
    },
    enabled: !!(currentUser?.id && (isContributor || isAdmin)),
  });

  // ── Application ──
  const { data: mediaApplication } = useQuery({
    queryKey: ['myMediaApplication', currentUser?.id],
    queryFn: () => base44.entities.MediaApplication.filter({ user_id: currentUser.id }, '-created_date', 1),
    enabled: !!currentUser?.id,
    select: data => data?.[0] || null,
  });

  // ── Credential data for overview cards ──
  const { data: credentialRequests = [] } = useQuery({
    queryKey: ['myCredentialRequests', mediaUser?.id],
    queryFn: () => base44.entities.CredentialRequest.filter({ holder_media_user_id: mediaUser.id }),
    enabled: !!mediaUser?.id,
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ['myMediaCredentials', mediaUser?.id],
    queryFn: () => base44.entities.MediaCredential.filter({ holder_media_user_id: mediaUser.id }),
    enabled: !!mediaUser?.id,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['myMediaAssets', mediaUser?.id],
    queryFn: () => base44.entities.MediaAsset.filter({ uploader_media_user_id: mediaUser.id }),
    enabled: !!mediaUser?.id,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['myStorySubmissions', currentUser?.email],
    queryFn: () => base44.entities.StorySubmission.filter({ email: currentUser.email }, '-created_date', 50),
    enabled: !!currentUser?.email,
  });

  // ── Outlets for contributor view ──
  const { data: myOutlets = [] } = useQuery({
    queryKey: ['myOutlets', myMediaProfile?.id],
    queryFn: async () => {
      if (!myMediaProfile) return [];
      const affiliatedIds = [
        ...(myMediaProfile.primary_outlet_id ? [myMediaProfile.primary_outlet_id] : []),
        ...(myMediaProfile.secondary_outlet_ids || []),
      ];
      if (affiliatedIds.length === 0) return [];
      const all = await base44.entities.MediaOutlet.list('-created_date', 100);
      return all.filter(o => affiliatedIds.includes(o.id));
    },
    enabled: !!(myMediaProfile || isAdmin),
  });

  // ── Admin counts ──
  const { data: adminCounts } = useQuery({
    queryKey: ['adminMediaCounts'],
    queryFn: async () => {
      const [apps, contributors, outlets, pendingCreds, assetsForReview] = await Promise.all([
        base44.entities.MediaApplication.filter({ status: 'pending' }),
        base44.entities.MediaProfile.list(),
        base44.entities.MediaOutlet.list(),
        base44.entities.CredentialRequest.filter({ status: 'under_review' }),
        base44.entities.AssetReview.filter({ status: 'in_review' }),
      ]);
      return {
        pendingApplications: apps.length,
        approvedContributors: contributors.length,
        outlets: outlets.length,
        pendingCredentials: pendingCreds.length,
        assetsForReview: assetsForReview.length,
      };
    },
    enabled: isAdmin,
  });

  // ── Operation log ──
  useEffect(() => {
    if (!currentUser?.id) return;
    base44.entities.OperationLog.create({
      operation_type: 'media_portal_opened',
      entity_type: 'User',
      entity_id: currentUser.id,
      user_email: currentUser.email,
      status: 'success',
      message: `MediaPortal opened by ${currentUser.email}`,
      metadata: {
        user_id: currentUser.id,
        acted_by_user_id: currentUser.id,
        current_contributor_state: isAdmin ? 'admin' : isContributor ? 'contributor' : mediaApplication?.status || 'general',
        media_profile_id: myMediaProfile?.id || null,
      },
    }).catch(() => {});
  }, [currentUser?.id]);

  // ── Loading ──
  if (loadingAuth || (isAuthenticated && !currentUser)) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-700 border-t-gray-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated === false) {
    return <LoggedOutLanding />;
  }

  const tabs = buildTabs(isContributor, isAdmin);

  const navigateTo = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Page header */}
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-widest mb-0.5">Internal</p>
          <h1 className="text-2xl font-black text-white">Media Portal</h1>
          {currentUser && (
            <p className="text-gray-500 text-sm mt-0.5">{currentUser.full_name || currentUser.email}</p>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Tab bar — scrollable on mobile */}
          <div className="overflow-x-auto mb-6">
            <TabsList className="bg-[#171717] border border-gray-800 p-1 flex gap-1 w-max min-w-full sm:w-auto">
              {tabs.map(t => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="flex-none data-[state=active]:bg-[#232323] data-[state=active]:text-white text-gray-500 text-xs px-3 py-1.5 whitespace-nowrap"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview">
            {/* State B: no application */}
            {!isContributor && !isAdmin && !mediaApplication ? (
              <PortalOverviewDashboard
                currentUser={currentUser}
                mediaProfile={null}
                mediaApplication={null}
                credentialRequests={[]}
                credentials={[]}
                assets={[]}
                submissions={submissions}
                outlets={[]}
                isAdmin={false}
                adminCounts={null}
                onNavigate={navigateTo}
              />
            ) : !isContributor && !isAdmin && mediaApplication ? (
              /* State C: application pending/denied/needs_info */
              <PortalApplicationStatus application={mediaApplication} onNavigate={navigateTo} />
            ) : (
              /* State D / E: contributor or admin */
              <PortalOverviewDashboard
                currentUser={currentUser}
                mediaProfile={myMediaProfile}
                mediaApplication={mediaApplication}
                credentialRequests={credentialRequests}
                credentials={credentials}
                assets={assets}
                submissions={submissions}
                outlets={isAdmin ? [] : myOutlets}
                isAdmin={isAdmin}
                adminCounts={adminCounts}
                onNavigate={navigateTo}
              />
            )}
          </TabsContent>

          {/* ── CONTRIBUTOR-ONLY TABS ── */}
          {(isContributor || isAdmin) && (
            <>
              <TabsContent value="my_profile">
                <ContributorProfileTab currentUser={currentUser} isAdmin={isAdmin} />
              </TabsContent>

              <TabsContent value="outlets">
                <OutletManagementTab
                  currentUser={currentUser}
                  isAdmin={isAdmin}
                  mediaProfile={myMediaProfile}
                />
              </TabsContent>

              <TabsContent value="credentials">
                <MyCredentialsTab mediaUser={mediaUser} />
              </TabsContent>

              <TabsContent value="assets">
                <MyAssetsTab mediaUser={mediaUser} currentUser={currentUser} isAdmin={isAdmin} />
              </TabsContent>

              <TabsContent value="requests">
                <MyRequestsTab mediaUser={mediaUser} currentUser={currentUser} />
              </TabsContent>

              <TabsContent value="requests">
                <MyMediaRequestsTab
                  currentUser={currentUser}
                  myProfile={myMediaProfile}
                  mediaUser={mediaUser}
                />
              </TabsContent>

              <TabsContent value="assignments">
                <MyAssignmentsTab currentUser={currentUser} isContributor={isContributor} />
              </TabsContent>

              <TabsContent value="payments">
                <MyPaymentsTab currentUser={currentUser} myProfile={myMediaProfile} />
              </TabsContent>

              <TabsContent value="status">
                <ContributorStatusPanel
                  profile={myMediaProfile}
                  currentUser={currentUser}
                  credentialCount={credentials.filter(c => c.status === 'active').length}
                  outletCount={myOutlets.length}
                  onNavigate={navigateTo}
                />
              </TabsContent>
            </>
          )}

          {/* ── SUBMISSIONS (all authenticated users) ── */}
          <TabsContent value="submissions">
            <MySubmissionsTab
              currentUser={currentUser}
              isContributor={isContributor}
              hasMediaRole={userHasMediaRole}
              mediaProfile={myMediaProfile}
              mediaOutlet={myOutlets?.[0] || null}
            />
          </TabsContent>

          {/* ── NON-CONTRIBUTOR TABS ── */}
          {!isContributor && !isAdmin && (
            <>
              <TabsContent value="apply">
                <ApplyTab currentUser={currentUser} mediaUser={mediaUser} onSubmitted={() => {
                  toast.success('Application submitted!');
                  navigateTo('overview');
                }} />
              </TabsContent>
              <TabsContent value="media_profile">
                <ProfileTab currentUser={currentUser} mediaUser={mediaUser} onSaved={() => {
                  refetchMediaUser();
                  toast.success('Profile saved.');
                }} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}