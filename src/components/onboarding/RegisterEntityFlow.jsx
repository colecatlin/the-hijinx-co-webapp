import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Users, MapPin, Trophy, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react';

const ENTITY_TYPES = [
  { type: 'Driver', label: 'Driver', Icon: User, description: 'A racing driver profile', color: 'border-blue-200 bg-blue-50 text-blue-700', iconBg: 'bg-blue-100' },
  { type: 'Team', label: 'Team', Icon: Users, description: 'A racing team or organization', color: 'border-purple-200 bg-purple-50 text-purple-700', iconBg: 'bg-purple-100' },
  { type: 'Track', label: 'Track', Icon: MapPin, description: 'A racing venue or facility', color: 'border-green-200 bg-green-50 text-green-700', iconBg: 'bg-green-100' },
  { type: 'Series', label: 'Series', Icon: Trophy, description: 'A racing series or championship', color: 'border-orange-200 bg-orange-50 text-orange-700', iconBg: 'bg-orange-100' },
];

function TypeSelector({ onSelect }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">Choose Entity Type</h3>
      <p className="text-sm text-gray-500 mb-4">What type of racing entity are you registering?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ENTITY_TYPES.map(({ type, label, Icon, description, color, iconBg }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`text-left p-4 border-2 rounded-xl flex items-start gap-3 hover:shadow-md transition-all ${color}`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">{label}</div>
              <div className="text-xs opacity-75 mt-0.5">{description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DriverForm({ data, onChange }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">First Name *</label>
          <Input value={data.first_name || ''} onChange={e => onChange({ ...data, first_name: e.target.value })} placeholder="First name" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Last Name *</label>
          <Input value={data.last_name || ''} onChange={e => onChange({ ...data, last_name: e.target.value })} placeholder="Last name" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Discipline *</label>
        <Select value={data.primary_discipline || ''} onValueChange={v => onChange({ ...data, primary_discipline: v })}>
          <SelectTrigger><SelectValue placeholder="What do you race?" /></SelectTrigger>
          <SelectContent>
            {['Off Road','Snowmobile','Asphalt Oval','Road Racing','Rallycross','Drag Racing','Mixed'].map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Car / Bib Number <span className="text-gray-400 font-normal">(optional)</span></label>
        <Input value={data.primary_number || ''} onChange={e => onChange({ ...data, primary_number: e.target.value })} placeholder="e.g. 48" />
      </div>
    </div>
  );
}

function TeamForm({ data, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Team Name *</label>
        <Input value={data.name || ''} onChange={e => onChange({ ...data, name: e.target.value })} placeholder="Team name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Headquarters City</label>
          <Input value={data.headquarters_city || ''} onChange={e => onChange({ ...data, headquarters_city: e.target.value })} placeholder="City" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Headquarters State</label>
          <Input value={data.headquarters_state || ''} onChange={e => onChange({ ...data, headquarters_state: e.target.value })} placeholder="State" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Manufacturer</label>
        <Select value={data.manufacturer || ''} onValueChange={v => onChange({ ...data, manufacturer: v })}>
          <SelectTrigger><SelectValue placeholder="Select manufacturer" /></SelectTrigger>
          <SelectContent>
            {['Chevrolet', 'Ford', 'Toyota', 'Honda', 'Other'].map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function TrackForm({ data, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Track Name *</label>
        <Input value={data.name || ''} onChange={e => onChange({ ...data, name: e.target.value })} placeholder="Track name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">City *</label>
          <Input value={data.location_city || ''} onChange={e => onChange({ ...data, location_city: e.target.value })} placeholder="City" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">State</label>
          <Input value={data.location_state || ''} onChange={e => onChange({ ...data, location_state: e.target.value })} placeholder="State" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Country *</label>
        <Input value={data.location_country || ''} onChange={e => onChange({ ...data, location_country: e.target.value })} placeholder="e.g. USA" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Track Type</label>
        <Select value={data.track_type || ''} onValueChange={v => onChange({ ...data, track_type: v })}>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            {['Oval', 'Road Course', 'Street Circuit', 'Short Track', 'Speedway', 'Off-Road', 'Dirt Track', 'Other'].map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function SeriesForm({ data, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Series Name *</label>
        <Input value={data.name || ''} onChange={e => onChange({ ...data, name: e.target.value })} placeholder="Series name" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Full Name</label>
        <Input value={data.full_name || ''} onChange={e => onChange({ ...data, full_name: e.target.value })} placeholder="Full official name" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Discipline</label>
        <Select value={data.discipline || ''} onValueChange={v => onChange({ ...data, discipline: v })}>
          <SelectTrigger><SelectValue placeholder="Select discipline" /></SelectTrigger>
          <SelectContent>
            {['Stock Car', 'Off Road', 'Dirt Oval', 'Snowmobile', 'Dirt Bike', 'Open Wheel', 'Sports Car', 'Touring Car', 'Rally', 'Drag', 'Motorcycle', 'Karting', 'Water', 'Alternative'].map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Season Year</label>
        <Input value={data.season_year || ''} onChange={e => onChange({ ...data, season_year: e.target.value })} placeholder="e.g. 2025" />
      </div>
    </div>
  );
}

export default function RegisterEntityFlow({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [entityType, setEntityType] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const isValid = () => {
    if (entityType === 'Driver') return !!(formData.first_name && formData.last_name && formData.primary_discipline);
    if (entityType === 'Team') return !!formData.name;
    if (entityType === 'Track') return !!(formData.name && formData.location_city && formData.location_country);
    if (entityType === 'Series') return !!formData.name;
    return false;
  };

  const handleSelectType = (type) => {
    setEntityType(type);
    setFormData({});
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!isValid()) return;
    setLoading(true);
    setError(null);

    const payload = { ...formData };
    if (entityType === 'Track' || entityType === 'Series') {
      payload.data_source = 'user_onboarding';
      payload.notes = 'User-created via onboarding — pending admin review';
    }

    const res = await base44.functions.invoke('createEntityWithOwnership', {
      entity_type: entityType,
      payload,
    }).catch(err => { setError(err.message || 'Failed to create entity'); return null; });

    if (!res?.data?.success) {
      setError(res?.data?.error || 'Failed to create entity');
      setLoading(false);
      return;
    }

    if (!user?.primary_entity_type) {
      await base44.auth.updateMe({
        primary_entity_type: entityType,
        primary_entity_id: res.data.entity_id,
      }).catch(() => {});
    }

    await queryClient.invalidateQueries();
    setResult(res.data);

    // Drivers go straight into the profile setup flow
    if (entityType === 'Driver') {
      navigate(`/DriverProfileSetup?driver_id=${res.data.entity_id}&new=1`);
      return;
    }

    setStep(3);
    setLoading(false);
  };

  if (step === 3 && result) {
    const isDriver = entityType === 'Driver';
    return (
      <div className="text-center py-10 px-4 space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {isDriver ? "Your driver profile is live!" : "Profile Created!"}
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            <strong>{result.entity_name}</strong> has been added to the platform.
          </p>
          {isDriver && (
            <p className="text-gray-400 text-xs mt-2 max-w-xs mx-auto">
              Add your photo, bio, and social links so fans and teams can find you.
            </p>
          )}
        </div>
        {(entityType === 'Track' || entityType === 'Series') && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 inline-block">
            Track and Series entries are pending admin review before appearing publicly.
          </p>
        )}
        <div className="flex flex-col items-center gap-2">
          {isDriver && (
            <Button
              onClick={() => navigate(createPageUrl('DriverProfileSetup') + `?driver_id=${result.entity_id}`)}
              className="bg-[#232323] hover:bg-black text-white w-full max-w-xs"
            >
              Complete Your Profile →
            </Button>
          )}
          <Button
            variant={isDriver ? 'outline' : 'default'}
            onClick={() => navigate(createPageUrl('MyDashboard') + '?access_updated=1')}
            className={`w-full max-w-xs ${!isDriver ? 'bg-[#232323] hover:bg-black text-white' : ''}`}
          >
            {isDriver ? 'Skip for now' : 'Go to Dashboard'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs">
        <span className={`px-2 py-1 rounded-full font-medium ${step === 1 ? 'bg-[#232323] text-white' : 'bg-gray-100 text-gray-500'}`}>1 Type</span>
        <span className="text-gray-300">→</span>
        <span className={`px-2 py-1 rounded-full font-medium ${step === 2 ? 'bg-[#232323] text-white' : 'bg-gray-100 text-gray-500'}`}>2 Details</span>
      </div>

      {step === 1 && <TypeSelector onSelect={handleSelectType} />}

      {step === 2 && entityType && (
        <div className="space-y-4">
          <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Change type
          </button>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Register New {entityType}</h3>
            <p className="text-sm text-gray-500">Fill in the basic details. You can add more information later.</p>
          </div>

          {entityType === 'Driver' && <DriverForm data={formData} onChange={setFormData} />}
          {entityType === 'Team' && <TeamForm data={formData} onChange={setFormData} />}
          {entityType === 'Track' && <TrackForm data={formData} onChange={setFormData} />}
          {entityType === 'Series' && <SeriesForm data={formData} onChange={setFormData} />}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>
          )}

          <Button onClick={handleSubmit} disabled={!isValid() || loading} className="w-full bg-[#232323] hover:bg-black text-white">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : `Register ${entityType}`}
          </Button>
        </div>
      )}
    </div>
  );
}