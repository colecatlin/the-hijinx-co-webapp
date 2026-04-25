import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

function SectionHeader({ label, viewAllHref }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-white font-black text-sm uppercase tracking-widest">{label}</h2>
      {viewAllHref && (
        <a href={viewAllHref} className="flex items-center gap-1 text-[11px] font-bold text-white/50 hover:text-[#1DA1A1] transition-colors uppercase tracking-wider">
          View all <ChevronRight className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

export default function BehindTheScenesCarousel() {
  // Fetch driver media galleries
  const { data: driverMedia = [] } = useQuery({
    queryKey: ['behind-scenes-driver-media'],
    queryFn: async () => {
      const drivers = await base44.entities.DriverMedia.list('-created_date', 30);
      return drivers.filter(dm => dm.gallery_urls && dm.gallery_urls.length > 0);
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch event media galleries
  const { data: events = [] } = useQuery({
    queryKey: ['behind-scenes-events'],
    queryFn: async () => {
      const eventList = await base44.entities.Event.list('-created_date', 30);
      return eventList.filter(e => e.event_media_gallery && e.event_media_gallery.length > 0);
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch outlet stories with images
  const { data: stories = [] } = useQuery({
    queryKey: ['behind-scenes-stories'],
    queryFn: async () => {
      const storyList = await base44.entities.OutletStory.list('-created_date', 20);
      return storyList.filter(s => s.images && s.images.length > 0);
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch public media assets from motorsports community
  const { data: mediaAssets = [] } = useQuery({
    queryKey: ['behind-scenes-media-assets'],
    queryFn: async () => {
      const assets = await base44.entities.MediaAsset.list('-created_date', 40);
      return assets.filter(a => a.asset_url);
    },
    staleTime: 10 * 60 * 1000,
  });

  // Combine and flatten all images
  const allImages = [
    ...driverMedia.flatMap(dm => dm.gallery_urls || []),
    ...events.flatMap(e => e.event_media_gallery || []),
    ...stories.flatMap(s => s.images || []),
    ...mediaAssets.map(ma => ma.asset_url).filter(Boolean),
  ];

  // Remove duplicates and limit to a reasonable number
  const uniqueImages = Array.from(new Set(allImages)).slice(0, 20);
  const isLoading = false;

  return (
    <div className="py-6 px-8 md:px-12 lg:px-20" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <SectionHeader label="From The Pits" viewAllHref="/gallery" />
      
      {isLoading ? (
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 rounded-xl animate-pulse bg-white/5" style={{ aspectRatio: '4/3' }} />
          ))}
        </div>
      ) : uniqueImages.length === 0 ? (
        <div className="text-center py-8 text-white/40 text-sm">
          No behind-the-scenes content yet
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {uniqueImages.map((imgUrl, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -2 }}
              className="flex-shrink-0 rounded-xl overflow-hidden cursor-pointer"
              style={{ width: '280px', aspectRatio: '4/3', border: '1px solid rgba(255,255,255,0.16)' }}
            >
              <img
                src={imgUrl}
                alt={`Behind the scenes ${idx + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}