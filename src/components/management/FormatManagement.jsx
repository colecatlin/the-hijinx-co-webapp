import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, AlertTriangle, Save, X, Eye, EyeOff, Pencil, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function FormatManagement() {
  const queryClient = useQueryClient();

  const { data: disciplines = [] } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => base44.entities.Discipline.list('sort_order'),
  });
  const activeDisciplines = disciplines.filter(d => d.is_active !== false);

  const { data: formats = [], isLoading } = useQuery({
    queryKey: ['formats'],
    queryFn: () => base44.entities.Format.list('sort_order'),
  });

  const [filterDisciplineId, setFilterDisciplineId] = useState('all');
  const [newName, setNewName] = useState('');
  const [newDisciplineId, setNewDisciplineId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [seeding, setSeeding] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries(['formats']);
    queryClient.invalidateQueries(['disciplines']);
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Format.create(data),
    onSuccess: () => {
      invalidate();
      setNewName('');
      setNewDisciplineId('');
      setNewDescription('');
      toast.success('Format created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Format.update(id, data),
    onSuccess: () => { invalidate(); setEditingId(null); toast.success('Format updated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Format.delete(id),
    onSuccess: invalidate,
  });

  const toggleActive = (f) => updateMutation.mutate({ id: f.id, data: { is_active: !f.is_active } });

  const handleAdd = () => {
    if (!newName.trim() || !newDisciplineId) return;
    const disciplineFormats = formats.filter(f => f.discipline_id === newDisciplineId);
    createMutation.mutate({
      name: newName.trim(),
      slug: slugify(newName.trim()),
      discipline_id: newDisciplineId,
      description: newDescription.trim() || undefined,
      sort_order: disciplineFormats.length,
      is_active: true,
    });
  };

  const handleSaveEdit = (id) => {
    updateMutation.mutate({
      id,
      data: {
        name: editFields.name,
        slug: slugify(editFields.name),
        discipline_id: editFields.discipline_id,
        description: editFields.description || undefined,
        sort_order: Number(editFields.sort_order) || 0,
      },
    });
  };

  const handleSeed = async () => {
    setSeeding(true);
    const res = await base44.functions.invoke('seedFormatData', {});
    setSeeding(false);
    invalidate();
    const r = res?.data?.results;
    if (r) {
      toast.success(`Seeded: ${r.formats_created?.length ?? 0} formats, ${r.disciplines_created?.length ?? 0} new disciplines`);
    }
  };

  const disciplineById = useMemo(() => {
    const m = {};
    disciplines.forEach(d => { m[d.id] = d; });
    return m;
  }, [disciplines]);

  const filteredFormats = filterDisciplineId && filterDisciplineId !== 'all'
    ? formats.filter(f => f.discipline_id === filterDisciplineId)
    : formats;

  const isNewNameDuplicate = formats.some(f => f.name.toLowerCase() === newName.toLowerCase().trim());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Formats are the second level of the classification hierarchy. Each Format belongs to one Discipline.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeed}
          disabled={seeding}
          className="shrink-0 gap-1.5"
        >
          <Play className="w-3.5 h-3.5" />
          {seeding ? 'Seeding...' : 'Seed Default Formats'}
        </Button>
      </div>

      {/* Add new format */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Format</h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-2">
          <Select value={newDisciplineId || undefined} onValueChange={setNewDisciplineId}>
            <SelectTrigger className="w-full sm:w-52 text-sm">
              <SelectValue placeholder="Select Discipline *" />
            </SelectTrigger>
            <SelectContent>
              {activeDisciplines.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="text"
            placeholder="Format name (e.g. Road Course)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <Button
            onClick={handleAdd}
            disabled={!newName.trim() || !newDisciplineId || isNewNameDuplicate || createMutation.isPending}
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        <input
          type="text"
          placeholder="Description (optional)"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {isNewNameDuplicate && newName.trim() && (
          <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Format name already exists.
          </p>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-3">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter by Discipline:</label>
        <Select value={filterDisciplineId} onValueChange={setFilterDisciplineId}>
          <SelectTrigger className="w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {disciplines.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400">{filteredFormats.length} format{filteredFormats.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Formats list */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Name / Discipline</span>
          <span>Order</span>
          <span>Status</span>
          <span />
        </div>

        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
        ) : filteredFormats.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No formats yet. Use "Seed Default Formats" to get started.
          </div>
        ) : (
          filteredFormats.map((f) => {
            const disc = disciplineById[f.discipline_id];
            const isEditing = editingId === f.id;
            return (
              <div
                key={f.id}
                className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 ${!f.is_active ? 'opacity-50' : ''}`}
              >
                {isEditing ? (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <input
                        type="text"
                        value={editFields.name}
                        onChange={(e) => setEditFields(prev => ({ ...prev, name: e.target.value }))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <Select
                        value={editFields.discipline_id || undefined}
                        onValueChange={(v) => setEditFields(prev => ({ ...prev, discipline_id: v }))}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Discipline" />
                        </SelectTrigger>
                        <SelectContent>
                          {disciplines.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <input
                      type="number"
                      value={editFields.sort_order}
                      onChange={(e) => setEditFields(prev => ({ ...prev, sort_order: e.target.value }))}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none"
                    />
                    <span className="text-xs text-gray-400">—</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleSaveEdit(f.id)} className="p-1.5 hover:bg-green-100 rounded text-green-600"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><X className="w-4 h-4" /></button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="font-medium text-sm text-[#232323]">{f.name}</p>
                      {disc && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: disc.color_code }} />
                          {disc.name}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-center">{f.sort_order ?? 0}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${f.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {f.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingId(f.id); setEditFields({ name: f.name, discipline_id: f.discipline_id, description: f.description || '', sort_order: f.sort_order ?? 0 }); }}
                        className="p-1.5 hover:bg-blue-50 rounded text-gray-400 hover:text-blue-500"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleActive(f)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400">
                        {f.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => deleteMutation.mutate(f.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
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
    </div>
  );
}