import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/shared/ThemeToggle';

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

  // Always show the beta bar (with dynamic message if available, else default)
  const betaMessage = announcements.length > 0
    ? announcements[currentIndex]?.message
    : 'FRIENDS & FAMILY PREVIEW — BUILDING TOGETHER';

  return (
    <div
      className="py-[1px] px-4"
      style={{
        background: 'hsl(var(--surface) / 0.85)',
        borderBottom: '1px solid hsl(var(--divider) / 0.6)',
      }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-10 items-center">
        {/* Left 10% — empty */}
        <div className="col-span-1" />
        {/* Middle 80% — announcement */}
        <div className="col-span-8 flex items-center justify-center gap-3">
          <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'hsl(var(--motion))', boxShadow: '0 0 6px hsl(var(--motion) / 0.8)' }} />
          <span
            className="font-mono text-[9px] tracking-[0.45em] uppercase"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            {betaMessage}
          </span>
          <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'hsl(var(--motion))', boxShadow: '0 0 6px hsl(var(--motion) / 0.8)' }} />
        </div>
        {/* Right 10% — theme toggle */}
        <div className="col-span-1 flex justify-end">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}