import React from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

/**
 * SeoHealth — lightweight SEO diagnostics panel.
 *
 * Checks the current draft config for common issues. All findings are
 * warnings — nothing is "invalid" (structural validation happens on save).
 */
export default function SeoHealth({ config }) {
  const checks = [];

  if (!config) return null;

  const site = config.site || {};
  const pages = config.pages || {};

  // Site-level checks
  if (site.default_description) {
    if (site.default_description.length > 200) {
      checks.push({ level: 'warn', msg: 'Default description is potentially long', detail: `${site.default_description.length} characters` });
    } else if (site.default_description.length < 50) {
      checks.push({ level: 'warn', msg: 'Default description is potentially short', detail: `${site.default_description.length} characters` });
    } else {
      checks.push({ level: 'ok', msg: 'Default description length looks good' });
    }
  } else {
    checks.push({ level: 'warn', msg: 'No default description set' });
  }

  if (site.default_og_image) {
    checks.push({ level: 'ok', msg: 'Default OG image configured' });
  } else {
    checks.push({ level: 'warn', msg: 'No default OG image set' });
  }

  if (site.canonical_base_url) {
    try {
      new URL(site.canonical_base_url);
      checks.push({ level: 'ok', msg: 'Canonical base URL is valid', detail: site.canonical_base_url });
    } catch {
      checks.push({ level: 'error', msg: 'Canonical base URL is invalid', detail: site.canonical_base_url });
    }
  } else {
    checks.push({ level: 'warn', msg: 'No canonical base URL set — will use hardcoded fallback' });
  }

  // Page-level checks
  const seenTitles = {};
  for (const [key, page] of Object.entries(pages)) {
    if (!page || typeof page !== 'object') continue;
    const label = key.charAt(0).toUpperCase() + key.slice(1);

    if (!page.title) {
      checks.push({ level: 'warn', msg: `${label} page has no title` });
    } else {
      if (page.title.length > 70) {
        checks.push({ level: 'warn', msg: `${label} title is potentially long`, detail: `${page.title.length} chars` });
      }
      if (page.title.length < 10) {
        checks.push({ level: 'warn', msg: `${label} title is potentially short`, detail: `${page.title.length} chars` });
      }
      if (seenTitles[page.title]) {
        checks.push({ level: 'warn', msg: `Duplicate title: "${seenTitles[page.title]}" and "${key}"` });
      } else {
        seenTitles[page.title] = key;
      }
    }

    if (!page.description) {
      checks.push({ level: 'info', msg: `${label} page has no description (will use default)` });
    }
  }

  const okCount = checks.filter((c) => c.level === 'ok').length;
  const warnCount = checks.filter((c) => c.level === 'warn').length;
  const errorCount = checks.filter((c) => c.level === 'error').length;
  const infoCount = checks.filter((c) => c.level === 'info').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="w-3.5 h-3.5" /> {okCount} ok</span>
        <span className="inline-flex items-center gap-1 text-warning"><AlertTriangle className="w-3.5 h-3.5" /> {warnCount} warnings</span>
        {errorCount > 0 && (
          <span className="inline-flex items-center gap-1 text-danger"><XCircle className="w-3.5 h-3.5" /> {errorCount} errors</span>
        )}
        {infoCount > 0 && (
          <span className="inline-flex items-center gap-1 text-foreground-quiet"><Info className="w-3.5 h-3.5" /> {infoCount} info</span>
        )}
      </div>

      <div className="space-y-1.5">
        {checks.map((c, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            {c.level === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />}
            {c.level === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />}
            {c.level === 'error' && <XCircle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />}
            {c.level === 'info' && <Info className="w-3.5 h-3.5 text-foreground-quiet flex-shrink-0 mt-0.5" />}
            <div>
              <span className="text-foreground">{c.msg}</span>
              {c.detail && <span className="text-foreground-quiet ml-1">({c.detail})</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}