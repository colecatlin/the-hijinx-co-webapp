import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import { Search, Plus, Pencil, Trash2, ArrowLeft, ExternalLink, AlertTriangle, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { buildRaceCoreUrl } from '@/components/registrationdashboard/raceCoreLinks';
import { Skeleton } from '@/components/ui/skeleton';
import TrackForm from '@/components/management/TrackForm';
import TrackCoreDetailsSection from '@/components/management/TrackManagement/TrackCoreDetailsSection';
import TrackSeriesSection from '@/components/management/TrackManagement/TrackSeriesSection';
import ActivityTab from '@/components/management/ActivityTab';
import { useEntityEditPermission } from '@/components/access/entityEditPermission';
import AdminOverridePanel from '@/components/management/AdminOverridePanel';
import PublishTab from '@/components/management/PublishTab';

export default function ManageTracks() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState(null);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  // Permission check for the currently-open track edit view
  const editingTrackRecord = selectedTrackForEdit?.id
    ? tracks.find(t => t.id === selectedTrackForEdit.id) || selectedTrackForEdit
    : selectedTrackForEdit;
  const { canEditManagement: canEditTrackManagement } =
    useEntityEditPermission('Track', selectedTrackForEdit?.id, editingTrackRecord);

  useEffect(() => {
    if (!isAdmin) return;
    base44.functions.invoke('findDuplicateSourceEntities', { entity_type: 'track' })
      .then(res => { if (res?.data?.duplicate_count > 0) setDuplicateWarning(true); })
      .catch(() => {});
  }, [isAdmin]);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list('-updated_date', 500),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, name }) => {
      await base44.entities.Track.delete(id);
      await base44.functions.invoke('logDeletion', { entityName: 'Track', recordIds: [id], recordNames: [name] });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tracks'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ ids, names }) => {
      await Promise.all(ids.map(id => base44.entities.Track.delete(id)));
      await base44.functions.invoke('logDeletion', { entityName: 'Track', recordIds: ids, recordNames: names });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      setSelectedTracks([]);
    },
  });

  const filteredTracks = tracks.filter(track =>
    track.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (track) => {
    if (window.confirm(`Delete ${track.name}?`)) {
      deleteMutation.mutate({ id: track.id, name: track.name });
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedTracks(filteredTracks.map(t => t.id));
    } else {
      setSelectedTracks([]);
    }
  };

  const handleSelectTrack = (id) => {
    setSelectedTracks(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedTracks.length} selected track(s)?`)) {
      const selectedItems = filteredTracks.filter(t => selectedTracks.includes(t.id));
      bulkDeleteMutation.mutate({ ids: selectedTracks, names: selectedItems.map(t => t.name) });
    }
  };

  // 'Add Track' now routes to /race-core/tracks/new — no showForm logic needed

  // Edit now routes to canonical /race-core/tracks/:id — this block is no longer reached

  return (
    <ManagementLayout currentPage="ManageTracks">
      {duplicateWarning && (
        <div className="mx-6 mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">Potential duplicate track records detected.</p>
            <p className="text-xs text-amber-700 mt-0.5">Review diagnostics before creating new records.</p>
          </div>
          <Link to={createPageUrl('Diagnostics')} className="text-xs font-semibold text-amber-800 underline whitespace-nowrap">
            Open Diagnostics
          </Link>
          <button onClick={() => setDuplicateWarning(false)} className="text-amber-500 hover:text-amber-700 ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <ManagementShell
        title="Tracks"
        subtitle={`${tracks.length} total tracks`}
        actions={activeTab === 'data' ? <Button onClick={() => navigate('/race-core/tracks/new')} className="bg-gray-900"><Plus className="w-4 h-4 mr-2" />Add Track</Button> : undefined}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="publish">Publish</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Tracks</p>
                <p className="text-2xl font-bold text-gray-900">{tracks.length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Active</p>
                <p className="text-2xl font-bold text-green-600">{tracks.filter(t => t.operational_status === 'Active').length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Seasonal</p>
                <p className="text-2xl font-bold text-yellow-600">{tracks.filter(t => t.operational_status === 'Seasonal').length}</p>
              </div>
            </div>
            <Button onClick={() => navigate('/race-core/tracks/new')} className="w-full bg-[#232323] hover:bg-[#1A3249]">
              <Plus className="w-4 h-4 mr-2" />
              Add Track
            </Button>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {isAdmin && selectedTracks.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? (
                <BurnoutSpinner />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedTracks.length}`}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {isAdmin && <th className="px-6 py-3 text-left w-12">
                    <Checkbox 
                      checked={selectedTracks.length === filteredTracks.length && filteredTracks.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>}
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTracks.map((track) => (
                  <tr key={track.id} className="hover:bg-gray-50">
                    {isAdmin && <td className="px-6 py-4">
                      <Checkbox 
                        checked={selectedTracks.includes(track.id)}
                        onCheckedChange={() => handleSelectTrack(track.id)}
                      />
                    </td>}
                    <td className="px-6 py-4">
                      <div className="font-medium">{track.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {track.location_city}, {track.location_state}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {track.track_type}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        track.operational_status === 'Active' ? 'bg-green-100 text-green-800' :
                        track.operational_status === 'Seasonal' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {track.operational_status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(buildRaceCoreUrl({
                            orgType: 'track',
                            orgId: track.id,
                            tab: 'overview',
                          }))}
                          title="Open in Race Core"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/race-core/tracks/' + track.id)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleDelete(track)}
                           disabled={deleteMutation.isPending}
                           className={deleteMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}
                         >
                           {deleteMutation.isPending ? (
                             <div className="text-gray-400"><BurnoutSpinner /></div>
                           ) : (
                             <Trash2 className="w-4 h-4 text-red-600" />
                           )}
                         </Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

            {!isLoading && filteredTracks.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No tracks found
              </div>
            )}
          </TabsContent>

          <TabsContent value="relationships" className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Track Relationships</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Series</p>
                  <p className="text-lg font-semibold">Host Events</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Events</p>
                  <p className="text-lg font-semibold">Hosted</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Manage track relationships by editing the track's sections.</p>
            </div>
          </TabsContent>

          <TabsContent value="publish">
            <PublishTab 
              entityCount={tracks.length}
              draftCount={0}
              liveCount={tracks.length}
              hasPublishControl={false}
            />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab entityName="Track" />
          </TabsContent>
        </Tabs>
      </ManagementShell>
    </ManagementLayout>
  );
}