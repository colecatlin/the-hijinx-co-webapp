import React from 'react';

export default function WriterStatsBar({ myRecs, myPackets, myDrafts }) {
  const inProgress = myRecs.filter(r => r.status === 'in_progress').length +
    myDrafts.filter(d => d.status === 'in_progress').length;

  const readyForReview = myRecs.filter(r => r.status === 'ready_for_review').length +
    myDrafts.filter(d => d.status === 'ready_for_review').length;

  const approved = myRecs.filter(r => r.status === 'approved').length;
  const attachedPackets = myPackets.filter(p => p.status === 'attached_to_draft').length;

  const stats = [
    { label: 'Assigned Recs', value: myRecs.length, color: 'bg-violet-50 border-violet-100 text-violet-700' },
    { label: 'Research Packets', value: myPackets.length, color: 'bg-blue-50 border-blue-100 text-blue-700' },
    { label: 'In Progress', value: inProgress, color: 'bg-orange-50 border-orange-100 text-orange-700' },
    { label: 'Ready for Review', value: readyForReview, color: 'bg-green-50 border-green-100 text-green-700' },
    { label: 'Approved', value: approved, color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
    { label: 'Drafts', value: myDrafts.length, color: 'bg-teal-50 border-teal-100 text-teal-700' },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-1">
      {stats.map(s => (
        <div key={s.label} className={`rounded-xl border ${s.color} px-3 py-2.5 text-center`}>
          <p className="text-xl font-bold">{s.value}</p>
          <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{s.label}</p>
        </div>
      ))}
    </div>
  );
}