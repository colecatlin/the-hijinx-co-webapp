import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowRight } from 'lucide-react';
import { mergeConfig, resolveCta } from './home1Helpers';

const BONE = '#FFF8F5';
const OIL = '#232323';
const RASP = '#D33F49';

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1502920917128-1aa1c652f298?auto=format&fit=crop&w=1400&q=80';

const FROM_OUTLET_DEFAULTS = {
  enabled: true,
  eyebrow: 'Media // Stories // Motorsports',
  headline: 'From The Outlet',
  supporting_tagline: 'The Pulse Of Motorsports.',
  view_all_cta: {
    enabled: true,
    label: 'View All Stories',
    destination: { type: 'internal_page', internal_page: '/OutletHome' },
  },
  lead_mode: 'auto',
  pinned_lead_story_id: '',
  secondary_story_count: 3,
  category_rail_enabled: true,
  schedule: { enabled: false, start_at: '', end_at: '' },
};

function timeAgo(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return 'JUST NOW';
    if (hrs < 24) return `${hrs} HOUR${hrs > 1 ? 'S' : ''} AGO`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} DAY${days > 1 ? 'S' : ''} AGO`;
    return `${Math.floor(days / 7)} WEEK${Math.floor(days / 7) > 1 ? 'S' : ''} AGO`;
  } catch {
    return null;
  }
}

function storyUrl(s) {
  return s.slug ? `/story/${s.slug}` : '/OutletHome';
}

function categoryLabel(s) {
  return (s.primary_category || 'STORY').toUpperCase();
}

export default function Home1FromTheOutlet({ config }) {
  const v = mergeConfig(FROM_OUTLET_DEFAULTS, config);

  const { data: stories = [] } = useQuery({
    queryKey: ['home1OutletStories'],
    queryFn: () => base44.entities.OutletStory.list('-published_date', 20),
    staleTime: 5 * 60 * 1000,
  });

  const published = stories.filter((s) => s.status === 'published');

  // Lead story: pinned or auto (featured → most recent)
  let lead = null;
  if (v.lead_mode === 'pinned' && v.pinned_lead_story_id) {
    lead = published.find((s) => s.id === v.pinned_lead_story_id) || null;
  }
  if (!lead) {
    // Auto: prefer featured, else most recent
    lead = published.find((s) => s.featured) || published[0] || null;
  }

  const secondaryCount = v.secondary_story_count || 3;
  const secondary = published
    .filter((s) => s.id !== lead?.id)
    .slice(0, secondaryCount);

  // Category rail
  const categories = v.category_rail_enabled
    ? [...new Set(published.map((s) => s.primary_category).filter(Boolean))].slice(0, 5)
    : [];

  const viewAllCta = resolveCta(v.view_all_cta);

  const ViewAllLink = ({ className, style, children }) => {
    if (!viewAllCta || !viewAllCta.isLink) return <span className={className} style={style}>{children}</span>;
    if (viewAllCta.isExternal) {
      return (
        <a href={viewAllCta.href} target={viewAllCta.openInNewTab ? '_blank' : undefined} rel={viewAllCta.openInNewTab ? 'noopener noreferrer' : undefined} className={className} style={style}>
          {children}
        </a>
      );
    }
    return <Link to={viewAllCta.href} className={className} style={style}>{children}</Link>;
  };

  return (
    <section
      className="w-full"
      style={{ background: BONE, paddingTop: '30px', paddingBottom: '34px' }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {/* Top rule */}
        <div className="h-px w-full mb-5" style={{ background: 'rgba(35,35,35,0.15)' }} />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
          <div>
            <p
              className="font-mono text-[10px] tracking-[0.3em] uppercase font-bold mb-2"
              style={{ color: RASP }}
            >
              {v.eyebrow}
            </p>
            <h2
              className="font-serif italic font-black leading-[0.9] tracking-[-0.02em]"
              style={{ color: OIL, fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}
            >
              {v.headline}
            </h2>
            <p
              className="mt-1 font-mono text-[10px] md:text-[11px] tracking-[0.25em] uppercase"
              style={{ color: 'rgba(35,35,35,0.6)' }}
            >
              {v.supporting_tagline}
            </p>
          </div>
          {viewAllCta && (
            <ViewAllLink className="inline-flex items-center gap-2 px-4 py-2 font-mono text-[10px] tracking-[0.25em] uppercase font-bold border transition-colors hover:bg-[#232323] hover:text-[#FFF8F5] self-start md:self-auto"
              style={{ color: OIL, borderColor: OIL }}>
              {viewAllCta.label} <ArrowRight className="w-3.5 h-3.5" />
            </ViewAllLink>
          )}
        </div>

        {published.length === 0 ? (
          <div className="flex items-center justify-center py-16 border" style={{ borderColor: 'rgba(35,35,35,0.15)' }}>
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: 'rgba(35,35,35,0.5)' }}>
              Stories coming soon.
            </p>
          </div>
        ) : (
          <>
            {/* Editorial grid */}
            <div
              className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-5 lg:gap-7"
              style={{ marginTop: '20px' }}
            >
              {/* LEAD STORY */}
              {lead && (
                <Link to={storyUrl(lead)} className="group relative block overflow-hidden" style={{ background: OIL }}>
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img
                      src={lead.cover_image || FALLBACK_IMG}
                      alt={lead.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(35,35,35,0.05) 0%, rgba(35,35,35,0.25) 45%, rgba(35,35,35,0.85) 100%)',
                      }}
                    />
                    {/* Category badge */}
                    <span
                      className="absolute top-4 left-4 inline-flex items-center px-2.5 py-1 font-mono text-[9px] tracking-[0.2em] uppercase font-bold"
                      style={{ background: RASP, color: '#FFFFFF' }}
                    >
                      {categoryLabel(lead)}
                    </span>
                    {/* Text overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-5 md:p-7 lg:p-8">
                      <h3
                        className="font-serif italic font-black uppercase leading-[0.95] tracking-[-0.01em]"
                        style={{ color: '#FFFFFF', fontSize: 'clamp(1.75rem, 3.5vw, 3rem)' }}
                      >
                        {lead.title}
                      </h3>
                      {lead.subtitle && (
                        <p
                          className="mt-3 text-[13px] md:text-[15px] leading-snug max-w-xl"
                          style={{ color: 'rgba(255,255,255,0.85)' }}
                        >
                          {lead.subtitle}
                        </p>
                      )}
                      <div className="mt-4 flex items-center gap-4">
                        <span
                          className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] uppercase font-bold"
                          style={{ color: '#FFFFFF' }}
                        >
                          Read Story
                          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </span>
                        {lead.published_date && (
                          <span
                            className="font-mono text-[9px] tracking-[0.18em] uppercase"
                            style={{ color: 'rgba(255,255,255,0.55)' }}
                          >
                            {timeAgo(lead.published_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* SECONDARY STACK */}
              <div className="flex flex-col">
                {secondary.map((s, i) => (
                  <React.Fragment key={s.id}>
                    {i > 0 && (
                      <div className="h-px w-full" style={{ background: 'rgba(35,35,35,0.12)' }} />
                    )}
                    <Link to={storyUrl(s)} className="group flex gap-4 py-3.5 items-start">
                      {/* Thumbnail */}
                      <div className="relative w-[38%] shrink-0 aspect-[4/3] overflow-hidden bg-[#f0ece6]">
                        <img
                          src={s.cover_image || FALLBACK_IMG}
                          alt={s.title}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                        />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <span
                          className="inline-flex items-center px-2 py-0.5 font-mono text-[8px] tracking-[0.18em] uppercase font-bold mb-1.5"
                          style={{ background: RASP, color: '#FFFFFF' }}
                        >
                          {categoryLabel(s)}
                        </span>
                        <h4
                          className="font-bold leading-[1.1] tracking-[-0.01em] line-clamp-2"
                          style={{ color: OIL, fontSize: 'clamp(0.85rem, 1.1vw, 1rem)' }}
                        >
                          {s.title}
                        </h4>
                        {s.subtitle && (
                          <p
                            className="mt-1 text-[11px] leading-snug line-clamp-2"
                            style={{ color: 'rgba(35,35,35,0.6)' }}
                          >
                            {s.subtitle}
                          </p>
                        )}
                        {s.published_date && (
                          <p
                            className="mt-1.5 font-mono text-[8px] tracking-[0.18em] uppercase"
                            style={{ color: 'rgba(35,35,35,0.45)' }}
                          >
                            {timeAgo(s.published_date)}
                          </p>
                        )}
                      </div>
                    </Link>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Category rail */}
            {categories.length > 0 && (
              <div
                className="mt-5 pt-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                style={{ borderColor: 'rgba(35,35,35,0.12)' }}
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <span
                    className="font-mono text-[10px] tracking-[0.25em] uppercase font-bold pb-0.5 border-b-2"
                    style={{ color: OIL, borderColor: RASP }}
                  >
                    Latest
                  </span>
                  {categories.map((c) => (
                    <Link
                      key={c}
                      to="/OutletHome"
                      className="font-mono text-[10px] tracking-[0.25em] uppercase transition-colors hover:text-[#D33F49]"
                      style={{ color: 'rgba(35,35,35,0.6)' }}
                    >
                      {c}
                    </Link>
                  ))}
                </div>
                <p
                  className="font-mono text-[9px] md:text-[10px] tracking-[0.25em] uppercase"
                  style={{ color: 'rgba(35,35,35,0.45)' }}
                >
                  Stories That Keep You In Motion.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}