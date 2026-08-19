import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Globe, AtSign, CheckCircle } from 'lucide-react';
import { PROFILE_TYPE_CONFIG, VERIFICATION_BADGE_CONFIG } from '@/components/system/userCapabilities';

const MOTION = 'hsl(var(--motion))';
const MOTION_HOVER = 'hsl(var(--motion-hover))';

/**
 * Shared identity hero used on both My Garage and Public Profile.
 * isOwner = true means show edit prompts / completion hints.
 * Uses semantic tokens so it adapts to light/dark theme.
 */
export default function ProfileIdentityHero({ user, isOwner = false, completionPct = null }) {
  const displayName = user?.display_name || user?.full_name || user?.first_name || user?.username || 'Anonymous';
  const profileTypes = user?.profile_types || ['fan'];
  const primaryType = user?.primary_profile_type || 'fan';
  const verificationBadges = user?.verification_badges || [];
  const isVerified = user?.verification_status === 'verified';

  return (
    <div className="relative">
      {/* Banner */}
      <div className="w-full h-44 rounded-2xl overflow-hidden"
        style={{
          background: user?.banner_image_url
            ? undefined
            : 'linear-gradient(135deg, hsl(var(--surface-elevated)) 0%, hsl(var(--surface)) 40%, hsl(var(--canvas)) 100%)',
        }}
      >
        {user?.banner_image_url
          ? <img src={user.banner_image_url} alt="Banner" className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full flex items-end pb-4 px-6">
              <div className="w-full h-px" style={{ background: 'linear-gradient(90deg, hsl(var(--motion) / 0.6), transparent)' }} />
            </div>
          )
        }
        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 rounded-b-2xl"
          style={{ background: 'linear-gradient(to top, hsl(var(--canvas)) 0%, transparent 100%)' }} />
      </div>

      {/* Identity card — overlaps banner */}
      <div className="relative -mt-10 mx-2 px-5 pt-5 pb-5 rounded-2xl"
        style={{
          background: 'hsl(var(--surface-elevated) / 0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid hsl(var(--divider))',
          boxShadow: '0 8px 40px hsl(0 0% 0% / 0.25), inset 0 1px 0 hsl(var(--foreground) / 0.05)',
        }}
      >
        <div className="flex flex-wrap items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden"
            style={{ border: `2px solid ${MOTION}`, boxShadow: `0 0 20px ${MOTION} / 0.15` }}
          >
            {user?.profile_photo_url
              ? <img src={user.profile_photo_url} alt={displayName} className="w-full h-full object-cover" />
              : (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${MOTION} 0%, hsl(var(--motion-active)) 100%)` }}
                >
                  <span className="text-2xl font-black" style={{ color: 'hsl(var(--canvas))' }}>{displayName?.[0]?.toUpperCase() || '?'}</span>
                </div>
              )
            }
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + verified */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>{displayName}</h1>
              {isVerified && (
                <span title="Verified" style={{ color: MOTION }}>
                  <CheckCircle className="w-4 h-4" />
                </span>
              )}
            </div>

            {/* Username */}
            {user?.username && (
              <p className="text-xs font-mono mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                @{user.username}
              </p>
            )}

            {/* Profile type badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profileTypes.map(type => {
                const cfg = PROFILE_TYPE_CONFIG[type];
                if (!cfg) return null;
                const isPrimary = type === primaryType;
                return (
                  <span key={type}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={isPrimary ? {
                      background: `hsl(var(--motion) / 0.2)`,
                      color: MOTION,
                      border: `1px solid ${MOTION} / 0.4)`,
                    } : {
                      background: 'hsl(var(--surface-interactive) / 0.5)',
                      color: 'hsl(var(--foreground-secondary))',
                      border: '1px solid hsl(var(--divider))',
                    }}
                  >
                    {cfg.label}
                  </span>
                );
              })}
            </div>
          </div>

          {isOwner && (
            <Link to="/Profile" className="flex-shrink-0">
              <button className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                style={{ background: 'hsl(var(--surface-interactive) / 0.5)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive))'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground-secondary))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.5)'; }}
              >
                Edit Profile
              </button>
            </Link>
          )}
        </div>

        {/* Verification badges */}
        {verificationBadges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {verificationBadges.map(badge => {
              const cfg = VERIFICATION_BADGE_CONFIG[badge];
              if (!cfg) return null;
              return (
                <span key={badge} className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                  style={{ background: `hsl(var(--motion) / 0.15)`, color: MOTION, border: `1px solid ${MOTION} / 0.3)` }}>
                  {cfg.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Bio */}
        {user?.bio && (
          <p className="text-sm mt-4 leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>{user.bio}</p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 mt-3">
          {user?.location_display && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
              <MapPin className="w-3 h-3" /> {user.location_display}
            </span>
          )}
          {user?.website_url && (
            <a href={user.website_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: 'hsl(var(--foreground-quiet))' }}
              onMouseEnter={e => e.currentTarget.style.color = MOTION}
              onMouseLeave={e => e.currentTarget.style.color = 'hsl(var(--foreground-quiet))'}
            >
              <Globe className="w-3 h-3" /> {user.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          )}
        </div>

        {/* Completion hint for owner */}
        {isOwner && completionPct !== null && completionPct < 100 && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid hsl(var(--divider))' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'hsl(var(--foreground-quiet))' }}>Profile Strength</span>
              <span className="text-[10px] font-mono" style={{ color: MOTION }}>{completionPct}%</span>
            </div>
            <div className="w-full h-1 rounded-full" style={{ background: 'hsl(var(--surface-interactive))' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${completionPct}%`, background: `linear-gradient(90deg, ${MOTION}, ${MOTION_HOVER})` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}