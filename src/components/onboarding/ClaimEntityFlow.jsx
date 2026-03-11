import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Users, MapPin, Trophy, ChevronLeft, CheckCircle2, Loader2, Search } from 'lucide-react';

const ENTITY_TYPES = [
  { type: 'Driver', label: 'Driver', Icon: User, color: 'border-blue-200 bg-blue-50 text-blue-700', iconBg: 'bg-blue-100' },
  { type: 'Team', label: 'Team', Icon: Users, color: 'border-purple-200 bg-purple-50 text-purple-700', iconBg: 'bg-purple-100' },
  { type: 'Track', label: 'Track', Icon: MapPin, color: 'border-green-200 bg-green-50 text-green-700', iconBg: 'bg-green-100' },
  { type: 'Series', label: 'Series', Icon: Trophy, color: 'border-orange-200 bg-orange-50 text-orange-700', iconBg: 'bg-orange-100' },
];

function entitySubtitle(entity, type) {
  if (type === 'Driver') {
    const parts = [entity.primary_number && `#${entity.primary_number}`, entity.hometown_city, entity.hometown_state].filter(Boolean);
    return parts.join(' · ') || 'Driver';
  }
  if (type === 'Team') {
    return [entity.location_city, entity.location_state].filter(Boolean).join(', ') || 'Team';
  }
  if (type === 'Track') {
    return [entity.location_city, entity.location_state, entity.location_country].filter(Boolean).join(', ') || 'Track';
  }
  if (type === 'Series') {
    return entity.discipline || 'Series';
  }
  return '';
}

function entityName(entity, type) {
  if (type === 'Driver') return `${entity.first_name || ''} ${entity.last_name || ''}`.trim();
  return entity.name || entity.full_name || 'Unknown';
}

export default function ClaimEntityFlow({ user }) {
  const [step, setStep] = useState(1);
  const [entityType, setEntityType] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || query.length < 2) return;
    setSearching(true);
    setResults([]);
    setError(null);

    const q = query.toLowerCase().trim();
    let records = [];

    if (entityType === 'Driver') {
      const all = await base44.entities.Driver.list('-updated_date', 200);
      records = all.filter(d => {
        const name = `${d.first_name || ''} ${d.last_name || ''}`.toLowerCase();
        return name.includes(q);
      });
    } else if (entityType === 'Team') {
      const all = await base44.entities.Team.list('-updated_date', 200);
      records = all.filter(d => (d.name || '').toLowerCase().includes(q));
    } else if (entityType === 'Track') {
      const all = await base44.entities.Track.list('-updated_date', 200);
      records = all.filter(d => (d.name || '').toLowerCase().includes(q));
    } else if (entityType === 'Series') {
      const all = await base44.entities.Series.list('-updated_date', 200);
      records = all.filter(d => (d.name || '').toLowerCase().includes(q) || (d.full_name || '').toLowerCase().includes(q));
    }

    setResults(records.slice(0, 10));
    setSearching(false);
  };

  const handleSubmitClaim = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);

    // Check for existing open claim
    const existing = await base44.entities.EntityClaimRequest.filter({
      user_id: user.id,
      entity_id: selected.id,
      status: 'pending',
    }).catch(() => []);

    if (existing && existing.length > 0) {
      setError('You already have a pending claim for this entity.');
      setSubmitting(false);
      return;
    }

    const name = entityName(selected, entityType);
    await base44.entities.EntityClaimRequest.create({
      user_id: user.id,
      user_email: user.email,
      entity_type: entityType,
      entity_id: selected.id,
      entity_name: name,
      status: 'pending',
      justification: justification.trim() || null,
    });

    // Log the submission
    base44.entities.OperationLog.create({
      operation_type: 'entity_claim_submitted',
      entity_name: entityType,
      entity_id: selected.id,
      status: 'success',
      message: `Claim submitted for ${name} (${entityType}) by ${user.email}`,
      initiated_by: user.email,
      metadata: {
        entity_type: entityType,
        entity_id: selected.id,
        target_user_email: user.email,
        acted_by_user_id: user.id,
      },
    }).catch(() => {});

    setSubmitting(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="text-center py-10 px-4 space-y-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Claim Submitted</h3>
          <p className="text-gray-500 text-sm mt-1">
            Your claim for <strong>{entityName(selected, entityType)}</strong> has been submitted for review.
          </p>
          <p className="text-gray-400 text-xs mt-2">You'll gain access once an admin approves your request.</p>
        </div>
      </div>
    );
  }

  const steps = ['Type', 'Search', 'Confirm'];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <span className={`px-2 py-1 rounded-full font-medium ${step === i + 1 ? 'bg-[#232323] text-white' : 'bg-gray-100 text-gray-500'}`}>
              {i + 1} {s}
            </span>
            {i < steps.length - 1 && <span className="text-gray-300">→</span>}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Type */}
      {step === 1 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Choose Entity Type</h3>
          <p className="text-sm text-gray-500 mb-4">What type of entity are you looking to claim?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ENTITY_TYPES.map(({ type, label, Icon, color, iconBg }) => (
              <button
                key={type}
                onClick={() => { setEntityType(type); setQuery(''); setResults([]); setStep(2); }}
                className={`text-left p-4 border-2 rounded-xl flex items-center gap-3 hover:shadow-md transition-all ${color}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Search */}
      {step === 2 && (
        <div className="space-y-4">
          <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Change type
          </button>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Search for {entityType}</h3>
            <p className="text-sm text-gray-500 mb-4">Type a name to find the existing profile.</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={entityType === 'Driver' ? 'Search by name...' : 'Search by name...'}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching || query.length < 2} variant="outline" className="gap-1.5">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
              {results.map(entity => (
                <button
                  key={entity.id}
                  onClick={() => { setSelected(entity); setStep(3); }}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-all"
                >
                  <div className="font-medium text-sm text-gray-900">{entityName(entity, entityType)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{entitySubtitle(entity, entityType)}</div>
                </button>
              ))}
            </div>
          )}

          {!searching && query.length >= 2 && results.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No results found. Try a different search term.</p>
          )}
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && selected && (
        <div className="space-y-4">
          <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to search
          </button>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Confirm Claim Request</h3>
            <p className="text-sm text-gray-500">You are requesting ownership of:</p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="font-semibold text-gray-900">{entityName(selected, entityType)}</div>
            <div className="text-sm text-gray-500">{entityType} · {entitySubtitle(selected, entityType)}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Why are you claiming this entity? (optional)</label>
            <textarea
              value={justification}
              onChange={e => setJustification(e.target.value)}
              placeholder="e.g. I am this driver / I manage this team..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
              rows={3}
            />
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            Claims are reviewed by admins. You'll gain access once approved. This does not immediately grant ownership.
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>
          )}
          <Button onClick={handleSubmitClaim} disabled={submitting} className="w-full bg-[#232323] hover:bg-black text-white">
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Submit Claim Request'}
          </Button>
        </div>
      )}
    </div>
  );
}