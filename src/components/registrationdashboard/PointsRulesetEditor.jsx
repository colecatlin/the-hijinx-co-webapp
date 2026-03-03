import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Info, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

function buildDefaultRows() {
  const table = { 1:100, 2:90, 3:82, 4:75, 5:69, 6:64, 7:60, 8:56, 9:53, 10:50,
    11:47, 12:44, 13:41, 14:38, 15:35, 16:32, 17:30, 18:28, 19:26, 20:25 };
  return Object.entries(table).map(([pos, pts]) => ({ position: parseInt(pos), points: pts }));
}

export default function PointsRulesetEditor({
  seriesId,
  canEdit = false,
  // legacy props (local-only mode when no seriesId)
  pointsTableRows: externalRows,
  onPointsTableChange,
}) {
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [localRows, setLocalRows] = useState(externalRows || buildDefaultRows());
  const [dirty, setDirty] = useState(false);

  // ── Load PointsConfig from entity ──
  const {
    data: configRecords = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['pointsConfig', seriesId],
    queryFn: () => {
      if (!seriesId) return [];
      return base44.entities.PointsConfig.filter({ series_id: seriesId });
    },
    enabled: !!seriesId,
    ...DQ,
  });

  const configRecord = configRecords[0] || null;
  const hasConfig = !!configRecord;
  const effectiveCanEdit = canEdit && hasConfig;

  // Sync rows when config loads
  useEffect(() => {
    if (configRecord?.points_table) {
      let rows;
      try {
        const pt = typeof configRecord.points_table === 'string'
          ? JSON.parse(configRecord.points_table)
          : configRecord.points_table;
        rows = Array.isArray(pt)
          ? pt
          : Object.entries(pt).map(([pos, pts]) => ({ position: parseInt(pos), points: parseInt(pts) || 0 }));
      } catch {
        rows = buildDefaultRows();
      }
      setLocalRows(rows);
      setDirty(false);
    }
  }, [configRecord?.id]);

  // Also notify parent when rows change (local calc mode)
  useEffect(() => {
    if (onPointsTableChange) onPointsTableChange(localRows);
  }, [localRows]);

  const commit = (rows) => {
    setLocalRows(rows);
    setDirty(true);
  };

  const updateRow = (idx, field, value) => {
    commit(localRows.map((r, i) => i === idx ? { ...r, [field]: parseInt(value) || 0 } : r));
  };

  const addRow = () => {
    const maxPos = Math.max(0, ...localRows.map((r) => r.position || 0));
    commit([...localRows, { position: maxPos + 1, points: 0 }]);
  };

  const removeRow = (idx) => {
    commit(localRows.filter((_, i) => i !== idx));
  };

  // ── Save mutation ──
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!configRecord) throw new Error('No PointsConfig record');
      const payload = { points_table: localRows };
      await base44.entities.PointsConfig.update(configRecord.id, payload);
      // Log
      base44.entities.OperationLog.create({
        operation_type: 'points_config_updated',
        status: 'success',
        entity_name: 'PointsConfig',
        entity_id: configRecord.id,
        message: `Points ruleset updated for series ${seriesId}`,
        metadata: { series_id: seriesId, positions_count: localRows.length },
      }).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointsConfig', seriesId] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      setDirty(false);
      toast.success('Points ruleset saved');
    },
    onError: (err) => toast.error(`Save failed: ${err.message}`),
  });

  const sorted = [...localRows].sort((a, b) => a.position - b.position);

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-white">Points Ruleset</CardTitle>
          <div className="flex items-center gap-2">
            {hasConfig && <Badge className="bg-green-500/20 text-green-400 text-xs">Config Loaded</Badge>}
            <button onClick={() => setCollapsed((v) => !v)} className="text-gray-500 hover:text-gray-300 p-1">
              {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-3">
          {/* Status banners */}
          {isLoading && (
            <div className="text-xs text-gray-500 animate-pulse">Loading points config…</div>
          )}
          {!isLoading && !hasConfig && seriesId && (
            <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-950/20 border border-amber-800/40 rounded p-2">
              <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
              Points rules editing not enabled yet — calculations use default rules.
            </div>
          )}
          {!isLoading && !canEdit && hasConfig && (
            <div className="flex items-start gap-2 text-xs text-blue-400 bg-blue-950/20 border border-blue-800/40 rounded p-2">
              <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
              Read-only view. Requires points_config_edit permission to modify.
            </div>
          )}
          {!isLoading && !hasConfig && !seriesId && (
            <div className="flex items-start gap-2 text-xs text-blue-400 bg-blue-950/20 border border-blue-800/40 rounded p-2">
              <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
              Local defaults — changes apply to this calculation only.
            </div>
          )}

          {/* Points table */}
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-1 text-xs text-gray-500 px-1 mb-1">
              <span>Pos</span><span>Points</span><span />
            </div>
            {sorted.map((row, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-1 items-center">
                {effectiveCanEdit ? (
                  <Input type="number" value={row.position} onChange={(e) => updateRow(sorted.indexOf(row), 'position', e.target.value)}
                    className="bg-[#111] border-gray-700 text-white h-6 text-xs font-mono px-2" />
                ) : (
                  <span className="text-xs text-gray-400 font-mono px-1">{row.position}</span>
                )}
                {effectiveCanEdit ? (
                  <Input type="number" value={row.points} onChange={(e) => updateRow(sorted.indexOf(row), 'points', e.target.value)}
                    className="bg-[#111] border-gray-700 text-white h-6 text-xs font-mono px-2" />
                ) : (
                  <span className="text-xs text-white font-mono font-bold px-1">{row.points}</span>
                )}
                {effectiveCanEdit ? (
                  <Button size="sm" variant="ghost" onClick={() => removeRow(sorted.indexOf(row))}
                    className="text-gray-600 hover:text-red-400 h-6 w-6 p-0">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                ) : <span />}
              </div>
            ))}
          </div>

          {/* Special values */}
          <div className="border-t border-gray-800 pt-2 space-y-1 text-xs text-gray-500">
            <div className="flex justify-between"><span>DNF</span><span className="text-gray-300">{configRecord?.dnf_points ?? 2} pts</span></div>
            <div className="flex justify-between"><span>DNS</span><span className="text-gray-300">0 pts</span></div>
            <div className="flex justify-between"><span>DSQ</span><span className="text-gray-300">0 pts</span></div>
          </div>

          {effectiveCanEdit && (
            <>
              <Button size="sm" variant="outline" onClick={addRow}
                className="w-full border-gray-700 text-gray-400 text-xs h-7">
                <Plus className="w-3 h-3 mr-1" /> Add Position
              </Button>
              {dirty && (
                <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
                  className="w-full bg-blue-700 hover:bg-blue-600 text-xs h-7">
                  <Save className="w-3 h-3 mr-1" />
                  {saveMutation.isPending ? 'Saving…' : 'Save Ruleset'}
                </Button>
              )}
            </>
          )}

          {/* Tie-breaker info */}
          <div className="border-t border-gray-800 pt-2 text-xs text-gray-600">
            <p>Tie-breaker: Wins → Podiums → Top 5s → Last finish</p>
            {configRecord?.drop_rounds > 0 && (
              <p className="mt-1">Drop rounds: {configRecord.drop_rounds}</p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}