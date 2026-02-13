import React from 'react';
import { Instagram, Facebook, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TrackSocial({ track }) {
  const socials = [
    { name: 'Instagram', url: track.social_instagram, icon: Instagram },
    { name: 'Facebook', url: track.social_facebook, icon: Facebook },
    { name: 'YouTube', url: track.social_youtube, icon: Youtube },
    { name: 'TikTok', url: track.social_tiktok, icon: null }
  ].filter(s => s.url);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Social Media</h2>
      
      {socials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {socials.map(social => {
            const Icon = social.icon;
            return (
              <a 
                key={social.name} 
                href={social.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full justify-start gap-3">
                  {Icon && <Icon className="w-5 h-5" />}
                  <span>{social.name}</span>
                </Button>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-gray-600">No social media links available</p>
        </div>
      )}
    </div>
  );
}