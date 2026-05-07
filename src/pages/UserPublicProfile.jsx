import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import HijinxPageShell from '@/components/shared/HijinxPageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/components/utils';
import { ArrowLeft, MapPin, Globe, ExternalLink, CheckCircle } from 'lucide-react';
import { PROFILE_TYPE_CONFIG, VERIFICATION_BADGE_CONFIG, SOCIAL_PLATFORM_CONFIG } from '@/components/system/userCapabilities';
import { motion } from 'framer-motion';

const TEAL = '#1DA1A1';

const SOCIAL_ICONS = {
  instagram: 'IG', tiktok: 'TK', youtube: 'YT', facebook: 'FB',
  x: 'X', threads: 'TH', linkedin: 'LI', snapchat: 'SC',
  discord: 'DC', twitch: 'TV', website: '🌐',
};

function cleanDomain(url) {
  if (!url) return '';
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url.replace(/^https?:\/\//, '').split('/')[0] || ''; }
}

function SocialPill({ link }) {
  const displayLabel = link.handle || cleanDomain(link.url) || link.url;
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(29,161,161,0.1)'; e.currentTarget.style.border = '1px solid rgba(29,161,161,0.3)'; e.currentTarget.style.color = TEAL; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
    >
      <span className="font-mono text-[10px] flex-shrink-0">{SOCIAL_ICONS[link.platform] || link.platform.slice(0,2).toUpperCase()}</span>
      <span className="truncate">{displayLabel}</span>
      <ExternalLink className="w-3 h-3 ml-auto opacity-40 flex-shrink-0" />
    </a>
  );
}

function BackLink() {
  return (
    <Link to={createPageUrl('Home')}>
      <button className="flex items-center gap-1.5 text-xs mb-2 transition-colors"
        style={{ color: 'rgba(255,255,255,0.3)' }}
        onMouseEnter={e => e.currentTarget.style.color = TEAL}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> HIJINX
      </button>
    </Link>
  );
}

export default function UserPublicProfile() {
  const { username } = useParams();

  const { data: result, isLoading } = useQuery({
    queryKey: ['publicProfile', username],
    queryFn: () => base44.functions.invoke('getPublicProfile', { username_slug: username?.toLowerCase() }),
    enabled: !!username,
    select: res => res?.data || { profile: null, visibility: 'private' },
  });

  if (isLoading) {
    return (
      <HijinxPageShell>
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl opacity-20" />
          <Skeleton className="h-32 w-full rounded-2xl opacity-10" />
        </div>
      </HijinxPageShell>
    );
  }

  const { profile, visibility } = result || { profile: null, visibility: 'private' };

  // Private or not found
  if (!profile || visibility === 'private') {
    return (
      <HijinxPageShell>
        <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-2xl">🔒</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Profile not found</h1>
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              This profile doesn't exist or is set to private.
            </p>
          </div>
          <Link to={createPageUrl('Home')}>
            <button className="flex items-center gap-2 mx-auto px-4 py-2 text-sm font-medium rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            >
              <ArrowLeft className="w-4 h-4" /> Back to HIJINX
            </button>
          </Link>
        </div>
      </HijinxPageShell>
    );
  }

  // Limited — teaser only
  if (visibility === 'limited') {
    const displayName = profile.display_name || profile.username || username;
    const primaryType = profile.primary_profile_type || 'fan';
    const cfg = PROFILE_TYPE_CONFIG[primaryType];
    return (
      <HijinxPageShell>
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <BackLink />
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="px-6 py-8 rounded-2xl text-center space-y-4"
            style={{ background: 'rgba(8,12,14,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden"
              style={{ border: '2px solid rgba(29,161,161,0.3)' }}>
              {profile.profile_photo_url
                ? <img src={profile.profile_photo_url} alt={displayName} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #1DA1A1, #0D5C5C)' }}>
                    <span className="text-2xl font-black text-white">{displayName?.[0]?.toUpperCase()}</span>
                  </div>
              }
            </div>
            <div>
              <h1 className="text-xl font-black text-white">{displayName}</h1>
              {profile.username && <p className="text-xs font-mono mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>@{profile.username}</p>}
              {cfg && (
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: 'rgba(29,161,161,0.15)', color: TEAL, border: '1px solid rgba(29,161,161,0.25)' }}>
                  {cfg.label}
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
              This profile is visible by direct link, but not publicly discoverable.
            </p>
          </motion.div>
        </div>
      </HijinxPageShell>
    );
  }

  // Full public profile
  const displayName = profile.display_name || profile.username || username;
  const profileTypes = profile.profile_types || ['fan'];
  const primaryType = profile.primary_profile_type || 'fan';
  const verificationBadges = profile.verification_badges || [];
  const isVerified = profile.verification_status === 'verified';
  const publicSocials = profile.social_links || [];

  return (
    <HijinxPageShell>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        <BackLink />

        {/* Banner */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
          className="w-full h-40 rounded-2xl overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #0D1F1F 0%, #081212 100%)' }}
        >
          {profile.banner_image_url && (
            <img src={profile.banner_image_url} alt="Banner" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(6,10,10,1) 0%, transparent 70%)' }} />
        </motion.div>

        {/* Identity card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="-mt-10 relative mx-2 px-5 py-5 rounded-2xl"
          style={{
            background: 'rgba(8,12,14,0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Avatar + name row — wraps on small screens */}
          <div className="flex flex-wrap items-start gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0"
              style={{ border: '2px solid rgba(29,161,161,0.35)', boxShadow: '0 0 20px rgba(29,161,161,0.12)' }}>
              {profile.profile_photo_url
                ? <img src={profile.profile_photo_url} alt={displayName} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #1DA1A1, #0D5C5C)' }}>
                    <span className="text-2xl font-black text-white">{displayName?.[0]?.toUpperCase()}</span>
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-white tracking-tight">{displayName}</h1>
                {isVerified && (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: TEAL }} />
                )}
              </div>
              {profile.username && (
                <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>@{profile.username}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {profileTypes.map(type => {
                  const cfg = PROFILE_TYPE_CONFIG[type];
                  if (!cfg) return null;
                  const isPrimary = type === primaryType;
                  return (
                    <span key={type} className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={isPrimary ? {
                        background: 'rgba(29,161,161,0.2)', color: '#00FFDA', border: '1px solid rgba(0,255,218,0.25)',
                      } : {
                        background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {cfg.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {verificationBadges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {verificationBadges.map(badge => {
                const cfg = VERIFICATION_BADGE_CONFIG[badge];
                if (!cfg) return null;
                return (
                  <span key={badge} className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'rgba(29,161,161,0.12)', color: TEAL, border: '1px solid rgba(29,161,161,0.25)' }}>
                    {cfg.label}
                  </span>
                );
              })}
            </div>
          )}

          {profile.bio && (
            <p className="text-sm mt-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{profile.bio}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-3">
            {profile.location_display && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <MapPin className="w-3 h-3" /> {profile.location_display}
              </span>
            )}
            {profile.website_url && (
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={e => e.currentTarget.style.color = TEAL}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
              >
                <Globe className="w-3 h-3" /> {profile.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
          </div>
        </motion.div>

        {/* Social links */}
        {publicSocials.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="px-5 py-4 rounded-2xl space-y-3"
            style={{ background: 'rgba(8,12,14,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Find Me Online
            </p>
            <div className="grid grid-cols-2 gap-2">
              {publicSocials.map((link, i) => <SocialPill key={i} link={link} />)}
            </div>
          </motion.div>
        )}

      </div>
    </HijinxPageShell>
  );
}