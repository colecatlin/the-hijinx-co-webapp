/**
 * AdminOverridePanel
 *
 * Reusable admin-only surface for protected core / identity fields on shared entities.
 * Renders inside the admin "Override" tab — never in normal Management or Race Core forms.
 *
 * Editable (with warnings):      slug, owner_user_id (Driver), featured (Driver)
 * Read-only (provenance):        canonical_slug, canonical_key, normalized_name,
 *                                numeric_id, data_source, external_uid,
 *                                sync_last_seen_at, is_sample, created_by
 *
 * Props:
 *   entityType   — 'Driver' | 'Team' | 'Track' | 'Series' | 'Event'
 *   entityId     — record id
 *   entityRecord — the full entity record (pre-loaded by the parent page)
 *   onSaved      — optional callback after a successful save
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, ShieldAlert, Lock, Eye } from 'lucide-react';
import { toast } from 'sonner';

// Fields that differ by entity type
const ENTITY_SDK_MAP = {
  Driver: 'Driver',
  Team: 'Team',
  Track: 'Track',
  Series: 'Series',
  Event: 'Event',
};

// Fields present on each entity (keep in sync with entity schemas)
const EDITABLE_FIELDS = {
  Driver:  ['slug', 'owner_user_id', 'featured'],
  Team:    ['slug'],
  Track:   ['slug'],
  Series:  ['slug', 'popularity_rank'],
  Event:   [],
};

const READONLY_FIELDS = {
  Driver:  ['canonical_slug', 'canonical_key', 'normalized_name', 'numeric_id', 'data_source', 'external_uid', 'sync_last_seen_at', 'is_sample', 'created_by'],
  Team:    ['canonical_slug', 'canonical_key', 'normalized_name', 'numeric_id', 'data_source', 'external_uid', 'sync_last_seen_at', 'created_by'],
  Track:   ['canonical_slug', 'canonical_key', 'normalized_name', 'numeric_id', 'data_source', 'external_uid', 'sync_last_seen_at', 'created_by'],
  Series:  ['canonical_slug', 'canonical_key', 'normalized_name', 'numeric_id', 'data_source', 'external_uid', 'sync_last_seen_at', 'is_sample', 'created_by'],
  Event:   ['canonical_slug', 'canonical_key', 'normalized_event_key', 'normalized_name', 'numeric_id', 'data_source', 'external_uid', 'sync_last_seen_at', 'created_by', 'external_uid'],
};

const FIELD_LABELS = {
  slug:               'Slug',
  canonical_slug:     'Canonical Slug',
  canonical_key:      'Canonical Key',
  normalized_name:    'Normalized Name',
  normalized_event_key: 'Normalized Event Key',
  numeric_id:         'Numeric Access Code',
  owner_user_id:      'Owner User ID',
  featured:           'Featured on Homepage',
  data_source:        'Data Source',
  external_uid:       'External UID',
  sync_last_seen_at:  'Last Sync Seen At',
  is_sample:          'Sample / Demo Record',
  created_by:         'Created By',
  popularity_rank:    'Popularity Rank',
};

const FIELD_WARNINGS = {
  slug:           'Changing the slug will break existing public URLs for this entity. Only change if you know what you are doing.',
  owner_user_id:  'Changing the owner transfers profile management rights to a different user account.',
  featured:       'Controls homepage spotlight placement. Only set for intentional featured profiles.',
  popularity_rank: 'Lower numbers appear more prominently. Leave blank to use default ordering.',
};

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Lock className="w-3 h-3 text-gray-400" />
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      </div>
      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono text-gray-600 break-all">
        {value == null || value === '' ? <span className="italic text-gray-400">—</span> : String(value)}
      </div>
    </div>
  );
}

function EditableField({ label, fieldKey, value, onChange, warning }) {
  const isBoolean = typeof value === 'boolean';
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Eye className="w-3 h-3 text-amber-500" />
        <label className="text-xs font-medium text-amber-700 uppercase tracking-wide">{label}</label>
      </div>
      {isBoolean ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded">
          <Checkbox
            id={`override-${fieldKey}`}
            checked={!!value}
            onCheckedChange={(checked) => onChange(fieldKey, !!checked)}
          />
          <Label htmlFor={`override-${fieldKey}`} className="text-sm cursor-pointer">{label}</Label>
        </div>
      ) : (
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className="font-mono text-sm border-amber-300 focus:border-amber-500 bg-amber-50"
        />
      )}
      {warning && (
        <p className="mt-1 text-xs text-amber-700 flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {warning}
        </p>
      )}
    </div>
  );
}

export default function AdminOverridePanel({ entityType, entityId, entityRecord, onSaved }) {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState({});
  const [confirmed, setConfirmed] = useState(false);

  const editableFields = EDITABLE_FIELDS[entityType] || [];
  const readonlyFields = READONLY_FIELDS[entityType] || [];

  useEffect(() => {
    // Reset edits whenever the record changes
    if (entityRecord) {
      const initial = {};
      editableFields.forEach(f => { initial[f] = entityRecord[f] ?? null; });
      setEdits(initial);
    }
  }, [entityRecord?.id]);

  const handleChange = (field, value) => {
    setEdits(prev => ({ ...prev, [field]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const sdk = base44.entities[ENTITY_SDK_MAP[entityType]];
      if (!sdk) throw new Error(`Unknown entity type: ${entityType}`);

      const payload = {};
      editableFields.forEach(f => {
        if (edits[f] !== undefined) payload[f] = edits[f];
      });

      return sdk.update(entityId, payload);
    },
    onSuccess: () => {
      const queryKey = entityType.toLowerCase();
      queryClient.invalidateQueries({ queryKey: [queryKey, entityId] });
      queryClient.invalidateQueries({ queryKey: [`${queryKey}s`] });
      toast.success('Override saved');
      setConfirmed(false);
      if (onSaved) onSaved();
    },
  });

  if (!entityRecord) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">Loading entity data...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header warning */}
      <div className="flex items-start gap-3 px-4 py-4 bg-red-50 border border-red-200 rounded-lg">
        <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-800">Protected Override Area — Admin Only</p>
          <p className="text-xs text-red-700 mt-0.5">
            Fields below are system-level identity and provenance fields. Edits here can break
            routing, deduplication, and data integrity. Only change values if you fully understand
            the consequences.
          </p>
        </div>
      </div>

      {/* Editable protected fields */}
      {editableFields.length > 0 && (
        <div className="border border-amber-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Editable Protected Fields</h3>
          </div>
          {editableFields.map(f => (
            <EditableField
              key={f}
              label={FIELD_LABELS[f] || f}
              fieldKey={f}
              value={edits[f]}
              onChange={handleChange}
              warning={FIELD_WARNINGS[f]}
            />
          ))}

          <div className="pt-3 border-t border-amber-200 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={confirmed}
                onCheckedChange={setConfirmed}
                id="confirm-override"
              />
              <Label htmlFor="confirm-override" className="text-sm text-amber-800 cursor-pointer">
                I understand these are protected system fields and I intend to make this change.
              </Label>
            </label>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!confirmed || saveMutation.isPending}
              className="bg-red-700 hover:bg-red-800 text-white disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving Override...' : 'Save Override'}
            </Button>
          </div>
        </div>
      )}

      {/* Read-only provenance fields */}
      <div className="border border-gray-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Read-Only Provenance Fields</h3>
          <span className="text-xs text-gray-400">(system-managed — not editable)</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {readonlyFields.map(f => (
            <ReadOnlyField
              key={f}
              label={FIELD_LABELS[f] || f}
              value={entityRecord[f]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}