import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createPageUrl } from '@/components/utils';
import { toast } from 'sonner';
import { ExternalLink, Plus, CheckCircle2 } from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────

const ENTITY_TYPES = ['Driver', 'Team', 'Track', 'Series', 'Event'];

const MANAGEMENT_PAGE = {
  Driver: 'ManageDrivers',
  Team:   'ManageTeams',
  Track:  'ManageTracks',
  Series: 'ManageSeries',
  Event:  'ManageEvents',
};

const INPUT_CLS    = 'bg-[#1A1A1A] border-gray-700 text-white text-sm h-8';
const TRIGGER_CLS  = 'bg-[#1A1A1A] border-gray-700 text-white text-sm h-8';
const CONTENT_CLS  = 'bg-[#262626] border-gray-700';

// ── Default form state per entity type ────────────────────────────────────────

function defaultForm(type) {
  switch (type) {
    case 'Driver': return { first_name: '', last_name: '', primary_discipline: '', primary_number: '', team_id: '', racing_status: 'Active' };
    case 'Team':   return { name: '', primary_discipline: '', team_level: 'Regional', racing_status: 'Active' };
    case 'Track':  return { name: '', track_type: '', surface_type: '', location_city: '', location_state: '', location_country: 'United States', operational_status: 'Active' };
    case 'Series': return { name: '', discipline: '', geographic_scope: 'Regional', operational_status: 'Active' };
    case 'Event':  return { name: '', track_id: '', series_id: '', season: String(new Date().getFullYear()), event_date: '', round_number: '', status: 'Draft' };
    default: return {};
  }
}

// ── Required field validation per entity ──────────────────────────────────────

function isValid(type, form) {
  switch (type) {
    case 'Driver': return !!(form.first_name && form.last_name && form.primary_discipline);
    case 'Team':   return !!(form.name && form.primary_discipline);
    case 'Track':  return !!(form.name && form.track_type && form.surface_type && form.location_city && form.location_country);
    case 'Series': return !!(form.name && form.discipline);
    case 'Event':  return !!(form.name && form.event_date);
    default: return false;
  }
}

// ── Labeled field wrapper ─────────────────────────────────────────────────────

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Form renderers per entity ─────────────────────────────────────────────────

function DriverForm({ form, set, teams }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First Name" required>
          <Input className={INPUT_CLS} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First" />
        </Field>
        <Field label="Last Name" required>
          <Input className={INPUT_CLS} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last" />
        </Field>
      </div>
      <Field label="Discipline" required>
        <Select value={form.primary_discipline} onValueChange={v => set('primary_discipline', v)}>
          <SelectTrigger className={TRIGGER_CLS}><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent className={CONTENT_CLS}>
            {['Off Road','Snowmobile','Asphalt Oval','Road Racing','Rallycross','Drag Racing','Mixed'].map(d =>
              <SelectItem key={d} value={d}>{d}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Car Number">
          <Input className={INPUT_CLS} value={form.primary_number} onChange={e => set('primary_number', e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Racing Status">
          <Select value={form.racing_status} onValueChange={v => set('racing_status', v)}>
            <SelectTrigger className={TRIGGER_CLS}><SelectValue /></SelectTrigger>
            <SelectContent className={CONTENT_CLS}>
              {['Active','Inactive','Part Time'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Team (optional)">
        <Select value={form.team_id} onValueChange={v => set('team_id', v)}>
          <SelectTrigger className={TRIGGER_CLS}><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent className={CONTENT_CLS}>
            <SelectItem value={null}>None</SelectItem>
            {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function TeamForm({ form, set }) {
  return (
    <div className="space-y-3">
      <Field label="Team Name" required>
        <Input className={INPUT_CLS} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Team name" />
      </Field>
      <Field label="Discipline" required>
        <Select value={form.primary_discipline} onValueChange={v => set('primary_discipline', v)}>
          <SelectTrigger className={TRIGGER_CLS}><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent className={CONTENT_CLS}>
            {['Off Road','Snowmobile','Asphalt Oval','Road Racing','Rallycross','Drag Racing','Mixed'].map(d =>
              <SelectItem key={d} value={d}>{d}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Level">
          <Select value={form.team_level} onValueChange={v => set('team_level', v)}>
            <SelectTrigger className={TRIGGER_CLS}><SelectValue /></SelectTrigger>
            <SelectContent className={CONTENT_CLS}>
              {['Local','Regional','National','International'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Racing Status">
          <Select value={form.racing_status} onValueChange={v => set('racing_status', v)}>
            <SelectTrigger className={TRIGGER_CLS}><SelectValue /></SelectTrigger>
            <SelectContent className={CONTENT_CLS}>
              {['Active','Part Time','Historic','Inactive'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

function TrackForm({ form, set }) {
  return (
    <div className="space-y-3">
      <Field label="Track Name" required>
        <Input className={INPUT_CLS} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Track name" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Track Type" required>
          <Select value={form.track_type} onValueChange={v => set('track_type', v)}>
            <SelectTrigger className={TRIGGER_CLS}><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent className={CONTENT_CLS}>
              {['Oval','Road Course','Street Circuit','Short Track','Speedway','Off-Road','Dirt Track','Other'].map(t =>
                <SelectItem key={t} value={t}>{t}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Surface" required>
          <Select value={form.surface_type} onValueChange={v => set('surface_type', v)}>
            <SelectTrigger className={TRIGGER_CLS}><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent className={CONTENT_CLS}>
              {['Asphalt','Concrete','Dirt','Clay','Mixed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" required>
          <Input className={INPUT_CLS} value={form.location_city} onChange={e => set('location_city', e.target.value)} placeholder="City" />
        </Field>
        <Field label="State">
          <Input className={INPUT_CLS} value={form.location_state} onChange={e => set('location_state', e.target.value)} placeholder="State / Region" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Country" required>
          <Input className={INPUT_CLS} value={form.location_country} onChange={e => set('location_country', e.target.value)} placeholder="Country" />
        </Field>
        <Field label="Operational Status">
          <Select value={form.operational_status} onValueChange={v => set('operational_status', v)}>
            <SelectTrigger className={TRIGGER_CLS}><SelectValue /></SelectTrigger>
            <SelectContent className={CONTENT_CLS}>
              {['Active','Inactive','Seasonal'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

function SeriesForm({ form, set }) {
  return (
    <div className="space-y-3">
      <Field label="Series Name" required>
        <Input className={INPUT_CLS} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Series name" />
      </Field>
      <Field label="Discipline" required>
        <Select value={form.discipline} onValueChange={v => set('discipline', v)}>
          <SelectTrigger className={TRIGGER_CLS}><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent className={CONTENT_CLS}>
            {['Stock Car','Off Road','Dirt Oval','Snowmobile','Dirt Bike','Open Wheel','Sports Car','Touring Car','Rally','Drag','Motorcycle','Karting','Water','Alternative'].map(d =>
              <SelectItem key={d} value={d}>{d}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Geographic Scope">
          <Select value={form.geographic_scope} onValueChange={v => set('geographic_scope', v)}>
            <SelectTrigger className={TRIGGER_CLS}><SelectValue /></SelectTrigger>
            <SelectContent className={CONTENT_CLS}>
              {['Local','Regional','National','International','Global'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Operational Status">
          <Select value={form.operational_status} onValueChange={v => set('operational_status', v)}>
            <SelectTrigger className={TRIGGER_CLS}><SelectValue /></SelectTrigger>
            <SelectContent className={CONTENT_CLS}>
              {['Active','Inactive','Upcoming'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

function EventForm({ form, set, tracks, seriesList }) {
  return (
    <div className="space-y-3">
      <Field label="Event Name" required>
        <Input className={INPUT_CLS} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Event name" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Event Date" required>
          <Input type="date" className={INPUT_CLS} value={form.event_date} onChange={e => set('event_date', e.target.value)} />
        </Field>
        <Field label="Season">
          <Input className={INPUT_CLS} value={form.season} onChange={e => set('season', e.target.value)} placeholder="2026" />
        </Field>
      </div>
      <Field label="Track (optional)">
        <Select value={form.track_id} onValueChange={v => set('track_id', v)}>
          <SelectTrigger className={TRIGGER_CLS}><SelectValue placeholder="Select track…" /></SelectTrigger>
          <SelectContent className={CONTENT_CLS}>
            <SelectItem value={null}>None</SelectItem>
            {tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Series (optional)">
        <Select value={form.series_id} onValueChange={v => set('series_id', v)}>
          <SelectTrigger className={TRIGGER_CLS}><SelectValue placeholder="Select series…" /></SelectTrigger>
          <SelectContent className={CONTENT_CLS}>
            <SelectItem value={null}>None</SelectItem>
            {seriesList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Round #">
          <Input type="number" className={INPUT_CLS} value={form.round_number} onChange={e => set('round_number', e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger className={TRIGGER_CLS}><SelectValue /></SelectTrigger>
            <SelectContent className={CONTENT_CLS}>
              {['Draft','PendingApproval','Published','Live','Completed','Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RaceCoreQuickCreate({
  open,
  onClose,
  initialEntityType = 'Driver',
  tracks = [],
  seriesList = [],
  onCreated,
}) {
  const [entityType, setEntityType] = useState(initialEntityType);
  const [form, setForm] = useState(() => defaultForm(initialEntityType));
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  // Sync entity type and reset form when modal opens or initialEntityType changes
  useEffect(() => {
    if (open) {
      setEntityType(initialEntityType);
      setForm(defaultForm(initialEntityType));
      setCreated(null);
    }
  }, [initialEntityType, open]);

  // Fetch teams for the Driver form
  const { data: teams = [] } = useQuery({
    queryKey: ['teams_for_quickcreate'],
    queryFn: () => base44.entities.Team.list(),
    enabled: open,
    staleTime: 60_000,
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleTypeChange = (type) => {
    setEntityType(type);
    setForm(defaultForm(type));
    setCreated(null);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Strip empty string optional fields before saving
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      );

      // Coerce numeric fields
      if (entityType === 'Event' && payload.round_number) {
        payload.round_number = Number(payload.round_number);
      }

      const result = await base44.entities[entityType].create(payload);
      setCreated(result);
      toast.success(`${entityType} created`);
      onCreated?.(entityType, result);
    } catch (err) {
      toast.error(`Failed to create ${entityType}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setCreated(null);
    setForm(defaultForm(entityType));
    onClose();
  };

  const renderForm = () => {
    switch (entityType) {
      case 'Driver': return <DriverForm form={form} set={set} teams={teams} />;
      case 'Team':   return <TeamForm form={form} set={set} />;
      case 'Track':  return <TrackForm form={form} set={set} />;
      case 'Series': return <SeriesForm form={form} set={set} />;
      case 'Event':  return <EventForm form={form} set={set} tracks={tracks} seriesList={seriesList} />;
      default: return null;
    }
  };

  const displayName = created
    ? (entityType === 'Driver' ? `${created.first_name} ${created.last_name}` : created.name)
    : '';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-[#1C1C1C] border-gray-800 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-bold flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400" /> Quick Create
            <span className="text-xs text-gray-500 font-normal ml-1">· Admin only</span>
          </DialogTitle>
        </DialogHeader>

        {/* Entity type tabs */}
        <div className="flex gap-1 flex-wrap border-b border-gray-800 pb-3">
          {ENTITY_TYPES.map(type => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                entityType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#262626] text-gray-400 hover:text-white hover:bg-[#333]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {created ? (
          /* ── Success state ── */
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-4 bg-green-950/30 border border-green-800/50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-300">{entityType} created</p>
                <p className="text-xs text-green-400/70 mt-0.5">{displayName}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              This {entityType.toLowerCase()} is immediately available for selection in Race Core.
            </p>
            <a
              href={createPageUrl(MANAGEMENT_PAGE[entityType])}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Complete profile in Management
            </a>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => { setCreated(null); setForm(defaultForm(entityType)); }}
                className="bg-blue-700 hover:bg-blue-600 text-xs"
              >
                Create Another {entityType}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClose}
                className="border-gray-700 text-gray-300 text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* ── Form state ── */
          <div className="space-y-4">
            {renderForm()}
            <div className="flex gap-2 pt-2 border-t border-gray-800">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={saving || !isValid(entityType, form)}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs"
              >
                {saving ? 'Creating…' : `Create ${entityType}`}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClose}
                className="border-gray-700 text-gray-300 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}