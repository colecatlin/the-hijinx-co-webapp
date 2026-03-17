// MyAssignmentsTab — contributor view inside MediaPortal (dark theme)

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Briefcase, AlertTriangle } from 'lucide-react';
import AssignmentCard from '@/components/media/assignments/AssignmentCard';
import { ASSIGNMENT_STATUS_COLORS_DARK, ASSIGNMENT_STATUSES, isOverdue } from '@/components/media/assignments/assignmentHelpers';

const STATUS_ORDER = ['assigned', 'accepted', 'in_progress', 'needs_revision', 'submitted', 'approved', 'completed', 'declined', 'cancelled', 'draft'];

export default function MyAssignmentsTab({ currentUser, isContributor }) {
  const [filterStatus, setFilterStatus] = useState('active');

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['myAssignments', currentUser?.id],
    queryFn: () => base44.entities.MediaAssignment.filter(
      { assigned_to_user_id: currentUser.id },
      '-created_date',
      100
    ),
    enabled: !!currentUser?.id,
  });

  const activeStatuses = ['assigned', 'accepted', 'in_progress', 'submitted', 'needs_revision'];
  const completedStatuses = ['approved', 'completed'];
  const closedStatuses = ['declined', 'cancelled'];

  const filtered = filterStatus === 'active'
    ? assignments.filter(a => activeStatuses.includes(a.status))
    : filterStatus === 'completed'
    ? assignments.filter(a => completedStatuses.includes(a.status))
    : assignments.filter(a => closedStatuses.includes(a.status));

  const sorted = [...filtered].sort((a, b) => {
    const ao = STATUS_ORDER.indexOf(a.status);
    const bo = STATUS_ORDER.indexOf(b.status);
    if (ao !== bo) return ao - bo;
    if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
    return 0;
  });

  const overdueCount = assignments.filter(a => isOverdue(a)).length;
  const activeCount = assignments.filter(a => activeStatuses.includes(a.status)).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-white font-bold text-lg">My Assignments</h2>
          <p className="text-gray-500 text-sm">
            {activeCount} active{overdueCount > 0 ? ` · ` : ''}
            {overdueCount > 0 && (
              <span className="text-red-400 font-medium">{overdueCount} overdue</span>
            )}
          </p>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="bg-red-900/10 border border-red-800/50 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-red-300 text-xs">
            You have {overdueCount} overdue assignment{overdueCount > 1 ? 's' : ''}. Please submit or contact your editor.
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-800 pb-1">
        {[
          { key: 'active', label: 'Active', count: activeCount },
          { key: 'completed', label: 'Completed', count: assignments.filter(a => completedStatuses.includes(a.status)).length },
          { key: 'closed', label: 'Closed', count: assignments.filter(a => closedStatuses.includes(a.status)).length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilterStatus(t.key)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors rounded-t border-b-2 -mb-px ${
              filterStatus === t.key
                ? 'text-white border-white'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                filterStatus === t.key ? 'bg-white text-black' : 'bg-gray-800 text-gray-400'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {!isContributor ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center">
            <Briefcase className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Assignments are available to approved contributors.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center">
            <Briefcase className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No {filterStatus} assignments.</p>
            <p className="text-gray-600 text-xs mt-1">Assignments are created by the editorial team.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map(a => (
            <AssignmentCard key={a.id} assignment={a} currentUser={currentUser} />
          ))}
        </div>
      )}
    </div>
  );
}