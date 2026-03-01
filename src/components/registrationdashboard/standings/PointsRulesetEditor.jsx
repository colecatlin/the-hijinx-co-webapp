import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

export default function PointsRulesetEditor({
  seriesId,
  seriesName,
  seasonYear,
  selectedClass,
  seriesClasses,
  pointsConfig,
}) {
  const [editingClass, setEditingClass] = useState(selectedClass);
  const [formData, setFormData] = useState({
    points_by_position: [],
    applies_to_session_types: ['Final'],
    bonus_rules: [],
    drop_rounds: { enabled: false, count: 0 },
    tie_breaker_order: [
      'wins',
      'podiums',
      'best_finishes',
      'most_events',
      'best_last_event',
    ],
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (pointsConfig?.classes) {
      try {
        const classes =
          typeof pointsConfig.classes === 'string'
            ? JSON.parse(pointsConfig.classes)
            : pointsConfig.classes;
        const classConfig = classes.find((c) => c.class_name === editingClass);
        if (classConfig) {
          setFormData(classConfig);
        }
      } catch (e) {
        console.error('Failed to parse classes:', e);
      }
    }
  }, [editingClass, pointsConfig]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const classes = pointsConfig?.classes
        ? typeof pointsConfig.classes === 'string'
          ? JSON.parse(pointsConfig.classes)
          : pointsConfig.classes
        : [];

      const classIndex = classes.findIndex((c) => c.class_name === editingClass);
      const updatedClass = { class_name: editingClass, ...data };

      if (classIndex >= 0) {
        classes[classIndex] = updatedClass;
      } else {
        classes.push(updatedClass);
      }

      if (pointsConfig?.id) {
        await base44.entities.PointsConfig.update(pointsConfig.id, {
          classes: JSON.stringify(classes),
        });
      } else {
        await base44.entities.PointsConfig.create({
          series_id: seriesId,
          series_name: seriesName,
          season_year: seasonYear,
          status: 'draft',
          classes: JSON.stringify(classes),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointsConfigs'] });
      toast.success('Rules saved as draft');
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (pointsConfig?.id) {
        await base44.entities.PointsConfig.update(pointsConfig.id, {
          status: 'published',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointsConfigs'] });
      toast.success('Rules published');
    },
  });

  const handleSaveDraft = () => {
    saveMutation.mutate(formData);
  };

  const handlePublish = () => {
    publishMutation.mutate();
  };

  const handleAddPosition = () => {
    const maxPos = Math.max(
      0,
      ...formData.points_by_position.map((p) => p.position || 0)
    );
    setFormData({
      ...formData,
      points_by_position: [
        ...formData.points_by_position,
        { position: maxPos + 1, points: 0 },
      ],
    });
  };

  const handleRemovePosition = (idx) => {
    setFormData({
      ...formData,
      points_by_position: formData.points_by_position.filter((_, i) => i !== idx),
    });
  };

  const handleAddBonus = () => {
    setFormData({
      ...formData,
      bonus_rules: [...formData.bonus_rules, { key: '', description: '', points: 0 }],
    });
  };

  const handleRemoveBonus = (idx) => {
    setFormData({
      ...formData,
      bonus_rules: formData.bonus_rules.filter((_, i) => i !== idx),
    });
  };

  return (
    <Card className="bg-[#262626] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Points Ruleset</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {pointsConfig?.status !== 'published' && (
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
              {seriesClasses.map((sc) => (
                <SelectItem key={sc.id} value={sc.class_name} className="text-white">
                  {sc.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
                    updated[idx].position = parseInt(e.target.value);
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
                    updated[idx].points = parseInt(e.target.value);
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
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400 uppercase tracking-wide">
              Bonus Rules
            </label>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAddBonus}
              className="text-blue-400 hover:bg-blue-900/20 h-7"
            >
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {formData.bonus_rules.map((rule, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <Input
                  placeholder="Bonus key"
                  value={rule.key || ''}
                  onChange={(e) => {
                    const updated = [...formData.bonus_rules];
                    updated[idx].key = e.target.value;
                    setFormData({ ...formData, bonus_rules: updated });
                  }}
                  className="bg-[#171717] border-gray-700 text-white w-28 h-8 text-xs"
                />
                <Input
                  placeholder="Description"
                  value={rule.description || ''}
                  onChange={(e) => {
                    const updated = [...formData.bonus_rules];
                    updated[idx].description = e.target.value;
                    setFormData({ ...formData, bonus_rules: updated });
                  }}
                  className="bg-[#171717] border-gray-700 text-white flex-1 h-8 text-xs"
                />
                <Input
                  type="number"
                  placeholder="Points"
                  value={rule.points || ''}
                  onChange={(e) => {
                    const updated = [...formData.bonus_rules];
                    updated[idx].points = parseInt(e.target.value);
                    setFormData({ ...formData, bonus_rules: updated });
                  }}
                  className="bg-[#171717] border-gray-700 text-white w-20 h-8 text-xs"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveBonus(idx)}
                  className="text-red-400 hover:bg-red-900/20 h-8 w-8 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
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
                    count: parseInt(e.target.value),
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
            onClick={handleSaveDraft}
            disabled={saveMutation.isPending}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 flex-1"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            onClick={handlePublish}
            disabled={publishMutation.isPending || pointsConfig?.status === 'published'}
            className="bg-green-600 hover:bg-green-700 flex-1"
          >
            {pointsConfig?.status === 'published'
              ? 'Published'
              : publishMutation.isPending
                ? 'Publishing...'
                : 'Publish Rules'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}