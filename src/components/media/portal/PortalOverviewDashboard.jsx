import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User, Building2, Shield, ImageIcon, FileText, CheckCircle2,
  Clock, AlertCircle, ArrowRight, FilePlus, ClipboardList,
  Users, ExternalLink
} from 'lucide-react';
import { createPageUrl } from '@/components/utils';

function StatCard({ icon: Icon, label, value, sub, color = 'text-gray-400', onClick, badge }) {
  const inner = (
    <div
      className={`bg-[#171717] border border-gray-800 rounded-xl p-4 flex items-start gap-3 ${onClick ? 'cursor-pointer hover:border-gray-600 transition-colors group' : ''}`}
      onClick={onClick}
    >
      <div className={`w-8 h-8 rounded-lg bg-[#1a1a1a] border border-gray-800 flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-gray-400 text-xs">{label}</p>
          {badge && <span className="text-[10px] bg-amber-800/60 text-amber-300 px-1.5 rounded-full">{badge}</span>}
        </div>
        <p className="text-white font-semibold text-sm mt-0.5">{value}</p>
        {sub && <p className="text-gray-600 text-xs mt-0.5 truncate">{sub}</p>}
      </div>
      {onClick && <ArrowRight className="w-3 h-3 text-gray-700 group-hover:text-gray-400 shrink-0 mt-1" />}
    </div>
  );
  return inner;
}

export default function PortalOverviewDashboard({
  currentUser, mediaProfile, mediaApplication,
  credentialRequests, credentials, assets, submissions, outlets,
  isAdmin, adminCounts,
  onNavigate,
}) {
  const isContributor = !!(mediaProfile);
  const completeness = mediaProfile?.completeness_score ?? 0;
  const profileRoles = currentUser?.media_roles || [];

  return (
    <div className="space-y-6">
      {/* Welcome / identity strip */}
      <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Media Portal</p>
            <h2 className="text-white font-black text-xl">{currentUser?.full_name || currentUser?.email}</h2>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {isAdmin && <Badge className="bg-purple-900/60 text-purple-300 text-[10px]">Admin</Badge>}
              {isContributor && <Badge className="bg-green-900/60 text-green-300 text-[10px]">Approved Contributor</Badge>}
              {profileRoles.map(r => (
                <Badge key={r} className="bg-gray-800 text-gray-400 text-[10px]">{r}</Badge>
              ))}
              {!isContributor && !isAdmin && mediaApplication?.status === 'pending' && (
                <Badge className="bg-amber-900/60 text-amber-300 text-[10px]">Application Pending</Badge>
              )}
              {!isContributor && !isAdmin && !mediaApplication && (
                <Badge className="bg-gray-800 text-gray-500 text-[10px]">General Member</Badge>
              )}
            </div>
          </div>
          {mediaProfile?.profile_image_url && (
            <img src={mediaProfile.profile_image_url} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-700 shrink-0" />
          )}
        </div>

        {/* Profile completeness bar for contributors */}
        {isContributor && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-500 text-xs">Profile Completion</p>
              <p className={`text-xs font-semibold ${completeness >= 80 ? 'text-green-400' : completeness >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{completeness}%</p>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${completeness >= 80 ? 'bg-green-500' : completeness >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Contributor workspace cards */}
      {(isContributor || isAdmin) && (
        <div>
          <p className="text-gray-600 text-xs uppercase tracking-wider mb-3">My Workspace</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              icon={User} label="Media Profile" color="text-blue-400"
              value={mediaProfile?.display_name || 'Untitled'}
              sub={mediaProfile?.primary_role || 'No role set'}
              onClick={() => onNavigate('my_profile')}
              badge={completeness < 50 ? 'Incomplete' : null}
            />
            <StatCard
              icon={Building2} label="Outlets" color="text-indigo-400"
              value={outlets?.length > 0 ? `${outlets.length} outlet${outlets.length !== 1 ? 's' : ''}` : 'None'}
              sub={mediaProfile?.primary_outlet_name || 'Independent'}
              onClick={() => onNavigate('outlets')}
            />
            <StatCard
              icon={Shield} label="Credentials" color="text-green-400"
              value={credentials?.filter(c => c.status === 'active').length ?? 0}
              sub={`${credentialRequests?.filter(r => r.status === 'applied' || r.status === 'under_review').length ?? 0} pending request(s)`}
              onClick={() => onNavigate('credentials')}
            />
            <StatCard
              icon={ImageIcon} label="Assets" color="text-amber-400"
              value={assets?.length ?? 0}
              sub="uploaded assets"
              onClick={() => onNavigate('assets')}
            />
            <StatCard
              icon={FileText} label="Submissions" color="text-cyan-400"
              value={submissions?.length ?? 0}
              sub="story submissions"
              onClick={() => onNavigate('submissions')}
            />
            <StatCard
              icon={ClipboardList} label="Credential Requests" color="text-orange-400"
              value={credentialRequests?.length ?? 0}
              sub={`${credentialRequests?.filter(r => r.status === 'denied').length ?? 0} denied`}
              onClick={() => onNavigate('requests')}
            />
          </div>
        </div>
      )}

      {/* Admin shortcuts */}
      {isAdmin && adminCounts && (
        <div>
          <p className="text-gray-600 text-xs uppercase tracking-wider mb-3">Admin Shortcuts</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              icon={Users} label="Applications" color="text-purple-400"
              value={adminCounts.pendingApplications ?? 0}
              sub="pending review"
              badge={adminCounts.pendingApplications > 0 ? adminCounts.pendingApplications : null}
              onClick={() => window.location.href = '/management/media/applications'}
            />
            <StatCard
              icon={CheckCircle2} label="Contributors" color="text-green-400"
              value={adminCounts.approvedContributors ?? 0}
              sub="approved"
              onClick={() => onNavigate('my_profile')}
            />
            <StatCard
              icon={Building2} label="Outlets" color="text-indigo-400"
              value={adminCounts.outlets ?? 0}
              sub="total outlets"
              onClick={() => onNavigate('outlets')}
            />
            <StatCard
              icon={Shield} label="Pending Credentials" color="text-amber-400"
              value={adminCounts.pendingCredentials ?? 0}
              sub="awaiting review"
            />
            <StatCard
              icon={ImageIcon} label="Assets for Review" color="text-orange-400"
              value={adminCounts.assetsForReview ?? 0}
              sub="need review"
            />
            <div className="bg-[#171717] border border-gray-800 rounded-xl p-4 flex flex-col justify-between gap-3">
              <p className="text-gray-400 text-xs">Editorial Tools</p>
              <Link to="/management/editorial/writer-workspace">
                <Button size="sm" variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 text-xs h-7 gap-1.5">
                  <ExternalLink className="w-3 h-3" /> Writer Workspace
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Next steps for contributors with incomplete profiles */}
      {isContributor && completeness < 80 && (
        <div className="bg-[#0f1117] border border-blue-900/40 rounded-xl p-4">
          <p className="text-blue-300 text-sm font-semibold mb-3">Complete Your Profile</p>
          <div className="space-y-2">
            {!mediaProfile?.bio && <NextStep text="Add a professional bio" onClick={() => onNavigate('my_profile')} />}
            {!mediaProfile?.specialties?.length && <NextStep text="Add your coverage specialties" onClick={() => onNavigate('my_profile')} />}
            {!mediaProfile?.profile_image_url && <NextStep text="Upload a profile photo" onClick={() => onNavigate('my_profile')} />}
            {!mediaProfile?.primary_outlet_id && <NextStep text="Connect with an outlet" onClick={() => onNavigate('outlets')} />}
            {!mediaProfile?.website_url && <NextStep text="Add your professional website" onClick={() => onNavigate('my_profile')} />}
          </div>
        </div>
      )}

      {/* Apply CTA for non-contributors */}
      {!isContributor && !isAdmin && !mediaApplication && (
        <div className="bg-[#111] border border-gray-700 rounded-xl p-5 text-center">
          <FilePlus className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">Apply to Become a Contributor</p>
          <p className="text-gray-500 text-sm mb-4">Unlock credentials, asset management, outlet affiliations, and the full contributor workspace.</p>
          <Button onClick={() => onNavigate('apply')} className="bg-white text-black hover:bg-gray-100 gap-1.5">
            Apply Now <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Submission shortcut for all authenticated users */}
      {!isContributor && !isAdmin && (
        <div className="bg-[#171717] border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-white text-sm font-medium">Submit a Story or Tip</p>
            <p className="text-gray-500 text-xs">Open to all registered members — no contributor status required.</p>
          </div>
          <Button size="sm" onClick={() => onNavigate('submissions')} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 shrink-0 gap-1.5 text-xs">
            Submit <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function NextStep({ text, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between text-left bg-[#171717] border border-gray-800 hover:border-gray-600 rounded-lg px-3 py-2 transition-colors group">
      <span className="text-gray-300 text-xs">{text}</span>
      <ArrowRight className="w-3 h-3 text-gray-600 group-hover:text-gray-300" />
    </button>
  );
}