import React from 'react';
import { Heart, ShieldCheck, Plus } from 'lucide-react';
import IdentityApplicationForm from '@/components/identity/IdentityApplicationForm';

const MOTION = 'hsl(var(--motion))';

const CAPABILITY_LABELS = {
  fan: 'Fan',
  driver: 'Driver',
  team: 'Team',
  track: 'Track',
  series: 'Series',
  media: 'Media',
  brand: 'Brand',
  crew: 'Crew',
  builder: 'Builder',
  sponsor: 'Sponsor',
  photographer: 'Photographer',
  creator: 'Creator',
};

// Ordered for display
const ORDERED_TYPES = ['fan', 'driver', 'team', 'track', 'series', 'media', 'photographer', 'creator', 'brand', 'sponsor', 'crew', 'builder'];

export default function IdentitySection({ formData, setFormData, user }) {
  const profileTypes = user?.profile_types || ['fan'];
  const approvedIdentities = ORDERED_TYPES.filter((t) => profileTypes.includes(t));

  return (
    <div className="space-y-5">
      {/* Approved identities — Fan is always on, others are application-approved */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>
          Your Identities
        </p>
        <div className="flex flex-wrap gap-2">
          {approvedIdentities.map((type) => {
            const isFan = type === 'fan';
            const label = CAPABILITY_LABELS[type] || type;
            return (
              <span
                key={type}
                className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                style={isFan ? {
                  background: `${MOTION} / 0.18)`,
                  color: MOTION,
                  border: `1px solid ${MOTION} / 0.4)`,
                } : {
                  background: `${MOTION} / 0.12)`,
                  color: MOTION,
                  border: `1px solid ${MOTION} / 0.3)`,
                }}
              >
                {isFan && <Heart className="w-3 h-3" />}
                {!isFan && <ShieldCheck className="w-3 h-3" />}
                {label}
              </span>
            );
          })}
        </div>
        <p className="text-xs mt-2" style={{ color: 'hsl(var(--foreground-quiet))' }}>
          Fan is your default identity. Other identities are granted after application review.
        </p>
      </div>

      {/* Application form */}
      <div className="pt-4" style={{ borderTop: '1px solid hsl(var(--divider))' }}>
        <div className="flex items-center gap-2 mb-3">
          <Plus className="w-3.5 h-3.5" style={{ color: MOTION }} />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: MOTION }}>
            Apply for a new identity
          </p>
        </div>
        <IdentityApplicationForm user={user} />
      </div>
    </div>
  );
}