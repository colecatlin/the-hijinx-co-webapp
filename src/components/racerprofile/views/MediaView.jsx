import React from 'react';
import RacerSectionHeading from '@/components/racerprofile/RacerSectionHeading';

/**
 * MediaView — racer photography and the single highlight video.
 *
 * Both come from the experience response only. The richer media experience
 * (event/season-linked assets, a full video library) is NOT re-introduced here:
 * it is deferred to a separate projection proposal, so this view deliberately
 * issues no browser-side queries of its own.
 */
export default function MediaView({ galleryPhotos = [], heroImage = null, portraitImage = null, highlightVideoUrl = null, racerName = '' }) {
  const photos = [heroImage, portraitImage, ...(galleryPhotos || [])]
    .filter(Boolean)
    .filter((url, index, all) => all.indexOf(url) === index);

  const isEmpty = photos.length === 0 && !highlightVideoUrl;

  if (isEmpty) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <RacerSectionHeading label="Media" title="Photography" />
        <p className="text-sm text-foreground-secondary">No media is published for this racer yet.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6">
      {highlightVideoUrl && (
        <section>
          <RacerSectionHeading label="Film" title="Highlight" />
          <video
            src={highlightVideoUrl}
            controls
            poster={heroImage || undefined}
            className="aspect-video w-full bg-black"
          >
            Your browser does not support embedded video.
          </video>
        </section>
      )}

      {photos.length > 0 && (
        <section>
          <RacerSectionHeading label="Photography" title={racerName ? racerName : 'Gallery'} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {photos.map((url, index) => (
              <div
                key={url}
                className={`overflow-hidden bg-surface-sunken ${
                  index === 0 ? 'col-span-2 aspect-[4/3]' : 'col-span-1 aspect-square'
                }`}
              >
                <img
                  src={url}
                  alt={`${racerName || 'Racer'} photograph ${index + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}