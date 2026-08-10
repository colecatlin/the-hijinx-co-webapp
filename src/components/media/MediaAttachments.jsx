import React from 'react';
import { Download, ExternalLink, File } from 'lucide-react';

export default function MediaAttachments({ media }) {
  if (!media) return null;

  const attachments = [];
  if (media.file_url) {
    attachments.push({ label: 'Download Original', url: media.file_url, icon: Download });
  }
  if (media.external_links?.length > 0) {
    attachments.push(...media.external_links.map(l => ({ label: l.label, url: l.url, icon: ExternalLink })));
  }

  if (attachments.length === 0) return null;

  return (
    <div className="p-4 rounded-lg border border-divider">
      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary mb-3">Attachments & Links</h3>
      <div className="space-y-2">
        {attachments.map((att, idx) => {
          const Icon = att.icon || File;
          return (
            <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg border border-divider hover:border-motion transition-colors text-sm text-foreground-secondary hover:text-motion">
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{att.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}