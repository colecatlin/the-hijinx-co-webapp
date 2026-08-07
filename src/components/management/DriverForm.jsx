import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Lock, AlertTriangle, Shield } from 'lucide-react';
import DateInput from '@/components/shared/DateInput';
import LocationFields from '@/components/shared/LocationFields';
import { useDisciplines } from '@/hooks/useDisciplines';
import { isDriverWriteAllowed } from '@/lib/driverReadOnly';

export default function DriverForm({ driver, onClose }) {
  const { disciplines: disciplineList = [] } = useDisciplines();

  const [formData, setFormData] = useState(driver || {
    first_name: '',
    last_name: '',
    slug: '',
    date_of_birth: '',
    hometown_city: '',
    hometown_state: '',
    hometown_country: 'USA',
    primary_number: '',
    primary_discipline: '',
  });

  // ── Driver read-only enforcement ──
  // Driver is read-only in normal UI. Admin repair mode unlocks compatibility fields.
  const [repairMode, setRepairMode] = useState(false);
  const [enforcementChecked, setEnforcementChecked] = useState(false);
  const [enforcementResult, setEnforcementResult] = useState(null);

  const queryClient = useQueryClient();

  // Check enforcement on mount
  React.useEffect(() => {
    const checkEnforcement = async () => {
      const result = await isDriverWriteAllowed(driver ? 'update' : 'create', {
        source_operation: 'driver_form',
      });
      setEnforcementResult(result);
      setEnforcementChecked(true);
      // If admin, allow repair mode toggle
      if (result.auth_source === 'admin') {
        // Admin can enable repair mode
      }
    };
    checkEnforcement();
  }, [driver?.id]);

  // ── Normalization helpers (mirror backend logic) ──
  const normalizeName = (value) => {
    if (!value) return '';
    return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const generateEntitySlug = (text) => {
    if (!text) return '';
    return text.trim().toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const generateUniqueNumericId = async () => {
    let numericId;
    let isUnique = false;
    while (!isUnique) {
      numericId = String(Math.floor(Math.random() * 90000000) + 10000000);
      const existing = await base44.entities.Driver.filter({ numeric_id: numericId });
      isUnique = existing.length === 0;
    }
    return numericId;
  };

  const generateUniqueCanonicalSlug = async (baseSlug, excludeId = null) => {
    let candidate = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await base44.entities.Driver.filter({ canonical_slug: candidate }).catch(() => []);
      const collision = existing.find(r => r.id !== excludeId);
      if (!collision) return candidate;
      counter++;
      candidate = `${baseSlug}-${counter}`;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // ── Driver read-only enforcement check ──
      // Block save unless in admin repair mode or allowlisted compat service
      if (!repairMode) {
        throw new Error('Driver is read-only. Use the RacerProfile page to edit public fields, or enable Admin Repair Mode for compatibility changes.');
      }

      // Log the admin repair attempt through enforcement backend
      const enforcementCheck = await isDriverWriteAllowed(driver ? 'update' : 'create', {
        source_operation: 'driver_form_admin_repair',
        driver_id: driver?.id,
      });
      if (!enforcementCheck.allowed && enforcementCheck.auth_source !== 'admin') {
        throw new Error(enforcementCheck.reason || 'Driver write blocked by enforcement.');
      }

      let payload = { ...data };

      if (!driver) {
        // ── New driver: generate all identity fields ──
        const numericId = await generateUniqueNumericId();
        // slug = internal unique slug (name + numeric id)
        const slugBase = `${data.first_name} ${data.last_name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const slug = `${slugBase}-${numericId}`;
        // canonical_slug = public route identity (clean name slug, collision-safe)
        const normalized = normalizeName(`${data.first_name} ${data.last_name}`);
        const canonicalSlugBase = generateEntitySlug(normalized);
        const canonical_slug = await generateUniqueCanonicalSlug(canonicalSlugBase);
        // normalized_name + canonical_key
        const normalized_name = normalized;
        let canonical_key = `driver:${normalized}`;
        if (data.date_of_birth) canonical_key = `driver:${normalized}:${data.date_of_birth}`;
        else if (data.primary_number) canonical_key = `driver:${normalized}:${data.primary_number}`;

        payload = { ...payload, numeric_id: numericId, slug, canonical_slug, normalized_name, canonical_key };
      } else {
        // ── Existing driver: carry id for update matching ──
        payload = { ...payload, id: driver.id };
        // If canonical_slug is missing on an existing record, generate it now
        if (!driver.canonical_slug) {
          const normalized = normalizeName(`${data.first_name} ${data.last_name}`);
          const canonicalSlugBase = generateEntitySlug(normalized);
          const canonical_slug = await generateUniqueCanonicalSlug(canonicalSlugBase, driver.id);
          payload = { ...payload, canonical_slug, normalized_name: normalized };
        }
      }

      const result = await base44.functions.invoke('syncSourceAndEntityRecord', {
        entity_type: 'driver',
        payload,
        triggered_from: 'driver_form',
      });

      if (result?.data?.source_record) {
        const record = result.data.source_record;
        // Log canonical slug generation for new drivers
        if (!driver && record.canonical_slug) {
          await base44.functions.invoke('createActivityFeedItemSafe', {
            event_type: 'driver_canonical_slug_generated',
            entity_type: 'Driver',
            entity_id: record.id,
            metadata: {
              driver_id: record.id,
              new_canonical_slug: record.canonical_slug,
              new_slug: record.slug,
              acted_by_user_id: null,
            },
          }).catch(() => {});
        }
        return record;
      }
      throw new Error(result?.data?.error || 'syncSourceAndEntityRecord returned no record');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['drivers-all'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-4xl font-black">
            {driver ? 'Edit Driver' : 'Add Driver'}
          </h1>
        </div>

        {/* ── Driver Read-Only Banner ── */}
        <div className={`border rounded-lg p-4 mb-6 ${repairMode ? 'bg-orange-50 border-orange-300' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-start gap-3">
            {repairMode ? <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" /> : <Lock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />}
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-800 mb-1">
                {repairMode ? 'Admin Repair Mode — Driver Compatibility' : 'Driver is Read-Only'}
              </h3>
              <p className="text-xs text-gray-600 mb-2">
                {repairMode
                  ? 'You are editing Driver compatibility fields directly. This is logged as an admin repair. Use this only for data correction that cannot be done through the modern identity chain.'
                  : 'Driver is a compatibility-only entity. Public profile fields should be edited on the RacerProfile page. Governed identity fields (legal name, DOB) should be edited through PersonIdentity admin tools.'}
              </p>
              {enforcementChecked && enforcementResult?.auth_source === 'admin' && (
                <button
                  type="button"
                  onClick={() => setRepairMode(!repairMode)}
                  className={`text-xs font-semibold flex items-center gap-1 ${repairMode ? 'text-orange-700' : 'text-blue-700'} hover:underline`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  {repairMode ? 'Exit Repair Mode' : 'Enable Admin Repair Mode'}
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={`space-y-6 bg-white border border-gray-200 rounded-lg p-6 ${!repairMode ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">First Name *</label>
              <Input
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Last Name *</label>
              <Input
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                required
              />
            </div>
          </div>



          <div>
            <label className="block text-sm font-medium mb-2">Date of Birth</label>
            <DateInput
              value={formData.date_of_birth}
              onChange={(value) => handleChange('date_of_birth', value)}
            />
            {formData.date_of_birth && (
              <div className="text-sm text-gray-600 mt-2">
                Age: {calculateAge(formData.date_of_birth)} years old
              </div>
            )}
          </div>

          <LocationFields
            cityValue={formData.hometown_city}
            stateValue={formData.hometown_state}
            countryValue={formData.hometown_country}
            onCityChange={(v) => handleChange('hometown_city', v)}
            onStateChange={(v) => handleChange('hometown_state', v)}
            onCountryChange={(v) => handleChange('hometown_country', v)}
            cityLabel="Hometown City *"
            stateLabel="State/Region"
            countryLabel="Country *"
          />

          <div>
            <label className="block text-sm font-medium mb-2">Primary Number *</label>
            <Input
              value={formData.primary_number}
              onChange={(e) => handleChange('primary_number', e.target.value)}
              placeholder="e.g., 24, #24"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Primary Discipline *</label>
            <Select value={formData.primary_discipline} onValueChange={(value) => handleChange('primary_discipline', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select discipline" />
              </SelectTrigger>
              <SelectContent>
                {disciplineList.map((d) => (
                  <SelectItem key={d.id} value={d.name}>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: d.color_code }} />
                      {d.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Profile Visibility</label>
            <Select value={formData.visibility_status || 'draft'} onValueChange={(value) => handleChange('visibility_status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft — hidden from public</SelectItem>
                <SelectItem value="live">Live — visible on site</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">Only "Live" profiles appear in the Driver Directory and public search.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-gray-900">
              {saveMutation.isPending ? 'Saving...' : driver ? 'Update Driver' : 'Create Driver'}
            </Button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}