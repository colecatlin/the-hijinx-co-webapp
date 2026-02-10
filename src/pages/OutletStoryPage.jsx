import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MapPin, Calendar, Tag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SocialShareButtons from '@/components/shared/SocialShareButtons';

export default function OutletStoryPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const storyId = urlParams.get('id');

  const { data: story, isLoading } = useQuery({
    queryKey: ['story', storyId],
    queryFn: () => base44.entities.OutletStory.list().then(s => s.find(x => x.id === storyId)),
    enabled: !!storyId,
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-3xl mx-auto px-6 py-20">
          <Skeleton className="h-6 w-20 mb-6" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-8" />
          <Skeleton className="h-80 w-full mb-8" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </PageShell>
    );
  }

  if (!story) {
    return (
      <PageShell>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <p className="text-gray-400">Story not found.</p>
          <Link to={createPageUrl('OutletHome')} className="text-sm underline mt-4 inline-block">
            Back to The Outlet
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <article className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <Link
          to={createPageUrl('OutletHome')}
          className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#0A0A0A] mb-8 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back to The Outlet
        </Link>

        <span className="font-mono text-[10px] tracking-[0.2em] text-gray-400 uppercase block">
          {story.category}
        </span>

        <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-2 leading-[1.05]">
          {story.title}
        </h1>

        {story.subtitle && (
          <p className="text-lg text-gray-500 mt-4">{story.subtitle}</p>
        )}

        {/* Meta line */}
        <div className="mt-6 pb-8 border-b border-gray-200">
          {/* Stacked: Published by and Photo by */}
          <div className="flex flex-col gap-2 mb-4">
            {story.author && (
              <span className="text-xs text-gray-400">Published by {story.author}</span>
            )}
            {story.photo_credit && (
              <span className="text-xs text-gray-400">Photo by {story.photo_credit}</span>
            )}
          </div>
          {/* Social buttons below */}
          <SocialShareButtons 
            url={window.location.href}
            title={story.title}
            description={story.subtitle || story.body?.substring(0, 150)}
            type="inline"
          />
        </div>

        {/* Cover image */}
        {story.cover_image && (
          <div className="mt-8">
            <img src={story.cover_image} alt={story.title} className="w-full" />
            {story.location && (
              <div className="mt-3">
                <span className="flex items-center gap-1 text-xs font-bold text-black">
                  <MapPin className="w-3 h-3" />
                  {story.location}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="editorial-body mt-10" dangerouslySetInnerHTML={{ __html: story.body || '' }} />

        {/* Tags */}
        {story.tags?.length > 0 && (
          <div className="flex items-center gap-2 mt-12 pt-8 border-t border-gray-200">
            <Tag className="w-3 h-3 text-gray-400" />
            {story.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 text-[10px] font-mono tracking-wider bg-gray-100 text-gray-500 uppercase">
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </PageShell>
  );
}