import React from 'react';

/**
 * Generates branded initials from entity name + type.
 */
function getInitials(entity, entityType) {
  if (!entity) return '??';

  switch (entityType) {
    case 'driver': {
      const f = (entity.first_name || '').trim()[0] || '';
      const l = (entity.last_name || '').trim()[0] || '';
      return (f + l).toUpperCase() || '??';
    }

    case 'team': {
      const name = entity.name || '';
      const words = name.trim().split(/\s+/).filter(Boolean);
      if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
      return name.slice(0, 2).toUpperCase() || '??';
    }

    case 'track': {
      const name = entity.name || '';
      const words = name.trim().split(/\s+/).filter(Boolean);
      const initials = words.map(w => w[0]).join('').toUpperCase();
      return initials.slice(0, 3) || '??';
    }

    case 'series': {
      const name = entity.name || entity.full_name || '';
      const words = name.trim().split(/\s+/).filter(Boolean);
      // Acronym from meaningful words (skip short connectors)
      const skip = new Set(['of', 'the', 'and', 'for', 'a', 'an', 'in', 'at']);
      const acronym = words.filter(w => !skip.has(w.toLowerCase())).map(w => w[0]).join('').toUpperCase();
      return acronym.slice(0, 3) || name.slice(0, 2).toUpperCase() || '??';
    }

    default: {
      const name = entity.name || entity.title || '';
      const words = name.trim().split(/\s+/).filter(Boolean);
      if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
      return name.slice(0, 2).toUpperCase() || '??';
    }
  }
}

/**
 * Optional entity number badge (e.g. car number).
 */
function getNumber(entity, entityType) {
  if (entityType === 'driver') return entity.primary_number || null;
  return null;
}

/**
 * EntityPlaceholderImage
 *
 * Renders a branded Oil Black / Denim Blue placeholder with large centered initials.
 * Uses inline SVG — no external dependencies, no blank states.
 *
 * Props:
 *  entity       - entity object
 *  entityType   - 'driver' | 'team' | 'track' | 'series' | string
 *  className    - optional extra class
 *  style        - optional inline style
 *  size         - number (px) or 'full' (default: 'full', fills container)
 */
export default function EntityPlaceholderImage({ entity = {}, entityType = 'driver', className = '', style = {}, size = 'full' }) {
  const initials = getInitials(entity, entityType);
  const number = getNumber(entity, entityType);

  const dim = size === 'full' ? '100%' : `${size}px`;

  // Unique gradient ID per instance to avoid SVG collisions
  const gradId = `epg-${entityType}-${initials}`;
  const noiseId = `epn-${entityType}-${initials}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={dim}
      height={dim}
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ display: 'block', ...style }}
      aria-label={`${entityType} placeholder: ${initials}`}
    >
      <defs>
        {/* Oil Black → Denim Blue radial gradient */}
        <radialGradient id={gradId} cx="30%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#1A3249" stopOpacity="1" />
          <stop offset="55%" stopColor="#0D1B2A" stopOpacity="1" />
          <stop offset="100%" stopColor="#090E14" stopOpacity="1" />
        </radialGradient>

        {/* Subtle noise filter for texture */}
        <filter id={noiseId} x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
          <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blended" />
          <feComposite in="blended" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      {/* Background fill */}
      <rect width="400" height="400" fill={`url(#${gradId})`} />

      {/* Noise texture overlay */}
      <rect width="400" height="400" fill="transparent" filter={`url(#${noiseId})`} opacity="0.06" />

      {/* Subtle diagonal slash accent — Teal */}
      <line x1="0" y1="400" x2="400" y2="0" stroke="#00FFDA" strokeWidth="1" opacity="0.06" />
      <line x1="-20" y1="400" x2="380" y2="0" stroke="#00FFDA" strokeWidth="0.5" opacity="0.04" />

      {/* Corner marks */}
      <line x1="20" y1="20" x2="50" y2="20" stroke="#00FFDA" strokeWidth="1.5" opacity="0.25" />
      <line x1="20" y1="20" x2="20" y2="50" stroke="#00FFDA" strokeWidth="1.5" opacity="0.25" />
      <line x1="380" y1="380" x2="350" y2="380" stroke="#00FFDA" strokeWidth="1.5" opacity="0.25" />
      <line x1="380" y1="380" x2="380" y2="350" stroke="#00FFDA" strokeWidth="1.5" opacity="0.25" />

      {/* Teal glow circle behind initials */}
      <circle cx="200" cy="195" r="110" fill="#00FFDA" opacity="0.025" />

      {/* Entity type label — mono, top-left */}
      <text
        x="200"
        y="130"
        textAnchor="middle"
        fontFamily="'JetBrains Mono', 'Courier New', monospace"
        fontSize="11"
        fontWeight="700"
        letterSpacing="4"
        fill="#FFF8F5"
        opacity="0.2"
        textTransform="uppercase"
      >
        {entityType.toUpperCase()}
      </text>

      {/* Large initials */}
      <text
        x="200"
        y="240"
        textAnchor="middle"
        fontFamily="'Inter', 'Arial Black', sans-serif"
        fontSize={initials.length > 2 ? '90' : '108'}
        fontWeight="900"
        letterSpacing="-2"
        fill="#FFF8F5"
        opacity="0.88"
      >
        {initials}
      </text>

      {/* Teal underline accent beneath initials */}
      <rect
        x={200 - (initials.length > 2 ? 52 : 42)}
        y="258"
        width={initials.length > 2 ? 104 : 84}
        height="3"
        fill="#00FFDA"
        opacity="0.6"
        rx="1.5"
      />

      {/* Optional car number — bottom right */}
      {number && (
        <text
          x="370"
          y="385"
          textAnchor="end"
          fontFamily="'JetBrains Mono', 'Courier New', monospace"
          fontSize="13"
          fontWeight="700"
          fill="#00FFDA"
          opacity="0.35"
          letterSpacing="1"
        >
          #{number}
        </text>
      )}
    </svg>
  );
}