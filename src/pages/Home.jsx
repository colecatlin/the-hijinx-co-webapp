import React from 'react';
import PageShell from '../components/shared/PageShell';
import HeroSection from '../components/home/HeroSection';
import VerticalGrid from '../components/home/VerticalGrid';
import LatestFeed from '../components/home/LatestFeed';
import NewsletterSignup from '../components/shared/NewsletterSignup';

export default function Home() {
  return (
    <PageShell>
      <HeroSection />
      <VerticalGrid />
      <LatestFeed />

      {/* Newsletter CTA */}
      <section className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Stay in the loop.</h2>
            <p className="text-gray-400 text-sm mt-2">Updates on stories, standings, drops, and more.</p>
          </div>
          <NewsletterSignup source="home_cta" dark />
        </div>
      </section>
    </PageShell>
  );
}