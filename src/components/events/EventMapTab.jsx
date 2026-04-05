import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { MapPin, Navigation, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { isEventPublic } from '@/components/system/publishHelpers';

const RADIUS_MI = 150;

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function EventMapTab() {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data: allEvents = [] } = useQuery({
    queryKey: ['events-all'],
    queryFn: () => base44.entities.Event.list('event_date', 500),
    staleTime: 3 * 60 * 1000,
  });

  const { data: allTracks = [] } = useQuery({
    queryKey: ['tracks-with-coords'],
    queryFn: () => base44.entities.Track.list(),
    staleTime: 10 * 60 * 1000,
  });

  const trackMap = useMemo(
    () => Object.fromEntries(allTracks.map((t) => [t.id, t])),
    [allTracks]
  );

  const today = new Date().toISOString().split('T')[0];

  const upcomingEvents = useMemo(
    () =>
      allEvents.filter(
        (e) =>
          isEventPublic(e) &&
          e.event_date >= today &&
          ['Published', 'Live'].includes(e.status)
      ),
    [allEvents, today]
  );

  // Events that have a track with coordinates
  const mappableEvents = useMemo(
    () =>
      upcomingEvents.filter((e) => {
        const t = trackMap[e.track_id];
        return t?.latitude && t?.longitude;
      }),
    [upcomingEvents, trackMap]
  );

  // Events filtered by proximity (if location set)
  const nearbyEvents = useMemo(() => {
    if (!userLocation) return mappableEvents;
    return mappableEvents
      .map((e) => {
        const t = trackMap[e.track_id];
        const dist = haversineDistance(
          userLocation.lat,
          userLocation.lng,
          t.latitude,
          t.longitude
        );
        return { ...e, _distance: dist };
      })
      .filter((e) => e._distance <= RADIUS_MI)
      .sort((a, b) => a._distance - b._distance);
  }, [mappableEvents, userLocation, trackMap]);

  // Initialize Google Map
  useEffect(() => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.google?.maps && mapRef.current) {
        clearInterval(interval);
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

        // Init autocomplete on search input
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
      } else if (attempts > 30) {
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Update markers whenever nearby events change
  useEffect(() => {
    if (!googleMapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    nearbyEvents.forEach((event) => {
      const track = trackMap[event.track_id];
      if (!track?.latitude || !track?.longitude) return;

      const marker = new window.google.maps.Marker({
        position: { lat: track.latitude, lng: track.longitude },
        map: googleMapRef.current,
        title: event.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#0A0A0A',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        setSelectedEvent(event);
        googleMapRef.current.panTo({ lat: track.latitude, lng: track.longitude });
      });

      markersRef.current.push(marker);
    });

    // Add user location marker
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
  }, [nearbyEvents, userLocation, trackMap]);

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

  const track = selectedEvent ? trackMap[selectedEvent.track_id] : null;

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

      {locationError && (
        <p className="text-sm text-red-500">{locationError}</p>
      )}

      {userLocation && (
        <p className="text-sm text-gray-500">
          Showing events within <strong>{RADIUS_MI} miles</strong> of{' '}
          <strong>{locationLabel}</strong> — {nearbyEvents.length} found
        </p>
      )}

      {!userLocation && mappableEvents.length > 0 && (
        <p className="text-sm text-gray-400">
          {mappableEvents.length} upcoming events on map. Search a location or use your location to filter nearby.
        </p>
      )}

      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border border-gray-200" style={{ height: 480 }}>
        <div ref={mapRef} className="w-full h-full" />

        {/* Selected event popup */}
        {selectedEvent && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="font-bold text-sm leading-snug pr-6">{selectedEvent.name}</p>
            {selectedEvent.series_name && (
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mt-0.5">
                {selectedEvent.series_name}
              </p>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
              <Calendar className="w-3.5 h-3.5" />
              {selectedEvent.event_date
                ? format(parseISO(selectedEvent.event_date), 'MMM d, yyyy')
                : 'TBA'}
            </div>
            {track && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {[track.location_city, track.location_state].filter(Boolean).join(', ')}
              </div>
            )}
            {selectedEvent._distance !== undefined && (
              <p className="text-xs text-blue-600 font-medium mt-1">
                ~{Math.round(selectedEvent._distance)} miles away
              </p>
            )}
            <Link
              to={`${createPageUrl('EventProfile')}?id=${selectedEvent.id}`}
              className="mt-3 block text-center text-xs font-bold bg-[#0A0A0A] text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors"
            >
              View Event
            </Link>
          </div>
        )}
      </div>

      {/* Events list below map */}
      {nearbyEvents.length === 0 && userLocation ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No upcoming events found within {RADIUS_MI} miles. Try expanding your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {(userLocation ? nearbyEvents : mappableEvents).slice(0, 9).map((event) => {
            const t = trackMap[event.track_id];
            return (
              <Link
                key={event.id}
                to={`${createPageUrl('EventProfile')}?id=${event.id}`}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <p className="font-bold text-sm leading-snug">{event.name}</p>
                {event.series_name && (
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">
                    {event.series_name}
                  </p>
                )}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {event.event_date ? format(parseISO(event.event_date), 'MMM d, yyyy') : 'TBA'}
                </div>
                {t && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {[t.location_city, t.location_state].filter(Boolean).join(', ')}
                  </div>
                )}
                {event._distance !== undefined && (
                  <p className="text-xs text-blue-600 font-medium mt-1">
                    ~{Math.round(event._distance)} mi away
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {mappableEvents.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No events with map coordinates yet. Tracks need latitude/longitude set to appear on the map.
        </div>
      )}
    </div>
  );
}