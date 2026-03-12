import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Lock } from 'lucide-react';
import { toast } from 'sonner';
import ProfileTab from '@/components/media/portal/ProfileTab';
import ApplyTab from '@/components/media/portal/ApplyTab';
import MyRequestsTab from '@/components/media/portal/MyRequestsTab';
import MyCredentialsTab from '@/components/media/portal/MyCredentialsTab';
import MyAssetsTab from '@/components/media/portal/MyAssetsTab';

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
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-3">
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
          <TabsList className="bg-[#171717] border border-gray-800 p-1 flex gap-1 mb-6 w-full sm:w-auto">
            <TabsTrigger value="profile" className="flex-1 sm:flex-none data-[state=active]:bg-blue-900 data-[state=active]:text-blue-100 text-gray-400 text-xs px-4 py-2">
              Profile
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
          </TabsList>

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
        </Tabs>
      </div>
    </div>
  );
}