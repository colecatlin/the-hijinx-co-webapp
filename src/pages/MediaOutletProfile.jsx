import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, CheckCircle2, ArrowLeft, Users } from 'lucide-react';
import { isPublicOutlet, isPublicProfile, isOutletShowcaseAsset, OUTLET_TYPE_LABELS, SOCIAL_ICONS, ROLE_LABELS } from '@/components/media/public/mediaPublicHelpers';
import { Image } from 'lucide-react';
import { createPageUrl } from '@/components/utils';

function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400 text-lg font-medium mb-4">Outlet not found or not public</p>
        <Link to="/media-outlets">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" /> Back to Outlets</Button>
        </Link>
      </div>
    </div>
  );
}

export default function MediaOutletProfile() {
  const { slug } = useParams();

  const { data: outlet, isLoading } = useQuery({
    queryKey: ['outletBySlug', slug],
    queryFn: async () => {
      const results = await base44.entities.MediaOutlet.filter({ slug });
      return results[0] || null;
    },
    enabled: !!slug,
  });

  // Fetch public contributor profiles
  const { data: contributors = [] } = useQuery({
    queryKey: ['outletContributors', outlet?.contributor_profile_ids],
    queryFn: async () => {
      const profileIds = outlet.contributor_profile_ids || [];
      if (profileIds.length === 0) return [];
      const all = await base44.entities.MediaProfile.list('-created_date', 200);
      return all.filter(p => profileIds.includes(p.id) && isPublicProfile(p));
    },
    enabled: !!outlet?.id,
  });

  // Rights-aware outlet showcase assets
  const { data: outletAssets = [] } = useQuery({
    queryKey: ['outletShowcaseAssets', outlet?.id],
    queryFn: async () => {
      const byOutlet = await base44.entities.MediaAsset.filter({ owner_outlet_id: outlet.id });
      const featured = await base44.entities.MediaAsset.filter({ featured_on_outlet_profile: true });
      const seen = new Set();
      return [...byOutlet, ...featured].filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return isOutletShowcaseAsset(a, outlet);
      }).slice(0, 12);
    },
    enabled: !!outlet?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!outlet || !isPublicOutlet(outlet)) return <NotFound />;

  const isVerified = outlet.verification_status === 'verified' || outlet.verification_status === 'featured';
  const isFeatured = outlet.verification_status === 'featured';
  const socialLinks = outlet.social_links || {};
  const typeLabel = OUTLET_TYPE_LABELS[outlet.outlet_type] || outlet.outlet_type;

  return (
    <div className="min-h-screen bg-white">
      {/* Cover */}
      <div className="h-48 sm:h-56 bg-gradient-to-r from-gray-900 to-gray-700 relative overflow-hidden">
        {outlet.cover_image_url && (
          <img src={outlet.cover_image_url} alt="" className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute top-4 left-4">
          <Link to="/media-outlets" className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Media Outlets
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-end gap-5 -mt-10 mb-6 relative z-10">
          {outlet.logo_url ? (
            <img
              src={outlet.logo_url}
              alt={outlet.name}
              className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg bg-white"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center">
              <span className="text-gray-400 font-black text-3xl">{(outlet.name || '?')[0]}</span>
            </div>
          )}
          <div className="pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{outlet.name}</h1>
              {isVerified && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
              {isFeatured && <Badge className="bg-amber-500 text-white">Featured</Badge>}
            </div>
            <p className="text-gray-500 font-medium">{typeLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-6 pb-16">
          {/* Main */}
          <div className="lg:col-span-2 space-y-8">
            {outlet.description && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">About</h2>
                <p className="text-gray-700 leading-relaxed">{outlet.description}</p>
              </section>
            )}

            {outlet.specialties?.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Specialties</h2>
                <div className="flex flex-wrap gap-2">
                  {outlet.specialties.map(s => (
                    <Badge key={s} className="bg-gray-100 text-gray-700 font-normal">{s}</Badge>
                  ))}
                </div>
              </section>
            )}

            {outlet.series_covered?.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Series Covered</h2>
                <div className="flex flex-wrap gap-2">
                  {outlet.series_covered.map(s => (
                    <Badge key={s} className="bg-blue-50 text-blue-700 font-normal border-0">{s}</Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Outlet showcase assets */}
            {outletAssets.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Featured Work</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {outletAssets.map(asset => (
                    <div key={asset.id} className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                      {(asset.thumbnail_url || asset.file_url) ? (
                        <img src={asset.thumbnail_url || asset.file_url} alt={asset.title || ''} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Contributors */}
            {contributors.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Contributors ({contributors.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contributors.map(p => (
                    <Link
                      key={p.id}
                      to={`/creators/${p.slug}`}
                      className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors"
                    >
                      {p.profile_image_url ? (
                        <img src={p.profile_image_url} alt={p.display_name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 font-bold">{(p.display_name || '?')[0]}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-gray-900 text-sm font-medium truncate">{p.display_name}</p>
                          {(p.verification_status === 'verified' || p.verification_status === 'featured') && (
                            <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-gray-500 text-xs">{ROLE_LABELS[p.primary_role] || p.primary_role}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
              {outlet.website_url && (
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <a href={outlet.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate">
                    {outlet.website_url.replace(/^https?:\/\//, '')}
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

            {isVerified && (
              <div className="bg-gray-50 rounded-2xl p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Recognition</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-700 text-sm">{isFeatured ? 'Featured Outlet' : 'Verified Outlet'}</span>
                </div>
              </div>
            )}

            <Link to={createPageUrl('MediaPortal')}>
              <Button variant="outline" className="w-full text-sm">Join as a Contributor</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}