import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp } from 'lucide-react';

export default function HashtagAnalytics() {
  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['hashtagAnalytics'],
    queryFn: () => base44.entities.HashtagAnalytic.list('-usage_count', 50),
  });

  const maxCount = analytics[0]?.usage_count || 1;

  return (
    <PageShell className="bg-[#0A0A0A] min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">

        {/* Header */}
        <div className="mb-12">
          <Link
            to="/hashtag-library"
            className="inline-flex items-center gap-2 text-white/40 hover:text-white text-xs font-mono mb-6 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Library
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-[2px] bg-[#FF6B35]" />
            <span className="font-mono text-[10px] tracking-[0.45em] text-[#FF6B35] uppercase font-bold">
              Internal Analytics
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
            Hashtag Analytics
          </h1>
          <p className="text-white/40 text-sm max-w-lg">
            Popularity rankings based on how often each hashtag is copied within the HIJINX platform.
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : analytics.length === 0 ? (
          <div className="text-center py-20">
            <TrendingUp className="w-10 h-10 text-white/20 mx-auto mb-4" />
            <p className="text-white/30 font-mono text-sm">No data yet. Start copying hashtags to build analytics.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {analytics.map((item, i) => (
              <div
                key={item.id}
                className="relative flex items-center gap-4 px-5 py-4 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {/* Rank */}
                <span className="font-mono text-xs text-white/20 w-6 flex-shrink-0 text-right">{i + 1}</span>

                {/* Bar background fill */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    background: `linear-gradient(90deg, #FF6B35 0%, transparent 100%)`,
                    width: `${(item.usage_count / maxCount) * 100}%`,
                  }}
                />

                {/* Hashtag */}
                <span className="relative font-mono text-sm text-white flex-1">{item.hashtag}</span>

                {/* Count */}
                <div className="relative flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-[#FF6B35]" />
                  <span className="font-mono text-sm text-white font-bold">{item.usage_count.toLocaleString()}</span>
                  <span className="font-mono text-[10px] text-white/30">{item.usage_count === 1 ? 'copy' : 'copies'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}