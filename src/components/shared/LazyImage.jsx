/**
 * LazyImage — Sprint 1E
 *
 * Shared image component with native lazy loading, async decoding,
 * and a lightweight blur-up placeholder. Used across cards, galleries,
 * and hero images to avoid loading off-screen images.
 *
 * Preserves image quality — no srcset or format negotiation (future improvement).
 */
import React, { useState } from 'react';

export default function LazyImage({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  aspectClass = '',
  fallbackBg = 'hsl(var(--surface-interactive))',
  onError,
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div
      className={`relative overflow-hidden ${aspectClass} ${className}`}
      style={{ background: loaded ? 'transparent' : fallbackBg }}
    >
      {!errored && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            setErrored(true);
            if (onError) onError(e);
          }}
          className={`w-full h-full transition-opacity duration-300 ${imgClassName} ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ objectFit: 'cover' }}
          {...rest}
        />
      )}
      {errored && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: fallbackBg }}>
          <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            No Image
          </span>
        </div>
      )}
    </div>
  );
}