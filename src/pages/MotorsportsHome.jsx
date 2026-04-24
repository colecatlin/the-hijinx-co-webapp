import React, { useEffect } from 'react';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';

export default function MotorsportsHome() {
  useEffect(() => { Analytics.pageView('MotorsportsHome'); }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <SeoMeta
        title="Index46 | Motorsports"
        description="The home of competitive motorsports on HIJINX."
      />
      <p className="text-white/20 font-mono text-sm tracking-widest uppercase">Coming Soon</p>
    </div>
  );
}