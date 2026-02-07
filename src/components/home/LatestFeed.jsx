import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function LatestFeed() {
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['latestStories'],
    queryFn: () => base44.entities.OutletStory.filter({ status: 'published' }, '-published_date', 4),
  });

  return (
    <section className="max-w-7xl mx-auto px-6 py-20 border-t border-[#1A3249]">
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="font-mono text-xs tracking-[0.2em] text-[#1A3249] uppercase">Latest</span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#FFF8F5] mt-2">From The Outlet</h2>
        </div>
        <Link
          to={createPageUrl('OutletHome')}
          className="hidden md:flex items-center gap-1 text-xs font-medium text-[#00FFDA] hover:text-[#D33F49] transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      ) : stories.length === 0 ? (
        <p className="text-sm text-gray-400">No published stories yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stories.map((story) => (
            <Link
              key={story.id}
              to={createPageUrl('OutletStoryPage') + `?id=${story.id}`}
              className="group"
            >
              <div className="aspect-[4/3] bg-[#1A3249] mb-3 overflow-hidden">
                {story.cover_image ? (
                  <img
                    src={story.cover_image}
                    alt={story.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-mono text-xs text-[#FFF8F5]">{story.category}</span>
                  </div>
                )}
              </div>
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#1A3249] uppercase">{story.category}</span>
              <h3 className="font-bold text-sm mt-1 text-[#FFF8F5] group-hover:text-[#00FFDA] transition-colors tracking-tight leading-snug">
                {story.title}
              </h3>
              {story.published_date && (
                <p className="font-mono text-[10px] text-[#1A3249] mt-2">
                  {format(new Date(story.published_date), 'MMM d, yyyy')}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}