import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, AlertTriangle, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ManageDisciplineColors() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), retry: false });

  const { data: disciplines = [], isLoading } = useQuery({
    queryKey: ['disciplineColors'],
    queryFn: () => base44.entities.DisciplineColor.list(),
  });

  const [newDiscipline, setNewDiscipline] = useState('');
  const [newColor, setNewColor] = useState('#000000');
  const [editingId, setEditingId] = useState(null);
  const [editColor, setEditColor] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DisciplineColor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['disciplineColors']);
      setNewDiscipline('');
      setNewColor('#000000');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DisciplineColor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['disciplineColors']);
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DisciplineColor.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['disciplineColors']),
  });

  // Duplicate detection
  const colorCounts = useMemo(() => {
    const counts = {};
    disciplines.forEach((d) => {
      const key = d.color_code?.toLowerCase();
      if (key) counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [disciplines]);

  const duplicateColors = useMemo(
    () => new Set(Object.entries(colorCounts).filter(([, v]) => v > 1).map(([k]) => k)),
    [colorCounts]
  );

  const isNewColorDuplicate = disciplines.some(
    (d) => d.color_code?.toLowerCase() === newColor?.toLowerCase()
  );
  const isNewDisciplineDuplicate = disciplines.some(
    (d) => d.discipline?.toLowerCase() === newDiscipline?.toLowerCase().trim()
  );

  if (user && user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Admin access required.
      </div>
    );
  }

  const handleAdd = () => {
    if (!newDiscipline.trim() || isNewDisciplineDuplicate || isNewColorDuplicate) return;
    createMutation.mutate({ discipline: newDiscipline.trim(), color_code: newColor });
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#232323]">Discipline Pin Colors</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage the map pin colors for each racing discipline shown on the Event Directory map.
        </p>
      </div>

      {/* Add new discipline */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Discipline</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Discipline name (e.g. Off Road)"
            value={newDiscipline}
            onChange={(e) => setNewDiscipline(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              maxLength={7}
              className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={
              !newDiscipline.trim() ||
              isNewDisciplineDuplicate ||
              isNewColorDuplicate ||
              createMutation.isPending
            }
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        {isNewDisciplineDuplicate && newDiscipline.trim() && (
          <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Discipline name already exists.
          </p>
        )}
        {isNewColorDuplicate && (
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> This color is already used by another discipline.
          </p>
        )}
      </div>

      {/* Disciplines list */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Discipline</span>
          <span>Color</span>
          <span>Hex Code</span>
          <span />
        </div>

        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
        ) : disciplines.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No disciplines configured yet.</div>
        ) : (
          disciplines.map((d) => {
            const isDupColor = duplicateColors.has(d.color_code?.toLowerCase());
            const isEditing = editingId === d.id;
            return (
              <div
                key={d.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50"
              >
                <div className="font-medium text-sm text-[#232323]">{d.discipline}</div>

                {isEditing ? (
                  <>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      maxLength={7}
                      className="w-24 border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateMutation.mutate({ id: d.id, data: { color_code: editColor } })}
                        className="p-1.5 hover:bg-green-100 rounded text-green-600"
                        title="Save"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                      style={{ backgroundColor: d.color_code }}
                      onClick={() => { setEditingId(d.id); setEditColor(d.color_code); }}
                      title="Click to edit"
                    />
                    <div className="flex items-center gap-1">
                      <span
                        className="text-xs font-mono text-gray-600 cursor-pointer hover:underline"
                        onClick={() => { setEditingId(d.id); setEditColor(d.color_code); }}
                      >
                        {d.color_code}
                      </span>
                      {isDupColor && (
                        <span title="Duplicate color code">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(d.id)}
                      className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {duplicateColors.size > 0 && (
        <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          {duplicateColors.size} duplicate color code{duplicateColors.size > 1 ? 's' : ''} detected — each discipline should have a unique color.
        </p>
      )}
    </div>
  );
}