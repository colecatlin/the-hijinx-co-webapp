import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import SeoMeta from '@/components/system/seoMeta';
import PlatformOverview from '@/components/shared/PlatformOverview';
import OwnershipGuide from '@/components/shared/OwnershipGuide';
import {
  Search, ShieldCheck, Camera, Trophy, Compass, Gauge, Newspaper,
  ChevronRight, Mail, Clock, Sparkles, Store, Shirt, HelpCircle,
  UserPlus, FileCheck, RotateCcw, ArrowRight,
} from 'lucide-react';

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started', icon: Sparkles },
  { id: 'claiming-a-profile', label: 'Claiming a Profile', icon: ShieldCheck },
  { id: 'racer-profiles', label: 'Racer Profiles', icon: Trophy },
  { id: 'organizations', label: 'Organizations', icon: Compass },
  { id: 'sponsors', label: 'Sponsors', icon: Trophy },
  { id: 'media', label: 'Media', icon: Camera },
  { id: 'marketplace', label: 'Marketplace', icon: Store },
  { id: 'apparel', label: 'Apparel', icon: Shirt },
  { id: 'racecore', label: 'RaceCore', icon: Gauge },
  { id: 'friends-family', label: 'Friends & Family Preview', icon: Clock },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'contact', label: 'Contact & Support', icon: Mail },
];

const FAQS = [
  { q: 'What is Hijinx?', a: 'Hijinx is a motorsports platform that connects drivers, teams, tracks, series, media creators, and fans in one place. We operate across media, motorsports, and culture — building tools for the people who make racing happen.' },
  { q: 'What is INDEX46?', a: 'INDEX46 is our public directory — the searchable home for every racer, team, track, and series on the platform. Think of it as the index of who\'s who in motorsports. You can browse profiles, check results, and follow the entities you care about.' },
  { q: 'What is RaceCore?', a: 'RaceCore is our operational management system for race events. It\'s the toolset that tracks, series, and event organizers use to manage entries, sessions, results, standings, and race-day operations. Most users interact with RaceCore results and standings through public profile pages.' },
  { q: 'What is The Outlet?', a: 'The Outlet is Hijinx\'s editorial and media surface — where stories, features, and media coverage from the motorsports world are published. It\'s home to our journalism, creator content, and editorial features.' },
  { q: 'How do claims work?', a: 'If you\'re a driver, team owner, track operator, or series organizer, you can claim your profile on INDEX46. Find your profile in the directory, submit a claim with evidence of your relationship, and our team reviews it manually. Once approved, you get full editing access to your profile.' },
  { q: 'How long does claim review take?', a: 'Most claims are reviewed within 48 hours. Complex claims may take longer. You\'ll see your claim status update in the Claims Center, and you\'ll be notified when a decision is made.' },
  { q: 'What if my claim is denied?', a: 'If your claim is denied, you can resubmit with additional evidence. Review the denial reason, gather stronger evidence of your relationship to the entity, and submit a new claim. There is no penalty for resubmitting.' },
  { q: 'How do I upload media?', a: 'Media creators can apply for a media profile through the Media Portal. Once approved, you can upload photos, videos, and editorial content. Your media appears on your creator profile and can be linked to events, tracks, and entities across the platform.' },
  { q: 'How do I become verified?', a: 'Verification badges are awarded when your entity claim is approved by our team. The badge confirms that you are the legitimate owner or representative of the profile.' },
  { q: 'How do sponsorships work?', a: 'Sponsorships are managed through the platform\'s commercial layer. Organizations can sponsor racers, teams, events, series, or the platform itself. Sponsor relationships are tracked publicly on entity profiles.' },
  { q: 'Is Hijinx free to use?', a: 'Browsing the directory, viewing profiles, and reading The Outlet are free. Creating an account and claiming a profile are also free. Some features may have associated costs as they become available.' },
  { q: 'What if I find a bug or issue?', a: 'Use the "Report an Issue" link in the footer of any page. You can describe what happened, attach a screenshot, and we\'ll review it. You can also reach us through the Contact page.' },
];

function SectionWrapper({ id, icon: Icon, label, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5" style={{ color: 'hsl(var(--motion))' }} />
        <h2 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>{label}</h2>
      </div>
      {children}
    </section>
  );
}

export default function Help() {
  const [activeSection, setActiveSection] = useState('getting-started');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <PageShell>
      <SeoMeta title="Help Center" description="Hijinx Help Center — guides, FAQs, and support for the motorsports platform." />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <span className="font-mono text-xs tracking-[0.3em] uppercase" style={{ color: 'hsl(var(--foreground-quiet))' }}>Support</span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 mb-2" style={{ color: 'hsl(var(--foreground))' }}>Help Center</h1>
          <p className="text-sm max-w-lg" style={{ color: 'hsl(var(--foreground-secondary))' }}>
            Everything you need to get started, understand the platform, and get help when you need it.
          </p>
        </div>

        <div className="flex gap-8">
          {/* TOC Sidebar (desktop) */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <nav className="sticky top-24 space-y-1">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                    style={
                      activeSection === s.id
                        ? { background: 'hsl(var(--motion) / 0.1)', color: 'hsl(var(--motion))', fontWeight: 600 }
                        : { color: 'hsl(var(--foreground-secondary))' }
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {s.label}
                  </a>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-12">
            {/* Getting Started */}
            <SectionWrapper id="getting-started" icon={Sparkles} label="Getting Started">
              <div className="space-y-4">
                <PlatformOverview variant="full" />
                <div className="p-5 rounded-xl" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="w-4 h-4" style={{ color: 'hsl(var(--motion))' }} />
                    <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Creating an Account</h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                    Creating a Hijinx account is free. Click "Login" in the header and follow the sign-up flow.
                    Once registered, you can browse the directory, follow racers and teams, submit story content to The Outlet,
                    and claim profiles for entities you represent. You'll need a verified account before claiming any profile.
                  </p>
                </div>
                <div className="p-5 rounded-xl" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Compass className="w-4 h-4" style={{ color: 'hsl(var(--motion))' }} />
                    <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Navigating the Platform</h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                    Use the search icon in the header to find racers, teams, tracks, series, events, vehicles, media, and stories.
                    The Directory is your home for browsing all racing entities. Your Dashboard shows your profiles, claims,
                    and account settings. The Outlet is where you'll find editorial stories and media coverage.
                  </p>
                </div>
              </div>
            </SectionWrapper>

            {/* Claiming a Profile */}
            <SectionWrapper id="claiming-a-profile" icon={ShieldCheck} label="Claiming a Profile">
              <div className="space-y-5">
                <div className="p-5 rounded-xl" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="w-4 h-4" style={{ color: 'hsl(var(--motion))' }} />
                    <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>How Claims Work</h3>
                  </div>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                    If you're a driver, team owner, track operator, or series organizer, you can claim your profile on INDEX46.
                    The process has three steps:
                  </p>
                  <ol className="space-y-2 text-sm" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                    <li className="flex gap-2"><span className="font-bold" style={{ color: 'hsl(var(--motion))' }}>1.</span> Find your profile in the directory.</li>
                    <li className="flex gap-2"><span className="font-bold" style={{ color: 'hsl(var(--motion))' }}>2.</span> Submit a claim with evidence of your relationship.</li>
                    <li className="flex gap-2"><span className="font-bold" style={{ color: 'hsl(var(--motion))' }}>3.</span> Our team reviews your claim manually and notifies you of the decision.</li>
                  </ol>
                </div>
                <OwnershipGuide variant="full" />
                <div className="flex gap-3">
                  <Link to={createPageUrl('JoinIndex46')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all" style={{ background: 'hsl(var(--motion))', color: 'hsl(var(--canvas))' }}>
                    Start a Claim <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link to={createPageUrl('ClaimsCenter')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all" style={{ border: '1px solid hsl(var(--divider))', color: 'hsl(var(--foreground))' }}>
                    View My Claims
                  </Link>
                </div>
              </div>
            </SectionWrapper>

            {/* Racer Profiles */}
            <SectionWrapper id="racer-profiles" icon={Trophy} label="Racer Profiles">
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                Racer profiles are the core of INDEX46. Each profile includes a bio, career stats, sponsors, vehicles, media,
                and race results. If you're a driver, claiming your profile lets you manage all of this content and display
                a verified owner badge.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                Even without claiming, your profile may already exist in the directory — we import public racing records to
                build a comprehensive index. Claiming gives you control over what's displayed.
              </p>
            </SectionWrapper>

            {/* Organizations */}
            <SectionWrapper id="organizations" icon={Compass} label="Organizations">
              <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                Organizations include sponsors, vendors, manufacturers, and other commercial entities in the motorsports
                ecosystem. Each organization has a public profile showing its relationships with racers, teams, events, and
                series. Organizations can be claimed and managed by their owners, just like racer profiles.
              </p>
            </SectionWrapper>

            {/* Sponsors */}
            <SectionWrapper id="sponsors" icon={Trophy} label="Sponsors">
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                Sponsorships are managed through the platform's commercial layer. Organizations can sponsor racers, teams,
                events, series, or the platform itself. Each sponsorship relationship is tracked publicly on the entity's
                profile, showing the sponsors and partners that support them.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                Sponsorship tiers (Title, Presenting, Official, Primary, Supporting, Associate) indicate the prominence of
                each relationship. This information is visible to the public to maintain transparency in the motorsports
                ecosystem.
              </p>
            </SectionWrapper>

            {/* Media */}
            <SectionWrapper id="media" icon={Camera} label="Media">
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                Media creators — photographers, videographers, journalists, and content producers — can apply for a media
                profile through the Media Portal. Once approved, you can upload photos, videos, and editorial content that
                appears on your creator profile and can be linked to events, tracks, and entities across the platform.
              </p>
              <Link to={createPageUrl('MediaHome')} className="inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:opacity-80" style={{ color: 'hsl(var(--motion))' }}>
                Visit Media Home <ChevronRight className="w-4 h-4" />
              </Link>
            </SectionWrapper>

            {/* Marketplace */}
            <SectionWrapper id="marketplace" icon={Store} label="Marketplace">
              <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                The Marketplace is our future commerce surface for motorsports-related products and services. During the
                Friends & Family preview, the Marketplace is not yet available. We're building it carefully to serve the
                motorsports community with relevant, high-quality offerings.
              </p>
            </SectionWrapper>

            {/* Apparel */}
            <SectionWrapper id="apparel" icon={Shirt} label="Apparel">
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                Hijinx Apparel is our lifestyle and goods vertical. During the Friends & Family preview, apparel purchases
                are routed to our external Shopify store at Hijinx.com. The in-platform apparel experience will be available
                in a future release.
              </p>
              <a href="https://hijinx.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:opacity-80" style={{ color: 'hsl(var(--motion))' }}>
                Visit Hijinx.com Shop <ArrowRight className="w-4 h-4" />
              </a>
            </SectionWrapper>

            {/* RaceCore */}
            <SectionWrapper id="racecore" icon={Gauge} label="RaceCore">
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                RaceCore is our operational management system for race events. It's the toolset that tracks, series, and event
                organizers use to manage entries, sessions, results, standings, and race-day operations. RaceCore is
                available to approved entity owners and their designated editors.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                Most users interact with RaceCore data through public profile pages — race results, standings, and event
                schedules are displayed on racer, team, track, and series profiles. If you manage a track or series and need
                RaceCore access, claim your profile first, then request access through your dashboard.
              </p>
            </SectionWrapper>

            {/* Friends & Family Preview */}
            <SectionWrapper id="friends-family" icon={Clock} label="Friends & Family Preview">
              <div className="p-5 rounded-xl" style={{ background: 'hsl(var(--motion) / 0.06)', border: '1px solid hsl(var(--motion) / 0.2)' }}>
                <p className="text-sm leading-relaxed mb-3" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                  Hijinx is currently in a Friends & Family preview. This means:
                </p>
                <ul className="space-y-2 text-sm" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                  <li className="flex items-start gap-2"><span style={{ color: 'hsl(var(--motion))' }}>•</span> The platform is functional but still being refined based on early feedback.</li>
                  <li className="flex items-start gap-2"><span style={{ color: 'hsl(var(--motion))' }}>•</span> Some features (Marketplace, in-platform Apparel) are not yet available.</li>
                  <li className="flex items-start gap-2"><span style={{ color: 'hsl(var(--motion))' }}>•</span> Data is being added and enriched continuously.</li>
                  <li className="flex items-start gap-2"><span style={{ color: 'hsl(var(--motion))' }}>•</span> Your feedback directly shapes what we build next.</li>
                </ul>
                <p className="text-sm leading-relaxed mt-3" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                  Thank you for being part of the early community. If you encounter issues or have suggestions, use the
                  "Report an Issue" link in the footer or contact us through the Contact page.
                </p>
              </div>
            </SectionWrapper>

            {/* FAQ */}
            <SectionWrapper id="faq" icon={HelpCircle} label="Frequently Asked Questions">
              <div className="space-y-4">
                {FAQS.map((faq, i) => (
                  <div key={i} className="pb-4" style={{ borderBottom: '1px solid hsl(var(--divider))' }}>
                    <h3 className="text-sm font-bold mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>{faq.q}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>{faq.a}</p>
                  </div>
                ))}
              </div>
            </SectionWrapper>

            {/* Contact & Support */}
            <SectionWrapper id="contact" icon={Mail} label="Contact & Support">
              <div className="p-6 rounded-xl text-center" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
                <Mail className="w-6 h-6 mx-auto mb-3" style={{ color: 'hsl(var(--motion))' }} />
                <h3 className="text-sm font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>Still need help?</h3>
                <p className="text-sm mb-4" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                  We're here to help. Reach out and we'll get back to you within 2-3 business days.
                </p>
                <Link to={createPageUrl('Contact')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all" style={{ background: 'hsl(var(--motion))', color: 'hsl(var(--canvas))' }}>
                  Contact Support <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </SectionWrapper>
          </div>
        </div>
      </div>
    </PageShell>
  );
}