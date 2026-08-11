import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  FileText, Building2, ImageIcon, Handshake, Users, ShoppingBag,
  TrendingUp, MessageSquare, Clock, Activity,
} from 'lucide-react';

/**
 * OperationsRecentActivity — aggregates recent platform activity.
 * Uses existing ActivityFeed entity — no new backend architecture.
 */

const ACTIVITY_ICONS = {
  claim: FileText,
  organization: Building2,
  media: ImageIcon,
  sponsor: Handshake,
  user: Users,
  order: ShoppingBag,
  story: TrendingUp,
  feedback: MessageSquare,
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function OperationsRecentActivity() {
  const { data: activity = [], isLoading } = useQuery({
    queryKey: ['ops_hub_recent_activity'],
    queryFn: () => base44.entities.ActivityFeed.list('-created_date', 15),
    staleTime: 60 * 1000,
  });

  return (
    <div className="bg-surface-elevated border border-divider rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
        <Clock className="w-3.5 h-3.5 text-foreground-quiet" />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="w-7 h-7 rounded-lg bg-surface-interactive animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-3/4 bg-surface-interactive rounded animate-pulse" />
                <div className="h-2 w-1/4 bg-surface-interactive/60 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : activity.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-xs text-foreground-quiet">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-1">
          {activity.slice(0, 10).map((item) => {
            const Icon = ACTIVITY_ICONS[item.activity_type] || Activity;
            return (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-interactive/50 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-surface-interactive flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-foreground-quiet" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground-secondary truncate">
                    {item.title || item.description || item.activity_type || 'Activity'}
                  </p>
                  <p className="text-[10px] text-foreground-quiet">
                    {timeAgo(item.created_date)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}