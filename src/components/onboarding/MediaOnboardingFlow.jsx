import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/components/utils';
import { Camera, Video, PenLine, Share2, Building2, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

const MEDIA_ROLES = [
  { id: 'Photographer', label: 'Photographer', description: 'Photo coverage, event stills, portraits', icon: Camera },
  { id: 'Videographer', label: 'Videographer', description: 'Video production, highlight reels, livestream', icon: Video },
  { id: 'Journalist', label: 'Journalist / Writer', description: 'Editorial, race reports, features', icon: PenLine },
  { id: 'Content Creator', label: 'Content Creator', description: 'Social content, short form, reels', icon: Share2 },
  { id: 'Media Outlet', label: 'Media Outlet', description: 'Publication, outlet, or broadcast org', icon: Building2 },
];

const DISCIPLINES = ['Off Road', 'Dirt Oval', 'Asphalt Oval', 'Road Racing', 'Snowmobile', 'Drag Racing', 'Mixed'];
const REGIONS = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Pacific Northwest', 'National', 'International'];

export default function MediaOnboardingFlow({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('role'); // role → details → preferences → done
  const [saving, setSaving] = useState(false);

  const [selectedRole, setSelectedRole] = useState('');
  const [mediaOutletName, setMediaOutletName] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [selectedRegions, setSelectedRegions] = useState([]);

  const toggleItem = (list, setList, item) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleRoleNext = () => {
    if (!selectedRole) return;
    setStep('details');
  };

  const handleDetailsNext = () => {
    setStep('preferences');
  };

  const handleComplete = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      role_interest_category: 'Media / Creator',
      role_interest: selectedRole,
      media_outlet_name: mediaOutletName.trim() || undefined,
      portfolio_url: portfolioUrl.trim() || undefined,
      instagram_url: instagramUrl.trim() || undefined,
      website_url: websiteUrl.trim() || undefined,
      disciplines_covered: selectedDisciplines.length > 0 ? selectedDisciplines : undefined,
      regions_covered: selectedRegions.length > 0 ? selectedRegions : undefined,
      onboarding_complete: true,
    }).catch(() => {});
    setSaving(false);
    navigate(createPageUrl('MyDashboard'));
  };

  const stepCount = { role: 1, details: 2, preferences: 3 };
  const totalSteps = 3;

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < stepCount[step] ? 'bg-[#232323] w-8' : 'bg-gray-200 w-4'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
          Step {stepCount[step]} of {totalSteps} — Media / Creator
        </p>
      </div>

      {/* Step 1 — Role Selection */}
      {step === 'role' && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">What kind of media do you do?</h2>
            <p className="text-sm text-gray-500 mt-1">Pick the role that best describes your work.</p>
          </div>
          <div className="space-y-2">
            {MEDIA_ROLES.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSelectedRole(id)}
                className={`w-full flex items-center gap-3 p-4 border rounded-xl transition-all text-left ${
                  selectedRole === id
                    ? 'border-[#232323] bg-gray-50 ring-1 ring-[#232323]'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  selectedRole === id ? 'bg-[#232323]' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-5 h-5 ${selectedRole === id ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">{label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{description}</div>
                </div>
                {selectedRole === id && <CheckCircle2 className="w-4 h-4 text-[#232323] flex-shrink-0" />}
              </button>
            ))}
          </div>
          <Button
            onClick={handleRoleNext}
            disabled={!selectedRole}
            className="w-full bg-[#232323] hover:bg-black text-white gap-2"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Step 2 — Profile Details */}
      {step === 'details' && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">Tell us about your work</h2>
            <p className="text-sm text-gray-500 mt-1">This helps editors and event organizers find you. All fields optional.</p>
          </div>
          <div className="space-y-3">
            {selectedRole === 'Media Outlet' && (
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Outlet / Publication Name</label>
                <Input
                  value={mediaOutletName}
                  onChange={e => setMediaOutletName(e.target.value)}
                  placeholder="e.g. Racer Magazine, Off Road HQ"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Portfolio URL</label>
              <Input
                value={portfolioUrl}
                onChange={e => setPortfolioUrl(e.target.value)}
                placeholder="https://yourportfolio.com"
                type="url"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Instagram</label>
              <Input
                value={instagramUrl}
                onChange={e => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/yourhandle"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Website</label>
              <Input
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://yourwebsite.com"
                type="url"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('role')} className="flex-1">Back</Button>
            <Button onClick={handleDetailsNext} className="flex-1 bg-[#232323] hover:bg-black text-white gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Coverage Preferences */}
      {step === 'preferences' && (
        <div className="space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">What do you cover?</h2>
            <p className="text-sm text-gray-500 mt-1">Helps us personalize your feed and future opportunities. Optional.</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Disciplines</p>
            <div className="flex flex-wrap gap-2">
              {DISCIPLINES.map(d => (
                <button
                  key={d}
                  onClick={() => toggleItem(selectedDisciplines, setSelectedDisciplines, d)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    selectedDisciplines.includes(d)
                      ? 'bg-[#232323] text-white border-[#232323]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Regions</p>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map(r => (
                <button
                  key={r}
                  onClick={() => toggleItem(selectedRegions, setSelectedRegions, r)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    selectedRegions.includes(r)
                      ? 'bg-[#232323] text-white border-[#232323]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('details')} className="flex-1">Back</Button>
            <Button
              onClick={handleComplete}
              disabled={saving}
              className="flex-1 bg-[#232323] hover:bg-black text-white gap-2"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <>Finish Setup <CheckCircle2 className="w-4 h-4" /></>}
            </Button>
          </div>
          <p className="text-center text-xs text-gray-400">You can update all of this from your dashboard later.</p>
        </div>
      )}
    </div>
  );
}