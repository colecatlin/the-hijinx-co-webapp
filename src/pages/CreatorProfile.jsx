import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Globe, CheckCircle2, ArrowLeft, Building2, Shield } from 'lucide-react';
import { deriveCredentialSignals } from '@/components/media/credentials/credentialHelpers.jsx';
import { isPublicProfile, isCreatorPortfolioAsset, ROLE_LABELS, SOCIAL_ICONS, OUTLET_TYPE_LABELS } from '@/components/media/public/mediaPublicHelpers.jsx';
import { createPageUrl } from '@/components/utils';

function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400 text-lg font-medium mb-4">Creator not found or profile not public</p>
        <Link to="/creators">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" /> Back to Directory</Button>
        </Link>
      </div>
    </div>
  );
}

export default function CreatorProfile() {
  const { slug } = useParams();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['creatorProfileBySlug', slug],
    queryFn: async () => {
      const results = await base44.entities.MediaProfile.filter({ slug });
      return results[0] || null;
    },
    enabled: !!slug,
  });

  // Rights-aware creator portfolio assets
  const { data: publicAssets = [] } = useQuery({
    queryKey: ['creatorPortfolioAssets', profile?.id, profile?.user_id],
    queryFn: async () => {
      // Fetch by owner_profile_id (preferred) or owner_user_id
      const [byProfile, byUser] = await Promise.all([
        profile.id ? base44.entities.MediaAsset.filter({ owner_profile_id: profile.id }) : Promise.resolve([]),
        profile.user_id ? base44.entities.MediaAsset.filter({ owner_user_id: profile.user_id }) : Promise.resolve([]),
      ]);
      const seen = new Set();
      const all = [...byProfile, ...byUser].filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
      // Apply rights-aware portfolio filter
      return all
        .filter(a => isCreatorPortfolioAsset(a, profile))
        .sort((a, b) => (b.featured_on_creator_profile ? 1 : 0) - (a.featured_on_creator_profile ? 1 : 0))
        .slice(0, 12);
    },
    enabled: !!(profile?.id || profile?.user_id),
  });

  // Featured outlet stories by author name
  const { data: stories = [] } = useQuery({
    queryKey: ['creatorStories', profile?.display_name],
    queryFn: () => base44.entities.OutletStory.filter({ author: profile.display_name, status: 'published' }, '-published_date', 6),
    enabled: !!profile?.display_name,
  });

  // Credentials for credibility signals (only if profile has a user_id to link to MediaUser)
  const { data: creatorCredentials = [] } = useQuery({
    queryKey: ['creatorPublicCredentials', profile?.id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      // Find the MediaUser record linked to this profile's user
      const mediaUsers = await base44.entities.MediaUser.filter({ user_id: profile.user_id });
      const mediaUserId = mediaUsers[0]?.id;
      if (!mediaUserId) return [];
      const creds = await base44.entities.MediaCredential.filter({ holder_media_user_id: mediaUserId });
      // Only surface active or recently expired — no private notes
      return creds.filter(c => ['active', 'expired'].includes(c.status)).slice(0, 8);
    },
    enabled: !!(profile?.user_id),
  });

  const { data: eventNames = {} } = useQuery({
    queryKey: ['eventNamesForCreator'],
    queryFn: async () => {
      if (creatorCredentials.length === 0) return {};
      const eventIds = [...new Set(creatorCredentials.filter(c => c.scope_entity_type === 'event').map(c => c.scope_entity_id).filter(Boolean))];
      if (eventIds.length === 0) return {};
      const all = await base44.entities.Event.list();
      return Object.fromEntries(all.filter(e => eventIds.includes(e.id)).map(e => [e.id, e.name]));
    },
    enabled: creatorCredentials.length > 0,
  });

  const credentialSignals = deriveCredentialSignals(creatorCredentials);

  // Primary outlet
  const { data: primaryOutlet } = useQuery({
    queryKey: ['outletById', profile?.primary_outlet_id],
    queryFn: () => base44.entities.MediaOutlet.get(profile.primary_outlet_id),
    enabled: !!profile?.primary_outlet_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile || !isPublicProfile(profile)) return <NotFound />;

  const location = [profile.location_city, profile.location_state, profile.location_country].filter(Boolean).join(', ');
  const isVerified = profile.verification_status === 'verified' || profile.verification_status === 'featured';
  const isFeatured = profile.verification_status === 'featured';
  const socialLinks = profile.social_links || {};

  return (
    <div className="min-h-screen bg-white">
      {/* Cover */}
      <div className="h-48 sm:h-64 bg-gradient-to-r from-gray-900 to-gray-700 relative overflow-hidden">
        {profile.cover_image_url && (
          <img src={profile.cover_image_url} alt="" className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute top-4 left-4">
          <Link to="/creators" className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Creator Directory
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6">
        {/* Profile header */}
        <div className="flex items-end gap-4 -mt-10 mb-6 relative z-10">
          {profile.profile_image_url ? (
            <img
              src={profile.profile_image_url}
              alt={profile.display_name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center">
              <span className="text-gray-500 font-black text-3xl">{(profile.display_name || '?')[0]}</span>
            </div>
          )}
          <div className="pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{profile.display_name}</h1>
              {isVerified && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
              {isFeatured && <Badge className="bg-amber-500 text-white">Featured</Badge>}
            </div>
            <p className="text-gray-500 font-medium">{ROLE_LABELS[profile.primary_role] || profile.primary_role}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio */}
            {profile.bio && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">About</h2>
                <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
              </section>
            )}

            {/* Specialties */}
            {profile.specialties?.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Specialties</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.map(s => (
                    <Badge key={s} className="bg-gray-100 text-gray-700 font-normal">{s}</Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Role tags */}
            {profile.role_tags?.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Also Works As</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.role_tags.map(r => (
                    <Badge key={r} variant="outline" className="text-gray-600 font-normal">{ROLE_LABELS[r] || r}</Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Series covered */}
            {profile.series_covered?.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Series Covered</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.series_covered.map(s => (
                    <Badge key={s} className="bg-blue-50 text-blue-700 font-normal border-0">{s}</Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Credentialed Events */}
            {creatorCredentials.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Credentialed Events
                </h2>
                <div className="flex flex-wrap gap-2">
                  {creatorCredentials.map(cred => {
                    const name = cred.scope_entity_type === 'event'
                      ? (eventNames[cred.scope_entity_id] || 'Event')
                      : cred.scope_entity_id?.slice(0, 8);
                    const isActive = cred.status === 'active';
                    return (
                      <div key={cred.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                          isActive
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}
                      >
                        {isActive && <CheckCircle2 className="w-3 h-3" />}
                        {name}
                        {cred.access_level && cred.access_level !== 'general' && (
                          <span className="opacity-60 capitalize">· {cred.access_level.replace(/_/g, ' ')}</span>
                        )}
                        {cred.issued_at && (
                          <span className="opacity-50">{new Date(cred.issued_at).getFullYear()}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Featured assets */}
            {publicAssets.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Work</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {publicAssets.map(asset => (
                    <div key={asset.id} className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                      {(asset.thumbnail_url || asset.file_url) ? (
                        <img src={asset.thumbnail_url || asset.file_url} alt={asset.title || ''} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-gray-400 text-xs text-center px-2">{asset.title || asset.asset_type}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Published stories */}
            {stories.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Published Stories</h2>
                <div className="space-y-3">
                  {stories.map(story => (
                    <Link
                      key={story.id}
                      to={`/story/${story.slug}`}
                      className="block bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                    >
                      {story.cover_image && (
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
                          <img src={story.cover_image} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <p className="text-gray-900 font-semibold text-sm">{story.title}</p>
                      {story.subtitle && <p className="text-gray-500 text-xs mt-1 line-clamp-2">{story.subtitle}</p>}
                      {story.published_date && (
                        <p className="text-gray-400 text-xs mt-1.5">{new Date(story.published_date).toLocaleDateString()}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Info card */}
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
              {location && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-gray-600 text-sm">{location}</span>
                </div>
              )}
              {profile.website_url && (
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate">
                    {profile.website_url.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {Object.entries(socialLinks).filter(([, v]) => v).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm w-4 text-center">{SOCIAL_ICONS[key] || '→'}</span>
                  <a href={val.startsWith('http') ? val : `https://${val}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate">
                    {val.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                </div>
              ))}
            </div>

            {/* Outlet affiliation */}
            {primaryOutlet && (
              <div className="bg-gray-50 rounded-2xl p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Primary Outlet</p>
                <Link to={`/media-outlets/${primaryOutlet.slug}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  {primaryOutlet.logo_url ? (
                    <img src={primaryOutlet.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-200" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-gray-900 text-sm font-semibold">{primaryOutlet.name}</p>
                    <p className="text-gray-500 text-xs">{OUTLET_TYPE_LABELS[primaryOutlet.outlet_type] || primaryOutlet.outlet_type}</p>
                  </div>
                </Link>
              </div>
            )}

            {/* Trust signals */}
            {(isVerified || profile.credentialed_media || credentialSignals.credentialed_media || credentialSignals.experienced_media) && (
              <div className="bg-gray-50 rounded-2xl p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recognition</p>
                <div className="space-y-2">
                  {isVerified && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-700 text-sm">{isFeatured ? 'Featured Creator' : 'Verified Creator'}</span>
                    </div>
                  )}
                  {(profile.credentialed_media || credentialSignals.credentialed_media) && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-gray-700 text-sm">Credentialed Media</span>
                    </div>
                  )}
                  {credentialSignals.experienced_media && (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-teal-500" />
                      <span className="text-gray-700 text-sm">Experienced Media ({credentialSignals.total_credential_count} credentials)</span>
                    </div>
                  )}
                  {credentialSignals.verified_event_media && (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      <span className="text-gray-700 text-sm">Active Event Coverage</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Link to={createPageUrl('MediaPortal')}>
              <Button variant="outline" className="w-full text-sm gap-2">
                Join the Media Ecosystem
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}