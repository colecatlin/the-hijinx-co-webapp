import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import NewsletterSignup from './NewsletterSignup';
import ReportIssueModal from '@/components/system/reportIssueModal';
import { useFooterConfig } from '@/hooks/useFooterConfig';

// ── Hardcoded fallback — matches the current public footer exactly ──
const FALLBACK_GROUPS = [
  {
    label: 'Platform',
    links: [
      { name: 'The Outlet', page: 'OutletHome' },
      { name: 'Motorsports', page: 'MotorsportsHome' },
      { name: 'Apparel', page: 'ApparelHome' },
      { name: 'Creative Services', page: 'CreativeServices' },
    ]
  },
  {
    label: 'Get Started',
    links: [
      { name: 'Join / Claim Profile', href: '/join' },
      { name: 'Directory', href: '/Directory' },
      { name: 'Racers', href: '/Directory?cat=drivers' },
      { name: 'Sponsors', href: '/Directory?cat=sponsors' },
      { name: 'Vehicles', href: '/Directory?cat=vehicles' },
    ]
  },
  {
    label: 'Ventures',
    links: [
      { name: 'Tech', page: 'TechHome' },
      { name: 'Learning', page: 'Learning' },
      { name: 'Hospitality', page: 'Hospitality' },
      { name: 'Food & Beverage', page: 'FoodBeverage' },
    ]
  },
  {
    label: 'Company',
    links: [
      { name: 'About', page: 'About' },
      { name: 'Contact', page: 'Contact' },
      { name: 'Help', page: 'Help' },
      { name: 'Advertise', page: 'OutletAdvertising' },
      { name: 'Submit a Story', page: 'OutletSubmit' },
      { name: 'Hashtag Library', href: '/hashtag-library' },
    ]
  },
  {
    label: 'Legal',
    links: [
      { name: 'Privacy Policy', page: 'Privacy' },
      { name: 'Terms of Service', page: 'Terms' },
    ]
  },
];

const FALLBACK_BRAND = {
  name: 'HIJINX',
  tagline: 'A multi-vertical platform building at the intersection of media, motorsports, and culture.',
  copyright_text: '© {year} The Hijinx Co LLC. All rights reserved.',
  built_on_purpose: 'Built on purpose.',
  show_newsletter: true,
  newsletter_label: 'STAY UPDATED',
};

const FALLBACK_DISPLAY = {
  show_report_issue: true,
  report_label: 'Report an Issue',
};

// ── Resolve a footer link destination to a usable href ──
function resolveLinkHref(link) {
  if (!link || link.enabled === false) return null;
  if (link._resolved === false) return null; // broken reusable_link reference
  const d = link.destination;
  if (!d || d.type === 'none') return null;
  if (d.type === 'internal_page' && d.internal_page) return { href: d.internal_page, external: false, newTab: link.open_in_new_tab || d.open_in_new_tab };
  if (d.type === 'external' && d.external_url) {
    try { new URL(d.external_url); return { href: d.external_url, external: true, newTab: link.open_in_new_tab || d.open_in_new_tab }; } catch { return null; }
  }
  if (d.type === 'entity' && d.entity_id) {
    const id = d.entity_slug || d.entity_id;
    if (d.entity_type === 'Event') return { href: `/events/${id}`, external: false, newTab: link.open_in_new_tab };
    if (d.entity_type === 'OutletStory') return { href: `/story/${id}`, external: false, newTab: link.open_in_new_tab };
  }
  return null;
}

export default function Footer() {
  const [reportOpen, setReportOpen] = useState(false);
  const { config } = useFooterConfig();

  // While config is null (loading/error), use hardcoded fallback
  const groups = config?.groups || FALLBACK_GROUPS;
  const legal = config?.legal || [];
  const brand = config?.brand || FALLBACK_BRAND;
  const display = config?.display || FALLBACK_DISPLAY;
  const socials = config?.socials || [];

  // Build columns: enabled groups + legal (if has links)
  const columns = [
    ...groups.filter(g => g.enabled !== false),
    ...(legal.length > 0 ? [{ label: 'Legal', links: legal }] : []),
  ];

  const year = new Date().getFullYear();
  const copyright = (brand.copyright_text || '').replace('{year}', String(year));

  return (
    <footer style={{ background: 'hsl(var(--surface))', borderTop: '1px solid hsl(var(--divider))', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8 md:py-16 lg:py-24">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-6 md:gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-black tracking-tight text-foreground">{brand.name || 'HIJINX'}</h3>
            <p className="text-sm mt-3 max-w-xs leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              {brand.tagline}
            </p>
            {brand.show_newsletter !== false && (
              <div className="mt-6">
                <p className="font-mono text-xs tracking-[0.15em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>{brand.newsletter_label || 'STAY UPDATED'}</p>
                <NewsletterSignup source="footer" />
              </div>
            )}
            {socials.filter(s => s.enabled).length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                {socials.filter(s => s.enabled).map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-foreground-quiet hover:text-motion transition-colors">
                    {s.platform}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link Columns */}
          {columns.map((col) => {
            const colLabel = col.title || col.label;
            const colLinks = col.links || [];
            const validLinks = colLinks.map(link => {
              if (config) {
                const resolved = resolveLinkHref(link);
                if (!resolved) return null;
                return { name: link.label, href: resolved.href, external: resolved.external, newTab: resolved.newTab };
              }
              // Fallback mode — use page/href directly
              return { name: link.name, href: link.href || createPageUrl(link.page), external: false, newTab: false };
            }).filter(Boolean);

            if (validLinks.length === 0) return null;

            return (
              <div key={colLabel}>
                <p className="font-mono text-[10px] md:text-xs tracking-[0.2em] mb-2 md:mb-4" style={{ color: 'hsl(var(--foreground-quiet))' }}>{colLabel.toUpperCase()}</p>
                <ul className="space-y-1.5 md:space-y-3">
                  {validLinks.map((link) => (
                    <li key={link.name}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target={link.newTab ? '_blank' : undefined}
                          rel={link.newTab ? 'noopener noreferrer' : undefined}
                          className="text-xs md:text-sm transition-colors hover:text-motion"
                          style={{ color: 'hsl(var(--foreground-secondary))' }}
                        >
                          {link.name}
                        </a>
                      ) : (
                        <Link
                          to={link.href}
                          className="text-xs md:text-sm transition-colors hover:text-motion"
                          style={{ color: 'hsl(var(--foreground-secondary))' }}
                        >
                          {link.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 md:mt-16 pt-4 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderTop: '1px solid hsl(var(--divider))' }}>
          <p className="font-mono text-xs" style={{ color: 'hsl(var(--foreground-quiet) / 0.8)' }}>
            {copyright}
          </p>
          <div className="flex items-center gap-4">
            {display.show_report_issue !== false && (
              <button
                onClick={() => setReportOpen(true)}
                className="font-mono text-xs underline underline-offset-2 transition-colors hover:text-foreground"
                style={{ color: 'hsl(var(--foreground-quiet) / 0.8)' }}
              >
                {display.report_label || 'Report an Issue'}
              </button>
            )}
            {brand.built_on_purpose && (
              <p className="font-mono text-xs" style={{ color: 'hsl(var(--foreground-quiet) / 0.8)' }}>
                {brand.built_on_purpose}
              </p>
            )}
          </div>
        </div>
      </div>
      <ReportIssueModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </footer>
  );
}