import React, { useState, useRef } from 'react';
import { Play } from 'lucide-react';

export default function HeroMedia({
  posterUrl,
  videoUrl,
  mediaType = 'image',
  videoAspect = '16:9',
  overlayIntensity = 'medium'
}) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef(null);

  const overlayOpacity = {
    low: 'opacity-20',
    medium: 'opacity-40',
    high: 'opacity-60'
  }[overlayIntensity] || 'opacity-40';

  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsVideoPlaying(true);
    }
  };

  const handleVideoLoadedData = () => {
    setVideoLoaded(true);
  };

  const handleVideoError = () => {
    // Silently fall back to poster on video error
    setIsVideoPlaying(false);
    setVideoLoaded(false);
  };

  return (
    <div className="absolute inset-0 bg-[#232323]">
      {/* Poster Image - Always visible */}
      <img
        src={posterUrl}
        alt="Hero background"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          isVideoPlaying && videoLoaded ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Video - Lazy loaded on user interaction */}
      {mediaType === 'video' && videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            isVideoPlaying && videoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          muted
          loop
          onLoadedData={handleVideoLoadedData}
          onError={handleVideoError}
          playsInline
        />
      )}

      {/* Gradient Overlay for text contrast */}
      <div
        className={`absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60 ${overlayOpacity}`}
      />

      {/* Play Button - visible only for video media type */}
      {mediaType === 'video' && videoUrl && !isVideoPlaying && (
        <button
          onClick={handlePlayVideo}
          className="absolute bottom-8 left-8 flex items-center gap-3 group hover:opacity-80 transition-opacity z-10"
          aria-label="Play hero video"
        >
          <div className="w-12 h-12 rounded-full border-2 border-[#FFF8F5] flex items-center justify-center group-hover:bg-[#FFF8F5]/10 transition-colors">
            <Play className="w-5 h-5 text-[#FFF8F5] fill-[#FFF8F5]" />
          </div>
          <span className="text-[#FFF8F5] text-sm font-medium opacity-70">Play</span>
        </button>
      )}
    </div>
  );
}