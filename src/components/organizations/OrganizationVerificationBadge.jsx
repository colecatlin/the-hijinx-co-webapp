import React from 'react';
import { CheckCircle2, ShieldCheck, Clock, XCircle } from 'lucide-react';
import { VERIFICATION_STATES } from '@/config/organizationRegistry';

/**
 * Reusable verification badge — the same component renders for every org type
 * because verification lives on OrganizationSettings, independent of users.
 */
export default function OrganizationVerificationBadge({ status = 'unverified', size = 'sm' }) {
  const cfg = VERIFICATION_STATES[status] || VERIFICATION_STATES.unverified;
  const Icon =
    status === 'verified' || status === 'official'
      ? status === 'official'
        ? ShieldCheck
        : CheckCircle2
      : status === 'pending_review'
        ? Clock
        : XCircle;
  const iconSize = size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';
  const textSize = size === 'lg' ? 'text-[11px]' : 'text-[9px]';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase tracking-[0.15em] ${textSize}`}
      style={{ background: 'rgba(255,255,255,0.06)', color: cfg.color, border: `1px solid ${cfg.color}33` }}
    >
      <Icon className={iconSize} style={{ color: cfg.color }} />
      {cfg.label}
    </span>
  );
}