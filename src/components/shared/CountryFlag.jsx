import React from 'react';
import { flagUrl } from '@/lib/countryReference';

/**
 * CountryFlag — renders the flag for any country spelling the platform accepts
 * (the canonical name, its two-letter code, or a historical alias such as
 * 'USA'). Flags resolve from the platform's one country list, so every country
 * carries one rather than the partial set this used to hold.
 */
export default function CountryFlag({ country, className = "w-4 h-3" }) {
  const src = flagUrl(country, 160);
  if (!src) return null;

  return (
    <img
      src={src}
      alt={`${country} flag`}
      className={className}
    />
  );
}