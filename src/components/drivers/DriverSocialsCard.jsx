import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Instagram, Twitter, Youtube, Facebook, Globe } from 'lucide-react';

export default function DriverSocialsCard({ media }) {
  if (!media) {
    return null;
  }

  const socials = [
    { icon: Instagram, label: 'Instagram', url: media.social_instagram },
    { icon: Twitter, label: 'X/Twitter', url: media.social_x },
    { icon: Youtube, label: 'YouTube', url: media.social_youtube },
    { icon: Facebook, label: 'Facebook', url: media.social_facebook },
    { icon: Globe, label: 'Website', url: media.website_url },
  ];

  const activeSocials = socials.filter(s => s.url);

  if (activeSocials.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Connect</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {activeSocials.map(social => {
            const Icon = social.icon;
            return (
              <a
                key={social.label}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{social.label}</span>
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}