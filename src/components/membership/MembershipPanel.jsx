import React from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Settings, Calendar, Crown, Sparkles } from 'lucide-react';
import { useMembership } from '@/hooks/useMembership';
import { ENTITLEMENT_MAP } from '@/config/entitlements';

const STATUS_STYLES = {
  active: { bg: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))', label: 'Active' },
  comp: { bg: 'hsl(var(--motion) / 0.15)', color: 'hsl(var(--motion))', label: 'Complimentary' },
  past_due: { bg: 'hsl(var(--warning) / 0.15)', color: 'hsl(var(--warning))', label: 'Past Due' },
  canceled: { bg: 'hsl(var(--danger) / 0.15)', color: 'hsl(var(--danger))', label: 'Canceled' },
  expired: { bg: 'hsl(var(--foreground-quiet) / 0.15)', color: 'hsl(var(--foreground-quiet))', label: 'Expired' },
};

export default function MembershipPanel() {
  const { user, membership, tier, allTiers, portalMutation, checkoutMutation } = useMembership();

  if (!membership || !tier) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'hsl(var(--foreground-quiet))' }} />
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[membership.status] || STATUS_STYLES.active;
  const features = (tier.features || []).map(k => ENTITLEMENT_MAP[k]).filter(Boolean);
  const isPaid = membership.status === 'active' && !!membership.stripe_subscription_id;
  const isComp = membership.status === 'comp';
  const renewalDate = membership.current_period_end
    ? new Date(membership.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const tierIcon = tier.tier_key === 'elite' ? Crown : tier.tier_key === 'pro' ? Sparkles : null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Current tier card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl p-7 mb-6"
        style={{
          background: 'hsl(var(--surface))',
          border: '1px solid hsl(var(--divider))',
        }}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            {tierIcon && (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'hsl(var(--motion) / 0.12)' }}>
                {React.createElement(tierIcon, { className: 'w-5 h-5', style: { color: 'hsl(var(--motion))' } })}
              </div>
            )}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] mb-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                Current Plan
              </p>
              <h2 className="text-2xl font-black" style={{ color: 'hsl(var(--foreground))' }}>
                {tier.display_name}
              </h2>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: statusStyle.bg, color: statusStyle.color }}>
            {statusStyle.label}
          </span>
        </div>

        <p className="text-sm mb-5" style={{ color: 'hsl(var(--foreground-secondary))' }}>
          {tier.description}
        </p>

        {/* Renewal / comp info */}
        <div className="flex items-center gap-2 text-sm mb-5 pb-5"
          style={{ color: 'hsl(var(--foreground-quiet))', borderBottom: '1px solid hsl(var(--divider))' }}>
          {isComp ? (
            <>
              <Crown className="w-4 h-4" style={{ color: 'hsl(var(--motion))' }} />
              <span>Complimentary access — no expiration</span>
            </>
          ) : renewalDate ? (
            <>
              <Calendar className="w-4 h-4" />
              <span>Renews on {renewalDate}</span>
            </>
          ) : (
            <span>Free plan — no renewal</span>
          )}
        </div>

        {/* Features list */}
        {features.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>
              Included
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {features.map(feat => (
                <div key={feat.key} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--motion))' }} />
                  <span style={{ color: 'hsl(var(--foreground-secondary))' }}>{feat.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manage button */}
        {isPaid && (
          <button
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: 'hsl(var(--surface-interactive))',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--divider))',
            }}
          >
            {portalMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Settings className="w-4 h-4" />
                Manage Subscription
              </>
            )}
          </button>
        )}
      </motion.div>

      {/* Upgrade options */}
      {membership.tier_key !== 'elite' && allTiers.length > 0 && (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] mb-4" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            Upgrade
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {allTiers
              .filter(t => t.tier_key !== 'free' && t.tier_key !== membership.tier_key && t.is_active !== false)
              .map(t => (
                <div key={t.tier_key} className="rounded-xl p-4"
                  style={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--divider))' }}>
                  <p className="font-bold text-sm mb-1" style={{ color: 'hsl(var(--foreground))' }}>{t.display_name}</p>
                  <p className="text-xs mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                    {t.price_cents > 0 ? `$${(t.price_cents / 100).toFixed(0)}/mo` : 'Free'}
                  </p>
                  <button
                    onClick={() => checkoutMutation.mutate(t.tier_key)}
                    disabled={checkoutMutation.isPending || !t.stripe_price_id}
                    className="w-full py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                    style={{ background: 'hsl(var(--motion) / 0.12)', color: 'hsl(var(--motion))' }}
                  >
                    {t.stripe_price_id ? 'Upgrade' : 'Soon'}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}