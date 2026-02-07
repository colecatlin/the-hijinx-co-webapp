import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../components/utils';
import { format } from 'date-fns';
import PageShell from '../components/shared/PageShell';
import SectionHeader from '../components/shared/SectionHeader';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen } from 'lucide-react';

export default function OutletIssues() {
  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['outletIssues'],
    queryFn: () => base44.entities.OutletIssue.filter({ status: 'published' }, '-volume', 50),
  });

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        <SectionHeader
          label="The Outlet"
          title="Issue Archive"
          subtitle="Browse past issues by volume and number."
        />

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-72 w-full" />
            ))}
          </div>
        ) : issues.length === 0 ? (
          <EmptyState icon={BookOpen} title="No issues yet" message="The archive will grow as issues are published." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {issues.map((issue) => (
              <Link
                key={issue.id}
                to={createPageUrl('OutletIssuePage') + `?id=${issue.id}`}
                className="group"
              >
                <div className="aspect-[3/4] bg-[#0A0A0A] flex flex-col justify-end p-5 relative overflow-hidden">
                  {issue.cover_image && (
                    <img
                      src={issue.cover_image}
                      alt={issue.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                    />
                  )}
                  <div className="relative z-10">
                    <span className="font-mono text-[10px] text-gray-400 tracking-wider">
                      VOL. {issue.volume} · NO. {issue.issue_number}
                    </span>
                    <h3 className="text-white font-bold text-sm mt-1">{issue.title}</h3>
                    {issue.published_date && (
                      <p className="text-[10px] text-gray-400 mt-2 font-mono">
                        {format(new Date(issue.published_date), 'MMM yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}