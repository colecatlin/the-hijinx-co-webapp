import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, X, Flag, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildProfileUrl } from '@/components/utils/routingContract';

const RADIUS_MI = 150;

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTrackUrl(track) {
  const slug = track.canonical_slug || track.slug;
  if (slug) return buildProfileUrl('Track', slug);
  return `/TrackProfile?id=${track.id}`;
}

function trackColor(track) {
  // Use track_type to pick a pin color so the map has visual variety
  const palette = {
    'Oval': '#6366F1',
    'Road Course': '#10B981',
    'Street Circuit': '#F59E0B',
    'Short Track': '#EC4899',
    'Speedway': '#8B5CF6',
    'Off-Road': '#F97316',
    'Dirt Track': '#A16207',
    'Other': '#20ACAC',
  };
  return palette[track.track_type] || '#20ACAC';
}

export default function TrackMapTab({
  searchQuery = '',
  trackTypeFilter = 'all',
}) {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [mapsReady, setMapsReady] = useState(false);

  const { data: allTracks = [], isLoading } = useQuery({
    queryKey: ['tracks-with-coords'],
    queryFn: () => base44.entities.Track.list(),
    staleTime: 10 * 60 * 1000,
  });

  // Only tracks that have coordinates and are visible
  const mappableTracks = useMemo(
    () =>
      allTracks.filter(
        (t) =>
          t.latitude &&
          t.longitude &&
          t.visibility_status === 'live' &&
          !t.is_archived
      ),
    [allTracks]
  );

  // Apply search + track-type filter
  const filteredTracks = useMemo(() => {
    return mappableTracks.filter((t) => {
      if (trackTypeFilter !== 'all' && t.track_type !== trackTypeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = [t.name, t.location_city, t.location_state, t.location_country]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [mappableTracks, trackTypeFilter, searchQuery]);

  // Proximity-filtered list when location is active
  const displayTracks = useMemo(() => {
    if (!userLocation) return filteredTracks;
    return filteredTracks
      .map((t) => ({
        ...t,
        _distance: haversineDistance(userLocation.lat, userLocation.lng, t.latitude, t.longitude),
      }))
      .filter((t) => t._distance <= RADIUS_MI)
      .sort((a, b) => a._distance - b._distance);
  }, [filteredTracks, userLocation]);

  // Unique track types for legend
  const activeTrackTypes = useMemo(() => {
    const seen = new Map();
    filteredTracks.forEach((t) => {
      if (t.track_type && !seen.has(t.track_type)) {
        seen.set(t.track_type, trackColor(t));
      }
    });
    return [...seen.entries()].map(([name, color]) => ({ name, color })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredTracks]);

  // Initialize Google Map
  useEffect(() => {
    let cancelled = false;
    let interval;

    const init = async () => {
      let attempts = 0;
      await new Promise((resolve, reject) => {
        interval = setInterval(() => {
          attempts++;
          if (window.google?.maps) {
            clearInterval(interval);
            resolve();
          } else if (attempts > 50) {
            clearInterval(interval);
            reject(new Error('Google Maps script not loaded'));
          }
        }, 200);
      });

      if (cancelled || !mapRef.current) return;

      await window.google.maps.importLibrary('maps');
      await window.google.maps.importLibrary('places');

      if (cancelled || !mapRef.current) return;

      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 39.5, lng: -98.35 },
        zoom: 4,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      });

      if (searchInputRef.current) {
        const ac = new window.google.maps.places.Autocomplete(searchInputRef.current, {
          types: ['geocode'],
        });
        autocompleteRef.current = ac;
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place.geometry) return;
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setUserLocation({ lat, lng });
          setLocationLabel(place.formatted_address || place.name || '');
          setLocationError('');
          googleMapRef.current.setCenter({ lat, lng });
          googleMapRef.current.setZoom(8);
        });
      }

      setMapsReady(true);
    };

    init().catch((err) => console.error('TrackMapTab init failed:', err));

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  // Update markers whenever display tracks change
  useEffect(() => {
    if (!mapsReady || !googleMapRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    displayTracks.forEach((track) => {
      const color = trackColor(track);
      const marker = new window.google.maps.Marker({
        position: { lat: track.latitude, lng: track.longitude },
        map: googleMapRef.current,
        title: track.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        setSelectedTrack(track);
        googleMapRef.current.panTo({ lat: track.latitude, lng: track.longitude });
      });

      markersRef.current.push(marker);
    });

    if (userLocation) {
      const userMarker = new window.google.maps.Marker({
        position: userLocation,
        map: googleMapRef.current,
        title: 'Your Location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#2563EB',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        zIndex: 999,
      });
      markersRef.current.push(userMarker);
    }
  }, [mapsReady, displayTracks, userLocation]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        setLocationLabel('My Location');
        setLocating(false);
        if (googleMapRef.current) {
          googleMapRef.current.setCenter({ lat, lng });
          googleMapRef.current.setZoom(8);
        }
      },
      () => {
        setLocationError('Unable to get your location. Please allow location access.');
        setLocating(false);
      }
    );
  };

  const clearLocation = () => {
    setUserLocation(null);
    setLocationLabel('');
    if (searchInputRef.current) searchInputRef.current.value = '';
    if (googleMapRef.current) {
      googleMapRef.current.setCenter({ lat: 39.5, lng: -98.35 });
      googleMapRef.current.setZoom(4);
    }
  };

  const listTracks = userLocation ? displayTracks : filteredTracks;

  return (
    <div className="space-y-4">
      {/* Location controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search a city or address..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <Button
          onClick={handleUseMyLocation}
          disabled={locating}
          variant="outline"
          className="flex items-center gap-2 shrink-0"
        >
          <Navigation className="w-4 h-4" />
          {locating ? 'Locating...' : 'Use My Location'}
        </Button>
        {userLocation && (
          <Button variant="ghost" size="icon" onClick={clearLocation} className="shrink-0">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {locationError && <p className="text-sm text-red-500">{locationError}</p>}

      {userLocation ? (
        <p className="text-sm text-gray-500">
          Showing tracks within <strong>{RADIUS_MI} miles</strong> of{' '}
          <strong>{locationLabel}</strong> — {displayTracks.length} found
        </p>
      ) : filteredTracks.length > 0 ? (
        <p className="text-sm text-gray-400">
          {filteredTracks.length} tracks on map. Search a location or use your location to filter nearby.
        </p>
      ) : null}

      {/* Track type legend */}
      {activeTrackTypes.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {activeTrackTypes.map(({ name, color }) => (
            <div key={name} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-600 font-medium">{name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border border-gray-200 h-72 sm:h-96 md:h-[480px]">
        <div ref={mapRef} className="w-full h-full" />

        {selectedTrack && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
            <button
              onClick={() => setSelectedTrack(null)}
              className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
              style={{ backgroundColor: trackColor(selectedTrack) }}
            />
            <p className="font-bold text-sm leading-snug pr-6 mt-1">{selectedTrack.name}</p>
            {selectedTrack.track_type && (
              <span
                className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-white mt-1"
                style={{ backgroundColor: trackColor(selectedTrack) }}
              >
                {selectedTrack.track_type}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
              <MapPin className="w-3.5 h-3.5" />
              {[selectedTrack.location_city, selectedTrack.location_state, selectedTrack.location_country]
                .filter(Boolean)
                .join(', ')}
            </div>
            {selectedTrack.length && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                <Layers className="w-3.5 h-3.5" />
                {selectedTrack.length} mile{selectedTrack.length !== 1 ? 's' : ''}
              </div>
            )}
            {selectedTrack._distance !== undefined && (
              <p className="text-xs text-blue-600 font-medium mt-1">
                ~{Math.round(selectedTrack._distance)} miles away
              </p>
            )}
            <Link
              to={getTrackUrl(selectedTrack)}
              className="mt-3 block text-center text-xs font-bold bg-[#0A0A0A] text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors"
            >
              View Track
            </Link>
          </div>
        )}
      </div>

      {/* Tracks list */}
      {listTracks.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {userLocation
            ? `No tracks found within ${RADIUS_MI} miles. Try expanding your search.`
            : 'No tracks with location data found. Tracks need coordinates to appear on the map.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {listTracks.slice(0, 12).map((track) => (
            <Link
              key={track.id}
              to={getTrackUrl(track)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: trackColor(track) }} />
              <p className="font-bold text-sm leading-snug mt-1">{track.name}</p>
              {track.track_type && (
                <span
                  className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-white mt-1"
                  style={{ backgroundColor: trackColor(track) }}
                >
                  {track.track_type}
                </span>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                <MapPin className="w-3.5 h-3.5" />
                {[track.location_city, track.location_state].filter(Boolean).join(', ')}
              </div>
              {track._distance !== undefined && (
                <p className="text-xs text-blue-600 font-medium mt-1">
                  ~{Math.round(track._distance)} mi away
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}