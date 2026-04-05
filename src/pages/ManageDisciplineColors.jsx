import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, AlertTriangle, Save, X, Eye, EyeOff, GripVertical, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function ManageDisciplineColors() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), retry: false });

  const { data: disciplines = [], isLoading } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => base44.entities.Discipline.list('sort_order'),
  });

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#000000');
  const [newDescription, setNewDescription] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({});

  const invalidate = () => queryClient.invalidateQueries(['disciplines']);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Discipline.create(data),
    onSuccess: () => { invalidate(); setNewName(''); setNewColor('#000000'); setNewDescription(''); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Discipline.update(id, data),
    onSuccess: () => { invalidate(); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Discipline.delete(id),
    onSuccess: invalidate,
  });

  const toggleActive = (d) => updateMutation.mutate({ id: d.id, data: { is_active: !d.is_active } });

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
  const isNewNameDuplicate = disciplines.some(
    (d) => d.name?.toLowerCase() === newName?.toLowerCase().trim()
  );

  const startEdit = (d) => {
    setEditingId(d.id);
    setEditFields({ name: d.name, color_code: d.color_code, description: d.description || '', sort_order: d.sort_order ?? 0 });
  };

  const handleAdd = () => {
    if (!newName.trim() || isNewNameDuplicate) return;
    createMutation.mutate({
      name: newName.trim(),
      slug: slugify(newName.trim()),
      color_code: newColor,
      description: newDescription.trim() || undefined,
      sort_order: disciplines.length,
      is_active: true,
    });
  };

  const handleSaveEdit = (id) => {
    updateMutation.mutate({
      id,
      data: {
        name: editFields.name,
        slug: slugify(editFields.name),
        color_code: editFields.color_code,
        description: editFields.description || undefined,
        sort_order: Number(editFields.sort_order) || 0,
      },
    });
  };

  if (user && user.role !== 'admin') {
    return <div className="flex items-center justify-center h-64 text-gray-500">Admin access required.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#232323]">Discipline Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage the canonical list of racing disciplines. These drive map pin colors, badges, and future classification features.
        </p>
      </div>

      {/* Add new discipline */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Discipline</h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-2">
          <input
            type="text"
            placeholder="Name (e.g. Off Road)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
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
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <Button
            onClick={handleAdd}
            disabled={!newName.trim() || isNewNameDuplicate || createMutation.isPending}
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        {isNewNameDuplicate && newName.trim() && (
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
        <div className="grid grid-cols-[24px_1fr_auto_auto_auto_auto] items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span />
          <span>Name</span>
          <span>Color</span>
          <span>Order</span>
          <span>Status</span>
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
                className={`grid grid-cols-[24px_1fr_auto_auto_auto_auto] items-center gap-3 px-5 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 ${!d.is_active ? 'opacity-50' : ''}`}
              >
                <GripVertical className="w-4 h-4 text-gray-300" />

                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editFields.name}
                      onChange={(e) => setEditFields(f => ({ ...f, name: e.target.value }))}
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={editFields.color_code}
                        onChange={(e) => setEditFields(f => ({ ...f, color_code: e.target.value }))}
                        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editFields.color_code}
                        onChange={(e) => setEditFields(f => ({ ...f, color_code: e.target.value }))}
                        maxLength={7}
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none"
                      />
                    </div>
                    <input
                      type="number"
                      value={editFields.sort_order}
                      onChange={(e) => setEditFields(f => ({ ...f, sort_order: e.target.value }))}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none"
                    />
                    <span className="text-xs text-gray-400">—</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleSaveEdit(d.id)} className="p-1.5 hover:bg-green-100 rounded text-green-600" title="Save">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Cancel">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-medium text-sm text-[#232323]">{d.name}</div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-8 h-8 rounded border border-gray-200"
                        style={{ backgroundColor: d.color_code }}
                      />
                      <span className="text-xs font-mono text-gray-500">
                        {d.color_code}
                        {isDupColor && <AlertTriangle className="w-3 h-3 text-amber-500 inline ml-1" />}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-center">{d.sort_order ?? 0}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(d)} className="p-1.5 hover:bg-blue-50 rounded text-gray-400 hover:text-blue-500" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleActive(d)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400" title={d.is_active ? 'Deactivate' : 'Activate'}>
                        {d.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => deleteMutation.mutate(d.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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