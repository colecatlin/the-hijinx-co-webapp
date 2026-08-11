import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import NewsletterSignup from './NewsletterSignup';
import ReportIssueModal from '@/components/system/reportIssueModal';

const footerLinks = [
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

export default function Footer() {
  const [reportOpen, setReportOpen] = useState(false);
  return (
    <footer style={{ background: 'hsl(var(--surface))', borderTop: '1px solid hsl(var(--divider))', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 md:gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-black tracking-tight text-foreground">HIJINX</h3>
            <p className="text-sm mt-3 max-w-xs leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              A multi-vertical platform building at the intersection of media, motorsports, and culture.
            </p>
            <div className="mt-6">
              <p className="font-mono text-xs tracking-[0.15em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>STAY UPDATED</p>
              <NewsletterSignup source="footer" />
            </div>
          </div>

          {/* Link Columns */}
          {footerLinks.map((col) => (
            <div key={col.label}>
              <p className="font-mono text-xs tracking-[0.2em] mb-4" style={{ color: 'hsl(var(--foreground-quiet))' }}>{col.label.toUpperCase()}</p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href || createPageUrl(link.page)}
                      className="text-sm transition-colors hover:text-motion"
                      style={{ color: 'hsl(var(--foreground-secondary))' }}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderTop: '1px solid hsl(var(--divider))' }}>
          <p className="font-mono text-xs" style={{ color: 'hsl(var(--foreground-quiet) / 0.8)' }}>
            © {new Date().getFullYear()} The Hijinx Co LLC. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setReportOpen(true)}
              className="font-mono text-xs underline underline-offset-2 transition-colors hover:text-foreground"
              style={{ color: 'hsl(var(--foreground-quiet) / 0.8)' }}
            >
              Report an Issue
            </button>
            <p className="font-mono text-xs" style={{ color: 'hsl(var(--foreground-quiet) / 0.8)' }}>
              Built on purpose.
            </p>
          </div>
        </div>
      </div>
      <ReportIssueModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </footer>
  );
}