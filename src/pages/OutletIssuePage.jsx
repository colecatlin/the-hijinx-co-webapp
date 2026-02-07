import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import PageShell from '../components/shared/PageShell';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FileText } from 'lucide-react';

export default function OutletIssuePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const issueId = urlParams.get('id');

  const { data: issue, isLoading: loadingIssue } = useQuery({
    queryKey: ['issue', issueId],
    queryFn: async () => {
      const issues = await base44.entities.OutletIssue.list();
      return issues.find(i => i.id === issueId);
    },
    enabled: !!issueId,
  });

  const { data: stories = [], isLoading: loadingStories } = useQuery({
    queryKey: ['issueStories', issueId],
    queryFn: async () => {
      if (!issueId) return [];
      const all = await base44.entities.OutletStory.filter({ issue_id: issueId, status: 'published' }, '-published_date', 50);
      return all;
    },
    enabled: !!issueId,
  });

  if (loadingIssue) {
    return (
      <PageShell>
        <div className="max-w-5xl mx-auto px-6 py-20">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-5 w-1/2 mb-10" />
          <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        </div>
      </PageShell>
    );
  }

  if (!issue) {
    return (
      <PageShell>
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-gray-400">Issue not found.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <Link to={createPageUrl('OutletIssues')} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#0A0A0A] mb-8 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Issue Archive
        </Link>

        <span className="font-mono text-xs tracking-[0.2em] text-gray-400 uppercase">
          Volume {issue.volume} · Issue {issue.issue_number}
        </span>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-2">{issue.title}</h1>
        {issue.description && <p className="text-gray-500 mt-3">{issue.description}</p>}
        {issue.published_date && (
          <p className="font-mono text-xs text-gray-400 mt-2">{format(new Date(issue.published_date), 'MMMM yyyy')}</p>
        )}

        <div className="mt-12 border-t border-gray-200 pt-8">
          <h2 className="font-mono text-xs tracking-[0.2em] text-gray-400 uppercase mb-6">Stories in this issue</h2>
          {loadingStories ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : stories.length === 0 ? (
            <EmptyState icon={FileText} title="No stories linked" message="Stories will appear here once assigned to this issue." />
          ) : (
            <div className="space-y-4">
              {stories.map((s) => (
                <Link
                  key={s.id}
                  to={createPageUrl('OutletStoryPage') + `?id=${s.id}`}
                  className="flex items-start gap-4 p-4 border border-gray-100 hover:border-gray-300 transition-colors group"
                >
                  <div className="flex-1">
                    <span className="font-mono text-[10px] tracking-wider text-gray-400 uppercase">{s.category}</span>
                    <h3 className="font-bold text-sm mt-1 group-hover:underline">{s.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{s.author}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}