import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { buildProfileUrl, generateSlug, validateSlug } from '@/components/utils/routingContract';
import { toast } from 'sonner';

export default function Diagnostics() {
  const [generatingSlug, setGeneratingSlug] = useState(null);
  const queryClient = useQueryClient();

  // Check if user is admin
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch entity data
  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ['tracks-diag'],
    queryFn: () => base44.entities.Track.list('-updated_date', 10),
  });

  const { data: series = [], isLoading: seriesLoading } = useQuery({
    queryKey: ['series-diag'],
    queryFn: () => base44.entities.Series.list('-updated_date', 10),
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams-diag'],
    queryFn: () => base44.entities.Team.list('-updated_date', 10),
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers-diag'],
    queryFn: () => base44.entities.Driver.list('-updated_date', 10),
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events-diag'],
    queryFn: () => base44.entities.Event.list('-updated_date', 10),
  });

  // Relation health queries
  const { data: allEvents = [] } = useQuery({
    queryKey: ['all-events-diag'],
    queryFn: () => base44.entities.Event.list('-updated_date', 50),
  });

  const { data: allTracks = [] } = useQuery({
    queryKey: ['all-tracks-diag'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: allSeries = [] } = useQuery({
    queryKey: ['all-series-diag'],
    queryFn: () => base44.entities.Series.list(),
  });

  // Mutation to generate slug
  const generateSlugMutation = useMutation({
    mutationFn: async ({ entityType, record }) => {
      const slug = generateSlug(record.name, record.city || record.date);
      const allRecords = entityType === 'Track' ? allTracks :
                        entityType === 'Series' ? allSeries :
                        entityType === 'Team' ? teams :
                        entityType === 'Driver' ? drivers : allEvents;
      
      const existingSlugs = allRecords.map(r => r.slug).filter(Boolean);
      const { isUnique, suggestion } = validateSlug(slug, existingSlugs);
      
      const finalSlug = isUnique ? slug : suggestion;
      
      if (entityType === 'Track') {
        await base44.entities.Track.update(record.id, { slug: finalSlug });
      } else if (entityType === 'Series') {
        await base44.entities.Series.update(record.id, { slug: finalSlug });
      } else if (entityType === 'Team') {
        await base44.entities.Team.update(record.id, { slug: finalSlug });
      } else if (entityType === 'Driver') {
        await base44.entities.Driver.update(record.id, { slug: finalSlug });
      } else if (entityType === 'Event') {
        await base44.entities.Event.update(record.id, { slug: finalSlug });
      }
      
      return { finalSlug, wasUnique: isUnique };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`${variables.entityType.toLowerCase()}s-diag`] });
      queryClient.invalidateQueries({ queryKey: [`all-${variables.entityType.toLowerCase()}s-diag`] });
      toast.success(`Slug generated: ${data.finalSlug}${data.wasUnique ? '' : ' (made unique)'}`);
      setGeneratingSlug(null);
    },
    onError: (error) => {
      toast.error(`Failed to generate slug: ${error.message}`);
      setGeneratingSlug(null);
    },
  });

  if (user?.role !== 'admin') {
    return (
      <ManagementLayout currentPage="Diagnostics">
        <ManagementShell title="Access Denied" subtitle="">
          <div className="py-20 text-center">
            <p className="text-gray-600">This page is for administrators only.</p>
          </div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  const isLoading = tracksLoading || seriesLoading || teamsLoading || driversLoading || eventsLoading;

  if (isLoading) {
    return (
      <ManagementLayout currentPage="Diagnostics">
        <ManagementShell title="Diagnostics" subtitle="">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-96" />
        </ManagementShell>
      </ManagementLayout>
    );
  }

  // Helper functions
  const getSlugStatus = (record) => {
    if (!record.slug) return { icon: XCircle, color: 'text-red-500', label: 'Missing' };
    return { icon: CheckCircle, color: 'text-green-500', label: 'OK' };
  };

  const getRelationStatus = (hasRelation) => {
    return hasRelation 
      ? { icon: CheckCircle, color: 'text-green-500', label: 'Yes' }
      : { icon: XCircle, color: 'text-red-500', label: 'No' };
  };

  // Check for broken links
  const getBrokenRecords = () => {
    const broken = [];
    
    // Check all entity types
    [...tracks, ...series, ...teams, ...drivers].forEach(record => {
      const entityType = record.name && tracks.includes(record) ? 'Track' :
                        record.name && series.includes(record) ? 'Series' :
                        record.name && teams.includes(record) ? 'Team' : 'Driver';
      
      if (!record.slug) {
        broken.push({
          entityType,
          record,
          issue: 'Missing slug',
        });
      }
    });
    
    events.forEach(event => {
      if (!event.slug) {
        broken.push({ entityType: 'Event', record: event, issue: 'Missing slug' });
      }
      if (!event.track_id || !event.series_id) {
        broken.push({ 
          entityType: 'Event', 
          record: event, 
          issue: event.status === 'draft' ? 'Draft (missing relations)' : 'Missing required relation',
        });
      }
    });
    
    return broken;
  };

  const brokenRecords = getBrokenRecords();

  const handleGenerateSlug = (entityType, record) => {
    setGeneratingSlug(record.id);
    generateSlugMutation.mutate({ entityType, record });
  };

  // Render entity table
  const renderEntityTable = (entityType, records) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold">Name</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Slug</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Profile URL</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map(record => {
              const slugStatus = getSlugStatus(record);
              const StatusIcon = slugStatus.icon;
              const profileUrl = record.slug ? buildProfileUrl(entityType, record.slug) : '#';
              
              return (
                <tr key={record.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-sm font-medium">{record.name}</td>
                  <td className="py-3 px-4 text-sm font-mono text-gray-600">{record.slug || '—'}</td>
                  <td className="py-3 px-4 text-xs text-gray-500 max-w-xs truncate">
                    {profileUrl !== '#' ? profileUrl : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-4 h-4 ${slugStatus.color}`} />
                      <span className="text-sm">{slugStatus.label}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {!record.slug && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateSlug(entityType, record)}
                        disabled={generatingSlug === record.id}
                      >
                        {generatingSlug === record.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                            Generating...
                          </>
                        ) : (
                          'Generate Slug'
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">Routing & Relations Diagnostics</h1>
          <p className="text-gray-600">Admin-only health check for entity routes and relationships</p>
        </div>

        {/* Broken Links Summary */}
        {brokenRecords.length > 0 && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                {brokenRecords.length} Issue{brokenRecords.length !== 1 ? 's' : ''} Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {brokenRecords.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white border border-red-200 p-3 rounded">
                    <div>
                      <span className="font-semibold text-sm">{item.entityType}:</span>{' '}
                      <span className="text-sm">{item.record.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs border-red-300 text-red-700">
                        {item.issue}
                      </Badge>
                    </div>
                    {item.issue === 'Missing slug' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateSlug(item.entityType, item.record)}
                        disabled={generatingSlug === item.record.id}
                      >
                        Fix
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Route Health */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>A. Route Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="font-bold mb-4">Tracks</h3>
                {renderEntityTable('Track', tracks)}
              </div>
              <div>
                <h3 className="font-bold mb-4">Series</h3>
                {renderEntityTable('Series', series)}
              </div>
              <div>
                <h3 className="font-bold mb-4">Teams</h3>
                {renderEntityTable('Team', teams)}
              </div>
              <div>
                <h3 className="font-bold mb-4">Drivers</h3>
                {renderEntityTable('Driver', drivers)}
              </div>
              <div>
                <h3 className="font-bold mb-4">Events</h3>
                {renderEntityTable('Event', events)}
              </div>
            </CardContent>
          </Card>

          {/* Relation Health */}
          <Card>
            <CardHeader>
              <CardTitle>B. Relation Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="font-bold mb-4">Events (Sample)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold">Track Relation</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold">Series Relation</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold">Links</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.slice(0, 10).map(event => {
                        const trackStatus = getRelationStatus(event.track_id);
                        const seriesStatus = getRelationStatus(event.series_id);
                        const TrackIcon = trackStatus.icon;
                        const SeriesIcon = seriesStatus.icon;
                        
                        return (
                          <tr key={event.id} className="border-b border-gray-100">
                            <td className="py-3 px-4 text-sm font-medium">{event.name}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <TrackIcon className={`w-4 h-4 ${trackStatus.color}`} />
                                <span className="text-sm">{trackStatus.label}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <SeriesIcon className={`w-4 h-4 ${seriesStatus.color}`} />
                                <span className="text-sm">{seriesStatus.label}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              {event.track_name && <div className="text-gray-600">→ {event.track_name}</div>}
                              {event.series_name && <div className="text-gray-600">→ {event.series_name}</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-4">Tracks (Relation Counts)</h3>
                <div className="space-y-2">
                  {tracks.slice(0, 10).map(track => {
                    const eventsCount = allEvents.filter(e => e.track_id === track.id).length;
                    
                    return (
                      <div key={track.id} className="flex items-center justify-between border border-gray-200 p-3 rounded">
                        <span className="font-medium">{track.name}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-gray-600">{eventsCount} event{eventsCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-4">Series (Relation Counts)</h3>
                <div className="space-y-2">
                  {series.slice(0, 10).map(s => {
                    const eventsCount = allEvents.filter(e => e.series_id === s.id).length;
                    
                    return (
                      <div key={s.id} className="flex items-center justify-between border border-gray-200 p-3 rounded">
                        <span className="font-medium">{s.name}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-gray-600">{eventsCount} event{eventsCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}