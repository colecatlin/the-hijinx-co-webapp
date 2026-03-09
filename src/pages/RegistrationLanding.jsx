/**
 * Registration Landing Page
 * 
 * Single entry point for all admin and entity-owner access to Race Core and Management.
 * Replaces confusion from direct deep linking.
 * 
 * Routes to:
 * - Management Studio (admin only)
 * - Race Core Console (admin + entity owners)
 * - Control Panel (My Entities, Access requests)
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock, Gauge, Users, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RegistrationLanding() {
  const { data: isAuthenticated, isLoading: authLoading } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
  });

  const { data: collaborations = [] } = useQuery({
    queryKey: ['myCollaborations', user?.id],
    queryFn: () => (user?.id 
      ? base44.entities.EntityCollaborator.filter({ user_id: user.id })
      : Promise.resolve([])),
    enabled: !!isAuthenticated && !!user?.id,
  });

  const isAdmin = useMemo(() => user?.role === 'admin', [user?.role]);

  const collaborationsByType = useMemo(() => {
    const grouped = {};
    collaborations.forEach(c => {
      if (!grouped[c.entity_type]) grouped[c.entity_type] = [];
      grouped[c.entity_type].push(c);
    });
    return grouped;
  }, [collaborations]);

  if (authLoading) {
    return (
      <PageShell>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </PageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageShell>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="w-5 h-5" /> Login Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                You must be logged in to access the Race Core Console and Management Studio.
              </p>
              <Button 
                onClick={() => base44.auth.redirectToLogin()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Log In
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <h1 className="text-4xl font-black text-gray-900">Race Core</h1>
            <p className="text-lg text-gray-600">Manage events, entries, tech inspection, and results — all in one operational system built for competition.</p>
          </motion.div>

          {/* Admin Section */}
          {isAdmin && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Admin Controls</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Management Studio */}
                <Card className="border-blue-200 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <Gauge className="w-5 h-5" /> Management Studio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Master data management for drivers, teams, tracks, and series.
                    </p>
                    <Button
                      onClick={() => window.location.href = createPageUrl('Management')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Open Management Studio
                    </Button>
                  </CardContent>
                </Card>

                {/* Race Core Console */}
                <Card className="border-amber-200 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-900">
                      <Lock className="w-5 h-5" /> Race Core Console
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Event operations, sessions, entries, results, and compliance.
                    </p>
                    <Button
                      onClick={() => window.location.href = createPageUrl('RegistrationDashboard')}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Open Race Core Console
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Entity Owner Section */}
          {Object.keys(collaborationsByType).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">My Entities</h2>
              <p className="text-gray-600">Access the entities you manage</p>
              
              <div className="space-y-3">
                {Object.entries(collaborationsByType).map(([entityType, collabs]) => (
                  <Card key={entityType} className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{entityType}s</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {collabs.map((collab) => (
                          <div key={collab.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{collab.entity_name}</p>
                              <p className="text-xs text-gray-500 capitalize">{collab.role}</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                const orgType = entityType.toLowerCase();
                                window.location.href = createPageUrl('RegistrationDashboard', {
                                  orgType,
                                  orgId: collab.entity_id,
                                });
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Open
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* No Access Section */}
          {!isAdmin && Object.keys(collaborationsByType).length === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <AlertCircle className="w-5 h-5 text-amber-500" /> Race Core Access Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Race Core is available to track and series operators. To gain access, enter the access code provided by your entity owner — or request one through your Profile.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => window.location.href = createPageUrl('Profile') + '?tab=access_codes'}
                      className="flex-1 bg-[#232323] hover:bg-black text-white"
                    >
                      Enter Access Code
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.location.href = createPageUrl('MyDashboard')}
                      className="flex-1"
                    >
                      Go to My Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Footer Help */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center text-sm text-gray-500 border-t border-gray-200 pt-8">
            <p>Need help accessing Race Core? Go to your <a href={createPageUrl('Profile') + '?tab=access_codes'} className="underline underline-offset-2 hover:text-gray-700">Profile → Access & Setup</a> to enter a code or review pending invitations.</p>
          </motion.div>
        </div>
      </div>
    </PageShell>
  );
}