import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield } from 'lucide-react';
import EntityAccessManager from './EntityAccessManager';

export default function ManageTab({ user }) {
  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ['entityCollaborators', user?.email],
    queryFn: () => base44.entities.EntityCollaborator.filter({ user_email: user.email }),
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const ownerCollabs = collaborators.filter(c => c.role === 'owner');

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
    <div className="space-y-3">
      {ownerCollabs.map(collab => (
        <EntityAccessManager key={collab.id} collaborator={collab} user={user} />
      ))}
    </div>
  );
}