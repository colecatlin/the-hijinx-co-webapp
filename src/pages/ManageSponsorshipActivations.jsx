import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertCircle, ShieldCheck } from 'lucide-react';
import SponsorshipPicker from '@/components/sponsorship/SponsorshipPicker';
import ActivationCard from '@/components/sponsorship/ActivationCard';
import ActivationForm from '@/components/sponsorship/ActivationForm';
import DeliverableForm from '@/components/sponsorship/DeliverableForm';
import AdminAccessDenied from '@/components/shared/AdminAccessDenied';

export default function ManageSponsorshipActivations() {
  const queryClient = useQueryClient();
  const [selectedSponsorshipId, setSelectedSponsorshipId] = useState(null);
  const [showActivationForm, setShowActivationForm] = useState(false);
  const [editingActivation, setEditingActivation] = useState(null);
  const [showDeliverableForm, setShowDeliverableForm] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  const [deliverableActivationId, setDeliverableActivationId] = useState(null);
  const [actionError, setActionError] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: sponsorships = [], isLoading: loadingSponsorships } = useQuery({
    queryKey: ['sponsorships-for-activations'],
    queryFn: () => base44.entities.Sponsorship.list('-created_date', 200),
  });
  const { data: organizations = [] } = useQuery({
    queryKey: ['orgs-for-activations'],
    queryFn: () => base44.entities.Organization.list('-created_date', 200),
  });
  const { data: activations = [], isLoading: loadingActivations } = useQuery({
    queryKey: ['activations', selectedSponsorshipId],
    queryFn: () => selectedSponsorshipId
      ? base44.entities.Activation.filter({ sponsorship_id: selectedSponsorshipId }, '-created_date', 100)
      : [],
    enabled: !!selectedSponsorshipId,
  });
  const { data: deliverables = [] } = useQuery({
    queryKey: ['deliverables', selectedSponsorshipId],
    queryFn: () => selectedSponsorshipId
      ? base44.entities.SponsorshipDeliverable.filter({ sponsorship_id: selectedSponsorshipId }, '-created_date', 200)
      : [],
    enabled: !!selectedSponsorshipId,
  });

  const selectedSponsorship = useMemo(
    () => sponsorships.find(s => s.id === selectedSponsorshipId),
    [sponsorships, selectedSponsorshipId]
  );

  const activationsByDeliverable = useMemo(() => {
    const m = new Map();
    activations.forEach(a => m.set(a.id, a));
    return m;
  }, [activations]);

  const deliverablesByActivation = useMemo(() => {
    const m = new Map();
    deliverables.forEach(d => {
      const key = d.activation_id || 'standalone';
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(d);
    });
    return m;
  }, [deliverables]);

  const handleSaveActivation = async (payload, existingId) => {
    try {
      const res = await fetch('/api/functions/upsertActivation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'upsert', activation: { ...(existingId ? { id: existingId } : {}), ...payload } }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || result.errors?.join(', ') || 'Failed to save');
      setShowActivationForm(false);
      setEditingActivation(null);
      queryClient.invalidateQueries({ queryKey: ['activations', selectedSponsorshipId] });
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const handleArchiveActivation = async (activation) => {
    if (!confirm(`Archive activation "${activation.title}"?`)) return;
    try {
      const res = await fetch('/api/functions/upsertActivation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'archive', activation: { activation_id: activation.id } }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to archive');
      queryClient.invalidateQueries({ queryKey: ['activations', selectedSponsorshipId] });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleSaveDeliverable = async (payload, existingId) => {
    try {
      const res = await fetch('/api/functions/upsertSponsorshipDeliverable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'upsert', deliverable: { ...(existingId ? { id: existingId } : {}), ...payload } }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || result.errors?.join(', ') || 'Failed to save');
      setShowDeliverableForm(false);
      setEditingDeliverable(null);
      setDeliverableActivationId(null);
      queryClient.invalidateQueries({ queryKey: ['deliverables', selectedSponsorshipId] });
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const handleCompleteDeliverable = async (deliverable) => {
    try {
      const res = await fetch('/api/functions/upsertSponsorshipDeliverable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'complete', deliverable: { deliverable_id: deliverable.id } }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to complete');
      queryClient.invalidateQueries({ queryKey: ['deliverables', selectedSponsorshipId] });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleArchiveDeliverable = async (deliverable) => {
    if (!confirm(`Archive deliverable "${deliverable.title}"?`)) return;
    try {
      const res = await fetch('/api/functions/upsertSponsorshipDeliverable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'archive', deliverable: { deliverable_id: deliverable.id } }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to archive');
      queryClient.invalidateQueries({ queryKey: ['deliverables', selectedSponsorshipId] });
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (!isAdmin) return <AdminAccessDenied />;

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ background: 'hsl(var(--canvas))' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5" style={{ color: 'hsl(var(--motion))' }} />
          <div>
            <h1 className="text-xl font-bold tracking-wide uppercase" style={{ color: 'hsl(var(--foreground))' }}>Sponsorship Activations & Deliverables</h1>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>Phase 17D execution layer management — admin only</p>
          </div>
        </div>

        {actionError && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'hsl(var(--danger) / 0.1)', border: '1px solid hsl(var(--danger) / 0.3)' }}>
            <AlertCircle className="w-4 h-4" style={{ color: 'hsl(var(--danger))' }} />
            <span className="text-xs" style={{ color: 'hsl(var(--danger))' }}>{actionError}</span>
            <button onClick={() => setActionError('')} className="ml-auto text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>Dismiss</button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <div className="rounded-xl border p-4" style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--divider))' }}>
              <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'hsl(var(--foreground-secondary))' }}>Select Sponsorship</h2>
              {loadingSponsorships ? (
                <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>Loading...</p>
              ) : (
                <SponsorshipPicker
                  sponsorships={sponsorships}
                  organizations={organizations}
                  selectedId={selectedSponsorshipId}
                  onSelect={setSelectedSponsorshipId}
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {!selectedSponsorshipId ? (
              <div className="rounded-xl border flex items-center justify-center min-h-[300px]" style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--divider))' }}>
                <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>Select a sponsorship to manage its activations and deliverables.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedSponsorship && (
                  <div className="rounded-xl border px-4 py-3" style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--divider))' }}>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'hsl(var(--motion))' }}>Selected Sponsorship</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: 'hsl(var(--foreground))' }}>
                      {organizations.find(o => o.id === selectedSponsorship.sponsor_organization_id)?.name || 'Unknown Sponsor'}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                      {selectedSponsorship.target_entity_type} · {selectedSponsorship.relationship_type} · {selectedSponsorship.tier || '—'} · {selectedSponsorship.status}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                    Activations ({activations.length})
                  </h2>
                  <button
                    onClick={() => { setEditingActivation(null); setShowActivationForm(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'hsl(var(--motion))', color: 'hsl(var(--canvas))' }}
                  >
                    <Plus className="w-3.5 h-3.5" /> New Activation
                  </button>
                </div>

                {loadingActivations ? (
                  <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>Loading activations...</p>
                ) : activations.length === 0 ? (
                  <div className="rounded-xl border py-8 text-center" style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--divider))' }}>
                    <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>No activations yet. Create one to start tracking execution.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activations.filter(a => !a.is_archived).map(activation => (
                      <ActivationCard
                        key={activation.id}
                        activation={activation}
                        deliverables={deliverablesByActivation.get(activation.id) || []}
                        onEdit={(a) => { setEditingActivation(a); setShowActivationForm(true); }}
                        onArchive={handleArchiveActivation}
                        onAddDeliverable={() => {
                          setDeliverableActivationId(activation.id);
                          setEditingDeliverable(null);
                          setShowDeliverableForm(true);
                        }}
                        onEditDeliverable={(d) => {
                          setDeliverableActivationId(d.activation_id);
                          setEditingDeliverable(d);
                          setShowDeliverableForm(true);
                        }}
                        onCompleteDeliverable={handleCompleteDeliverable}
                        onArchiveDeliverable={handleArchiveDeliverable}
                      />
                    ))}
                    {deliverablesByActivation.get('standalone')?.length > 0 && (
                      <div className="rounded-xl border p-3" style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--divider))' }}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--foreground-secondary))' }}>Standalone Deliverables</p>
                        <div className="space-y-1">
                          {(deliverablesByActivation.get('standalone') || []).filter(d => !d.is_archived).map(d => (
                            <div key={d.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'hsl(var(--surface-interactive) / 0.4)' }}>
                              <span className="text-xs truncate" style={{ color: 'hsl(var(--foreground-secondary))' }}>{d.title}</span>
                              <div className="flex items-center gap-1">
                                {d.status !== 'completed' && (
                                  <button onClick={() => handleCompleteDeliverable(d)} className="p-1 rounded text-xs" style={{ color: 'hsl(var(--success))' }}>Complete</button>
                                )}
                                <button onClick={() => { setDeliverableActivationId(null); setEditingDeliverable(d); setShowDeliverableForm(true); }} className="p-1 rounded text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>Edit</button>
                                {!d.is_archived && (
                                  <button onClick={() => handleArchiveDeliverable(d)} className="p-1 rounded text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>Archive</button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => { setDeliverableActivationId(null); setEditingDeliverable(null); setShowDeliverableForm(true); }}
                  className="text-xs font-semibold tracking-wide"
                  style={{ color: 'hsl(var(--motion))' }}
                >
                  + Add Standalone Deliverable
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showActivationForm && (
        <ActivationForm
          sponsorshipId={selectedSponsorshipId}
          activation={editingActivation}
          onSave={handleSaveActivation}
          onCancel={() => { setShowActivationForm(false); setEditingActivation(null); }}
        />
      )}
      {showDeliverableForm && (
        <DeliverableForm
          sponsorshipId={selectedSponsorshipId}
          activationId={deliverableActivationId}
          deliverable={editingDeliverable}
          onSave={handleSaveDeliverable}
          onCancel={() => { setShowDeliverableForm(false); setEditingDeliverable(null); setDeliverableActivationId(null); }}
        />
      )}
    </div>
  );
}