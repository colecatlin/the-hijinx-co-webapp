import React, { useState } from 'react';
import EntityPlaceholderImage from './EntityPlaceholderImage';

/**
 * EntityImage
 *
 * Smart image component: renders the best available image for an entity,
 * falling back to EntityPlaceholderImage on missing / broken images.
 *
 * Priority chain:
 *   hero_image_url → profile_image_url → cover_image → banner_url → image_url → placeholder
 *
 * Props:
 *  entity      - entity object
 *  entityType  - 'driver' | 'team' | 'track' | 'series' | string
 *  context     - 'hero' | 'grid' | 'feed' | 'spotlight' (affects priority)
 *  alt         - img alt text
 *  className   - class string applied to both <img> and placeholder wrapper
 *  style       - inline style (applied to both img and placeholder svg)
 *  imgClassName - extra class only for <img> (e.g. object-top)
 *  size        - passed to EntityPlaceholderImage when placeholder used
 */
export default function EntityImage({
  entity = {},
  entityType = 'driver',
  context = 'grid',
  alt = '',
  className = '',
  style = {},
  imgClassName = '',
  size = 'full',
}) {
  const resolved = resolveImage(entity, entityType, context);
  const [errored, setErrored] = useState(false);

  if (!resolved || errored) {
    return (
      <div className={`overflow-hidden ${className}`} style={style}>
        <EntityPlaceholderImage entity={entity} entityType={entityType} size={size} />
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt || getAltText(entity, entityType)}
      className={`${className} ${imgClassName}`.trim()}
      style={style}
      onError={() => setErrored(true)}
    />
  );
}

// ─── Resolution logic ────────────────────────────────────────────────────────
// Priority: card_image_url → hero_image_url → legacy fields → null

function resolveImage(entity, type, context) {
  if (!entity) return null;

  // Explicit controlled fields checked first for all types
  const isHeroContext = context === 'hero' || context === 'spotlight';

  switch (type) {
    case 'driver':
      if (isHeroContext) {
        return entity.hero_image_url || entity.card_image_url || entity.profile_image_url || entity.thumbnail_url || null;
      }
      return entity.card_image_url || entity.profile_image_url || entity.hero_image_url || entity.thumbnail_url || null;

    case 'team':
      return entity.card_image_url || entity.hero_image_url || entity.logo_url || entity.banner_url || entity.image_url || null;

    case 'track':
      return entity.card_image_url || entity.hero_image_url || entity.cover_image || entity.aerial_image_url || entity.image_url || null;

    case 'series':
      return entity.card_image_url || entity.hero_image_url || entity.banner_url || entity.logo_url || entity.image_url || null;

    case 'event':
      return entity.card_image_url || entity.hero_image_url || entity.banner_url || entity.cover_image || entity.track_image || entity.image_url || null;

    case 'story':
      return entity.card_image_url || entity.cover_image || entity.hero_image_url || entity.thumbnail_url || entity.image_url || null;

    default:
      return entity.card_image_url || entity.image_url || entity.cover_image || entity.hero_image_url || entity.thumbnail_url || null;
  }
}

function getAltText(entity, type) {
  if (type === 'driver') return `${entity.first_name || ''} ${entity.last_name || ''}`.trim();
  return entity.name || entity.title || type;
}