import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Info } from 'lucide-react';

export default function PointsRulesetEditor({ pointsTableRows, onPointsTableChange, canEdit }) {
  const [localRows, setLocalRows] = useState(pointsTableRows);

  const commit = (rows) => {
    setLocalRows(rows);
    if (onPointsTableChange) onPointsTableChange(rows);
  };

  const updateRow = (idx, field, value) => {
    const updated = localRows.map((r, i) =>
      i === idx ? { ...r, [field]: parseInt(value) || 0 } : r
    );
    commit(updated);
  };

  const addRow = () => {
    const maxPos = Math.max(0, ...localRows.map((r) => r.position || 0));
    commit([...localRows, { position: maxPos + 1, points: 0 }]);
  };

  const removeRow = (idx) => {
    commit(localRows.filter((_, i) => i !== idx));
  };

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white">Points Ruleset</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canEdit && (
          <div className="flex items-start gap-2 text-xs text-blue-400 bg-blue-950/20 border border-blue-800/40 rounded p-2">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
            Local defaults — changes apply to this calculation only
          </div>
        )}

        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {/* Header */}
          <div className="grid grid-cols-3 gap-1 text-xs text-gray-500 px-1">
            <span>Pos</span><span>Points</span><span />
          </div>
          {localRows.sort((a, b) => a.position - b.position).map((row, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-1 items-center">
              {canEdit ? (
                <Input
                  type="number"
                  value={row.position}
                  onChange={(e) => updateRow(idx, 'position', e.target.value)}
                  className="bg-[#111] border-gray-700 text-white h-6 text-xs font-mono px-2"
                />
              ) : (
                <span className="text-xs text-gray-400 font-mono px-1">{row.position}</span>
              )}
              {canEdit ? (
                <Input
                  type="number"
                  value={row.points}
                  onChange={(e) => updateRow(idx, 'points', e.target.value)}
                  className="bg-[#111] border-gray-700 text-white h-6 text-xs font-mono px-2"
                />
              ) : (
                <span className="text-xs text-white font-mono font-bold px-1">{row.points}</span>
              )}
              {canEdit ? (
                <Button size="sm" variant="ghost" onClick={() => removeRow(idx)} className="text-gray-600 hover:text-red-400 h-6 w-6 p-0">
                  <Trash2 className="w-3 h-3" />
                </Button>
              ) : <span />}
            </div>
          ))}
        </div>

        {/* Special values */}
        <div className="border-t border-gray-800 pt-2 space-y-1 text-xs text-gray-500">
          <div className="flex justify-between"><span>DNF</span><span className="text-gray-300">2 pts</span></div>
          <div className="flex justify-between"><span>DNS</span><span className="text-gray-300">0 pts</span></div>
          <div className="flex justify-between"><span>DSQ</span><span className="text-gray-300">0 pts</span></div>
          <div className="flex justify-between"><span>21+ pos</span><span className="text-gray-300">5 pts</span></div>
        </div>

        {canEdit && (
          <Button size="sm" variant="outline" onClick={addRow} className="w-full border-gray-700 text-gray-400 text-xs h-7">
            <Plus className="w-3 h-3 mr-1" /> Add Position
          </Button>
        )}

        {/* Placeholder sections */}
        <div className="border-t border-gray-800 pt-2 space-y-1 text-xs text-gray-600">
          <p>Bonus rules — <em>coming soon</em></p>
          <p>Drop rounds — <em>coming soon</em></p>
          <p>Tie-breaker: Wins → Podiums → Top 5s → Last finish</p>
        </div>
      </CardContent>
    </Card>
  );
}