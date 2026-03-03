import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/components/utils';
import { ArrowRight, Users, Settings, LogIn } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

export default function RegistrationLanding() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    ...DQ,
  });

  const { data: collaborations = [] } = useQuery({
    queryKey: ['myCollaborations', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return base44.entities.EntityCollaborator.filter({ user_id: user.id });
    },
    enabled: !!user?.id,
    ...DQ,
  });

  // Group collaborations by entity type
  const grouped = useMemo(() => {
    const groups = {};
    collaborations.forEach(collab => {
      if (!groups[collab.entity_type]) groups[collab.entity_type] = [];
      groups[collab.entity_type].push(collab);
    });
    return groups;
  }, [collaborations]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <LogIn className="w-12 h-12 text-gray-400 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">Sign In Required</h2>
              <p className="text-gray-600">You must be logged in to access Race Core.</p>
              <Button onClick={() => base44.auth.redirectToLogin()} className="bg-blue-600 hover:bg-blue-700">
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Index46 Race Core</h1>
          <p className="text-gray-600">Event Operations and Entity Management Console</p>
        </div>

        {/* Admin Section */}
        {user?.role === 'admin' && (
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg text-blue-900">Administrator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-blue-800">Full platform access</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  onClick={() => window.location.href = createPageUrl('Management')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Management Studio
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button
                  onClick={() => window.location.href = createPageUrl('RegistrationDashboard')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Race Core Console
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Entity Owner Section */}
        {Object.keys(grouped).length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">My Entities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(grouped).map(([entityType, collab]) => (
                <Card key={entityType}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                      {entityType}
                      {collab.some(c => c.role === 'owner') && (
                        <Badge className="bg-purple-100 text-purple-700">Owner</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {collab.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{c.entity_name}</span>
                        <Badge variant="outline" className="text-xs">{c.role}</Badge>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const orgId = collab[0].entity_id;
                        const orgType = entityType.toLowerCase();
                        window.location.href = createPageUrl('RegistrationDashboard', {
                          orgType,
                          orgId,
                        });
                      }}
                      className="w-full mt-2"
                    >
                      Open Race Core
                      <ArrowRight className="w-3 h-3 ml-auto" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No Access Section */}
        {!user?.role === 'admin' && Object.keys(grouped).length === 0 && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="py-8 text-center space-y-4">
              <p className="text-gray-600">You don't have access to any entities yet.</p>
              <Button
                onClick={() => window.location.href = createPageUrl('Profile')}
                variant="outline"
              >
                Request Access in Profile
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>
              <strong>Management Studio</strong> is for editing master data: drivers, teams, tracks, series, and settings.
            </p>
            <p>
              <strong>Race Core Console</strong> is for managing event operations: entries, check-in, tech inspection, results, and standings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}