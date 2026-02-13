import React from 'react';
import { MapPin } from 'lucide-react';

export default function TrackMap({ track }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Map</h2>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {track.latitude && track.longitude ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5" />
              <span>{track.location_city}, {track.location_state}, {track.location_country}</span>
            </div>
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-600">Map integration coming soon</p>
            </div>
            <p className="text-sm text-gray-600">
              Coordinates: {track.latitude}, {track.longitude}
            </p>
          </div>
        ) : (
          <p className="text-gray-600">Location coordinates not available</p>
        )}
      </div>
    </div>
  );
}