import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import MediaProfileEditor from '@/components/media/profile/MediaProfileEditor';
import MediaProfileStatus from '@/components/media/profile/MediaProfileStatus';

export default function ContributorProfileTab({ currentUser, isAdmin }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['myMediaProfile', currentUser?.id],
    queryFn: async () => {
      const results = await base44.entities.MediaProfile.filter({ user_id: currentUser.id }, '-created_date', 1);
      return results[0] || null;
    },
    enabled: !!currentUser?.id,
  });

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await base44.functions.invoke('createMediaProfile', { user_id: currentUser.id });
      if (result.data?.success) {
        toast.success('MediaProfile created');
        refetch();
      } else {
        toast.error(result.data?.error || 'Failed to create profile');
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSaved = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['myMediaProfile', currentUser?.id] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-[#171717] border border-gray-800 rounded-xl p-8 text-center">
        <div className="w-12 h-12 bg-[#1a1a1a] border border-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </div>
        <p className="text-white font-semibold mb-1">No MediaProfile Found</p>
        <p className="text-gray-500 text-sm mb-5">Your contributor profile hasn't been created yet. This usually happens automatically when your application is approved.</p>
        <Button onClick={handleCreate} disabled={creating} className="bg-white text-black hover:bg-gray-100">
          {creating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</> : 'Create My Profile'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <MediaProfileStatus profile={profile} />
      <div className="bg-[#171717] border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Edit Profile</h2>
        <MediaProfileEditor
          profile={profile}
          user={currentUser}
          isAdmin={isAdmin}
          onSaved={handleSaved}
        />
      </div>
    </div>
  );
}