import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import RaceCorePageShell from '@/components/racecore/RaceCorePageShell';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RequestsReviewPanel from '@/components/media/requests/RequestsReviewPanel';

const PAGE = 'management/media/requests';

export default function ManageRequests() {
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) return null;
  if (!user) { base44.auth.redirectToLogin('/' + PAGE); return null; }

  if (user.role !== 'admin') {
    return (
      <RaceCorePageShell title="Media Requests" description="Hiring and collaboration requests for creators">
        <div className="py-24 flex flex-col items-center gap-4 text-center">
          <ShieldOff className="w-10 h-10 text-gray-600" />
          <p className="text-gray-500 text-sm">Restricted to editorial staff.</p>
          <Button size="sm" onClick={() => navigate('/racecore')}>Back to RaceCore</Button>
        </div>
      </RaceCorePageShell>
    );
  }

  return (
    <RaceCorePageShell title="Media Requests" description="Create and manage hiring and collaboration requests for creators">
      <RequestsReviewPanel currentUser={user} />
    </RaceCorePageShell>
  );
}