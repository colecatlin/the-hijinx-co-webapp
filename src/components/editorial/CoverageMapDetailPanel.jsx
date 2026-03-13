import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORY_COLORS = {
  Racing: 'bg-red-50 text-red-600',
  Business: 'bg-blue-50 text-blue-600',
  Culture: 'bg-purple-50 text-purple-600',
  Tech: 'bg-cyan-50 text-cyan-600',
  Media: 'bg-yellow-50 text-yellow-600',
  Marketplace: 'bg-green-50 text-green-600',
};

function DetailRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 leading-relaxed break-words">{String(value)}</p>
    </div>
  );
}

function ScoreBar({ label, value, color = 'bg-indigo-400' }) {
  if (value == null) return null;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span className="font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
        <span className="font-bold text-gray-800">{Math.round(value)}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function TagList({ label, items, color = 'bg-gray-100 text-gray-600' }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className={`px-2 py-0.5 rounded-full text-xs ${color}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function IdList({ label, ids }) {
  if (!ids?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label} ({ids.length})</p>
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id, i) => (
          <span key={i} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs rounded font-mono">{id.slice(-8)}</span>
        ))}
      </div>
    </div>
  );
}

export default function CoverageMapDetailPanel({ entry, onClose }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {entry.category && (
              <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${CATEGORY_COLORS[entry.category] ?? 'bg-gray-100 text-gray-500'}`}>
                {entry.category}
              </span>
            )}
            {entry.article_type && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded capitalize">
                {entry.article_type.replace(/_/g, ' ')}
              </span>
            )}
            {entry.is_gap && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded font-semibold">Coverage Gap</span>
            )}
          </div>
          <h2 className="text-sm font-bold text-gray-900 leading-snug">{entry.story_title}</h2>
          {entry.subcategory && (
            <p className="text-xs text-gray-400 mt-0.5">{entry.subcategory}</p>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Scores */}
        <div className="space-y-3">
          <ScoreBar label="Performance Score" value={entry.performance_score} color="bg-green-400" />
          <ScoreBar label="Evergreen Score" value={entry.evergreen_score} color="bg-indigo-400" />
        </div>

        {/* Meta */}
        <div className="space-y-4">
          <DetailRow label="Article Angle" value={entry.article_angle} />
          {entry.published_date && (
            <DetailRow label="Published" value={format(new Date(entry.published_date), 'MMM d, yyyy')} />
          )}
        </div>

        {/* Entity coverage */}
        <IdList label="Covered Entity IDs" ids={entry.covered_entity_ids} />

        {entry.covered_entity_names?.length > 0 && (
          <TagList label="Covered Entities" items={entry.covered_entity_names} color="bg-blue-50 text-blue-700" />
        )}

        <TagList label="Covered Topics" items={entry.covered_topics} color="bg-purple-50 text-purple-700" />
        <TagList label="Covered Keywords" items={entry.covered_keywords} color="bg-gray-100 text-gray-600" />

        {entry.is_gap && entry.gap_reason && (
          <div className="bg-orange-50 rounded-lg px-3 py-2 border border-orange-100">
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-1">Gap Reason</p>
            <p className="text-xs text-orange-700 leading-relaxed">{entry.gap_reason}</p>
          </div>
        )}

        {entry.notes && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-xs text-gray-600 leading-relaxed">{entry.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}