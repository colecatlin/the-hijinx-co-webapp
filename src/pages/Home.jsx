import React from 'react';
import PageShell from '@/components/shared/PageShell';
import HeroSection from '@/components/home/HeroSection';
import VerticalGrid from '@/components/home/VerticalGrid';
import LatestFeed from '@/components/home/LatestFeed';
import MotorsportsStrip from '@/components/home/MotorsportsStrip';
import FeaturedDrivers from '@/components/home/FeaturedDrivers';
import ApparelSection from '@/components/home/ApparelSection';
import NewsletterSignup from '@/components/shared/NewsletterSignup';
import BrandStatement from '@/components/home/BrandStatement';

export default function Home() {
  return (
    <PageShell>
      <HeroSection />
      <BrandStatement />
      <MotorsportsStrip />
      <FeaturedDrivers />
      <LatestFeed />
      <ApparelSection />
      <VerticalGrid />

      {/* Newsletter CTA */}
      <section className="bg-[#232323] text-[#FFF8F5]">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-[#FFF8F5]">Stay in the loop.</h2>
            <p className="text-[#FFF8F5] opacity-80 text-sm mt-2">Updates on stories, standings, drops, and more.</p>
          </div>
          <NewsletterSignup source="home_cta" dark />
        </div>
      </section>
    </PageShell>
  );
}