import React, { useState } from 'react';
import { useOnboardingWizard } from '@/components/onboarding/OnboardingWizardContext';
import MediaUploader from '@/components/shared/MediaUploader';
import SocialLinksEditor from '@/components/profile/SocialLinksEditor';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const TEAL = '#1DA1A1';

export default function AboutStage() {
  const { user, saveAbout } = useOnboardingWizard();
  const [photoUrl, setPhotoUrl] = useState(user?.profile_photo_url || '');
  const [bannerUrl, setBannerUrl] = useState(user?.banner_image_url || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [locationDisplay, setLocationDisplay] = useState(user?.location_display || '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.website_url || '');
  const [socialLinks, setSocialLinks] = useState(user?.social_links || []);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    setSaving(true);
    try {
      await saveAbout({
        profile_photo_url: photoUrl,
        banner_image_url: bannerUrl,
        bio,
        location_display: locationDisplay,
        website_url: websiteUrl,
        social_links: socialLinks,
      });
    } catch (e) {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile photo */}
      <div>
        <Label className="text-white text-xs">Profile photo <span className="text-white/30 font-normal">(optional)</span></Label>
        <div className="mt-1.5">
          <MediaUploader value={photoUrl} onChange={setPhotoUrl} accept="image/*" hint="Square works best." />
        </div>
      </div>

      {/* Banner */}
      <div>
        <Label className="text-white text-xs">Banner image <span className="text-white/30 font-normal">(optional)</span></Label>
        <div className="mt-1.5">
          <MediaUploader value={bannerUrl} onChange={setBannerUrl} accept="image/*" hint="Wide image for your profile header." />
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label className="text-white text-xs">Bio <span className="text-white/30 font-normal">(optional)</span></Label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder="A short line about you and motorsports."
          className="w-full rounded-lg px-3 py-2 text-sm focus-visible:outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label className="text-white text-xs">Location <span className="text-white/30 font-normal">(optional)</span></Label>
        <input
          value={locationDisplay}
          onChange={(e) => setLocationDisplay(e.target.value)}
          placeholder="Phoenix, AZ"
          className="w-full h-11 rounded-lg px-3 text-sm focus-visible:outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
        />
      </div>

      {/* Website */}
      <div className="space-y-2">
        <Label className="text-white text-xs">Website <span className="text-white/30 font-normal">(optional)</span></Label>
        <input
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://yoursite.com"
          className="w-full h-11 rounded-lg px-3 text-sm focus-visible:outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
        />
      </div>

      {/* Social links */}
      <div className="space-y-2">
        <Label className="text-white text-xs">Social links <span className="text-white/30 font-normal">(optional)</span></Label>
        <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} />
      </div>

      <Button
        onClick={handleContinue}
        disabled={saving}
        className="w-full gap-2 h-11 text-sm font-bold"
        style={{ background: TEAL, color: '#050A0A' }}
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Continue'}
      </Button>
    </div>
  );
}