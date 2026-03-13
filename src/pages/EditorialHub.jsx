import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { ShieldOff, Radar, Sparkles, Activity, TrendingUp, Map, Construction } from 'lucide-react';

const ALLOWED_ROLES = ['admin', 'editor', 'writer'];

const SECTIONS = {
  'management/editorial/story-radar': {
    title: 'Story Radar',
    subtitle: 'Monitor signals and surface stories worth covering',
    icon: Radar,
    description: 'Story Radar will track emerging topics, trending narratives, and coverage opportunities across the motorsports ecosystem.',
  },
  'management/editorial/recommendations': {
    title: 'Recommendations',
    subtitle: 'AI-assisted story recommendations for the editorial team',
    icon: Sparkles,
    description: 'Recommendations will surface suggested stories based on signals, trends, and coverage gaps identified across the platform.',
  },
  'management/editorial/signals': {
    title: 'Signals',
    subtitle: 'Raw signal feed from tracked sources and data inputs',
    icon: Activity,
    description: 'Signals will aggregate raw inputs — social mentions, race results, entity activity — that editorial staff can act on.',
  },
  'management/editorial/trend-clusters': {
    title: 'Trend Clusters',
    subtitle: 'Grouped narrative threads and recurring story patterns',
    icon: TrendingUp,
    description: 'Trend Clusters will identify recurring patterns and group related signals into coherent narrative threads.',
  },
  'management/editorial/coverage-map': {
    title: 'Coverage Map',
    subtitle: 'Visual overview of coverage density and gaps',
    icon: Map,
    description: 'Coverage Map will show which drivers, teams, series, and regions are under- or over-covered in existing editorial output.',
  },
};

export default function EditorialHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.replace(/^\//, '');
  const section = SECTIONS[currentPath] ?? SECTIONS['management/editorial/story-radar'];
  const Icon = section.icon;

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) return null;

  if (!user) {
    base44.auth.redirectToLogin(location.pathname);
    return null;
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    return (
      <ManagementLayout currentPage={currentPath}>
        <ManagementShell title="Access Denied" subtitle="">
          <div className="py-24 flex flex-col items-center gap-4 text-center">
            <ShieldOff className="w-10 h-10 text-gray-300" />
            <p className="text-gray-600 font-medium">Access denied</p>
            <p className="text-gray-400 text-sm max-w-sm">
              Story Radar tools are restricted to editorial staff. Contact an admin if you need access.
            </p>
            <Button size="sm" onClick={() => navigate(createPageUrl('Management'))}>
              Back to Management
            </Button>
          </div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout currentPage={currentPath}>
      <ManagementShell title={section.title} subtitle={section.subtitle}>
        <div className="py-20 flex flex-col items-center gap-6 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Icon className="w-8 h-8 text-violet-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-amber-600 text-xs font-semibold tracking-wide uppercase">
              <Construction className="w-3.5 h-3.5" />
              Coming Soon
            </div>
            <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{section.description}</p>
          </div>
        </div>
      </ManagementShell>
    </ManagementLayout>
  );
}