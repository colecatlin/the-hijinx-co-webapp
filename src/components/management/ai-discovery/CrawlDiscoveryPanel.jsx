import React, { useEffect, useState } from 'react';
import { Globe, Map, FileText, Link2, Info, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { SectionCard, CheckRow, PriorityBadge } from './shared';

export default function CrawlDiscoveryPanel({ diagnostics }) {
  const canonical = diagnostics?.canonical || {};
  const [sitemapStatus, setSitemapStatus] = useState(null);
  const [robotsStatus, setRobotsStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEndpoints = async () => {
    setLoading(true);
    try {
      const [sitemapRes, robotsRes] = await Promise.all([
        fetch('/sitemap.xml').catch(() => null),
        fetch('/robots.txt').catch(() => null),
      ]);

      // Parse sitemap
      let sitemap = { available: false, entries: 0, entityTypes: [] };
      if (sitemapRes?.ok) {
        const xml = await sitemapRes.text();
        const locCount = (xml.match(/<loc>/g) || []).length;
        const hasRacers = /\/racers\//.test(xml);
        const hasTracks = /\/tracks\//.test(xml);
        const hasSeries = /\/series\//.test(xml);
        const hasEvents = /\/events\//.test(xml);
        const hasStories = /\/story\//.test(xml);
        sitemap = {
          available: true,
          entries: locCount,
          entityTypes: [
            hasRacers && 'Racers',
            hasTracks && 'Tracks',
            hasSeries && 'Series',
            hasEvents && 'Events',
            hasStories && 'Outlet Stories',
          ].filter(Boolean),
        };
      }

      // Parse robots
      let robots = { available: false, hasSitemap: false, blocksManagement: false };
      if (robotsRes?.ok) {
        const txt = await robotsRes.text();
        robots = {
          available: true,
          hasSitemap: /Sitemap:\s*https?:\/\//i.test(txt),
          blocksManagement: /Disallow:\s*\/management\//i.test(txt),
          blocksRaceCore: /Disallow:\s*\/racecore\//i.test(txt),
          blocksAdmin: /Disallow:\s*\/admin\//i.test(txt),
        };
      }

      setSitemapStatus(sitemap);
      setRobotsStatus(robots);
    } catch {
      setSitemapStatus({ available: false, entries: 0, entityTypes: [] });
      setRobotsStatus({ available: false });
    }
    setLoading(false);
  };

  useEffect(() => { fetchEndpoints(); }, []);

  const relCoverage = diagnostics?.relationship_coverage || {};

  return (
    <div className="space-y-4">
      {/* ── Canonical Health ────────────────────────────────────────────────── */}
      <SectionCard title="Canonical Health" icon={Globe}>
        <div className="space-y-1">
          <CheckRow label="Production base URL" ok={!!canonical.configured_base_url} detail={canonical.configured_base_url || canonical.fallback} />
          <CheckRow label="Canonical source" ok={true} detail={canonical.source} />
          <CheckRow label="Legacy domain (hijinxco.com)" ok={!canonical.legacy_domain_found} detail={canonical.legacy_domain_found ? 'Found — should be hijinx.com' : 'Not found'} />
        </div>
        {canonical.legacy_domain_found && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-warning">Legacy domain "hijinxco.com" detected in canonical configuration. Update to "https://hijinx.com" in SEO settings.</p>
          </div>
        )}
      </SectionCard>

      {/* ── Sitemap Health ───────────────────────────────────────────────────── */}
      <SectionCard
        title="Sitemap Health"
        icon={Map}
        action={loading ? <RefreshCw className="w-3.5 h-3.5 text-foreground-quiet animate-spin" /> : null}
      >
        {sitemapStatus ? (
          <div className="space-y-1">
            <CheckRow label="Sitemap available" ok={sitemapStatus.available} detail={sitemapStatus.available ? `${sitemapStatus.entries} entries` : 'Not reachable'} />
            <CheckRow label="Racer profiles" ok={sitemapStatus.entityTypes.includes('Racers')} />
            <CheckRow label="Track profiles" ok={sitemapStatus.entityTypes.includes('Tracks')} />
            <CheckRow label="Series profiles" ok={sitemapStatus.entityTypes.includes('Series')} />
            <CheckRow label="Event profiles" ok={sitemapStatus.entityTypes.includes('Events')} />
            <CheckRow label="Outlet stories" ok={sitemapStatus.entityTypes.includes('Outlet Stories')} />
          </div>
        ) : (
          <p className="text-xs text-foreground-quiet">Checking sitemap...</p>
        )}
      </SectionCard>

      {/* ── Robots Health ────────────────────────────────────────────────────── */}
      <SectionCard title="Robots Health" icon={FileText}>
        {robotsStatus ? (
          <div className="space-y-1">
            <CheckRow label="Robots.txt available" ok={robotsStatus.available} />
            <CheckRow label="Sitemap reference" ok={robotsStatus.hasSitemap} />
            <CheckRow label="Management routes blocked" ok={robotsStatus.blocksManagement} detail="Disallow: /management/" />
            <CheckRow label="RaceCore routes blocked" ok={robotsStatus.blocksRaceCore} detail="Disallow: /racecore/" />
            <CheckRow label="Admin routes blocked" ok={robotsStatus.blocksAdmin} detail="Disallow: /admin/" />
          </div>
        ) : (
          <p className="text-xs text-foreground-quiet">Checking robots.txt...</p>
        )}
      </SectionCard>

      {/* ── Internal Linking Health ─────────────────────────────────────────── */}
      <SectionCard title="Internal Linking Health" icon={Link2}>
        <p className="text-xs text-foreground-quiet mb-3">
          The question is not "how many links are on this page?" — it is "can a crawler follow the factual relationship?"
        </p>
        <div className="space-y-2">
          <LinkingRow label="Event → Track" rel={relCoverage.events_with_track} />
          <LinkingRow label="Event → Series" rel={relCoverage.events_with_series} />
          <LinkingRow label="Results → Racer" rel={relCoverage.results_with_racer} />
          <LinkingRow label="Results → Event" rel={relCoverage.results_with_event} />
          <LinkingRow label="Racer → Team" rel={relCoverage.racers_with_team} />
          <LinkingRow label="Standings → Racer" rel={relCoverage.standings_with_racer} />
          <LinkingRow label="Standings → Series" rel={relCoverage.standings_with_series} />
        </div>
      </SectionCard>

      {/* ── llms.txt Status ──────────────────────────────────────────────────── */}
      <SectionCard title="llms.txt Status" icon={Info}>
        <div className="flex items-start gap-3">
          <PriorityBadge priority="INFORMATIONAL" />
          <div>
            <p className="text-sm text-foreground">Deferred</p>
            <p className="text-xs text-foreground-quiet mt-1">
              Insufficient evidence that llms.txt materially improves discovery compared with the existing structured-data + sitemap architecture.
              The site is not unhealthy because llms.txt is absent.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function LinkingRow({ label, rel }) {
  if (!rel) return null;
  const pct = rel.total > 0 ? Math.round((rel.complete / rel.total) * 100) : 0;
  const isComplete = rel.total > 0 && rel.complete === rel.total;
  const isEmpty = rel.total === 0;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-foreground-secondary">{label}</span>
      {isEmpty ? (
        <span className="text-foreground-quiet">No records</span>
      ) : (
        <div className="flex items-center gap-2">
          <span className="font-mono tabular-nums text-foreground-quiet">{rel.complete}/{rel.total}</span>
          {isComplete ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <XCircle className="w-3.5 h-3.5 text-warning" />}
        </div>
      )}
    </div>
  );
}