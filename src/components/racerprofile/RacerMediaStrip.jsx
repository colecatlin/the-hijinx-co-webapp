import React from 'react';

/**
 * RacerMediaStrip — editorial photography block.
 *
 * Uses only racer-associated imagery already present in the experience
 * response. Never substitutes stock photography; when no imagery exists the
 * component renders nothing so the layout simplifies gracefully.
 */
export default function RacerMediaStrip({ heroImage, portraitImage, photos = [], alt = 'Racer photography', limit = 5 }) {
  const images = [heroImage, portraitImage, ...(photos || [])]
    .filter(Boolean)
    .filter((url, index, all) => all.indexOf(url) === index)
    .slice(0, limit);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="aspect-[16/9] overflow-hidden bg-surface-sunken">
        <img src={images[0]} alt={alt} className="w-full h-full object-cover" loading="lazy" decoding="async" />
      </div>
    );
  }

  const [lead, ...rest] = images;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      <div className="col-span-2 aspect-[4/3] overflow-hidden bg-surface-sunken">
        <img src={lead} alt={alt} className="w-full h-full object-cover" loading="lazy" decoding="async" />
      </div>
      {rest.slice(0, 3).map((url, index) => (
        <div key={url} className="col-span-1 aspect-square sm:aspect-[4/5] overflow-hidden bg-surface-sunken">
          <img
            src={url}
            alt={`${alt} ${index + 2}`}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      ))}
    </div>
  );
}