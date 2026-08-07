/**
 * CareerTimeline.jsx — Phase 10
 *
 * Renders an automatically-generated career timeline from computed
 * experience data. Events are derived from entries, results, standings,
 * championships, ownership milestones, and media — never manual entry.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import { Trophy, Medal, Flag, Crown, Camera, Newspaper, BadgeCheck, UserPlus, Sparkles, Award, MapPin, Zap, TrendingUp, CheckCircle } from 'lucide-react';

const ICON_MAP = {
  'trophy': Trophy, 'medal': Medal, 'flag': Flag, 'crown': Crown,
  'camera': Camera, 'newspaper': Newspaper, 'badge-check': BadgeCheck,
  'user-plus': UserPlus, 'sparkles': Sparkles, 'award': Award,
  'map-pin': MapPin, 'zap': Zap, 'trending-up': TrendingUp, 'check-circle': CheckCircle,
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isValid(d) ? format(d, 'MMM d, yyyy') : dateStr;
}

const TYPE_COLORS = {
  race_result: 'border-l-blue-400',
  championship: 'border-l-yellow-400',
  ownership_milestone: 'border-l-teal-400',
  career_milestone: 'border-l-green-400',
  media: 'border-l-purple-400',
};

export default function CareerTimeline({ timeline = [] }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-12">
        <Flag className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No career events yet. Timeline generates automatically from race results, championships, and milestones.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {timeline.map((event, i) => {
        const Icon = ICON_MAP[event.icon] || Flag;
        const colorClass = TYPE_COLORS[event.type] || 'border-l-gray-300';
        const isLast = i === timeline.length - 1;
        const storyLink = event.metadata?.story_slug ? `/story/${event.metadata.story_slug}` : null;
        const eventLink = event.metadata?.event_id ? `/EventProfile?id=${event.metadata.event_id}` : null;
        const link = storyLink || eventLink;

        const content = (
          <>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-sm font-bold text-[#232323] truncate">{event.title}</h4>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(event.date)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                {event.metadata?.track_name && (
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" /> {event.metadata.track_name}
                    {event.metadata?.series_name && ` · ${event.metadata.series_name}`}
                  </p>
                )}
              </div>
            </div>
          </>
        );

        return (
          <div key={i} className={`pl-3 border-l-2 ${colorClass} ${isLast ? 'pb-0' : 'pb-6'}`}>
            {link ? (
              <Link to={link} className="block hover:bg-gray-50 rounded-lg p-2 -ml-2 transition-colors">
                {content}
              </Link>
            ) : (
              <div className="p-2 -ml-2">{content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}