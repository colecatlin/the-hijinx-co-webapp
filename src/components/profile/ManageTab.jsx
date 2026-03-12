import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import EntityAccessManager from './EntityAccessManager';

export default function ManageTab({ user }) {
  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ['entityCollaborators', user?.email],
    queryFn: () => base44.entities.EntityCollaborator.filter({ user_email: user.email }),
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  useEffect(() => {
    try { base44.analytics.track({ eventName: 'access_management_viewed' }); } catch {}
  }, []);

  const ownerCollabs = collaborators.filter(c => c.role === 'owner');
  const editorCollabs = collaborators.filter(c => c.role !== 'owner');

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    );
  }

  if (ownerCollabs.length === 0) {
    return (
      <div className="flex items-start gap-3 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-4">
        <Shield className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <span>
          You don't own any entities yet. Once you have owner access to a Driver, Team, Track, or Series, you'll be able to manage collaborators and access codes here.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {ownerCollabs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Entities You Own</span>
          </div>
          {ownerCollabs.map(collab => (
            <EntityAccessManager key={collab.id} collaborator={collab} user={user} />
          ))}
        </div>
      )}

      {editorCollabs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Edit2 className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Entities You Edit</span>
          </div>
          {editorCollabs.map(collab => (
            <div key={collab.id} className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl bg-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-900">{collab.entity_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{collab.entity_type}</Badge>
                  <Badge className="text-xs bg-blue-100 text-blue-700 border border-blue-200">Editor</Badge>
                </div>
              </div>
              <span className="text-xs text-gray-400">Read-only access</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}