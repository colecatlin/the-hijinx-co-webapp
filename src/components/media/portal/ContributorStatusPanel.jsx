import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, ArrowRight, ExternalLink } from 'lucide-react';

function SignalRow({ label, value, ok, neutral }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800/60 last:border-0">
      <span className="text-gray-400 text-xs">{label}</span>
      <div className="flex items-center gap-1.5">
        {neutral ? (
          <Clock className="w-3 h-3 text-gray-600" />
        ) : ok ? (
          <CheckCircle2 className="w-3 h-3 text-green-500" />
        ) : (
          <XCircle className="w-3 h-3 text-gray-700" />
        )}
        <span className={`text-xs ${neutral ? 'text-gray-500' : ok ? 'text-green-400' : 'text-gray-600'}`}>{value}</span>
      </div>
    </div>
  );
}

export default function ContributorStatusPanel({ profile, currentUser, credentialCount, outletCount, onNavigate }) {
  if (!profile) return null;

  const roles = currentUser?.media_roles || [];
  const completeness = profile.completeness_score ?? 0;
  const hasBio = !!profile.bio;
  const hasSpecialties = (profile.specialties || []).length > 0;
  const hasPhoto = !!profile.profile_image_url;
  const hasOutlet = !!profile.primary_outlet_id;
  const isPublic = !!profile.public_visible;
  const isDirectoryEligible = !!profile.creator_directory_eligible;
  const isCredentialed = !!profile.credentialed_media;
  const isVerified = profile.verification_status === 'verified' || profile.verification_status === 'featured';

  return (
    <div className="space-y-4">
      <div className="bg-[#171717] border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <p className="text-white text-sm font-semibold">Contributor Status</p>
          <Badge className={
            completeness >= 80 ? 'bg-green-900/60 text-green-300' :
            completeness >= 50 ? 'bg-amber-900/60 text-amber-300' :
            'bg-red-900/60 text-red-300'
          }>
            {completeness}% complete
          </Badge>
        </div>
        <div className="px-4 py-1">
          <SignalRow label="Approved contributor" value="Yes" ok={true} />
          <SignalRow label="Profile status" value={profile.profile_status || 'draft'} ok={profile.profile_status === 'active'} />
          <SignalRow label="Verification" value={profile.verification_status || 'pending'} ok={isVerified} neutral={!isVerified} />
          <SignalRow label="Bio" value={hasBio ? 'Added' : 'Missing'} ok={hasBio} />
          <SignalRow label="Specialties" value={hasSpecialties ? `${profile.specialties.length} added` : 'None'} ok={hasSpecialties} />
          <SignalRow label="Profile photo" value={hasPhoto ? 'Uploaded' : 'Missing'} ok={hasPhoto} />
          <SignalRow label="Outlet affiliation" value={hasOutlet ? (profile.primary_outlet_name || 'Connected') : 'Independent'} ok={hasOutlet} neutral={!hasOutlet} />
          <SignalRow label="Active credentials" value={credentialCount > 0 ? `${credentialCount} active` : 'None'} ok={credentialCount > 0} neutral={credentialCount === 0} />
          <SignalRow label="Credentialed media" value={isCredentialed ? 'Yes' : 'Not yet'} ok={isCredentialed} neutral={!isCredentialed} />
          <SignalRow label="Public profile" value={isPublic ? 'Visible' : 'Hidden'} ok={isPublic} neutral={!isPublic} />
          <SignalRow label="Directory eligible" value={isDirectoryEligible ? 'Eligible' : 'Not yet'} ok={isDirectoryEligible} neutral={!isDirectoryEligible} />
          <SignalRow label="Monetization eligible" value={profile.monetization_eligible ? 'Yes' : 'No'} ok={!!profile.monetization_eligible} neutral={!profile.monetization_eligible} />
        </div>
      </div>

      {roles.length > 0 && (
        <div className="bg-[#171717] border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Media Roles</p>
          <div className="flex flex-wrap gap-1.5">
            {roles.map(r => <Badge key={r} className="bg-gray-800 text-gray-300 text-xs">{r}</Badge>)}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="bg-[#171717] border border-gray-800 rounded-xl p-4">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="space-y-1.5">
          {!hasBio && <ActionRow label="Add your bio" onClick={() => onNavigate('my_profile')} />}
          {!hasSpecialties && <ActionRow label="Add your coverage specialties" onClick={() => onNavigate('my_profile')} />}
          {!hasPhoto && <ActionRow label="Upload a profile photo" onClick={() => onNavigate('my_profile')} />}
          {!hasOutlet && <ActionRow label="Connect with an outlet" onClick={() => onNavigate('outlets')} />}
          {credentialCount === 0 && <ActionRow label="Request credentials for an event" onClick={() => onNavigate('apply')} />}
          <ActionRow label="Submit a story" onClick={() => onNavigate('submissions')} />
          {hasBio && hasSpecialties && hasPhoto && <ActionRow label="View credential requests" onClick={() => onNavigate('requests')} />}
        </div>
      </div>

      {/* Public profile link */}
      {isPublic && profile.slug && (
        <Link
          to={`/creators/${profile.slug}`}
          className="flex items-center justify-center gap-2 bg-[#0f0f0f] border border-gray-800 hover:border-gray-600 rounded-xl px-4 py-3 transition-colors group"
        >
          <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
          <span className="text-gray-400 group-hover:text-gray-200 text-sm">View My Public Profile</span>
        </Link>
      )}

      <div className="flex gap-3">
        <Link to="/creators" className="flex-1">
          <button className="w-full text-center text-gray-600 hover:text-gray-400 text-xs py-2 transition-colors">Browse Creator Directory</button>
        </Link>
        <Link to="/media-outlets" className="flex-1">
          <button className="w-full text-center text-gray-600 hover:text-gray-400 text-xs py-2 transition-colors">Browse Outlets</button>
        </Link>
      </div>
    </div>
  );
}

function ActionRow({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between text-left bg-[#0f0f0f] border border-gray-800 hover:border-gray-700 rounded-lg px-3 py-2 transition-colors group"
    >
      <span className="text-gray-300 text-xs">{label}</span>
      <ArrowRight className="w-3 h-3 text-gray-600 group-hover:text-gray-400" />
    </button>
  );
}