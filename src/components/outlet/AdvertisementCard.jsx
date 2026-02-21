import React from 'react';

export default function AdvertisementCard({ ad }) {
  const getCardHeight = () => {
    const ratio = ad.aspect_ratio || '1:1';
    if (ratio === '4:5') return 'h-48';
    return 'h-40';
  };

  return (
    <a
      href={ad.call_to_action_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block ${getCardHeight()} overflow-hidden rounded-lg hover:opacity-80 transition-opacity`}
    >
      <img 
        src={ad.cover_image_url} 
        alt={ad.title}
        className="w-full h-full object-cover"
      />
    </a>
  );
}