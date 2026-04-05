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

const DISCIPLINE_COLORS = {
  'Stock Car':    '#EF4444',
  'Off Road':     '#1E3A5F',
  'Dirt Oval':    '#A16207',
  'Snowmobile':   '#6366F1',
  'Dirt Bike':    '#8B5CF6',
  'Open Wheel':   '#9333EA',
  'Sports Car':   '#16A34A',
  'Touring Car':  '#0D9488',
  'Rally':        '#CA8A04',
  'Drag':         '#EC4899',
  'Motorcycle':   '#3B82F6',
  'Karting':      '#06B6D4',
  'Water':        '#0EA5E9',
  'Alternative':  '#84CC16',
};
const DEFAULT_COLOR = '#6B7280';

function getDisciplineColor(discipline) {
  return DISCIPLINE_COLORS[discipline] || DEFAULT_COLOR;
}

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

function getEventCoords(event, trackMap, geocodedCoords) {
  const track = trackMap[event.track_id];
  if (track?.latitude && track?.longitude) return { lat: track.latitude, lng: track.longitude };
  return geocodedCoords[event.id] || null;
}

export default function EventMapTab() {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const geocoderRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [geocodedCoords, setGeocodedCoords] = useState({});
  const [mapsReady, setMapsReady] = useState(false);

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

  const { data: allSeriesRaw } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    staleTime: 10 * 60 * 1000,
  });
  const allSeries = Array.isArray(allSeriesRaw) ? allSeriesRaw : [];

  const trackMap = useMemo(
    () => Object.fromEntries(allTracks.map((t) => [t.id, t])),
    [allTracks]
  );

  const seriesMap = useMemo(
    () => Object.fromEntries(allSeries.map((s) => [s.id, s])),
    [allSeries]
  );

  const today = new Date().toISOString().split('T')[0];

  const upcomingPublicEvents = useMemo(
    () =>
      allEvents.filter(
        (e) =>
          isEventPublic(e) &&
          e.event_date >= today &&
          ['Published', 'Live'].includes(e.status)
      ),
    [allEvents, today]
  );

  // Events that have coordinates (from track or geocoded)
  const mappableEvents = useMemo(
    () =>
      upcomingPublicEvents.filter(
        (e) => !!getEventCoords(e, trackMap, geocodedCoords)
      ),
    [upcomingPublicEvents, trackMap, geocodedCoords]
  );

  // Events that still need geocoding (have location_note, no track coords, not yet done)
  const eventsNeedingGeocode = useMemo(
    () =>
      upcomingPublicEvents.filter((e) => {
        const track = trackMap[e.track_id];
        const hasTrackCoords = track?.latitude && track?.longitude;
        return !hasTrackCoords && e.location_note && !geocodedCoords[e.id];
      }),
    [upcomingPublicEvents, trackMap, geocodedCoords]
  );

  // Geocode events that have a location_note but no track coords
  useEffect(() => {
    if (!mapsReady || eventsNeedingGeocode.length === 0) return;
    if (!geocoderRef.current) geocoderRef.current = new window.google.maps.Geocoder();
    eventsNeedingGeocode.forEach((event) => {
      geocoderRef.current.geocode({ address: event.location_note }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const loc = results[0].geometry.location;
          setGeocodedCoords((prev) => ({
            ...prev,
            [event.id]: { lat: loc.lat(), lng: loc.lng() },
          }));
        }
      });
    });
  }, [mapsReady, eventsNeedingGeocode.length]);

  // Events filtered by proximity when location is set
  const displayEvents = useMemo(() => {
    if (!userLocation) return mappableEvents;
    return mappableEvents
      .map((e) => {
        const coords = getEventCoords(e, trackMap, geocodedCoords);
        const dist = haversineDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
        return { ...e, _distance: dist };
      })
      .filter((e) => e._distance <= RADIUS_MI)
      .sort((a, b) => a._distance - b._distance);
  }, [mappableEvents, userLocation, trackMap, geocodedCoords]);

  // Unique disciplines for legend
  const activeDisciplines = useMemo(() => {
    const disciplines = new Set();
    mappableEvents.forEach((e) => {
      const series = seriesMap[e.series_id];
      if (series?.discipline) disciplines.add(series.discipline);
    });
    return [...disciplines].sort();
  }, [mappableEvents, seriesMap]);

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
      } else if (attempts > 30) {
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Update markers whenever display events, series, or geocoded coords change
  useEffect(() => {
    if (!googleMapRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    displayEvents.forEach((event) => {
      const coords = getEventCoords(event, trackMap, geocodedCoords);
      if (!coords) return;
      const series = seriesMap[event.series_id];
      const color = getDisciplineColor(series?.discipline);

      const marker = new window.google.maps.Marker({
        position: { lat: coords.lat, lng: coords.lng },
        map: googleMapRef.current,
        title: event.name,
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
        setSelectedEvent(event);
        googleMapRef.current.panTo({ lat: coords.lat, lng: coords.lng });
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
  }, [displayEvents, userLocation, seriesMap, geocodedCoords]);

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

  const selectedTrack = selectedEvent ? trackMap[selectedEvent.track_id] : null;
  const selectedSeries = selectedEvent ? seriesMap[selectedEvent.series_id] : null;
  const selectedCoords = selectedEvent ? getEventCoords(selectedEvent, trackMap, geocodedCoords) : null;

  const listEvents = userLocation ? displayEvents : mappableEvents;

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
          Showing events within <strong>{RADIUS_MI} miles</strong> of{' '}
          <strong>{locationLabel}</strong> — {displayEvents.length} found
        </p>
      ) : mappableEvents.length > 0 ? (
        <p className="text-sm text-gray-400">
          {mappableEvents.length} upcoming events on map. Search a location or use your location to filter nearby.
        </p>
      ) : null}

      {/* Discipline legend */}
      {activeDisciplines.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {activeDisciplines.map((discipline) => (
            <div key={discipline} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getDisciplineColor(discipline) }}
              />
              <span className="text-xs text-gray-600 font-medium">{discipline}</span>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border border-gray-200" style={{ height: 480 }}>
        <div ref={mapRef} className="w-full h-full" />

        {selectedEvent && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Discipline color bar */}
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
              style={{ backgroundColor: getDisciplineColor(selectedSeries?.discipline) }}
            />
            <p className="font-bold text-sm leading-snug pr-6 mt-1">{selectedEvent.name}</p>
            {selectedEvent.series_name && (
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mt-0.5">
                {selectedEvent.series_name}
              </p>
            )}
            {selectedSeries?.discipline && (
              <span
                className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: getDisciplineColor(selectedSeries.discipline) }}
              >
                {selectedSeries.discipline}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
              <Calendar className="w-3.5 h-3.5" />
              {selectedEvent.event_date
                ? format(parseISO(selectedEvent.event_date), 'MMM d, yyyy')
                : 'TBA'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {selectedTrack
                ? [selectedTrack.location_city, selectedTrack.location_state].filter(Boolean).join(', ')
                : selectedEvent.location_note || 'TBA'}
            </div>
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

      {/* Events list */}
      {listEvents.length === 0 && userLocation ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No upcoming events found within {RADIUS_MI} miles. Try expanding your search.
        </div>
      ) : listEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {listEvents.slice(0, 12).map((event) => {
            const t = trackMap[event.track_id];
            const series = seriesMap[event.series_id];
            const color = getDisciplineColor(series?.discipline);
            return (
              <Link
                key={event.id}
                to={`${createPageUrl('EventProfile')}?id=${event.id}`}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />
                <p className="font-bold text-sm leading-snug mt-1">{event.name}</p>
                {event.series_name && (
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">
                    {event.series_name}
                  </p>
                )}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {event.event_date ? format(parseISO(event.event_date), 'MMM d, yyyy') : 'TBA'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {t
                    ? [t.location_city, t.location_state].filter(Boolean).join(', ')
                    : event.location_note || 'TBA'}
                </div>
                {event._distance !== undefined && (
                  <p className="text-xs text-blue-600 font-medium mt-1">
                    ~{Math.round(event._distance)} mi away
                  </p>
                )}
                {series?.discipline && (
                  <span
                    className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: color }}
                  >
                    {series.discipline}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400 text-sm">
          No events with location data found. Events need a linked track with coordinates or a location note to appear on the map.
        </div>
      )}
    </div>
  );
}