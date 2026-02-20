import React from 'react';
import { motion } from 'framer-motion';
import PageShell from '@/components/shared/PageShell';
import NewsletterSignup from '@/components/shared/NewsletterSignup';
import { GraduationCap, BookOpen, Wrench, TrendingUp, Users, Video } from 'lucide-react';

const tracks = [
  {
    icon: BookOpen,
    title: 'Foundations',
    desc: 'Core principles of business, branding, and creative work. Learn the frameworks that drive lasting success.',
    tag: 'Business',
  },
  {
    icon: Wrench,
    title: 'Technical Skills',
    desc: 'Hands-on workshops in design, writing, production, and digital tools.',
    tag: 'Skills',
  },
  {
    icon: TrendingUp,
    title: 'Growth & Marketing',
    desc: 'Audience building, marketing strategy, and revenue generation for creators and entrepreneurs.',
    tag: 'Marketing',
  },
  {
    icon: Users,
    title: 'Community & Culture',
    desc: 'How to build loyal audiences and authentic communities around your brand.',
    tag: 'Community',
  },
  {
    icon: Video,
    title: 'Content Creation',
    desc: 'Video, photography, writing, and social content built for the modern creator.',
    tag: 'Content',
  },
  {
    icon: GraduationCap,
    title: 'Motorsports Business',
    desc: 'Sponsorship, media relations, team operations, and racing as a business.',
    tag: 'Motorsports',
  },
];

export default function Learning() {
  return (
    <PageShell>
      {/* Hero */}
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <span className="font-mono text-xs tracking-[0.3em] text-gray-500 uppercase">Hijinx U</span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mt-3 max-w-3xl">Learn. Build. Grow.</h1>
          <p className="text-gray-400 mt-4 max-w-lg">
            Educational resources, courses, and workshops for creators, athletes, and entrepreneurs.
          </p>
        </div>
        <div className="h-1 bg-gradient-to-r from-[#E5FF00] via-white to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Intro */}
        <div className="max-w-2xl mb-16">
          <h2 className="text-2xl font-black tracking-tight mb-4">What we're building</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Hijinx U is an educational platform for people who want to build something real. We're creating courses, workshops, and resources across business, creative production, and motorsports — designed for practitioners, not academics.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Content is focused, practical, and built around real experience. No fluff, no filler.
          </p>
        </div>

        {/* Course Tracks */}
        <p className="font-mono text-xs tracking-[0.2em] text-gray-400 uppercase mb-6">Course Tracks</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
          {tracks.map((track, i) => (
            <motion.div
              key={track.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="border border-gray-200 p-8 hover:border-[#0A0A0A] transition-colors"
            >
              <div className="flex items-center justify-between mb-6">
                <track.icon className="w-5 h-5 text-gray-400" />
                <span className="font-mono text-[10px] tracking-wider text-gray-400 uppercase bg-gray-100 px-2 py-0.5">{track.tag}</span>
              </div>
              <h3 className="font-bold tracking-tight mb-2">{track.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{track.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-[#0A0A0A] p-8 md:p-12 text-white">
          <div className="max-w-xl">
            <GraduationCap className="w-8 h-8 text-[#E5FF00] mb-4" />
            <h2 className="text-2xl font-black tracking-tight mb-2">Launching Soon</h2>
            <p className="text-sm text-gray-400 mt-2 mb-6 leading-relaxed">
              Hijinx U is currently in development. Sign up to be first in line when courses go live.
            </p>
            <NewsletterSignup source="learning" dark />
          </div>
        </div>
      </div>
    </PageShell>
  );
}