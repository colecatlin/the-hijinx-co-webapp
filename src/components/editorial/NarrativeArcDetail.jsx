import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  X, BookOpen, Zap, FileText, TrendingUp, Activity,
  Edit3, Save, Loader2, Map, Plus
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['active', 'emerging', 'cooling', 'closed', 'ignored'];
const STRATEGY_OPTIONS = ['light_watch', 'developing_story', 'priority_story', 'major_editorial_focus'];

const STATUS_COLORS = {
  active:   'bg-green-100 text-green-700',
  emerging: 'bg-blue-100 text-blue-700',
  cooling:  'bg-orange-100 text-orange-700',
  closed:   'bg-gray-100 text-gray-500',
  ignored:  'bg-gray-50 text-gray-400',
};

function TimelineEvent({ icon: Icon, label, date, color = 'text-gray-400' }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className={`w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0`}>
        <Icon className={`w-3 h-3 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-700 font-medium">{label}</p>
        {date && <p className="text-gray-400">{format(new Date(date), 'MMM d, yyyy')}</p>}
      </div>
    </div>
  );
}

export default function NarrativeArcDetail({ arc, plan, onClose, onUpdated }) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(plan?.editor_notes ?? '');
  const [saving, setSaving] = useState(null);

  const updateArcStatus = async (status) => {
    setSaving('status');
    await base44.entities.NarrativeArc.update(arc.id, { status });
    toast.success(`Arc marked as "${status}"`);
    onUpdated?.();
    setSaving(null);
  };

  const updatePlanStrategy = async (coverage_strategy) => {
    if (!plan) return;
    setSaving('strategy');
    await base44.entities.NarrativeCoveragePlan.update(plan.id, { coverage_strategy });
    toast.success('Coverage strategy updated');
    onUpdated?.();
    setSaving(null);
  };

  const savePlanNotes = async () => {
    if (!plan) return;
    setSaving('notes');
    await base44.entities.NarrativeCoveragePlan.update(plan.id, { editor_notes: notes });
    toast.success('Notes saved');
    setEditingNotes(false);
    onUpdated?.();
    setSaving(null);
  };

  const createCoveragePlan = async () => {
    setSaving('plan');
    try {
      const res = await base44.functions.invoke('detectNarrativeArcs', {
        // We just trigger a targeted re-detection — the plan will be created if arc needs one
      });
      toast.info('Re-running detection to generate coverage plan…');
      onUpdated?.();
    } catch {
      toast.error('Could not create coverage plan');
    }
    setSaving(null);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className={`px-2 py-0.5 text-xs rounded capitalize ${STATUS_COLORS[arc.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {arc.status}
            </span>
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded capitalize">
              {arc.arc_type?.replace(/_/g, ' ')}
            </span>
            {arc.coverage_gap_flagged && (
              <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded flex items-center gap-1">
                <Map className="w-3 h-3" /> Gap
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-gray-900 leading-snug">{arc.arc_name}</h2>
          {arc.last_update_date && (
            <p className="text-xs text-gray-400 mt-1">
              Updated {formatDistanceToNow(new Date(arc.last_update_date), { addSuffix: true })}
            </p>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="p-5 space-y-5 max-h-[calc(100vh-300px)] overflow-y-auto">

        {/* Summary */}
        {arc.arc_summary && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Summary</p>
            <p className="text-sm text-gray-700 leading-relaxed">{arc.arc_summary}</p>
          </div>
        )}

        {/* Scores */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-0.5">Momentum</p>
            <p className="text-xl font-bold text-gray-900">{Math.round(arc.momentum_score ?? 0)}<span className="text-xs text-gray-400 font-normal">/100</span></p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-0.5">Importance</p>
            <p className="text-xl font-bold text-gray-900">{Math.round(arc.importance_score ?? 0)}<span className="text-xs text-gray-400 font-normal">/100</span></p>
          </div>
        </div>

        {/* Entities */}
        {arc.entity_names?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Key Entities</p>
            <div className="flex flex-wrap gap-1.5">
              {arc.entity_names.map((n, i) => (
                <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg font-medium">{n}</span>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Arc Timeline</p>
          <div className="space-y-3">
            {arc.start_date && (
              <TimelineEvent icon={Zap} label="Arc Detected" date={arc.start_date} color="text-violet-500" />
            )}
            {(arc.signal_ids?.length ?? 0) > 0 && (
              <TimelineEvent icon={Activity} label={`${arc.signal_ids.length} signals contributing`} color="text-blue-500" />
            )}
            {(arc.recommendation_ids?.length ?? 0) > 0 && (
              <TimelineEvent icon={BookOpen} label={`${arc.recommendation_ids.length} recommendations generated`} color="text-green-500" />
            )}
            {(arc.story_ids?.length ?? 0) > 0 && (
              <TimelineEvent icon={FileText} label={`${arc.story_ids.length} stories published`} color="text-teal-500" />
            )}
            {arc.last_update_date && (
              <TimelineEvent icon={TrendingUp} label="Last updated" date={arc.last_update_date} color="text-orange-400" />
            )}
          </div>
        </div>

        {/* Coverage Plan */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Coverage Plan</p>
          {plan ? (
            <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 text-xs rounded capitalize ${
                  plan.coverage_status === 'active' ? 'bg-green-100 text-green-700' :
                  plan.coverage_status === 'complete' ? 'bg-teal-100 text-teal-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{plan.coverage_status}</span>
                <span className="text-xs text-violet-600 font-medium capitalize">{plan.coverage_strategy?.replace(/_/g, ' ')}</span>
              </div>
              {plan.recommended_story_types?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {plan.recommended_story_types.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white border border-violet-200 text-violet-700 text-xs rounded capitalize">{t.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              )}
              {plan.coverage_timeline && (
                <p className="text-xs text-violet-700 leading-relaxed">{plan.coverage_timeline}</p>
              )}

              {/* Strategy selector */}
              <div className="flex flex-wrap gap-1 pt-1">
                {STRATEGY_OPTIONS.map(s => (
                  <button key={s}
                    disabled={saving === 'strategy'}
                    onClick={() => updatePlanStrategy(s)}
                    className={`px-2 py-0.5 text-xs rounded capitalize transition-colors ${
                      plan.coverage_strategy === s ? 'bg-violet-600 text-white' : 'bg-white border border-violet-200 text-violet-600 hover:bg-violet-50'
                    }`}>
                    {s.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              {/* Editor notes */}
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-xs min-h-[80px]" placeholder="Add editorial strategy notes…" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={savePlanNotes} disabled={saving === 'notes'} className="h-7 text-xs">
                      {saving === 'notes' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)} className="h-7 text-xs">Cancel</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingNotes(true)} className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 transition-colors">
                  <Edit3 className="w-3 h-3" />
                  {plan.editor_notes ? 'Edit notes' : 'Add editor notes'}
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center">
              <p className="text-xs text-gray-400 mb-2">No coverage plan yet</p>
              <Button size="sm" variant="outline" onClick={createCoveragePlan} disabled={saving === 'plan'} className="text-xs h-7 gap-1">
                {saving === 'plan' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Create Plan
              </Button>
            </div>
          )}
        </div>

        {/* Status actions */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Arc Status</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.filter(s => s !== arc.status).map(s => (
              <button key={s} disabled={!!saving}
                onClick={() => updateArcStatus(s)}
                className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition-colors capitalize disabled:opacity-50">
                {saving === 'status' ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                Mark {s}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}