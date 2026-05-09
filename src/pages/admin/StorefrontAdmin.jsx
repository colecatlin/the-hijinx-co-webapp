import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Layers, ShoppingCart, Users, Tag, Star, Settings, Image, Sliders } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';

const SECTIONS = [
  { label: 'Products', icon: Package, href: '/admin/products', desc: 'Manage product catalog, descriptions, images' },
  { label: 'Variants', icon: Sliders, href: '/admin/variants', desc: 'Colors, sizes, SKU, inventory per variant' },
  { label: 'Collections', icon: Layers, href: '/admin/collections', desc: 'Organize products into collections' },
  { label: 'Orders', icon: ShoppingCart, href: '/admin/orders', desc: 'View and manage customer orders' },
  { label: 'Customers', icon: Users, href: '/admin/customers', desc: 'Browse customer profiles and history' },
  { label: 'Discounts', icon: Tag, href: '/admin/discounts', desc: 'Discount codes and promotions' },
  { label: 'Reviews', icon: Star, href: '/admin/reviews', desc: 'Moderate and approve product reviews' },
  { label: 'Hero Slides', icon: Image, href: '/admin/hero-slides', desc: 'Manage storefront hero carousel' },
  { label: 'Storefront Settings', icon: Settings, href: '/admin/storefront-settings', desc: 'Global store configuration' },
];

export default function StorefrontAdmin() {
  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5' }}>
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="mb-12">
          <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-3">Management</span>
          <h1 className="text-4xl font-black tracking-tight text-[#F5F5F5]">Storefront Admin</h1>
          <p className="text-[#555] mt-2">Manage every aspect of the HIJINX storefront.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                to={s.href}
                className="group border border-[#262626] bg-[#0D0D0D] p-6 hover:border-[#00FFDA]/50 transition-all duration-200"
              >
                <Icon className="w-5 h-5 text-[#00FFDA] mb-4" />
                <h3 className="text-sm font-bold text-[#F5F5F5] mb-1 group-hover:text-[#00FFDA] transition-colors">{s.label}</h3>
                <p className="text-xs text-[#555] leading-relaxed">{s.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}