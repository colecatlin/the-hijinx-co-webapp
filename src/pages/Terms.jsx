import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ChevronRight } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import SeoMeta from '@/components/system/seoMeta';

export default function Terms() {
  return (
    <PageShell>
      <SeoMeta title="Terms of Service" description="Hijinx Terms of Service — the rules for using the platform." />
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <span className="font-mono text-xs tracking-[0.3em] uppercase" style={{ color: 'hsl(var(--foreground-quiet))' }}>Legal</span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 mb-8" style={{ color: 'hsl(var(--foreground))' }}>Terms of Service</h1>
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--foreground-secondary))' }}>Last updated: August 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              By creating an account or using the Hijinx platform, you agree to these Terms of Service. If you do not agree, do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>2. About Hijinx</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              Hijinx is a motorsports platform that connects drivers, teams, tracks, series, media creators, and fans. The platform includes INDEX46 (our public directory of racing entities), RaceCore (our operational management system for race events), and The Outlet (our editorial and media surface).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>3. Your Account</h2>
            <ul className="space-y-2 text-sm leading-relaxed list-disc list-inside" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              <li>You must provide accurate information when creating your account.</li>
              <li>You are responsible for maintaining the security of your account.</li>
              <li>You must be at least 13 years old to create an account.</li>
              <li>One person or entity may not maintain multiple accounts under false identities.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>4. Entity Claims & Ownership</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              Hijinx allows users to claim profiles for drivers, teams, tracks, and series. When you submit a claim, you must provide truthful evidence of your relationship to the entity. Hijinx reviews each claim manually. Approved claimants gain editing access to the claimed profile. Falsely claiming an entity you do not represent may result in permanent account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>5. Content & Conduct</h2>
            <ul className="space-y-2 text-sm leading-relaxed list-disc list-inside" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              <li>You are responsible for all content you publish to your profiles.</li>
              <li>Do not upload content that is illegal, harmful, or infringes on others' rights.</li>
              <li>Do not use the platform to harass, discriminate, or harm others.</li>
              <li>Respect the intellectual property rights of other users and third parties.</li>
              <li>Hijinx reserves the right to remove content or suspend accounts that violate these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>6. Media & Usage Rights</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              When you upload media to Hijinx, you retain ownership of your content. You grant Hijinx a license to display, distribute, and use your content on the platform. You are responsible for ensuring you have the rights to upload any media you submit.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>7. Platform Availability</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              Hijinx is currently in a Friends & Family preview phase. The platform may change, and some features may not be fully available. We do not guarantee uninterrupted access to all features at all times.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>8. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              Hijinx is provided "as is" without warranties of any kind. To the fullest extent permitted by law, The Hijinx Co LLC shall not be liable for indirect, incidental, or consequential damages arising from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>9. Changes to Terms</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              We may update these Terms from time to time. We will notify users of significant changes. Continued use of the platform after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>10. Contact</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              Questions about these Terms? Reach out through our Contact page.
            </p>
          </section>
        </div>

        {/* Cross-links */}
        <div className="mt-12 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ borderTop: '1px solid hsl(var(--divider))' }}>
          <Link to={createPageUrl('Privacy')} className="flex items-center justify-between p-4 rounded-xl transition-all" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>Also read</p>
              <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Privacy Policy</p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'hsl(var(--foreground-quiet))' }} />
          </Link>
          <Link to={createPageUrl('Help')} className="flex items-center justify-between p-4 rounded-xl transition-all" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>Need help?</p>
              <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Help Center</p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'hsl(var(--foreground-quiet))' }} />
          </Link>
        </div>
      </div>
    </PageShell>
  );
}