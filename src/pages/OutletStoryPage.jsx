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
import DOMPurify from 'dompurify';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import AdvertisementCard from '@/components/advertisements/AdvertisementCard';

export default function OutletStoryPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const storyId = urlParams.get('id');

  const { data: story, isLoading } = useQuery({
    queryKey: ['story', storyId],
    queryFn: () => base44.entities.OutletStory.filter({ id: storyId }).then(results => results[0] || null),
    enabled: !!storyId,
  });

  const { data: ads = [] } = useQuery({
    queryKey: ['advertisements', 'outlet_story_sidebar', story?.id],
    queryFn: () => base44.entities.Advertisement.filter({ 
      placement: ['outlet_story_sidebar'],
      status: 'published'
    }).then(results => {
      const now = new Date();
      return results.filter(ad => {
        // Check date targeting
        const started = !ad.start_date || new Date(ad.start_date) <= now;
        const notEnded = !ad.end_date || new Date(ad.end_date) > now;
        if (!started || !notEnded) return false;

        // Check category targeting
        if (ad.target_categories?.length > 0 && !ad.target_categories.includes(story?.category)) {
          return false;
        }

        // Check tag targeting
        if (ad.target_tags?.length > 0) {
          const storyTags = story?.tags || [];
          const matchingTags = ad.target_tags.filter(tag => storyTags.includes(tag));
          if (ad.targeting_mode === 'all' && matchingTags.length !== ad.target_tags.length) {
            return false;
          }
          if (ad.targeting_mode === 'any' && matchingTags.length === 0) {
            return false;
          }
        }

        return true;
      });
    }),
    enabled: !!story,
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
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 py-12 md:py-20 px-6 lg:px-0">
        {/* Main story content - extends to edges */}
        <article className="flex-1 lg:max-w-3xl">
          <Link
            to={createPageUrl('OutletHome')}
            className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#0A0A0A] mb-8 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to The Outlet
          </Link>

          {story.cover_image && (
            <div className="mb-8 -mx-6 lg:mx-0">
              <img src={story.cover_image} alt={story.title} className="w-screen lg:w-full" />
              {(story.location_city || story.location_state || story.location_country) && (
                <div className="mt-3 px-6 lg:px-0">
                  <span className="flex items-center gap-1 text-xs font-bold text-black">
                    <MapPin className="w-3 h-3" />
                    {[story.location_city, story.location_state, story.location_country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 space-y-10">
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
            {/* Stacked: Date, Published by, and Photo by */}
            <div className="flex flex-col gap-2 mb-4">
              {story.published_date && (
                <span className="text-xs text-gray-400">{format(new Date(story.published_date), 'MMMM d, yyyy · h:mm a')}</span>
              )}
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

          {/* Body */}
          <div className="editorial-body mt-10" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(story.body || '') }} />

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
          </div>

          {/* Sidebar - Advertisements (always reserve space) */}
          <aside className="w-full lg:w-80 lg:sticky lg:top-24 lg:h-fit">
            {ads.length > 0 && (
              <div className="space-y-4">
                {ads.map((ad) => (
                  <AdvertisementCard key={ad.id} ad={ad} />
                ))}
              </div>
            )}
          </aside>
      </article>
      </div>
    </PageShell>
  );
}