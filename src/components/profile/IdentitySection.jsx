import React from 'react';
import { Badge } from '@/components/ui/badge';
import { PROFILE_TYPE_CONFIG, ALL_PROFILE_TYPES } from '@/components/system/userCapabilities';

export default function IdentitySection({ formData, setFormData }) {
  const profileTypes = formData.profile_types || ['fan'];
  const primaryType = formData.primary_profile_type || 'fan';

  const toggleType = (type) => {
    const current = profileTypes.includes(type)
      ? profileTypes.filter(t => t !== type)
      : [...profileTypes, type];
    const updated = current.length === 0 ? ['fan'] : current;
    // If we removed the primary, reset it
    const newPrimary = updated.includes(primaryType) ? primaryType : updated[0];
    setFormData({ ...formData, profile_types: updated, primary_profile_type: newPrimary });
  };

  const setPrimary = (type) => {
    const types = profileTypes.includes(type) ? profileTypes : [...profileTypes, type];
    setFormData({ ...formData, primary_profile_type: type, profile_types: types });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">Who are you in motorsports?</h3>
        <p className="text-xs text-gray-400 mb-4">
          Select all that apply. Your primary type controls what your dashboard emphasizes — it's identity only, not a permission level.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_PROFILE_TYPES.map(type => {
            const config = PROFILE_TYPE_CONFIG[type];
            const selected = profileTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selected
                    ? `${config.color} border-current ring-1 ring-current`
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {profileTypes.length > 1 && (
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-2">Primary identity</h3>
          <p className="text-xs text-gray-400 mb-3">Which one should your dashboard focus on?</p>
          <div className="flex flex-wrap gap-2">
            {profileTypes.map(type => {
              const config = PROFILE_TYPE_CONFIG[type];
              const isPrimary = primaryType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPrimary(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    isPrimary
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {isPrimary && <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />}
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