import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Camera, FileText, PenLine, Video, Image } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import CreatorCard from '@/components/media/public/CreatorCard';
import OutletCard from '@/components/media/public/OutletCard';
import { isPublicProfile, isPublicOutlet, isMediaHomeFeaturedAsset } from '@/components/media/public/mediaPublicHelpers';

export default function MediaHome() {
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['publicMediaProfiles'],
    queryFn: () => base44.entities.MediaProfile.list('-created_date', 100),
    select: data => data.filter(isPublicProfile),
  });

  const { data: allOutlets = [] } = useQuery({
    queryKey: ['publicMediaOutlets'],
    queryFn: () => base44.entities.MediaOutlet.list('-created_date', 100),
    select: data => data.filter(isPublicOutlet),
  });

  const { data: featuredAssets = [] } = useQuery({
    queryKey: ['featuredMediaAssets'],
    queryFn: () => base44.entities.MediaAsset.filter({ featured_on_media_home: true }),
    select: data => data.filter(isMediaHomeFeaturedAsset),
  });

  const featuredCreators = allProfiles.filter(p => p.verification_status === 'featured' || p.verification_status === 'verified').slice(0, 6);
  const previewCreators = allProfiles.slice(0, 4);
  const featuredOutlets = allOutlets.filter(o => o.verification_status === 'featured').slice(0, 4);
  const previewOutlets = featuredOutlets.length > 0 ? featuredOutlets : allOutlets.slice(0, 4);

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ── */}
      <section className="bg-[#0A0A0A] text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="max-w-3xl">
            <Badge className="bg-white/10 text-gray-300 border border-white/10 mb-5">Media Ecosystem</Badge>
            <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-5">
              The Motorsports<br />Media Community
            </h1>
            <p className="text-gray-400 text-lg mb-8 max-w-xl">
              Discover the photographers, writers, videographers, and media brands covering grassroots and professional motorsports across the HIJINX platform.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/creators">
                <Button className="bg-white text-black hover:bg-gray-100 font-semibold gap-2">
                  Browse Creators <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/media-outlets">
                <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-white/10 gap-2">
                  Browse Outlets
                </Button>
              </Link>
              <Link to={createPageUrl('MediaPortal')}>
                <Button variant="ghost" className="text-gray-400 hover:text-white gap-2">
                  Apply to Join
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED CREATORS ── */}
      {(featuredCreators.length > 0 || allProfiles.length > 0) && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Creators</p>
              <h2 className="text-2xl font-black text-gray-900">Featured Creators</h2>
            </div>
            <Link to="/creators" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {featuredCreators.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredCreators.map(p => <CreatorCard key={p.id} profile={p} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {previewCreators.map(p => <CreatorCard key={p.id} profile={p} />)}
            </div>
          )}
          {allProfiles.length === 0 && (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl">
              <Camera className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Creator profiles coming soon</p>
              <p className="text-gray-300 text-sm mt-1">Be among the first to apply and build your public profile.</p>
            </div>
          )}
        </section>
      )}

      {/* ── FEATURED WORK ── */}
      {featuredAssets.length > 0 && (
        <section className="bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Work</p>
              <h2 className="text-2xl font-black text-gray-900">Featured Work</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredAssets.slice(0, 8).map(asset => (
                <div key={asset.id} className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                  {asset.thumbnail_url || asset.file_url ? (
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      <img src={asset.thumbnail_url || asset.file_url} alt={asset.title || ''} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <div className="p-3">
                    {asset.title && <p className="text-gray-700 text-xs font-medium truncate">{asset.title}</p>}
                    <p className="text-gray-400 text-[10px] mt-0.5">{asset.asset_type || 'Asset'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURED OUTLETS ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Outlets</p>
            <h2 className="text-2xl font-black text-gray-900">Media Outlets</h2>
          </div>
          <Link to="/media-outlets" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {previewOutlets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {previewOutlets.map(o => <OutletCard key={o.id} outlet={o} />)}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl">
            <p className="text-gray-400 font-medium">Outlet profiles coming soon</p>
          </div>
        )}
      </section>

      {/* ── WHY JOIN ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Join</p>
            <h2 className="text-3xl font-black text-white mb-3">Built for Motorsports Media</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Whether you write, shoot, film, or broadcast — the HIJINX media ecosystem is built to support your work.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[
              { icon: PenLine, title: 'Writers & Journalists', desc: 'Build a public portfolio, connect with outlets, get credentials to cover events.' },
              { icon: Camera, title: 'Photographers', desc: 'Upload and showcase your work, manage usage rights, and affiliate with outlets.' },
              { icon: Video, title: 'Videographers', desc: 'Log your video work, manage media access credentials, and grow your audience.' },
              { icon: FileText, title: 'Outlets & Brands', desc: 'Build an official outlet profile, manage contributors, and expand your coverage.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <Icon className="w-6 h-6 text-gray-400 mb-3" />
                <p className="text-white font-semibold text-sm mb-1">{title}</p>
                <p className="text-gray-500 text-xs">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link to={createPageUrl('MediaPortal')}>
              <Button className="bg-white text-black hover:bg-gray-100 font-semibold gap-2">
                Apply to Be Media <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CREATOR DIRECTORY PREVIEW ── */}
      {allProfiles.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Explore</p>
              <h2 className="text-2xl font-black text-gray-900">Creator Directory</h2>
            </div>
            <Link to="/creators" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium">
              Browse all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {previewCreators.map(p => <CreatorCard key={p.id} profile={p} />)}
          </div>
          <div className="text-center mt-8">
            <Link to="/creators">
              <Button variant="outline" className="gap-2 font-medium">
                View Full Directory <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* ── STORY/TIP CTA ── */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-2">Have a Story or Tip?</h2>
          <p className="text-gray-500 mb-6">Submit a story pitch, race report, or tip to The Outlet. Open to all members.</p>
          <Link to={createPageUrl('OutletSubmit')}>
            <Button className="bg-[#0A0A0A] text-white hover:bg-gray-900 gap-2 font-semibold">
              Submit a Story <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}