import React from 'react';
import SocialShareButtons from '@/components/shared/SocialShareButtons';

export default function MediaSharePanel({ media }) {
  if (!media) return null;

  const url = typeof window !== 'undefined' ? window.location.href : `https://hijinxco.com${media.canonical_url || ''}`;
  const title = media.title || 'HIJINX Media';
  const description = media.description || media.subtitle || '';

  return (
    <div className="p-4 rounded-lg border border-divider">
      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary mb-3">Share</h3>
      <SocialShareButtons url={url} title={title} description={description} />
    </div>
  );
}