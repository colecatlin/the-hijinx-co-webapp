import React from 'react';
import { ShieldCheck, UserCog, CheckCircle2, XCircle, Clock, FileCheck, RotateCcw } from 'lucide-react';

/**
 * OwnershipGuide — reusable ownership education component.
 * Explains what owner/editor roles are, permissions, evidence requirements,
 * review process, and resubmission guidance. Uses consistent terminology.
 *
 * Props:
 *   variant: 'full' | 'compact'  (default: 'full')
 *   showReviewTimeline: boolean  (default: true)
 */
export default function OwnershipGuide({ variant = 'full', showReviewTimeline = true }) {
  if (variant === 'compact') {
    return (
      <div className="p-4 rounded-xl space-y-3" style={{ background: 'hsl(var(--surface-interactive) / 0.4)', border: '1px solid hsl(var(--divider))' }}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" style={{ color: 'hsl(var(--motion))' }} />
          <h4 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>What Ownership Means</h4>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
          An <strong style={{ color: 'hsl(var(--foreground))' }}>Owner</strong> is the verified person approved to manage a profile.
          An <strong style={{ color: 'hsl(var(--foreground))' }}>Editor</strong> is someone the owner has granted editing access.
          Owners can edit all content, manage media and sponsors, and add or remove editors.
          Editors can edit content and upload media but cannot transfer ownership.
        </p>
        {showReviewTimeline && (
          <div className="flex items-center gap-1.5 pt-1">
            <Clock className="w-3.5 h-3.5" style={{ color: 'hsl(var(--motion))' }} />
            <p className="text-xs" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              Most claims reviewed within <strong style={{ color: 'hsl(var(--foreground))' }}>48 hours</strong>.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Owner vs Editor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--motion) / 0.12)' }}>
              <ShieldCheck className="w-4 h-4" style={{ color: 'hsl(var(--motion))' }} />
            </div>
            <h4 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Owner</h4>
          </div>
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'hsl(var(--foreground-secondary))' }}>
            The verified person approved to manage a profile. Full editing access and control.
          </p>
          <ul className="space-y-1.5">
            {[
              'Edit all profile content (bio, photos, stats, sponsors)',
              'Add or remove editors',
              'Manage media uploads and galleries',
              'Manage schedule, entries, and results (tracks/series)',
              'Display the verified owner badge',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--success))' }} />
                <span className="text-xs" style={{ color: 'hsl(var(--foreground-secondary))' }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 rounded-xl" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--surface-interactive))' }}>
              <UserCog className="w-4 h-4" style={{ color: 'hsl(var(--foreground-secondary))' }} />
            </div>
            <h4 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Editor</h4>
          </div>
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'hsl(var(--foreground-secondary))' }}>
            A person granted editing access by the owner. Can contribute content without owning the profile.
          </p>
          <ul className="space-y-1.5">
            {[
              'Edit profile content (bio, photos, stats)',
              'Upload and manage media',
              'Manage sponsors (as permitted by owner)',
              'View and update schedule entries',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--success))' }} />
                <span className="text-xs" style={{ color: 'hsl(var(--foreground-secondary))' }}>{item}</span>
              </li>
            ))}
            <li className="flex items-start gap-2">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--danger))' }} />
              <span className="text-xs" style={{ color: 'hsl(var(--foreground-secondary))' }}>Cannot transfer ownership or remove other editors</span>
            </li>
          </ul>
        </div>
      </div>

      {/* What ownership does NOT allow */}
      <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--surface-interactive) / 0.4)', border: '1px solid hsl(var(--divider))' }}>
        <h4 className="text-sm font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>What Ownership Does Not Allow</h4>
        <ul className="space-y-1.5">
          {[
            'Deleting the entity record from the platform',
            'Modifying historical race results or standings',
            'Accessing other users\' private account data',
            'Transferring ownership to another user without admin review',
          ].map(item => (
            <li key={item} className="flex items-start gap-2">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--danger) / 0.8)' }} />
              <span className="text-xs" style={{ color: 'hsl(var(--foreground-secondary))' }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Evidence & Review */}
      <div className="space-y-4">
        <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
          <div className="flex items-center gap-2 mb-2">
            <FileCheck className="w-4 h-4" style={{ color: 'hsl(var(--motion))' }} />
            <h4 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Why Evidence Is Required</h4>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
            We manually review every claim to keep the platform trustworthy. Evidence verifies your relationship to the entity —
            this protects racers, teams, tracks, and series from false claims and ensures that the person managing a profile
            is who they say they are.
          </p>
        </div>

        {showReviewTimeline && (
          <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" style={{ color: 'hsl(var(--motion))' }} />
              <h4 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Review Timeline</h4>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              Most claims are reviewed within <strong style={{ color: 'hsl(var(--foreground))' }}>48 hours</strong>.
              Complex claims may take longer. You'll see your claim status update in the Claims Center, and you'll be notified
              when a decision is made.
            </p>
          </div>
        )}

        <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
          <div className="flex items-center gap-2 mb-2">
            <RotateCcw className="w-4 h-4" style={{ color: 'hsl(var(--motion))' }} />
            <h4 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>If Your Claim Is Denied</h4>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
            If your claim is denied, you can resubmit with additional evidence. Review the denial reason provided by our team,
            gather stronger evidence of your relationship to the entity, and submit a new claim. There is no penalty for
            resubmitting — we want the rightful owner to manage every profile.
          </p>
        </div>
      </div>
    </div>
  );
}