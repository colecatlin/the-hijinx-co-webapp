import React, { useState } from 'react';
import { Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TrackGallery({ media = {} }) {
  const { gallery_images = [], map_image_url = null } = media;
  const allImages = [...(map_image_url ? [map_image_url] : []), ...gallery_images];
  const [lightbox, setLightbox] = useState(null);

  if (!allImages.length) {
    return (
      <div className="text-center py-12 border border-dashed border-divider rounded-lg">
        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-foreground-quiet" />
        <p className="text-sm text-foreground-quiet">No gallery images yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {allImages.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setLightbox(idx)}
            className="aspect-square rounded-lg overflow-hidden border border-divider hover:border-motion transition-colors group"
          >
            <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          </button>
        ))}
      </div>

      {lightbox !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'hsl(0 0% 0% / 0.9)' }} onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setLightbox(null)}>
            <X className="w-6 h-6" />
          </button>
          {lightbox > 0 && (
            <button className="absolute left-4 text-white p-2" onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }}>
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {lightbox < allImages.length - 1 && (
            <button className="absolute right-4 text-white p-2" onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }}>
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          <img src={allImages[lightbox]} alt="Gallery" className="max-w-[90vw] max-h-[85vh] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}