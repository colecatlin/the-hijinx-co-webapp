import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, TrendingUp, Award, Target, Plus, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SubmitPastResultForm from '@/components/drivers/SubmitPastResultForm';
import DriverClaimsDisplay from '@/components/drivers/DriverClaimsDisplay';

export default function DriverStats() {
  const { slug } = useParams();
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const { data: drivers = [], isLoading: loadingDriver } = useQuery({
    queryKey: ['driver', slug],
    queryFn: () => base44.entities.Driver.filter({ slug }),
  });

  const driver = drivers[0];

  const { data: programs = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ['driverPrograms', driver?.id],
    queryFn: () => base44.entities.DriverProgram.filter({ driver_id: driver.id }),
    enabled: !!driver?.id,
  });

  const { data: allResults = [], isLoading: loadingResults } = useQuery({
    queryKey: ['driverResults', driver?.id],
    queryFn: () => base44.entities.Results.filter({ driver_id: driver.id }),
    enabled: !!driver?.id,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isOwner = user?.email === driver?.owner_user_id || user?.role === 'admin';

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list(),
  });

  const stats = useMemo(() => {
    if (!allResults.length) return null;

    const validResults = allResults.filter(r => 
      ['Race', 'Main', 'Feature'].includes(sessions.find(s => s.id === r.session_id)?.session_type)
    );

    const overallStats = {
      totalRaces: validResults.length,
      wins: validResults.filter(r => r.position === 1).length,
      podiums: validResults.filter(r => r.position && r.position <= 3).length,
      top5: validResults.filter(r => r.position && r.position <= 5).length,
      top10: validResults.filter(r => r.position && r.position <= 10).length,
      dnfs: validResults.filter(r => r.status_text?.toLowerCase().includes('dnf')).length,
    };

    const programStats = programs.map(program => {
      const programResults = validResults.filter(r => 
        r.series === program.series_name && 
        (!program.class_name || r.class === program.class_name)
      );

      return {
        ...program,
        totalRaces: programResults.length,
        wins: programResults.filter(r => r.position === 1).length,
        podiums: programResults.filter(r => r.position && r.position <= 3).length,
        top5: programResults.filter(r => r.position && r.position <= 5).length,
        avgPosition: programResults.length > 0
          ? (programResults.reduce((sum, r) => sum + (r.position || 0), 0) / programResults.length).toFixed(1)
          : '-',
      };
    });

    return { overallStats, programStats };
  }, [allResults, programs, sessions]);

  if (loadingDriver || loadingPrograms || loadingResults) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (!driver) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-gray-500">Driver not found</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Link to={createPageUrl('DriverProfile', { slug })}>
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
        </Link>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              {driver.first_name} {driver.last_name}
            </h1>
            <p className="text-xl text-gray-600">Career Statistics</p>
          </div>
          {isOwner && !showSubmitForm && (
            <Button onClick={() => setShowSubmitForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Submit Past Result
            </Button>
          )}
        </div>

        {showSubmitForm && (
          <div className="mb-6">
            <SubmitPastResultForm
              driverId={driver.id}
              onCancel={() => setShowSubmitForm(false)}
            />
          </div>
        )}

        {!stats ? (
          <Card className="p-12 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No race results available yet</p>
          </Card>
        ) : (
          <Tabs defaultValue="overall" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overall">Overall Stats</TabsTrigger>
              <TabsTrigger value="programs">By Program</TabsTrigger>
              {isOwner && (
                <TabsTrigger value="claims">
                  <FileText className="w-4 h-4 mr-2" />
                  My Submissions
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overall" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="p-6 text-center">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <div className="text-3xl font-bold">{stats.overallStats.wins}</div>
                  <div className="text-sm text-gray-600">Wins</div>
                </Card>

                <Card className="p-6 text-center">
                  <Award className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <div className="text-3xl font-bold">{stats.overallStats.podiums}</div>
                  <div className="text-sm text-gray-600">Podiums</div>
                </Card>

                <Card className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-3xl font-bold">{stats.overallStats.top5}</div>
                  <div className="text-sm text-gray-600">Top 5</div>
                </Card>

                <Card className="p-6 text-center">
                  <Target className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-3xl font-bold">{stats.overallStats.top10}</div>
                  <div className="text-sm text-gray-600">Top 10</div>
                </Card>

                <Card className="p-6 text-center">
                  <div className="text-3xl font-bold">{stats.overallStats.totalRaces}</div>
                  <div className="text-sm text-gray-600">Total Races</div>
                </Card>

                <Card className="p-6 text-center">
                  <div className="text-3xl font-bold">{stats.overallStats.dnfs}</div>
                  <div className="text-sm text-gray-600">DNFs</div>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4">Win Rate</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Wins</span>
                    <span>{((stats.overallStats.wins / stats.overallStats.totalRaces) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500"
                      style={{ width: `${(stats.overallStats.wins / stats.overallStats.totalRaces) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Podiums</span>
                    <span>{((stats.overallStats.podiums / stats.overallStats.totalRaces) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${(stats.overallStats.podiums / stats.overallStats.totalRaces) * 100}%` }}
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="programs" className="space-y-4">
              {stats.programStats.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-gray-500">No programs defined</p>
                </Card>
              ) : (
                stats.programStats.map((program) => (
                  <Card key={program.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{program.series_name}</h3>
                        <div className="flex gap-4 mt-1 text-sm text-gray-600">
                          <span>{program.season}</span>
                          {program.team_name && <span>• {program.team_name}</span>}
                          {program.class_name && <span>• {program.class_name}</span>}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        program.status === 'active' ? 'bg-green-100 text-green-800' :
                        program.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {program.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <div className="text-2xl font-bold">{program.wins}</div>
                        <div className="text-sm text-gray-600">Wins</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{program.podiums}</div>
                        <div className="text-sm text-gray-600">Podiums</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{program.top5}</div>
                        <div className="text-sm text-gray-600">Top 5</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{program.avgPosition}</div>
                        <div className="text-sm text-gray-600">Avg Finish</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{program.totalRaces}</div>
                        <div className="text-sm text-gray-600">Races</div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {isOwner && (
              <TabsContent value="claims" className="space-y-4">
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4">Submitted Results Awaiting Verification</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    These are results you've submitted that are pending review by administrators.
                    Once verified, they will appear in your official statistics.
                  </p>
                  <DriverClaimsDisplay driverId={driver.id} />
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </PageShell>
  );
}