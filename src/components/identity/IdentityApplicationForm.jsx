import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRole, ROLES, ROLES_BY_CATEGORY, ROLE_CATEGORIES } from '@/config/onboardingRoles';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Plus, Link2, FileText, ExternalLink, ShieldCheck, Info } from 'lucide-react';

const MOTION = 'hsl(var(--motion))';

// ─── Field config for role-specific onboarding_fields ──────────────────────
const FIELD_CONFIG = {
  primary_discipline: { label: 'Primary Discipline', placeholder: 'e.g. Off Road, Stock Car, Rally' },
  primary_number: { label: 'Car Number', placeholder: 'Your race number' },
  manufacturer: { label: 'Manufacturer', placeholder: 'e.g. Ford, Chevrolet, KTM' },
  hometown: { label: 'Hometown', placeholder: 'City, State' },
  license_number: { label: 'License Number', placeholder: 'Racing license number (optional)' },
  team_name: { label: 'Team Name', placeholder: 'Your team name' },
  team_discipline: { label: 'Discipline', placeholder: 'e.g. Off Road, Rally' },
  team_hq_location: { label: 'HQ Location', placeholder: 'City, State' },
  crew_role: { label: 'Crew Role', placeholder: 'e.g. Mechanic, Spotter, Tire Tech' },
  official_role: { label: 'Official Role', placeholder: 'e.g. Steward, Tech Inspector' },
  media_outlet_name: { label: 'Outlet / Publication', placeholder: 'Where you publish (optional)' },
  media_specialties: { label: 'Specialties', placeholder: 'e.g. Off Road, Rally, Drift (comma-separated)' },
  portfolio_link: { label: 'Portfolio Link', placeholder: 'https://yourportfolio.com' },
  brand_name: { label: 'Brand Name', placeholder: 'Your brand or company' },
  sponsor_industry: { label: 'Industry', placeholder: 'e.g. Energy Drink, Tires, Insurance' },
  business_name: { label: 'Business Name', placeholder: 'Your business' },
  services_offered: { label: 'Services Offered', placeholder: 'What you offer' },
  manufacturer_name: { label: 'Manufacturer Name', placeholder: 'Company name' },
  manufacturer_industry: { label: 'Industry', placeholder: 'e.g. Parts, Fluids, Chassis' },
  organization_name: { label: 'Organization Name', placeholder: 'Organization name' },
  creator_handle: { label: 'Creator Handle', placeholder: '@yourhandle' },
  content_focus: { label: 'Content Focus', placeholder: 'What you create (e.g. race recaps, tech)' },
  volunteer_interests: { label: 'Interests', placeholder: 'How you want to help' },
};

// Entity types that support the "existing" (claim) path
const EXISTING_PATH_ENTITIES = ['RacerProfile', 'Team', 'Track', 'Series'];

// SDK entity name for searching existing records
const SEARCH_ENTITY_MAP = {
  RacerProfile: 'RacerProfile',
  Team: 'Team',
  Track: 'Track',
  Series: 'Series',
};

export default function IdentityApplicationForm({ user, onSubmitted, onCancel }) {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [mode, setMode] = useState('new'); // 'new' | 'existing'
  const [roleFields, setRoleFields] = useState({});
  const [evidenceLinks, setEvidenceLinks] = useState(['']);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [entityName, setEntityName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const selectedRole = useMemo(() => (selectedRoleId ? getRole(selectedRoleId) : null), [selectedRoleId]);

  // Existing applications for this user (to show pending status)
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myIdentityApplications', user?.id],
    queryFn: () => base44.entities.IdentityApplication.filter({ user_id: user.id }, '-submitted_at', 50),
    enabled: !!user?.id,
  });

  const pendingForRole = (roleId) => myApplications.some(
    (a) => a.role_key === roleId && (a.status === 'pending' || a.status === 'needs_more_info')
  );

  const runSearch = async (q) => {
    setSearchQuery(q);
    if (!selectedRole?.application_entity_type || !SEARCH_ENTITY_MAP[selectedRole.application_entity_type]) {
      return;
    }
    if (q.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const sdkEntity = SEARCH_ENTITY_MAP[selectedRole.application_entity_type];
      const list = await base44.entities[sdkEntity].list('-created_date', 40);
      const lower = q.toLowerCase();
      const nameField = selectedRole.application_entity_type === 'RacerProfile' ? 'display_name' : 'name';
      setSearchResults(
        list
          .filter((r) => (r[nameField] || '').toLowerCase().includes(lower))
          .slice(0, 6),
      );
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleRoleSelect = (roleId) => {
    setSelectedRoleId(roleId);
    setMode('new');
    setRoleFields({});
    setEvidenceLinks(['']);
    setEvidenceNotes('');
    setEntityName('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedEntity(null);
    setError(null);
  };

  const resetRole = () => {
    setSelectedRoleId(null);
    setMode('new');
    setRoleFields({});
    setEvidenceLinks(['']);
    setEvidenceNotes('');
    setEntityName('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedEntity(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedRole || !user) return;
    setError(null);

    // Validate
    if (mode === 'existing' && !selectedEntity) {
      setError('Please search for and select an existing record to claim.');
      return;
    }
    if (mode === 'new' && selectedRole.application_entity_type && !entityName.trim()) {
      setError('Please enter a name for your new profile.');
      return;
    }
    const links = evidenceLinks.map((l) => l.trim()).filter(Boolean);
    if (links.length === 0 && !evidenceNotes.trim()) {
      setError('Please provide at least one piece of evidence (a link or a note).');
      return;
    }

    setSubmitting(true);
    try {
      const application = {
        user_id: user.id,
        user_email: user.email,
        user_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.full_name || '',
        role_key: selectedRole.id,
        capability: selectedRole.capability,
        display_name: selectedRole.display_name,
        application_mode: mode,
        application_entity_type: selectedRole.application_entity_type || null,
        entity_id: mode === 'existing' ? selectedEntity.id : null,
        entity_name: mode === 'existing'
          ? (selectedEntity.display_name || selectedEntity.name || '')
          : entityName.trim(),
        role_fields: roleFields,
        evidence_links: links,
        evidence_notes: evidenceNotes.trim(),
        evidence_attachment_urls: [],
        status: 'pending',
        review_tier: selectedRole.review_tier || 'full',
        submitted_at: new Date().toISOString(),
      };

      await base44.entities.IdentityApplication.create(application);
      await queryClient.invalidateQueries({ queryKey: ['myIdentityApplications', user.id] });

      if (onSubmitted) onSubmitted({ ...application, role: selectedRole });
      // Reset
      resetRole();
    } catch (e) {
      setError(e?.message || 'Could not submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    background: 'hsl(var(--surface-interactive) / 0.4)',
    border: '1px solid hsl(var(--divider))',
    color: 'hsl(var(--foreground))',
  };

  // ─── Role picker (no role selected yet) ────────────────────────────────────
  if (!selectedRole) {
    const categories = Object.entries(ROLE_CATEGORIES)
      .map(([key, cat]) => ({ ...cat, key }))
      .sort((a, b) => a.order - b.order);

    return (
      <div className="space-y-5">
        <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
          Everyone on Hijinx is a <span className="font-bold" style={{ color: MOTION }}>Fan</span> by default.
          To become a Driver, Team, Track, Media, or any other identity, submit a short application below.
          We review each one to keep the platform authentic.
        </p>

        {myApplications.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--foreground-quiet))' }}>
              Your Applications
            </p>
            {myApplications.map((app) => {
              const statusMeta = {
                pending: { color: 'hsl(var(--warning))', label: 'Under Review' },
                approved: { color: MOTION, label: 'Approved' },
                rejected: { color: 'hsl(var(--danger))', label: 'Not Approved' },
                needs_more_info: { color: 'hsl(var(--warning))', label: 'More Info Needed' },
              }[app.status] || { color: 'hsl(var(--foreground-quiet))', label: app.status };
              return (
                <div key={app.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider) / 0.6)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {app.display_name}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                      {app.application_mode === 'existing' ? `Claiming: ${app.entity_name}` : 'New profile'}
                    </p>
                    {app.status === 'needs_more_info' && app.admin_notes && (
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--warning))' }}>
                        {app.admin_notes}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider flex-shrink-0" style={{ color: statusMeta.color }}>
                    {statusMeta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {categories.map((cat) => {
          const roles = (ROLES_BY_CATEGORY[cat.key] || []).filter((r) => r.id !== 'fan');
          if (!roles.length) return null;
          return (
            <div key={cat.key} className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] pt-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                {cat.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {roles.map((role) => {
                  const Icon = role.icon;
                  const hasPending = pendingForRole(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => !hasPending && handleRoleSelect(role.id)}
                      disabled={hasPending}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-150 disabled:opacity-50"
                      style={{
                        background: 'hsl(var(--surface-interactive) / 0.3)',
                        border: '1px solid hsl(var(--divider) / 0.6)',
                      }}
                      onMouseEnter={(e) => {
                        if (!hasPending) e.currentTarget.style.borderColor = `${MOTION} / 0.3)`;
                      }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--divider) / 0.6)'; }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${MOTION} / 0.12)` }}>
                        <Icon className="w-4 h-4" style={{ color: MOTION }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                          {role.display_name}
                        </div>
                        <div className="text-[11px] truncate" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                          {hasPending ? 'Application pending' : role.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Application form (role selected) ──────────────────────────────────────
  const Icon = selectedRole.icon;
  const supportsExisting = EXISTING_PATH_ENTITIES.includes(selectedRole.application_entity_type);

  return (
    <div className="space-y-5">
      {/* Role header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${MOTION} / 0.12)` }}>
          <Icon className="w-5 h-5" style={{ color: MOTION }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Apply for: {selectedRole.display_name}
          </p>
          <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            {selectedRole.description}
          </p>
        </div>
        <button type="button" onClick={resetRole}
          className="text-xs transition-colors flex-shrink-0"
          style={{ color: 'hsl(var(--foreground-quiet))' }}>
          ← Back
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm rounded-xl px-3 py-2.5"
          style={{ background: 'hsl(var(--danger) / 0.08)', color: 'hsl(var(--danger))', border: '1px solid hsl(var(--danger) / 0.2)' }}>
          <Info className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* New vs Existing toggle */}
      {supportsExisting && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMode('new')}
            className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl transition-all"
            style={mode === 'new' ? {
              background: `${MOTION} / 0.12)`,
              border: `1px solid ${MOTION} / 0.4)`,
            } : {
              background: 'hsl(var(--surface-interactive) / 0.3)',
              border: '1px solid hsl(var(--divider) / 0.6)',
            }}>
            <Plus className="w-4 h-4" style={{ color: mode === 'new' ? MOTION : 'hsl(var(--foreground-quiet))' }} />
            <span className="text-xs font-bold" style={{ color: mode === 'new' ? MOTION : 'hsl(var(--foreground-quiet))' }}>
              I'm new
            </span>
            <span className="text-[10px] text-center" style={{ color: 'hsl(var(--foreground-quiet))' }}>
              Create a new profile
            </span>
          </button>
          <button type="button" onClick={() => setMode('existing')}
            className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl transition-all"
            style={mode === 'existing' ? {
              background: `${MOTION} / 0.12)`,
              border: `1px solid ${MOTION} / 0.4)`,
            } : {
              background: 'hsl(var(--surface-interactive) / 0.3)',
              border: '1px solid hsl(var(--divider) / 0.6)',
            }}>
            <Link2 className="w-4 h-4" style={{ color: mode === 'existing' ? MOTION : 'hsl(var(--foreground-quiet))' }} />
            <span className="text-xs font-bold" style={{ color: mode === 'existing' ? MOTION : 'hsl(var(--foreground-quiet))' }}>
              I'm existing
            </span>
            <span className="text-[10px] text-center" style={{ color: 'hsl(var(--foreground-quiet))' }}>
              Claim an existing record
            </span>
          </button>
        </div>
      )}

      {/* Existing entity search */}
      {mode === 'existing' && supportsExisting && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            Search for your existing record
          </p>
          <div className="flex items-center gap-2 rounded-lg px-3"
            style={{ background: 'hsl(var(--surface-interactive) / 0.4)', border: '1px solid hsl(var(--divider))' }}>
            <Search className="w-4 h-4" style={{ color: 'hsl(var(--foreground-quiet))' }} />
            <input
              value={searchQuery}
              onChange={(e) => runSearch(e.target.value)}
              placeholder={`Search ${selectedRole.application_entity_type}s…`}
              className="flex h-10 flex-1 bg-transparent text-sm focus-visible:outline-none"
              style={{ color: 'hsl(var(--foreground))' }}
            />
            {searching && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'hsl(var(--foreground-quiet))' }} />}
          </div>
          {searchResults.length > 0 ? (
            <div className="space-y-1">
              {searchResults.map((r) => {
                const name = r.display_name || r.name || 'Unnamed';
                const isSelected = selectedEntity?.id === r.id;
                return (
                  <button key={r.id} type="button"
                    onClick={() => setSelectedEntity(r)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all"
                    style={isSelected ? {
                      background: `${MOTION} / 0.12)`,
                      border: `1px solid ${MOTION} / 0.4)`,
                    } : {
                      background: 'hsl(var(--surface-interactive) / 0.3)',
                      border: '1px solid hsl(var(--divider) / 0.6)',
                    }}>
                    <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{name}</span>
                    {isSelected ? (
                      <ShieldCheck className="w-4 h-4" style={{ color: MOTION }} />
                    ) : (
                      <Plus className="w-3.5 h-3.5" style={{ color: MOTION }} />
                    )}
                  </button>
                );
              })}
            </div>
          ) : hasSearched && !searching ? (
            <p className="text-xs px-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>
              No matches. If you don't see your record, switch to "I'm new" to create one.
            </p>
          ) : null}
        </div>
      )}

      {/* New entity name */}
      {mode === 'new' && selectedRole.application_entity_type && (
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'hsl(var(--foreground-secondary))' }}>
            {selectedRole.application_entity_type === 'RacerProfile' ? 'Driver Name' : 'Profile Name'}
          </label>
          <input
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
            placeholder={selectedRole.application_entity_type === 'RacerProfile' ? 'Your name as it should appear' : 'Your profile name'}
            className="w-full h-10 rounded-lg px-3 text-sm focus-visible:outline-none"
            style={inputStyle}
          />
        </div>
      )}

      {/* Role-specific fields */}
      {selectedRole.onboarding_fields?.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            {selectedRole.display_name} Details
          </p>
          {selectedRole.onboarding_fields.map((fieldKey) => {
            const cfg = FIELD_CONFIG[fieldKey] || { label: fieldKey.replace(/_/g, ' '), placeholder: '' };
            return (
              <div key={fieldKey}>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                  {cfg.label}
                </label>
                <input
                  value={roleFields[fieldKey] || ''}
                  onChange={(e) => setRoleFields({ ...roleFields, [fieldKey]: e.target.value })}
                  placeholder={cfg.placeholder}
                  className="w-full h-10 rounded-lg px-3 text-sm focus-visible:outline-none"
                  style={inputStyle}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Evidence section */}
      <div className="space-y-3 pt-2" style={{ borderTop: '1px solid hsl(var(--divider) / 0.6)' }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--foreground-quiet))' }}>
          Evidence & Verification
        </p>
        <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
          Help us verify you're legit. Add a link to your results, portfolio, social media, or tell us about your involvement.
        </p>
        {evidenceLinks.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'hsl(var(--foreground-quiet))' }} />
            <input
              value={link}
              onChange={(e) => {
                const next = [...evidenceLinks];
                next[i] = e.target.value;
                setEvidenceLinks(next);
              }}
              placeholder="https://results.com/yourrace or https://instagram.com/you"
              className="flex-1 h-10 rounded-lg px-3 text-sm focus-visible:outline-none"
              style={inputStyle}
            />
            {evidenceLinks.length > 1 && (
              <button type="button" onClick={() => setEvidenceLinks(evidenceLinks.filter((_, idx) => idx !== i))}
                className="text-xs flex-shrink-0" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button"
          onClick={() => setEvidenceLinks([...evidenceLinks, ''])}
          className="text-xs font-medium flex items-center gap-1 transition-colors"
          style={{ color: MOTION }}>
          <Plus className="w-3 h-3" /> Add another link
        </button>
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'hsl(var(--foreground-secondary))' }}>
            Notes <span style={{ color: 'hsl(var(--foreground-quiet))' }}>(optional)</span>
          </label>
          <textarea
            value={evidenceNotes}
            onChange={(e) => setEvidenceNotes(e.target.value)}
            rows={3}
            placeholder="Anything else we should know? Series you race in, years of experience, etc."
            className="w-full rounded-lg px-3 py-2 text-sm resize-none focus-visible:outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}
            className="flex-1 h-11 text-sm font-medium"
            style={{ background: 'hsl(var(--surface-interactive) / 0.4)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))' }}>
            Cancel
          </Button>
        )}
        <Button type="button" onClick={handleSubmit} disabled={submitting}
          className="flex-1 gap-2 h-11 text-sm font-bold"
          style={{ background: MOTION, color: 'hsl(var(--canvas))' }}>
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><FileText className="w-4 h-4" /> Submit Application</>}
        </Button>
      </div>

      <p className="text-[11px] text-center" style={{ color: 'hsl(var(--foreground-quiet))' }}>
        {selectedRole.review_tier === 'light'
          ? 'Light review — we do quick checks and usually approve within a day.'
          : 'Full review — an admin will review your application before approval.'}
      </p>
    </div>
  );
}