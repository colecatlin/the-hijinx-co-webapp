import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronRight, Loader2, Building2 } from 'lucide-react';
import OutletForm from '@/components/media/outlet/OutletForm';
import OutletContributorManager from '@/components/media/outlet/OutletContributorManager';

const STATUS_COLORS = {
  draft: 'bg-gray-700 text-gray-400',
  active: 'bg-green-900/60 text-green-300',
  hidden: 'bg-gray-800 text-gray-500',
};

const VERIFY_COLORS = {
  pending: 'bg-gray-700 text-gray-400',
  verified: 'bg-green-900/60 text-green-300',
  featured: 'bg-blue-900/60 text-blue-300',
  suspended: 'bg-red-900/60 text-red-300',
};

export default function OutletManagementTab({ currentUser, isAdmin, mediaProfile }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState('list'); // 'list' | 'create' | { outlet, mode: 'edit' | 'contributors' }
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [detailMode, setDetailMode] = useState(null);

  // Admins see all outlets; contributors see their affiliated outlets
  const { data: outlets = [], isLoading, refetch } = useQuery({
    queryKey: ['mediaOutlets', isAdmin ? 'all' : mediaProfile?.id],
    queryFn: async () => {
      if (isAdmin) return base44.entities.MediaOutlet.list('-created_date', 100);
      if (!mediaProfile) return [];
      const affiliatedIds = [
        ...(mediaProfile.primary_outlet_id ? [mediaProfile.primary_outlet_id] : []),
        ...(mediaProfile.secondary_outlet_ids || []),
      ];
      if (affiliatedIds.length === 0) return [];
      const all = await base44.entities.MediaOutlet.list('-created_date', 100);
      return all.filter(o => affiliatedIds.includes(o.id));
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['mediaOutlets'] });
    refetch();
  };

  const handleSaved = () => {
    invalidate();
    setView('list');
    setSelectedOutlet(null);
    setDetailMode(null);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-gray-500 animate-spin" /></div>;
  }

  // Create form
  if (view === 'create') {
    return (
      <div className="bg-[#171717] border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Create Media Outlet</h2>
          <Button variant="ghost" size="sm" onClick={() => setView('list')} className="text-gray-400 hover:text-white text-xs">← Back</Button>
        </div>
        <OutletForm onSaved={handleSaved} onCancel={() => setView('list')} />
      </div>
    );
  }

  // Edit / Contributors detail view
  if (selectedOutlet && detailMode) {
    return (
      <div className="bg-[#171717] border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <button onClick={() => { setSelectedOutlet(null); setDetailMode(null); }} className="text-gray-500 hover:text-white text-xs mb-1 block">← Back to outlets</button>
            <h2 className="text-white font-semibold">{selectedOutlet.name}</h2>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <Button size="sm" variant={detailMode === 'edit' ? 'default' : 'outline'} onClick={() => setDetailMode('edit')} className="text-xs h-7 border-gray-700">Edit</Button>
                <Button size="sm" variant={detailMode === 'contributors' ? 'default' : 'outline'} onClick={() => setDetailMode('contributors')} className="text-xs h-7 border-gray-700">Contributors</Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4">
          {detailMode === 'edit' && isAdmin && (
            <OutletForm outlet={selectedOutlet} onSaved={handleSaved} onCancel={() => { setSelectedOutlet(null); setDetailMode(null); }} />
          )}
          {detailMode === 'contributors' && isAdmin && (
            <OutletContributorManager outlet={selectedOutlet} onUpdated={() => { invalidate(); refetch().then(r => { const updated = r.data?.find(o => o.id === selectedOutlet.id); if (updated) setSelectedOutlet(updated); }); }} />
          )}
          {detailMode === 'view' && (
            <OutletReadonlyView outlet={selectedOutlet} mediaProfile={mediaProfile} />
          )}
        </div>
      </div>
    );
  }

  // Outlet list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
          {isAdmin ? 'All Outlets' : 'My Outlet Affiliations'}
        </h2>
        {isAdmin && (
          <Button size="sm" onClick={() => setView('create')} className="bg-white text-black hover:bg-gray-100 gap-1.5 text-xs h-8">
            <Plus className="w-3 h-3" /> New Outlet
          </Button>
        )}
      </div>

      {outlets.length === 0 ? (
        <div className="bg-[#171717] border border-gray-800 rounded-xl p-8 text-center">
          <Building2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {isAdmin ? 'No outlets yet. Create the first one.' : 'You are not affiliated with any outlets.'}
          </p>
          {!isAdmin && (
            <p className="text-gray-600 text-xs mt-1">Outlet affiliations are managed by an admin.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {outlets.map(outlet => {
            const isPrimary = mediaProfile?.primary_outlet_id === outlet.id;
            return (
              <button
                key={outlet.id}
                onClick={() => { setSelectedOutlet(outlet); setDetailMode(isAdmin ? 'edit' : 'view'); }}
                className="w-full text-left bg-[#171717] border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {outlet.logo_url ? (
                      <img src={outlet.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-700" />
                    ) : (
                      <div className="w-9 h-9 bg-[#1a1a1a] border border-gray-700 rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{outlet.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{outlet.outlet_type?.replace('_', ' ')} · {(outlet.contributor_profile_ids || []).length} contributors</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isPrimary && <Badge className="bg-blue-900/60 text-blue-300 text-[10px]">Primary</Badge>}
                    <Badge className={STATUS_COLORS[outlet.outlet_status] || 'bg-gray-700 text-gray-400'}>{outlet.outlet_status}</Badge>
                    <Badge className={VERIFY_COLORS[outlet.verification_status] || 'bg-gray-700 text-gray-400'}>{outlet.verification_status}</Badge>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OutletReadonlyView({ outlet, mediaProfile }) {
  const isPrimary = mediaProfile?.primary_outlet_id === outlet.id;
  return (
    <div className="space-y-4">
      {isPrimary && <Badge className="bg-blue-900/60 text-blue-300">Your Primary Outlet</Badge>}
      {outlet.description && <p className="text-gray-400 text-sm">{outlet.description}</p>}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {outlet.website_url && <a href={outlet.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate">{outlet.website_url}</a>}
        <div className="text-gray-500">{(outlet.contributor_profile_ids || []).length} contributors</div>
      </div>
      <p className="text-gray-600 text-xs">Outlet affiliation details are managed by the platform admin.</p>
    </div>
  );
}