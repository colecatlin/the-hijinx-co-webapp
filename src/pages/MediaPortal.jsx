import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Lock, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import ProfileTab from '@/components/media/portal/ProfileTab';
import ApplyTab from '@/components/media/portal/ApplyTab';
import MyRequestsTab from '@/components/media/portal/MyRequestsTab';
import MyCredentialsTab from '@/components/media/portal/MyCredentialsTab';
import MyAssetsTab from '@/components/media/portal/MyAssetsTab';
import { isApprovedContributor, canAccessMediaPortalWorkspace } from '@/components/media/mediaPermissions';
import ContributorProfileTab from '@/components/media/portal/ContributorProfileTab';
import OutletManagementTab from '@/components/media/portal/OutletManagementTab';

export default function MediaPortal() {
  const [activeTab, setActiveTab] = useState('profile');
  const [submittedReq, setSubmittedReq] = useState(null);

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
  });

  const { data: mediaUser, refetch: refetchMediaUser } = useQuery({
    queryKey: ['mediaUserByEmail', currentUser?.email],
    queryFn: async () => {
      const results = await base44.entities.MediaUser.filter({ email: currentUser.email });
      if (results.length) return results[0];
      // fallback: try user_id
      const byId = await base44.entities.MediaUser.filter({ user_id: currentUser.id });
      return byId[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  // Contributor's MediaProfile (for outlet affiliation display)
  const { data: myMediaProfile } = useQuery({
    queryKey: ['myMediaProfile', currentUser?.id],
    queryFn: async () => {
      const results = await base44.entities.MediaProfile.filter({ user_id: currentUser.id }, '-created_date', 1);
      return results[0] || null;
    },
    enabled: !!(currentUser?.id && (isApprovedContributor(currentUser) || currentUser?.role === 'admin')),
  });

  // Contributor access state
  const { data: mediaApplication } = useQuery({
    queryKey: ['myMediaApplication', currentUser?.id],
    queryFn: () => base44.entities.MediaApplication.filter({ user_id: currentUser.id }, '-created_date', 1),
    enabled: !!currentUser?.id,
    select: data => data?.[0] || null,
  });

  const isContributor = isApprovedContributor(currentUser);
  const canAccessWorkspace = canAccessMediaPortalWorkspace(currentUser);

  // Unauthenticated view
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <Badge className="bg-blue-900/60 text-blue-300 mb-4">Media Credentialing</Badge>
            <h1 className="text-4xl font-black text-white mb-4">HIJINX Media Portal</h1>
            <p className="text-gray-400 max-w-xl mx-auto">Professional credentialing, asset management, and coverage coordination for motorsports media. Apply for event access, manage credentials, and submit deliverables — all in one place.</p>
          </div>

          <Card className="bg-[#171717] border-gray-800 max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Lock className="w-10 h-10 text-gray-600 mx-auto mb-4" />
              <h2 className="text-white font-bold text-lg mb-2">Sign In to Continue</h2>
              <p className="text-gray-500 text-sm mb-6">You must be signed in to create a profile, apply for credentials, or manage your requests.</p>
              <Button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="bg-white text-black hover:bg-gray-100 w-full font-semibold">
                Sign In
              </Button>
              <p className="text-gray-600 text-xs mt-4">Don't have an account? Sign up from the login page.</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
            {[
              { title: 'Build Your Profile', desc: 'Establish your professional identity — name, portfolio, organization, and coverage history.' },
              { title: 'Apply for Event Access', desc: 'Request credentials to events, tracks, and series through the official workflow.' },
              { title: 'Review Media Policies', desc: 'Accept usage rights agreements and policy terms before your coverage begins.' },
              { title: 'Manage Credentials', desc: 'View issued credentials, submission history, and compliance standing.' },
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

  const handleSaved = () => {
    refetchMediaUser();
    toast.success('Profile saved — you can now apply for credentials.');
  };

  const handleSubmitted = (req) => {
    setSubmittedReq(req);
    setActiveTab('requests');
    toast.success('Application submitted!');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-0.5">Media Portal</p>
              <h1 className="text-2xl font-black text-white">Media Portal</h1>
            </div>
            {mediaUser?.status && (
              <Badge className={{
                pending: 'bg-yellow-900/60 text-yellow-300',
                verified: 'bg-green-900/60 text-green-300',
                rejected: 'bg-red-900/60 text-red-300',
              }[mediaUser.status] || 'bg-gray-700 text-gray-300'}>
                {mediaUser.status}
              </Badge>
            )}
          </div>
          {currentUser && (
            <p className="text-gray-500 text-sm">{currentUser.full_name || currentUser.email}</p>
          )}
        </div>

        {/* Contributor access state banner */}
        {currentUser && !isContributor && !mediaApplication && currentUser.role !== 'admin' && (
          <div className="bg-[#171717] border border-gray-700 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Lock className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">Contributor Workspace Access Required</p>
              <p className="text-gray-400 text-xs mt-0.5">Apply to become an approved media contributor to unlock the full MediaPortal workspace.</p>
              <Link to={createPageUrl('Profile') + '?tab=media'}>
                <Button size="sm" className="mt-3 bg-white text-black hover:bg-gray-100 gap-1.5 text-xs h-7">
                  Apply Now <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {currentUser && !isContributor && mediaApplication && currentUser.role !== 'admin' && (
          <div className={`border rounded-xl p-4 mb-6 flex items-start gap-3 ${
            mediaApplication.status === 'pending' ? 'bg-amber-900/20 border-amber-800' :
            mediaApplication.status === 'needs_more_info' ? 'bg-blue-900/20 border-blue-800' :
            'bg-[#171717] border-gray-700'
          }`}>
            {mediaApplication.status === 'pending'
              ? <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              : mediaApplication.status === 'needs_more_info'
              ? <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              : <Lock className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />}
            <div>
              <p className="text-white text-sm font-medium">
                {mediaApplication.status === 'pending' ? 'Application Under Review' :
                 mediaApplication.status === 'needs_more_info' ? 'More Information Requested' :
                 'Application Not Approved'}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                {mediaApplication.status === 'pending'
                  ? 'Your contributor application has been submitted and is being reviewed.'
                  : mediaApplication.status === 'needs_more_info'
                  ? (mediaApplication.review_notes || 'The review team has requested more information.')
                  : 'Your application was not approved. You may apply again from your profile.'}
              </p>
            </div>
          </div>
        )}

        {isContributor && currentUser?.role !== 'admin' && (
          <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">Approved Contributor</p>
              <p className="text-gray-400 text-xs mt-0.5">You have approved media contributor access. Full workspace tools coming soon.</p>
            </div>
          </div>
        )}

        {currentUser?.role === 'admin' && (
          <div className="bg-purple-900/20 border border-purple-800 rounded-xl p-4 mb-6 flex items-center justify-between gap-3">
            <p className="text-purple-300 text-sm font-medium">Admin — full access</p>
            <Link to="/management/media/applications">
              <Button size="sm" variant="outline" className="text-xs h-7 border-purple-700 text-purple-300 hover:bg-purple-900/30">
                Review Applications
              </Button>
            </Link>
          </div>
        )}

        {submittedReq && (
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 mb-6 flex items-start justify-between gap-3">
            <div>
              <p className="text-green-300 font-medium text-sm">Application submitted!</p>
              <p className="text-green-400 text-xs mt-0.5">Status: <strong>{submittedReq.status}</strong> — ID: {submittedReq.id?.slice(0, 12)}</p>
            </div>
            <button onClick={() => setSubmittedReq(null)} className="text-green-600 hover:text-green-400 text-xs">Dismiss</button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#171717] border border-gray-800 p-1 flex gap-1 mb-6 w-full sm:w-auto flex-wrap">
            {(isContributor || currentUser?.role === 'admin') && (
              <TabsTrigger value="my_profile" className="flex-1 sm:flex-none data-[state=active]:bg-blue-900 data-[state=active]:text-blue-100 text-gray-400 text-xs px-4 py-2">
                My Profile
              </TabsTrigger>
            )}
            <TabsTrigger value="profile" className="flex-1 sm:flex-none data-[state=active]:bg-blue-900 data-[state=active]:text-blue-100 text-gray-400 text-xs px-4 py-2">
              Media Profile
            </TabsTrigger>
            <TabsTrigger value="apply" className="flex-1 sm:flex-none data-[state=active]:bg-blue-900 data-[state=active]:text-blue-100 text-gray-400 text-xs px-4 py-2">
              Apply
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex-1 sm:flex-none data-[state=active]:bg-blue-900 data-[state=active]:text-blue-100 text-gray-400 text-xs px-4 py-2">
              My Requests
            </TabsTrigger>
            <TabsTrigger value="credentials" className="flex-1 sm:flex-none data-[state=active]:bg-blue-900 data-[state=active]:text-blue-100 text-gray-400 text-xs px-4 py-2">
              My Credentials
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex-1 sm:flex-none data-[state=active]:bg-blue-900 data-[state=active]:text-blue-100 text-gray-400 text-xs px-4 py-2">
              My Assets
            </TabsTrigger>
            {(isContributor || currentUser?.role === 'admin') && (
              <TabsTrigger value="outlets" className="flex-1 sm:flex-none data-[state=active]:bg-blue-900 data-[state=active]:text-blue-100 text-gray-400 text-xs px-4 py-2">
                Outlets
              </TabsTrigger>
            )}
          </TabsList>

          {(isContributor || currentUser?.role === 'admin') && (
            <TabsContent value="my_profile">
              <ContributorProfileTab currentUser={currentUser} isAdmin={currentUser?.role === 'admin'} />
            </TabsContent>
          )}

          <TabsContent value="profile">
            <ProfileTab currentUser={currentUser} mediaUser={mediaUser} onSaved={handleSaved} />
          </TabsContent>
          <TabsContent value="apply">
            <ApplyTab currentUser={currentUser} mediaUser={mediaUser} onSubmitted={handleSubmitted} />
          </TabsContent>
          <TabsContent value="requests">
            <MyRequestsTab mediaUser={mediaUser} currentUser={currentUser} />
          </TabsContent>
          <TabsContent value="credentials">
            <MyCredentialsTab mediaUser={mediaUser} />
          </TabsContent>
          <TabsContent value="assets">
            <MyAssetsTab mediaUser={mediaUser} />
          </TabsContent>
          {(isContributor || currentUser?.role === 'admin') && (
            <TabsContent value="outlets">
              <OutletManagementTab
                currentUser={currentUser}
                isAdmin={currentUser?.role === 'admin'}
                mediaProfile={myMediaProfile}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}