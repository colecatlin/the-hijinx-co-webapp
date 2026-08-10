import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, User, Globe } from 'lucide-react';

export default function PublisherBadge({ publisher, size = 'md' }) {
  if (!publisher) return null;

  const sizes = {
    sm: { container: 'gap-1.5', logo: 'w-5 h-5', text: 'text-xs' },
    md: { container: 'gap-2', logo: 'w-7 h-7', text: 'text-sm' },
    lg: { container: 'gap-3', logo: 'w-10 h-10', text: 'text-base' },
  };
  const s = sizes[size] || sizes.md;

  const Icon = publisher.type === 'outlet' ? Building2 : publisher.type === 'creator' ? User : Globe;

  const content = (
    <div className={`flex items-center ${s.container}`}>
      {publisher.logo_url ? (
        <img src={publisher.logo_url} alt={publisher.name} className={`${s.logo} rounded-full object-cover`} />
      ) : (
        <div className={`${s.logo} rounded-full flex items-center justify-center`} style={{ background: 'hsl(var(--motion) / 0.15)' }}>
          <Icon className="w-3.5 h-3.5 text-motion" />
        </div>
      )}
      <div>
        <p className={`${s.text} font-semibold text-foreground`}>{publisher.name}</p>
        <p className="text-[9px] uppercase tracking-widest text-foreground-quiet">{publisher.type}</p>
      </div>
    </div>
  );

  if (publisher.profile_url) {
    return <Link to={publisher.profile_url} className="inline-block hover:opacity-80 transition-opacity">{content}</Link>;
  }
  return content;
}