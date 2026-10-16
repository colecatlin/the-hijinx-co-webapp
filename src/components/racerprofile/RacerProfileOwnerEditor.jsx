/**
 * RacerProfileOwnerEditor.jsx
 *
 * Editor BODY for authorized racer profile management.
 *
 * PRESENTATION CHANGE ONLY: this component no longer renders as a dominant
 * always-open public-profile panel and no longer gates or buttons itself. It is
 * mounted by RacerEditControl (a small "Edit Profile" control gated on the
 * server-computed can_manage flag) and rendered inside a dialog.
 *
 * UNCHANGED: the writable field allow-list, the canonical owner-update call,
 * the optimistic cache patch and its revert, error/success handling and the
 * backend's own authorization (which remains the real gate).
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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

export default function RacerProfileOwnerEditor({ racerProfile, identity, user, onUpdated, onClose, routeSlug }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (racerProfile) {
      const initial = {};
      for (const field of EDITABLE_FIELDS) {
        initial[field.key] = racerProfile[field.key] || '';
      }
      setFormData(initial);
    }
  }, [racerProfile?.id]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Optimistic update: reflect the edited fields in the cached experience
    // data immediately so the UI updates before the server responds.
    const queryKey = ['racerProfileExperience', routeSlug];
    const previous = routeSlug ? queryClient.getQueryData(queryKey) : null;
    if (routeSlug && previous) {
      queryClient.setQueryData(queryKey, (old) => {
        const data = old?.data || old;
        if (!data?.page_data?.racerProfile) return old;
        return {
          ...old,
          data: {
            ...data,
            page_data: {
              ...data.page_data,
              racerProfile: { ...data.page_data.racerProfile, ...formData },
            },
          },
        };
      });
    }

    try {
      const response = await base44.functions.invoke('updateOwnedRacerProfile', {
        racer_profile_id: racerProfile.id,
        fields: formData,
      });

      const result = response.data || response;
      if (result.status === 'updated' || result.status === 'no_change') {
        setSuccess(result.message || 'Profile updated successfully.');
        if (onUpdated) onUpdated(result);
        // Close after a short confirmation so the owner sees the result.
        setTimeout(() => {
          if (onClose) onClose();
        }, 1200);
      } else {
        setError(result.message || 'Update failed.');
        // Revert optimistic update on failure
        if (previous) queryClient.setQueryData(queryKey, previous);
      }
    } catch (err) {
      // Revert optimistic update on error
      if (previous) queryClient.setQueryData(queryKey, previous);
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
    setError(null);
    const initial = {};
    for (const field of EDITABLE_FIELDS) {
      initial[field.key] = racerProfile[field.key] || '';
    }
    setFormData(initial);
    if (onClose) onClose();
  };

  return (
    <div>
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" />
          <p className="text-xs text-danger">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-success/40 bg-success/10 p-2.5">
          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
          <p className="text-xs text-success">{success}</p>
        </div>
      )}

      <p className="mb-4 text-xs text-foreground-quiet">
        Update your bio, tagline, social links, and location info. Protected fields (display name, slug, RaceCore ID)
        require admin assistance.
      </p>

      <div className="space-y-3">
        {EDITABLE_FIELDS.map((field) => {
          const fieldId = `owner-edit-${field.key}`;
          return (
            <div key={field.key}>
              <Label htmlFor={fieldId} className="mb-1 block text-xs font-semibold text-foreground-secondary">
                {field.label}
              </Label>
              {field.type === 'textarea' ? (
                <Textarea
                  id={fieldId}
                  value={formData[field.key] || ''}
                  onChange={(event) => setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  placeholder={field.placeholder}
                  className="text-sm"
                  rows={3}
                />
              ) : (
                <Input
                  id={fieldId}
                  value={formData[field.key] || ''}
                  onChange={(event) => setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  placeholder={field.placeholder}
                  className="text-sm"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-4">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}