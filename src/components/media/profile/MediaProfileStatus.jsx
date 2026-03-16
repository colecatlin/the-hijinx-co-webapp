import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Star, AlertTriangle, Eye, EyeOff, Award } from 'lucide-react';

const VERIFICATION_CONFIG = {
  pending: { label: 'Pending Verification', color: 'bg-gray-700 text-gray-300', icon: Clock },
  verified: { label: 'Verified', color: 'bg-green-900/60 text-green-300', icon: CheckCircle2 },
  featured: { label: 'Featured Creator', color: 'bg-blue-900/60 text-blue-300', icon: Star },
  suspended: { label: 'Suspended', color: 'bg-red-900/60 text-red-300', icon: AlertTriangle },
};

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-700 text-gray-400' },
  active: { label: 'Active', color: 'bg-green-900/60 text-green-300' },
  hidden: { label: 'Hidden', color: 'bg-gray-700 text-gray-500' },
};

export default function MediaProfileStatus({ profile }) {
  if (!profile) return null;

  const vConfig = VERIFICATION_CONFIG[profile.verification_status] || VERIFICATION_CONFIG.pending;
  const sConfig = STATUS_CONFIG[profile.profile_status] || STATUS_CONFIG.draft;
  const VIcon = vConfig.icon;

  const completeness = profile.completeness_score || 0;
  const barColor = completeness >= 80 ? 'bg-green-500' : completeness >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="bg-[#171717] border border-gray-800 rounded-xl p-4 space-y-4">
      {/* Slug & Status row */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <p className="text-gray-500 text-xs mb-0.5">Profile Slug</p>
          <code className="text-white text-sm font-mono">/{profile.slug || '—'}</code>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge className={sConfig.color}>{sConfig.label}</Badge>
          <Badge className={vConfig.color}>
            <VIcon className="w-3 h-3 mr-1" />
            {vConfig.label}
          </Badge>
        </div>
      </div>

      {/* Completeness */}
      <div>
        <div className="flex justify-between mb-1">
          <p className="text-gray-500 text-xs">Profile Completeness</p>
          <p className="text-gray-400 text-xs font-mono">{completeness}%</p>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${completeness}%` }} />
        </div>
      </div>

      {/* Trust signals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <TrustSignal label="Directory" active={profile.creator_directory_eligible} />
        <TrustSignal label="Credentialed" active={profile.credentialed_media} icon={Award} />
        <TrustSignal label="Public" active={profile.public_visible} icon={profile.public_visible ? Eye : EyeOff} />
        <TrustSignal label="Monetization" active={profile.monetization_eligible} />
      </div>
    </div>
  );
}

function TrustSignal({ label, active, icon: Icon }) {
  return (
    <div className={`rounded-lg px-3 py-2 text-center border ${active ? 'bg-green-900/20 border-green-800' : 'bg-[#0f0f0f] border-gray-800'}`}>
      <p className={`text-xs font-medium ${active ? 'text-green-300' : 'text-gray-600'}`}>{label}</p>
    </div>
  );
}