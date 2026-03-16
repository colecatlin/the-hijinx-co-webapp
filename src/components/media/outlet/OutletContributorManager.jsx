import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, UserMinus, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function OutletContributorManager({ outlet, onUpdated }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [affiliationType, setAffiliationType] = useState('secondary');
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch all MediaProfiles for searching
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['allMediaProfiles'],
    queryFn: () => base44.entities.MediaProfile.list('-created_date', 100),
  });

  const contributorProfileIds = outlet?.contributor_profile_ids || [];
  const currentContributors = allProfiles.filter(p => contributorProfileIds.includes(p.id));
  const availableProfiles = allProfiles.filter(p =>
    !contributorProfileIds.includes(p.id) &&
    (!searchTerm || (p.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAction = async (profileId, action, type = 'secondary') => {
    setActionLoading(`${profileId}-${action}`);
    try {
      const result = await base44.functions.invoke('manageOutletContributor', {
        outlet_id: outlet.id,
        profile_id: profileId,
        action,
        affiliation_type: type,
      });
      if (result.data?.success) {
        toast.success(action === 'add' ? 'Contributor added' : 'Contributor removed');
        onUpdated?.();
      } else {
        toast.error(result.data?.error || 'Action failed');
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Current contributors */}
      <div>
        <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
          Current Contributors ({currentContributors.length})
        </h4>
        {currentContributors.length === 0 ? (
          <p className="text-gray-600 text-xs">No contributors yet.</p>
        ) : (
          <div className="space-y-2">
            {currentContributors.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-[#0f0f0f] border border-gray-800 rounded-lg px-3 py-2">
                <div>
                  <p className="text-white text-xs font-medium">{p.display_name || p.user_id}</p>
                  <div className="flex gap-1 mt-0.5">
                    <Badge className="bg-gray-800 text-gray-400 text-[10px] px-1.5">{p.primary_role || '—'}</Badge>
                    {p.primary_outlet_id === outlet.id && (
                      <Badge className="bg-blue-900/60 text-blue-300 text-[10px] px-1.5">Primary</Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAction(p.id, 'remove')}
                  disabled={actionLoading === `${p.id}-remove`}
                  className="text-red-500 hover:text-red-400 hover:bg-red-900/20 h-7 px-2"
                >
                  {actionLoading === `${p.id}-remove` ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3 h-3" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add contributor */}
      <div>
        <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Add Contributor</h4>
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search profiles..."
              className="bg-[#1a1a1a] border-gray-700 text-white text-xs pl-7"
            />
          </div>
          <Select value={affiliationType} onValueChange={setAffiliationType}>
            <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-white text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {availableProfiles.slice(0, 20).map(p => (
            <div key={p.id} className="flex items-center justify-between bg-[#0f0f0f] border border-gray-800 rounded-lg px-3 py-2">
              <div>
                <p className="text-white text-xs font-medium">{p.display_name || p.user_id}</p>
                <p className="text-gray-500 text-[10px]">{p.primary_role || 'contributor'}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAction(p.id, 'add', affiliationType)}
                disabled={actionLoading === `${p.id}-add`}
                className="text-green-500 hover:text-green-400 hover:bg-green-900/20 h-7 px-2"
              >
                {actionLoading === `${p.id}-add` ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
              </Button>
            </div>
          ))}
          {availableProfiles.length === 0 && (
            <p className="text-gray-600 text-xs text-center py-3">No profiles found</p>
          )}
        </div>
      </div>
    </div>
  );
}