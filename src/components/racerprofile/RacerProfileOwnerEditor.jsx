/**
 * RacerProfileOwnerEditor.jsx
 *
 * Phase 8+ — Owner-edit UI for RacerProfile public fields.
 *
 * Shows only for approved owners, approved managers, and platform admins.
 * Edits only approved RacerProfile fields via updateOwnedRacerProfile backend function.
 * Never writes to Driver. Never exposes protected PersonIdentity fields.
 *
 * Shows save success and validation errors.
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2, Pencil } from 'lucide-react';

const EDITABLE_FIELDS = [
  { key: 'bio', label: 'Bio', type: 'textarea', placeholder: 'Tell your racing story...' },
  { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'A short headline or identity statement' },
  { key: 'profile_image_url', label: 'Profile Image URL', type: 'text', placeholder: 'https://...' },
  { key: 'hero_image_url', label: 'Hero Image URL', type: 'text', placeholder: 'https://...' },
  { key: 'website_url', label: 'Website', type: 'text', placeholder: 'https://...' },
  { key: 'instagram_url', label: 'Instagram', type: 'text', placeholder: 'https://instagram.com/...' },
  { key: 'facebook_url', label: 'Facebook', type: 'text', placeholder: 'https://facebook.com/...' },
  { key: 'tiktok_url', label: 'TikTok', type: 'text', placeholder: 'https://tiktok.com/@...' },
  { key: 'x_url', label: 'X (Twitter)', type: 'text', placeholder: 'https://x.com/...' },
  { key: 'youtube_url', label: 'YouTube', type: 'text', placeholder: 'https://youtube.com/@...' },
  { key: 'hometown_city', label: 'Hometown City', type: 'text', placeholder: 'City' },
  { key: 'hometown_state', label: 'Hometown State', type: 'text', placeholder: 'State' },
  { key: 'hometown_country', label: 'Hometown Country', type: 'text', placeholder: 'Country' },
  { key: 'racing_base_city', label: 'Racing Base City', type: 'text', placeholder: 'City' },
  { key: 'racing_base_state', label: 'Racing Base State', type: 'text', placeholder: 'State' },
  { key: 'racing_base_country', label: 'Racing Base Country', type: 'text', placeholder: 'Country' },
];

export default function RacerProfileOwnerEditor({ racerProfile, identity, user, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Authorization check — only show for approved owners, managers, and admins
  const isOwner = identity?.claim_status === 'claimed' && identity?.owner_user_id === user?.id;
  const isAdmin = user?.role === 'admin';
  // Manager check would require collaborator data — for now, admin and owner are the primary gates
  // The backend function does the full authorization check regardless
  const canEdit = isOwner || isAdmin;

  useEffect(() => {
    if (racerProfile) {
      const initial = {};
      for (const field of EDITABLE_FIELDS) {
        initial[field.key] = racerProfile[field.key] || '';
      }
      setFormData(initial);
    }
  }, [racerProfile?.id]);

  if (!canEdit) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await base44.functions.invoke('updateOwnedRacerProfile', {
        racer_profile_id: racerProfile.id,
        fields: formData,
      });

      const result = response.data || response;
      if (result.status === 'updated' || result.status === 'no_change') {
        setSuccess(result.message || 'Profile updated successfully.');
        setIsEditing(false);
        if (onUpdated) onUpdated(result);
        // Clear success after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Update failed.');
      }
    } catch (err) {
      const errData = err?.response?.data || err;
      if (errData?.rejected_fields) {
        setError(`Cannot edit: ${errData.rejected_fields.join(', ')}. Only approved public fields are editable.`);
      } else {
        setError(errData?.error || errData?.message || 'Failed to update profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    // Reset form to current values
    const initial = {};
    for (const field of EDITABLE_FIELDS) {
      initial[field.key] = racerProfile[field.key] || '';
    }
    setFormData(initial);
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pencil className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-bold text-[#232323]">Edit My Profile</h3>
          {isOwner && <Badge className="bg-teal-100 text-teal-700 text-xs">Owner</Badge>}
          {isAdmin && <Badge className="bg-purple-100 text-purple-700 text-xs">Admin</Badge>}
        </div>
        {!isEditing && (
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 mb-3 p-2.5 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-700">{success}</p>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-3">
          {EDITABLE_FIELDS.map(field => (
            <div key={field.key}>
              <Label className="text-xs font-semibold text-gray-600 mb-1 block">{field.label}</Label>
              {field.type === 'textarea' ? (
                <Textarea
                  value={formData[field.key] || ''}
                  onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="text-sm"
                  rows={3}
                />
              ) : (
                <Input
                  value={formData[field.key] || ''}
                  onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="text-sm"
                />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          Update your bio, tagline, social links, and location info. Protected fields (display name, slug, RaceCore ID) require admin assistance.
        </p>
      )}
    </div>
  );
}