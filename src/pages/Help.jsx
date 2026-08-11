import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import SeoMeta from '@/components/system/seoMeta';
import { Search, ShieldCheck, Camera, Trophy, ChevronRight } from 'lucide-react';

const FAQS = [
  {
    q: 'What is Hijinx?',
    a: 'Hijinx is a motorsports platform that connects drivers, teams, tracks, series, media creators, and fans in one place. We operate across media, motorsports, and culture — building tools for the people who make racing happen.',
  },
  {
    q: 'What is INDEX46?',
    a: 'INDEX46 is our public directory — the searchable home for every racer, team, track, and series on the platform. Think of it as the index of who\'s who in motorsports. You can browse profiles, check results, and follow the entities you care about.',
  },
  {
    q: 'What is RaceCore?',
    a: 'RaceCore is our operational management system for race events. It\'s the toolset that tracks, series, and event organizers use to manage entries, sessions, results, standings, and race-day operations. Most users interact with RaceCore results and standings through public profile pages.',
  },
  {
    q: 'What is The Outlet?',
    a: 'The Outlet is Hijinx\'s editorial and media surface — where stories, features, and media coverage from the motorsports world are published. It\'s home to our journalism, creator content, and editorial features.',
  },
  {
    q: 'How do claims work?',
    a: 'If you\'re a driver, team owner, track operator, or series organizer, you can claim your profile on INDEX46. The process is simple: find your profile in the directory, submit a claim with evidence of your relationship, and our team reviews it manually. Once approved, you get full editing access to your profile.',
    link: { label: 'Start a claim', page: 'JoinIndex46' },
  },
  {
    q: 'How do I upload media?',
    a: 'Media creators can apply for a media profile through the Media Portal. Once approved, you can upload photos, videos, and editorial content. Your media appears on your creator profile and can be linked to events, tracks, and entities across the platform.',
    link: { label: 'Visit Media Home', page: 'MediaHome' },
  },
  {
    q: 'How do I become verified?',
    a: 'Verification badges are awarded when your entity claim is approved by our team. The badge confirms that you are the legitimate owner or representative of the profile. Submit a claim through the Join page to get started.',
    link: { label: 'Learn about claims', page: 'JoinIndex46' },
  },
  {
    q: 'How do sponsorships work?',
    a: 'Sponsorships are managed through the platform\'s commercial layer. Organizations can sponsor racers, teams, events, series, or the platform itself. Sponsor relationships are tracked publicly on entity profiles, showing the sponsors and partners that support each racer, team, or event.',
  },
  {
    q: 'Is Hijinx free to use?',
    a: 'Browsing the directory, viewing profiles, and reading The Outlet are free. Creating an account and claiming a profile are also free. Some features — like commerce, premium tools, and advanced RaceCore operations — may have associated costs as they become available.',
  },
  {
    q: 'What if I find a bug or issue?',
    a: 'Use the "Report an Issue" link in the footer of any page. You can describe what happened, attach a screenshot, and we\'ll review it. You can also reach us through the Contact page.',
    link: { label: 'Contact us', page: 'Contact' },
  },
];

export default function Help() {
  return (
    <PageShell>
      <SeoMeta title="Help" description="Hijinx Help — answers to common questions about the platform, claims, media, and more." />
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <span className="font-mono text-xs tracking-[0.3em] uppercase" style={{ color: 'hsl(var(--foreground-quiet))' }}>Support</span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 mb-3" style={{ color: 'hsl(var(--foreground))' }}>Help</h1>
        <p className="text-sm mb-12 max-w-lg" style={{ color: 'hsl(var(--foreground-secondary))' }}>
          Common questions about Hijinx, how the platform works, and how to get involved.
        </p>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
          <Link to={createPageUrl('JoinIndex46')} className="flex items-center gap-3 p-4 rounded-xl transition-all" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
            <ShieldCheck className="w-5 h-5" style={{ color: 'hsl(var(--motion))' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Claim a Profile</p>
              <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>For racers, teams, tracks</p>
            </div>
          </Link>
          <Link to={createPageUrl('Directory')} className="flex items-center gap-3 p-4 rounded-xl transition-all" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
            <Search className="w-5 h-5" style={{ color: 'hsl(var(--motion))' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Browse Directory</p>
              <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>Find racers & teams</p>
            </div>
          </Link>
          <Link to={createPageUrl('Contact')} className="flex items-center gap-3 p-4 rounded-xl transition-all" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
            <Camera className="w-5 h-5" style={{ color: 'hsl(var(--motion))' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Contact Us</p>
              <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>Get in touch</p>
            </div>
          </Link>
        </div>

        {/* FAQ */}
        <div className="space-y-6">
          {FAQS.map((faq, i) => (
            <div key={i} className="pb-6" style={{ borderBottom: '1px solid hsl(var(--divider))' }}>
              <h2 className="text-base font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>{faq.q}</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>{faq.a}</p>
              {faq.link && (
                <Link to={createPageUrl(faq.link.page)} className="inline-flex items-center gap-1 mt-3 text-sm font-semibold transition-colors hover:opacity-80" style={{ color: 'hsl(var(--motion))' }}>
                  {faq.link.label}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Still need help */}
        <div className="mt-12 p-6 rounded-xl text-center" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
          <Trophy className="w-6 h-6 mx-auto mb-3" style={{ color: 'hsl(var(--motion))' }} />
          <h3 className="text-sm font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>Still need help?</h3>
          <p className="text-sm mb-4" style={{ color: 'hsl(var(--foreground-secondary))' }}>We're here to help. Reach out and we'll get back to you within 2-3 business days.</p>
          <Link to={createPageUrl('Contact')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all" style={{ background: 'hsl(var(--motion))', color: 'hsl(var(--canvas))' }}>
            Contact Support
          </Link>
        </div>
      </div>
    </PageShell>
  );
}