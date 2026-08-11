import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ChevronRight } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import SeoMeta from '@/components/system/seoMeta';

export default function Privacy() {
  return (
    <PageShell>
      <SeoMeta title="Privacy Policy" description="Hijinx Privacy Policy — how we handle your data." />
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <span className="font-mono text-xs tracking-[0.3em] uppercase" style={{ color: 'hsl(var(--foreground-quiet))' }}>Legal</span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 mb-8" style={{ color: 'hsl(var(--foreground))' }}>Privacy Policy</h1>
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--foreground-secondary))' }}>Last updated: August 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>1. Overview</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              The Hijinx Co LLC ("Hijinx," "we," "us") operates the Hijinx platform — a motorsports platform that connects drivers, teams, tracks, series, media creators, and fans. This Privacy Policy explains what information we collect, how we use it, and the choices you have.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>2. Information We Collect</h2>
            <ul className="space-y-2 text-sm leading-relaxed list-disc list-inside" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              <li><strong>Account information:</strong> Name, email address, and authentication data when you create an account.</li>
              <li><strong>Profile information:</strong> Information you add to your racer, team, track, or series profile, including bios, photos, stats, and sponsorships.</li>
              <li><strong>Claim evidence:</strong> Information and documents you submit when claiming an entity profile, used solely to verify ownership.</li>
              <li><strong>Media uploads:</strong> Photos, videos, and content you upload to the platform.</li>
              <li><strong>Usage data:</strong> How you interact with the platform, including pages visited and features used.</li>
              <li><strong>Communication data:</strong> Messages you send through our contact form or report issue tool.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>3. How We Use Your Information</h2>
            <ul className="space-y-2 text-sm leading-relaxed list-disc list-inside" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              <li>To create and manage your account and profile.</li>
              <li>To verify entity ownership claims and maintain platform integrity.</li>
              <li>To display public profiles, results, standings, and media.</li>
              <li>To communicate with you about your account, claims, and platform updates.</li>
              <li>To improve the platform, fix issues, and develop new features.</li>
              <li>To process transactions and payments where applicable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>4. Information Sharing</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              We do not sell your personal information. We share data only with service providers who help us operate the platform (such as hosting, authentication, and payment processing), when required by law, or with your consent. Public profile information you publish is visible to other platform users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>5. Data Retention</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              We retain your account information for as long as your account is active. You may request deletion of your account and personal data at any time. Some data (such as race results and historical records) may be retained as part of the platform's public record.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>6. Your Rights</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              You have the right to access, correct, or delete your personal information. You can manage most of this through your profile settings. For other requests, contact us through the Contact page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>7. Security</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              We use industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure. We strive to protect your information but cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>8. Contact</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              Questions about this Privacy Policy? Reach out through our Contact page.
            </p>
          </section>
        </div>

        {/* Cross-links */}
        <div className="mt-12 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ borderTop: '1px solid hsl(var(--divider))' }}>
          <Link to={createPageUrl('Terms')} className="flex items-center justify-between p-4 rounded-xl transition-all" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>Also read</p>
              <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Terms of Service</p>
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