import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import NewsletterSignup from './NewsletterSignup';

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
      { name: 'Advertise', page: 'OutletAdvertising' },
      { name: 'Submit a Story', page: 'OutletSubmit' },
    ]
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#232323] text-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 md:gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-black tracking-tight text-[#FFF8F5]">HIJINX</h3>
            <p className="text-[#FFF8F5] text-sm mt-3 max-w-xs leading-relaxed opacity-80">
              A multi-vertical platform building at the intersection of media, motorsports, and culture.
            </p>
            <div className="mt-6">
              <p className="font-mono text-xs text-[#FFF8F5] tracking-[0.15em] mb-3 opacity-60">STAY UPDATED</p>
              <NewsletterSignup source="footer" dark />
            </div>
          </div>

          {/* Link Columns */}
          {footerLinks.map((col) => (
            <div key={col.label}>
              <p className="font-mono text-xs tracking-[0.2em] text-[#FFF8F5] opacity-60 mb-4">{col.label.toUpperCase()}</p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={createPageUrl(link.page)}
                      className="text-sm text-[#FFF8F5] hover:text-[#00FFDA] transition-colors"
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
        <div className="mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-mono text-xs text-[#FFF8F5] opacity-60">
            © {new Date().getFullYear()} The Hijinx Co LLC. All rights reserved.
          </p>
          <p className="font-mono text-xs text-[#FFF8F5] opacity-60">
            Built on purpose.
          </p>
        </div>
      </div>
    </footer>
  );
}