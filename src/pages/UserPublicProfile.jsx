import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/components/utils';
import { MapPin, Globe, ArrowLeft, ExternalLink } from 'lucide-react';
import {
  PROFILE_TYPE_CONFIG,
  VERIFICATION_BADGE_CONFIG,
  SOCIAL_PLATFORM_CONFIG,
} from '@/components/system/userCapabilities';

function SocialIcon({ platform }) {
  const labels = { instagram: 'IG', tiktok: 'TT', youtube: 'YT', facebook: 'FB', x: 'X', threads: 'TH', linkedin: 'LI', snapchat: 'SC', discord: 'DC', twitch: 'TV', website: '🌐' };
  return <span className="text-xs font-bold">{labels[platform] || platform.slice(0, 2).toUpperCase()}</span>;
}

export default function UserPublicProfile() {
  const { username } = useParams();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['publicProfile', username],
    queryFn: () => base44.entities.User.filter({ username_slug: username?.toLowerCase() }, '-created_date', 1),
    enabled: !!username,
  });

  const profileUser = users[0] || null;

  if (isLoading) {
    return (
      <PageShell className="bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (!profileUser || profileUser.profile_visibility === 'private') {
    return (
      <PageShell className="bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Profile not found</h1>
          <p className="text-gray-400 text-sm">This profile doesn't exist or is set to private.</p>
          <Link to={createPageUrl('Home')}>
            <Button variant="outline" size="sm" className="gap-2 mt-4">
              <ArrowLeft className="w-4 h-4" /> Back to HIJINX
            </Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  const profileTypes = profileUser.profile_types || ['fan'];
  const primaryType = profileUser.primary_profile_type || 'fan';
  const verificationBadges = profileUser.verification_badges || [];
  const publicSocials = (profileUser.social_links || []).filter(l => l.public_enabled !== false);
  const displayName = profileUser.display_name || profileUser.full_name || profileUser.first_name || username;

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* Back nav */}
        <Link to={createPageUrl('Home')}>
          <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> HIJINX
          </button>
        </Link>

        {/* Banner */}
        {profileUser.banner_image_url ? (
          <div className="w-full h-36 rounded-2xl overflow-hidden bg-gray-200">
            <img src={profileUser.banner_image_url} alt="Banner" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-36 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700" />
        )}

        {/* Identity card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 -mt-10 relative">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl border-2 border-white bg-gray-200 flex-shrink-0 overflow-hidden shadow-sm">
              {profileUser.profile_photo_url ? (
                <img src={profileUser.profile_photo_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <span className="text-xl font-bold text-gray-400">
                    {displayName?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
                {profileUser.verification_status === 'verified' && (
                  <span className="w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0" title="Verified">
                    <span className="text-white text-[9px] font-black">✓</span>
                  </span>
                )}
              </div>
              {profileUser.username && (
                <p className="text-sm text-gray-400 mt-0.5">@{profileUser.username}</p>
              )}

              {/* Profile type badges */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {profileTypes.map(type => {
                  const config = PROFILE_TYPE_CONFIG[type];
                  if (!config) return null;
                  return (
                    <span key={type} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${config.color} ${type === primaryType ? 'ring-1 ring-current' : ''}`}>
                      {config.label}
                    </span>
                  );
                })}
              </div>

              {/* Verification badges */}
              {verificationBadges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {verificationBadges.map(badge => {
                    const config = VERIFICATION_BADGE_CONFIG[badge];
                    if (!config) return null;
                    return (
                      <span key={badge} className={`px-2 py-0.5 rounded-full text-xs font-bold ${config.color}`}>
                        {config.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          {profileUser.bio && (
            <p className="text-sm text-gray-600 mt-4 leading-relaxed">{profileUser.bio}</p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {profileUser.location_display && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <MapPin className="w-3 h-3" /> {profileUser.location_display}
              </span>
            )}
            {profileUser.website_url && (
              <a href={profileUser.website_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                <Globe className="w-3 h-3" /> {profileUser.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
          </div>

          {/* Social links */}
          {publicSocials.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              {publicSocials.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  title={SOCIAL_PLATFORM_CONFIG[link.platform]?.label || link.platform}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400 hover:bg-white transition-all text-xs font-medium">
                  <SocialIcon platform={link.platform} />
                  {link.handle && <span>{link.handle}</span>}
                </a>
              ))}
            </div>
          )}
        </div>

      </div>
    </PageShell>
  );
}