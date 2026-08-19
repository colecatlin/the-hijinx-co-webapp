import React from 'react';
import { PROFILE_TYPE_CONFIG, ALL_PROFILE_TYPES } from '@/components/system/userCapabilities';

const MOTION = 'hsl(var(--motion))';
const MOTION_HOVER = 'hsl(var(--motion-hover))';

export default function IdentitySection({ formData, setFormData }) {
  const profileTypes = formData.profile_types || ['fan'];
  const primaryType = formData.primary_profile_type || 'fan';

  const toggleType = (type) => {
    const current = profileTypes.includes(type)
      ? profileTypes.filter(t => t !== type)
      : [...profileTypes, type];
    const updated = current.length === 0 ? ['fan'] : current;
    const newPrimary = updated.includes(primaryType) ? primaryType : updated[0];
    setFormData({ ...formData, profile_types: updated, primary_profile_type: newPrimary });
  };

  const setPrimary = (type) => {
    const types = profileTypes.includes(type) ? profileTypes : [...profileTypes, type];
    setFormData({ ...formData, primary_profile_type: type, profile_types: types });
  };

  return (
    <div className="space-y-6">
      {/* Type toggles */}
      <div className="flex flex-wrap gap-2">
        {ALL_PROFILE_TYPES.map(type => {
          const config = PROFILE_TYPE_CONFIG[type];
          const selected = profileTypes.includes(type);
          const isPrimary = selected && primaryType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200"
              style={isPrimary ? {
                background: `hsl(var(--motion) / 0.18)`,
                color: MOTION,
                border: `1px solid ${MOTION} / 0.4)`,
              } : selected ? {
                background: `hsl(var(--motion) / 0.12)`,
                color: MOTION,
                border: `1px solid ${MOTION} / 0.3)`,
              } : {
                background: 'hsl(var(--surface-interactive) / 0.3)',
                color: 'hsl(var(--foreground-quiet))',
                border: '1px solid hsl(var(--divider))',
              }}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Primary picker */}
      {profileTypes.length > 1 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            Which role do you want front and center in your Garage?
          </p>
          <div className="flex flex-wrap gap-2">
            {profileTypes.map(type => {
              const config = PROFILE_TYPE_CONFIG[type];
              const isPrimary = primaryType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPrimary(type)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5"
                  style={isPrimary ? {
                    background: MOTION,
                    color: 'hsl(var(--canvas))',
                    border: `1px solid ${MOTION}`,
                    boxShadow: `0 0 12px ${MOTION} / 0.3)`,
                  } : {
                    background: 'hsl(var(--surface-interactive) / 0.4)',
                    color: 'hsl(var(--foreground-quiet))',
                    border: '1px solid hsl(var(--divider))',
                  }}
                >
                  {isPrimary && <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ background: 'hsl(var(--canvas))' }} />}
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}