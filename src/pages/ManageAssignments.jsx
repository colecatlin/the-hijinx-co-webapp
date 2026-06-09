import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import RaceCorePageShell from '@/components/racecore/RaceCorePageShell';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AssignmentReviewPanel from '@/components/media/assignments/AssignmentReviewPanel';

const PAGE = 'management/media/assignments';
const ALLOWED_ROLES = ['admin'];

export default function ManageAssignments() {
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) return null;
  if (!user) { base44.auth.redirectToLogin('/' + PAGE); return null; }

  if (!ALLOWED_ROLES.includes(user.role)) {
    return (
      <RaceCorePageShell title="Assignments" description="Create and manage contributor assignments">
        <div className="py-24 flex flex-col items-center gap-4 text-center">
          <ShieldOff className="w-10 h-10 text-gray-600" />
          <p className="text-gray-500 text-sm">Restricted to editorial staff.</p>
          <Button size="sm" onClick={() => navigate('/racecore')}>Back to RaceCore</Button>
        </div>
      </RaceCorePageShell>
    );
  }

  return (
    <RaceCorePageShell title="Assignments" description="Create and manage contributor assignments">
      <AssignmentReviewPanel currentUser={user} />
    </RaceCorePageShell>
  );
}