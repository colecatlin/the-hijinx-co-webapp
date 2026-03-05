import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, FileText, Shield, Users, CheckCircle, ArrowRight, User, Plus } from 'lucide-react';

export default function MediaPortal() {
  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
  });

  const { data: mediaUser } = useQuery({
    queryKey: ['myMediaUser'],
    queryFn: async () => {
      const results = await base44.entities.MediaUser.filter({ user_id: user.id });
      return results[0] || null;
    },
    enabled: !!user?.id,
  });

  const features = [
    { icon: Camera, title: 'Apply for Credentials', desc: 'Request media access to tracks, series, and events.' },
    { icon: Shield, title: 'Policy Compliance', desc: 'Review and accept required media policies digitally.' },
    { icon: FileText, title: 'Digital Waivers', desc: 'Sign liability waivers without paper forms.' },
    { icon: CheckCircle, title: 'Deliverables Tracking', desc: 'Acknowledge content requirements for your credentials.' },
    { icon: Users, title: 'Media Profile', desc: 'Maintain your verified media professional profile.' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A] border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <Badge className="bg-blue-900/60 text-blue-300 mb-6">Media Credentialing System</Badge>
          <h1 className="text-5xl font-black text-white mb-4 leading-tight">
            Hijinx Media Portal
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            The official credentialing platform for motorsports media professionals. Apply for access, manage your profile, and track your requests in one place.
          </p>

          {isAuthenticated ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {mediaUser ? (
                <>
                  <Link to={createPageUrl('MediaProfile')}>
                    <Button className="bg-blue-700 hover:bg-blue-600 text-white px-8 py-6 text-base font-semibold">
                      <User className="w-5 h-5 mr-2" /> My Media Profile
                    </Button>
                  </Link>
                  <Link to={createPageUrl('MediaApply')}>
                    <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800 px-8 py-6 text-base font-semibold">
                      <Plus className="w-5 h-5 mr-2" /> Apply for Credentials
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to={createPageUrl('MediaProfile')}>
                    <Button className="bg-blue-700 hover:bg-blue-600 text-white px-8 py-6 text-base font-semibold">
                      <User className="w-5 h-5 mr-2" /> Create Media Profile
                    </Button>
                  </Link>
                  <p className="text-gray-500 text-sm">Create a profile first, then apply for credentials</p>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={() => base44.auth.redirectToLogin(window.location.href)}
                className="bg-white text-black hover:bg-gray-100 px-8 py-6 text-base font-semibold"
              >
                Sign In to Apply
              </Button>
              <p className="text-gray-500 text-sm">You must be signed in to apply for credentials</p>
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-10">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="bg-[#171717] border-gray-800 hover:border-gray-600 transition-colors">
              <CardContent className="p-6">
                <Icon className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-gray-400 text-sm">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="bg-[#111] border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Application Process</h2>
          <div className="space-y-4">
            {[
              { step: '01', title: 'Create Your Profile', desc: 'Set up your media professional profile with contact info, portfolio, and insurance details.' },
              { step: '02', title: 'Select Your Target', desc: 'Choose the track, series, or event you want access to.' },
              { step: '03', title: 'Accept Policies & Sign Waivers', desc: 'Review and acknowledge all required policies and liability waivers.' },
              { step: '04', title: 'Submit & Wait for Approval', desc: 'Your application is reviewed by the venue or series media team.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-4 p-4 bg-[#1A1A1A] rounded-lg border border-gray-800">
                <span className="text-3xl font-black text-gray-700 leading-none w-12 shrink-0">{step}</span>
                <div>
                  <h3 className="text-white font-semibold mb-1">{title}</h3>
                  <p className="text-gray-400 text-sm">{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600 ml-auto shrink-0 mt-1" />
              </div>
            ))}
          </div>

          {isAuthenticated && !mediaUser && (
            <div className="text-center mt-10">
              <Link to={createPageUrl('MediaProfile')}>
                <Button className="bg-blue-700 hover:bg-blue-600 text-white px-10 py-5 text-base font-semibold">
                  Get Started — Create Your Profile
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}