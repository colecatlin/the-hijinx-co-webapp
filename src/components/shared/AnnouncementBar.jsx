import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AnnouncementBar() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const queryClient = useQueryClient();

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const data = await base44.entities.Announcement.filter({ active: true }, '-priority');
      return data || [];
    },
  });

  // Subscribe to real-time announcement updates
  useEffect(() => {
    const unsubscribe = base44.entities.Announcement.subscribe((event) => {
      // Invalidate and refetch announcements on any change
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    });

    return unsubscribe;
  }, [queryClient]);

  useEffect(() => {
    if (announcements.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [announcements.length]);

  if (!announcements.length) return null;

  const current = announcements[currentIndex];
  
  const bgColors = {
    black: 'bg-[#232323] text-white',
    white: 'bg-white text-black border-b border-gray-200',
    blue: 'bg-blue-600 text-white',
    indigo: 'bg-indigo-600 text-white',
    purple: 'bg-purple-600 text-white',
    pink: 'bg-pink-600 text-white',
    red: 'bg-red-600 text-white',
    orange: 'bg-orange-600 text-white',
    yellow: 'bg-yellow-500 text-black',
    green: 'bg-green-600 text-white',
    teal: 'bg-teal-600 text-white',
    cyan: 'bg-cyan-600 text-white',
    gray: 'bg-gray-600 text-white'
  };

  return (
    <div className={`${bgColors[current.background_color] || bgColors.black} py-2 px-6`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
        <div className="flex items-center gap-3 text-sm">
          <span>{current.message}</span>
          {current.link_url && current.link_text && (
            <a
              href={current.link_url}
              target={current.link_url.startsWith('http') ? '_blank' : undefined}
              rel={current.link_url.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="underline font-medium hover:opacity-80 transition-opacity"
            >
              {current.link_text}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}