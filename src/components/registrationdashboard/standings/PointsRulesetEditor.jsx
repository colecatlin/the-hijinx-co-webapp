import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Valid tie_breaker_order enum values per PointsConfig schema
const VALID_TIE_BREAKERS = ['wins', 'seconds', 'thirds', 'best_finishes', 'most_starts', 'most_entries', 'latest_finish'];

// Map legacy/invalid tie-breaker values to schema-valid equivalents
const TIE_BREAKER_MIGRATION = {
  podiums: 'thirds',
  most_events: 'most_starts',
  best_last_event: 'latest_finish',
};

function normalizeTieBreakers(arr) {
  if (!Array.isArray(arr)) return ['wins', 'seconds', 'thirds', 'best_finishes', 'latest_finish'];
  return arr
    .map(v => TIE_BREAKER_MIGRATION[v] || v)
    .filter(v => VALID_TIE_BREAKERS.includes(v));
}

// Convert flat number array from schema → UI rows [{ position, points }]
function flatArrayToRows(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr.map((pts, idx) => ({ position: idx + 1, points: pts }));
}

// Convert UI rows [{ position, points }] → flat number array for schema
function rowsToFlatArray(rows) {
  if (!rows || rows.length === 0) return [];
  const sorted = [...rows].sort((a, b) => (a.position || 0) - (b.position || 0));
  const maxPos = sorted[sorted.length - 1]?.position || 0;
  const arr = new Array(maxPos).fill(0);
  sorted.forEach(r => {
    if (r.position >= 1) arr[r.position - 1] = r.points || 0;
  });
  return arr;
}

// Normalize bonus_rules: schema expects { fastest_lap, most_laps_led, pole_award }
function normalizeBonusRules(bonusRules) {
  const defaults = { fastest_lap: 0, most_laps_led: 0, pole_award: 0 };
  if (!bonusRules) return defaults;
  // If it's already the correct object shape
  if (typeof bonusRules === 'object' && !Array.isArray(bonusRules)) {
    return {
      fastest_lap: Number(bonusRules.fastest_lap) || 0,
      most_laps_led: Number(bonusRules.most_laps_led) || 0,
      pole_award: Number(bonusRules.pole_award) || 0,
    };
  }
  // If it's the old array shape, attempt key mapping
  if (Array.isArray(bonusRules)) {
    const result = { ...defaults };
    bonusRules.forEach(rule => {
      if (rule.key === 'fastest_lap') result.fastest_lap = Number(rule.points) || 0;
      if (rule.key === 'most_laps_led') result.most_laps_led = Number(rule.points) || 0;
      if (rule.key === 'pole_award') result.pole_award = Number(rule.points) || 0;
    });
    return result;
  }
  return defaults;
}

const DEFAULT_FORM = {
  points_by_position: [],           // UI rows: [{ position, points }]
  applies_to_session_types: ['Final'],
  bonus_rules: { fastest_lap: 0, most_laps_led: 0, pole_award: 0 },
  drop_rounds: { enabled: false, count: 0 },
  tie_breaker_order: ['wins', 'seconds', 'thirds', 'best_finishes', 'latest_finish'],
};

export default function PointsRulesetEditor({
  seriesId,
  seriesName,
  seasonYear,
  selectedClass,
  seriesClasses,
}) {
  const [editingClass, setEditingClass] = useState(selectedClass);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const queryClient = useQueryClient();

  // Resolve series_class_id from the editingClass name
  const resolvedClassRecord = useMemo(
    () => seriesClasses?.find(sc => sc.class_name === editingClass) || null,
    [seriesClasses, editingClass]
  );
  const resolvedClassId = resolvedClassRecord?.id || null;

  // Query the flat PointsConfig record for this series + class + season
  const configQueryKey = ['pointsConfig', seriesId, resolvedClassId, seasonYear];
  const { data: existingConfig, isLoading: loadingConfig } = useQuery({
    queryKey: configQueryKey,
    queryFn: async () => {
      if (!seriesId) return null;
      const query = { series_id: seriesId };
      if (resolvedClassId) {
        query.series_class_id = resolvedClassId;
      }
      const results = await base44.entities.PointsConfig.filter(query).catch(() => []);
      // Prefer season-matched, then any
      if (results.length === 0) return null;
      const seasonMatched = results.filter(c => c.season === seasonYear || !c.season);
      return (seasonMatched.length ? seasonMatched : results)
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
    },
    enabled: !!seriesId,
  });

  // Hydrate formData from the flat record when it loads or editingClass changes
  useEffect(() => {
    if (existingConfig) {
      setFormData({
        points_by_position: flatArrayToRows(existingConfig.points_by_position),
        applies_to_session_types: existingConfig.applies_to_session_types || ['Final'],
        bonus_rules: normalizeBonusRules(existingConfig.bonus_rules),
        drop_rounds: existingConfig.drop_rounds || { enabled: false, count: 0 },
        tie_breaker_order: normalizeTieBreakers(existingConfig.tie_breaker_order),
      });
    } else if (!loadingConfig) {
      setFormData(DEFAULT_FORM);
    }
  }, [existingConfig, loadingConfig]);

  // Also reset form when editingClass changes (before new config loads)
  useEffect(() => {
    setFormData(DEFAULT_FORM);
  }, [editingClass]);

  // Build the flat PointsConfig payload for save
  function buildPayload(status) {
    const isDefault = !resolvedClassId;
    const name = [seriesName, editingClass, seasonYear].filter(Boolean).join(' — ') || 'Points Config';
    return {
      name,
      series_id: seriesId,
      season: seasonYear || null,
      series_class_id: resolvedClassId,
      is_default: isDefault,
      status,
      is_active: status === 'active',
      priority: existingConfig?.priority || 0,
      applies_to_session_types: formData.applies_to_session_types,
      points_by_position: rowsToFlatArray(formData.points_by_position),
      bonus_rules: normalizeBonusRules(formData.bonus_rules),
      drop_rounds: formData.drop_rounds,
      tie_breaker_order: normalizeTieBreakers(formData.tie_breaker_order),
    };
  }

  const saveMutation = useMutation({
    mutationFn: async (status) => {
      const payload = buildPayload(status);
      if (existingConfig?.id) {
        await base44.entities.PointsConfig.update(existingConfig.id, payload);
      } else {
        await base44.entities.PointsConfig.create(payload);
      }
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['pointsConfig'] });
      queryClient.invalidateQueries({ queryKey: ['pointsConfigs'] });
      toast.success(status === 'active' ? 'Rules published' : 'Rules saved as draft');
    },
    onError: (err) => {
      toast.error('Save failed: ' + err.message);
    },
  });

  const handleAddPosition = () => {
    const maxPos = Math.max(0, ...formData.points_by_position.map(p => p.position || 0));
    setFormData({
      ...formData,
      points_by_position: [...formData.points_by_position, { position: maxPos + 1, points: 0 }],
    });
  };

  const handleRemovePosition = (idx) => {
    setFormData({
      ...formData,
      points_by_position: formData.points_by_position.filter((_, i) => i !== idx),
    });
  };

  const isDraft = !existingConfig || existingConfig.status === 'draft';

  return (
    <Card className="bg-[#262626] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Points Ruleset</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isDraft && (
          <div className="p-3 bg-yellow-900/30 rounded border border-yellow-700/50">
            <div className="flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-400">
                Rules are in draft. Publish to use for recalculation.
              </p>
            </div>
          </div>
        )}

        {/* Class Selector */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">
            Class to Edit
          </label>
          <Select value={editingClass} onValueChange={setEditingClass}>
            <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#171717] border-gray-700">
              {seriesClasses?.map((sc) => (
                <SelectItem key={sc.id} value={sc.class_name} className="text-white">
                  {sc.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {resolvedClassId && (
            <p className="text-[10px] text-gray-600 mt-1">class_id: {resolvedClassId}</p>
          )}
        </div>

        {loadingConfig ? (
          <p className="text-xs text-gray-500">Loading config...</p>
        ) : (
          <>
            {/* Points by Position */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400 uppercase tracking-wide">
                  Points by Position
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAddPosition}
                  className="text-blue-400 hover:bg-blue-900/20 h-7"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formData.points_by_position.map((pbp, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <Input
                      type="number"
                      placeholder="Position"
                      value={pbp.position || ''}
                      onChange={(e) => {
                        const updated = [...formData.points_by_position];
                        updated[idx] = { ...updated[idx], position: parseInt(e.target.value) || 0 };
                        setFormData({ ...formData, points_by_position: updated });
                      }}
                      className="bg-[#171717] border-gray-700 text-white w-20 h-8 text-xs"
                    />
                    <Input
                      type="number"
                      placeholder="Points"
                      value={pbp.points || ''}
                      onChange={(e) => {
                        const updated = [...formData.points_by_position];
                        updated[idx] = { ...updated[idx], points: parseInt(e.target.value) || 0 };
                        setFormData({ ...formData, points_by_position: updated });
                      }}
                      className="bg-[#171717] border-gray-700 text-white flex-1 h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemovePosition(idx)}
                      className="text-red-400 hover:bg-red-900/20 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Types */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wide block">
                Apply to Session Types
              </label>
              <div className="flex flex-wrap gap-3">
                {['Practice', 'Qualifying', 'Heat', 'LCQ', 'Final'].map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.applies_to_session_types.includes(type)}
                      onCheckedChange={(checked) => {
                        let types = [...formData.applies_to_session_types];
                        if (checked) {
                          types.push(type);
                        } else {
                          types = types.filter((t) => t !== type);
                        }
                        setFormData({ ...formData, applies_to_session_types: types });
                      }}
                      className="border-gray-700"
                    />
                    <span className="text-xs text-gray-300">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Bonus Rules */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wide block">
                Bonus Points
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'fastest_lap', label: 'Fastest Lap' },
                  { key: 'most_laps_led', label: 'Most Laps Led' },
                  { key: 'pole_award', label: 'Pole Award' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-[10px] text-gray-500 mb-1">{label}</p>
                    <Input
                      type="number"
                      min="0"
                      value={formData.bonus_rules[key] || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bonus_rules: {
                            ...formData.bonus_rules,
                            [key]: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="bg-[#171717] border-gray-700 text-white h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Drop Rounds */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.drop_rounds.enabled || false}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      drop_rounds: { ...formData.drop_rounds, enabled: checked },
                    });
                  }}
                  className="border-gray-700"
                />
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  Enable Drop Rounds
                </span>
              </label>
              {formData.drop_rounds.enabled && (
                <Input
                  type="number"
                  min="0"
                  placeholder="Number of rounds to drop"
                  value={formData.drop_rounds.count || 0}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      drop_rounds: {
                        ...formData.drop_rounds,
                        count: parseInt(e.target.value) || 0,
                      },
                    });
                  }}
                  className="bg-[#171717] border-gray-700 text-white h-8 text-xs"
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t border-gray-700">
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate('draft')}
                disabled={saveMutation.isPending}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 flex-1"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                onClick={() => saveMutation.mutate('active')}
                disabled={saveMutation.isPending || existingConfig?.status === 'active'}
                className="bg-green-600 hover:bg-green-700 flex-1"
              >
                {existingConfig?.status === 'active'
                  ? 'Published'
                  : saveMutation.isPending
                    ? 'Publishing...'
                    : 'Publish Rules'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}