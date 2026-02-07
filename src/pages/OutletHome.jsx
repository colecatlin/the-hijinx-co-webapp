import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../components/utils';
import { format } from 'date-fns';
import PageShell from '../components/shared/PageShell';
import SectionHeader from '../components/shared/SectionHeader';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper } from 'lucide-react';

const categories = ['All', 'Racing', 'Culture', 'Business', 'Gear', 'Travel', 'Opinion', 'Photo'];

export default function OutletHome() {
  const [activeCategory, setActiveCategory] = useState('All');

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['outletStories'],
    queryFn: () => base44.entities.OutletStory.filter({ status: 'published' }, '-published_date', 50),
  });

  const filtered = activeCategory === 'All' ? stories : stories.filter(s => s.category === activeCategory);

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        <SectionHeader
          label="The Outlet"
          title="Stories"
          subtitle="Journalism, culture, and coverage from across the Hijinx network."
        />

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-10 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-xs font-medium tracking-wide whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-[#0A0A0A] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-56 w-full" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="No stories yet"
            message={activeCategory !== 'All' ? `No ${activeCategory} stories published yet.` : 'Check back soon for new stories.'}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {filtered.map((story) => (
              <Link
                key={story.id}
                to={createPageUrl('OutletStoryPage') + `?id=${story.id}`}
                className="group"
              >
                <div className="aspect-[3/2] bg-gray-100 mb-4 overflow-hidden">
                  {story.cover_image ? (
                    <img
                      src={story.cover_image}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-mono text-xs text-gray-300">{story.category}</span>
                    </div>
                  )}
                </div>
                <span className="font-mono text-[10px] tracking-[0.2em] text-gray-400 uppercase">
                  {story.category}
                </span>
                <h3 className="font-bold text-lg mt-1 tracking-tight leading-tight group-hover:underline decoration-1 underline-offset-4">
                  {story.title}
                </h3>
                {story.subtitle && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{story.subtitle}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  {story.author && <span className="text-xs font-medium text-gray-600">{story.author}</span>}
                  {story.published_date && (
                    <span className="text-xs text-gray-400">
                      · {format(new Date(story.published_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}