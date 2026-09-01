import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Save, X, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DriverCombobox from './DriverCombobox';

const NUM_FIELDS = ['position', 'points', 'wins', 'top_5s', 'top_10s', 'starts', 'dnfs'];
const TEXT_FIELDS = ['car_number', 'manufacturer'];

function NumInput({ value, onChange, placeholder = '—' }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
      placeholder={placeholder}
      className="w-full h-9 rounded-md border px-2 text-sm outline-none transition-colors"
      style={{
        borderColor: 'hsl(var(--divider))',
        background: 'hsl(var(--surface-elevated))',
        color: 'hsl(var(--foreground))',
      }}
      onFocus={e => e.currentTarget.style.borderColor = 'hsl(var(--motion))'}
      onBlur={e => e.currentTarget.style.borderColor = 'hsl(var(--divider))'}
    />
  );
}

function TextInput({ value, onChange, placeholder = '—' }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      placeholder={placeholder}
      className="w-full h-9 rounded-md border px-2 text-sm outline-none transition-colors"
      style={{
        borderColor: 'hsl(var(--divider))',
        background: 'hsl(var(--surface-elevated))',
        color: 'hsl(var(--foreground))',
      }}
      onFocus={e => e.currentTarget.style.borderColor = 'hsl(var(--motion))'}
      onBlur={e => e.currentTarget.style.borderColor = 'hsl(var(--divider))'}
    />
  );
}

function Cell({ children }) {
  return <td className="px-3 py-2.5" style={{ color: 'hsl(var(--foreground-secondary))' }}>{children ?? '—'}</td>;
}

/**
 * StandingsEditableRow — one row in the standings table.
 *
 * Props:
 *   standing    — DriverStanding record (null when adding a new row)
 *   seriesId    — string
 *   seasonYear  — number
 *   canEdit     — boolean (admin/series-admin)
 *   drivers     — Driver[] for the combobox
 *   isNew       — boolean (true when this is the Add Row placeholder)
 *   onDone      — () => void (called after save/cancel on a new row)
 */
export default function StandingsEditableRow({ standing, seriesId, seasonYear, canEdit, drivers, isNew, onDone }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const blank = {
    position: null,
    driver_id: null,
    driver_name: '',
    car_number: null,
    manufacturer: null,
    points: null,
    wins: null,
    top_5s: null,
    top_10s: null,
    starts: null,
    dnfs: null,
  };

  const [draft, setDraft] = useState(standing || blank);

  const invalidateStandings = () =>
    queryClient.invalidateQueries({ queryKey: ['driverStandings', seriesId, seasonYear] });

  const update = (field, val) => setDraft(prev => ({ ...prev, [field]: val }));

  const handleSave = async () => {
    if (!draft.driver_name?.trim()) {
      toast.error('Driver name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        series_id: seriesId,
        season_year: seasonYear,
        driver_name: draft.driver_name.trim(),
        driver_id: draft.driver_id || null,
        car_number: draft.car_number || null,
        manufacturer: draft.manufacturer || null,
        position: draft.position ?? null,
        points: draft.points ?? null,
        wins: draft.wins ?? null,
        top_5s: draft.top_5s ?? null,
        top_10s: draft.top_10s ?? null,
        starts: draft.starts ?? null,
        dnfs: draft.dnfs ?? null,
      };

      if (isNew) {
        // Set dedup key for manual entries
        payload.standings_key = `${seriesId}:${seasonYear}:${payload.driver_name}`;
        payload.last_synced_at = new Date().toISOString();
        await base44.entities.DriverStanding.create(payload);
        toast.success('Standing added');
      } else {
        await base44.entities.DriverStanding.update(standing.id, payload);
        toast.success('Standing updated');
      }
      await invalidateStandings();
      setEditing(false);
      if (isNew) onDone();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await base44.entities.DriverStanding.delete(standing.id);
      toast.success('Standing deleted');
      await invalidateStandings();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleCancel = () => {
    if (isNew) {
      onDone();
      return;
    }
    setDraft(standing);
    setEditing(false);
    setConfirmDelete(false);
  };

  // ── Read mode ──
  if (!editing) {
    return (
      <tr className="transition-colors hover:bg-[hsl(var(--surface-interactive)/0.4)]">
        <td className="px-3 py-2.5 font-bold" style={{ color: 'hsl(var(--foreground))' }}>{standing.position ?? '—'}</td>
        <td className="px-3 py-2.5 font-medium whitespace-nowrap" style={{ color: 'hsl(var(--foreground))' }}>{standing.driver_name}</td>
        <Cell>{standing.car_number}</Cell>
        <Cell>{standing.manufacturer}</Cell>
        <td className="px-3 py-2.5 font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{standing.points?.toLocaleString() ?? '—'}</td>
        <Cell>{standing.stage_points}</Cell>
        <Cell>{standing.behind ? `-${standing.behind}` : null}</Cell>
        <Cell>{standing.starts}</Cell>
        <Cell>{standing.wins}</Cell>
        <Cell>{standing.top_5s}</Cell>
        <Cell>{standing.top_10s}</Cell>
        <Cell>{standing.dnfs}</Cell>
        <Cell>{standing.laps_led?.toLocaleString()}</Cell>
        {canEdit && (
          <td className="px-3 py-2.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'hsl(var(--foreground-quiet))' }}
                onMouseEnter={e => e.currentTarget.style.color = 'hsl(var(--motion))'}
                onMouseLeave={e => e.currentTarget.style.color = 'hsl(var(--foreground-quiet))'}
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: confirmDelete ? 'hsl(var(--danger))' : 'hsl(var(--foreground-quiet))' }}
                onMouseEnter={e => e.currentTarget.style.color = 'hsl(var(--danger))'}
                onMouseLeave={e => e.currentTarget.style.color = confirmDelete ? 'hsl(var(--danger))' : 'hsl(var(--foreground-quiet))'}
                title={confirmDelete ? 'Click again to confirm' : 'Delete'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </td>
        )}
      </tr>
    );
  }

  // ── Edit mode ──
  return (
    <tr style={{ background: 'hsl(var(--motion) / 0.05)' }}>
      <td className="px-2 py-2"><NumInput value={draft.position} onChange={v => update('position', v)} /></td>
      <td className="px-2 py-2 min-w-[160px]">
        <DriverCombobox
          value={{ driver_id: draft.driver_id, driver_name: draft.driver_name }}
          onChange={v => { update('driver_id', v.driver_id); update('driver_name', v.driver_name); }}
          drivers={drivers}
        />
      </td>
      <td className="px-2 py-2"><TextInput value={draft.car_number} onChange={v => update('car_number', v)} /></td>
      <td className="px-2 py-2"><TextInput value={draft.manufacturer} onChange={v => update('manufacturer', v)} /></td>
      <td className="px-2 py-2"><NumInput value={draft.points} onChange={v => update('points', v)} /></td>
      <td className="px-3 py-2.5 text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>—</td>
      <td className="px-3 py-2.5 text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>—</td>
      <td className="px-2 py-2"><NumInput value={draft.starts} onChange={v => update('starts', v)} /></td>
      <td className="px-2 py-2"><NumInput value={draft.wins} onChange={v => update('wins', v)} /></td>
      <td className="px-2 py-2"><NumInput value={draft.top_5s} onChange={v => update('top_5s', v)} /></td>
      <td className="px-2 py-2"><NumInput value={draft.top_10s} onChange={v => update('top_10s', v)} /></td>
      <td className="px-2 py-2"><NumInput value={draft.dnfs} onChange={v => update('dnfs', v)} /></td>
      <td className="px-3 py-2.5 text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>—</td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-1.5 rounded-md transition-colors disabled:opacity-50"
            style={{ color: 'hsl(var(--motion))' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'hsl(var(--motion) / 0.12)'; }}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent' }
            title="Save"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="p-1.5 rounded-md transition-colors disabled:opacity-50"
            style={{ color: 'hsl(var(--foreground-quiet))' }}
            onMouseEnter={e => e.currentTarget.style.color = 'hsl(var(--danger))'}
            onMouseLeave={e => e.currentTarget.style.color = 'hsl(var(--foreground-quiet))'}
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}