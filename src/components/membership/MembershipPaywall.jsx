import React from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Lock, ArrowRight } from 'lucide-react';
import { useMembership } from '@/hooks/useMembership';
import { ENTITLEMENT_MAP } from '@/config/entitlements';

function formatPrice(tier) {
  if (!tier || tier.price_cents === 0) return 'Free';
  return `$${(tier.price_cents / 100).toFixed(0)}/${tier.interval === 'year' ? 'yr' : 'mo'}`;
}

export default function MembershipPaywall({ currentTier }) {
  const { allTiers, checkoutMutation } = useMembership();

  const paidTiers = allTiers.filter(t => t.tier_key !== 'free' && t.is_active !== false);
  const currentKey = currentTier?.tier_key;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--canvas))' }}>
      {/* Header */}
      <div className="px-6 pt-16 pb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
            style={{ background: 'hsl(var(--motion) / 0.1)', border: '1px solid hsl(var(--motion) / 0.25)' }}>
            <Lock className="w-3 h-3" style={{ color: 'hsl(var(--motion))' }} />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--motion))' }}>
              RaceCore Access
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3" style={{ color: 'hsl(var(--foreground))' }}>
            Unlock RaceCore
          </h1>
          <p className="text-base max-w-md mx-auto" style={{ color: 'hsl(var(--foreground-secondary))' }}>
            RaceCore is the operational engine for race weekends — entries, results, standings, tech, and race control. Choose a membership to get started.
          </p>
        </motion.div>
      </div>

      {/* Tier grid */}
      <div className="flex-1 px-6 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {paidTiers.map((tier, idx) => {
            const isCurrent = tier.tier_key === currentKey;
            const features = (tier.features || []).map(k => ENTITLEMENT_MAP[k]).filter(Boolean);
            return (
              <motion.div
                key={tier.tier_key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="relative rounded-2xl p-6 flex flex-col"
                style={{
                  background: 'hsl(var(--surface))',
                  border: tier.highlight
                    ? '1.5px solid hsl(var(--motion) / 0.5)'
                    : '1px solid hsl(var(--divider))',
                  boxShadow: tier.highlight
                    ? '0 0 40px hsl(var(--motion) / 0.12)'
                    : 'none',
                }}
              >
                {tier.highlight && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-[0.2em]"
                    style={{ background: 'hsl(var(--motion))', color: 'hsl(var(--canvas))' }}>
                    Most Popular
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-xl font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                    {tier.display_name}
                  </h3>
                  <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                    {tier.description}
                  </p>
                </div>

                <div className="mb-5">
                  <span className="text-3xl font-black" style={{ color: 'hsl(var(--foreground))' }}>
                    {formatPrice(tier)}
                  </span>
                  {tier.price_cents > 0 && (
                    <span className="text-sm ml-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                      {tier.interval === 'year' ? 'per year' : 'per month'}
                    </span>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {features.map((feat) => (
                    <li key={feat.key} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--motion))' }} />
                      <span style={{ color: 'hsl(var(--foreground-secondary))' }}>{feat.label}</span>
                    </li>
                  ))}
                  {features.length === 0 && (
                    <li className="text-sm italic" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                      No RaceCore access
                    </li>
                  )}
                </ul>

                <button
                  onClick={() => checkoutMutation.mutate(tier.tier_key)}
                  disabled={isCurrent || checkoutMutation.isPending || !tier.stripe_price_id}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: tier.highlight ? 'hsl(var(--motion))' : 'hsl(var(--surface-interactive))',
                    color: tier.highlight ? 'hsl(var(--canvas))' : 'hsl(var(--foreground))',
                    border: tier.highlight ? 'none' : '1px solid hsl(var(--divider))',
                  }}
                >
                  {checkoutMutation.isPending && checkoutMutation.variables === tier.tier_key ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : !tier.stripe_price_id ? (
                    'Coming Soon'
                  ) : (
                    <>Subscribe <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs mt-8" style={{ color: 'hsl(var(--foreground-quiet))' }}>
          Prices in USD. Cancel anytime via the Stripe Customer Portal.
        </p>
      </div>
    </div>
  );
}