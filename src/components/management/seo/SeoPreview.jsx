import React from 'react';
import { Search, Share2 } from 'lucide-react';

/**
 * SeoPreview — approximate search result and social share preview.
 *
 * This is an approximation only — not an exact representation of how Google
 * or social platforms will display the result.
 */
export default function SeoPreview({ config, pageKey }) {
  const site = config?.site || {};
  const page = pageKey ? (config?.pages?.[pageKey] || {}) : {};
  const defaults = config?.defaults || {};

  const titleSuffix = site.title_suffix || 'HIJINX';
  const title = page.title || 'Page Title';
  const fullTitle = `${title} | ${titleSuffix}`;
  const description = page.description || site.default_description || 'Page description.';
  const ogImage = page.og_image || site.default_og_image || '';
  const canonicalBase = (site.canonical_base_url || 'https://hijinx.com').replace(/^https?:\/\//, '');
  const path = page.canonical_path || '/';
  const url = canonicalBase + path;

  return (
    <div className="space-y-4">
      {/* Search Result Preview */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground-quiet uppercase tracking-wider mb-2">
          <Search className="w-3.5 h-3.5" /> Search Result (approximate)
        </div>
        <div className="border border-divider rounded-lg p-3 bg-surface">
          <div className="text-xs text-success truncate">{url}</div>
          <div className="text-base text-[#1a0dab] dark:text-[#8ab4f8] font-medium leading-snug truncate" style={{ color: '#1a0dab' }}>
            {fullTitle}
          </div>
          <div className="text-xs text-foreground-quiet line-clamp-2 mt-0.5">{description}</div>
        </div>
      </div>

      {/* Social Share Preview */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground-quiet uppercase tracking-wider mb-2">
          <Share2 className="w-3.5 h-3.5" /> Social Share (approximate)
        </div>
        <div className="border border-divider rounded-lg overflow-hidden bg-surface">
          {ogImage ? (
            <div className="aspect-[1.91/1] bg-surface-interactive overflow-hidden">
              <img src={ogImage} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="aspect-[1.91/1] bg-surface-interactive flex items-center justify-center text-xs text-foreground-quiet">
              No image
            </div>
          )}
          <div className="p-3">
            <div className="text-xs text-foreground-quiet uppercase tracking-wide truncate">{canonicalBase}</div>
            <div className="text-sm font-semibold text-foreground truncate">{fullTitle}</div>
            <div className="text-xs text-foreground-quiet line-clamp-2 mt-0.5">{description}</div>
          </div>
        </div>
      </div>
    </div>
  );
}