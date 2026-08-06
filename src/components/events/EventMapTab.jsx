import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { resolveEventClassification, buildClassificationMaps } from '@/components/utils/eventClassification';
import { createPageUrl } from '@/components/utils';
import { MapPin, Navigation, Calendar, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { isEventPublic } from '@/components/system/publishHelpers';

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

function getEventCoords(event, trackMap, geocodedCoords) {
  const track = trackMap[event.track_id];
  if (track?.latitude && track?.longitude) return { lat: track.latitude, lng: track.longitude };
  return geocodedCoords[event.id] || null;
}

export default function EventMapTab({
  disciplineFilter: disciplineFilterProp,
  formatFilter: formatFilterProp,
  onDisciplineChange,
  onFormatChange,
  disciplines: disciplinesProp,
  formats: formatsProp,
}) {
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

  const { data: disciplinesFetched = [] } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => base44.entities.Discipline.list('sort_order'),
    staleTime: 5 * 60 * 1000,
    enabled: !disciplinesProp,
  });
  const disciplines = disciplinesProp ?? disciplinesFetched;

  const { data: formatsFetched = [] } = useQuery({
    queryKey: ['formats'],
    queryFn: () => base44.entities.Format.list(),
    staleTime: 5 * 60 * 1000,
    enabled: !formatsProp,
  });
  const formats = formatsProp ?? formatsFetched;

  // Use props if provided (URL-owned by parent), else internal state
  const disciplineFilter = disciplineFilterProp ?? 'all';
  const formatFilter = formatFilterProp ?? 'all';
  const setDisciplineFilter = onDisciplineChange ?? (() => {});
  const setFormatFilter = onFormatChange ?? (() => {});

  // Canonical classification maps
  const { disciplineById, disciplineByName, formatById } = useMemo(
    () => buildClassificationMaps(disciplines, formats),
    [disciplines, formats]
  );

  // Dependent format options (read-only when controlled by parent)
  const availableFormats = useMemo(() => {
    if (disciplineFilter === 'all') return formats.filter(f => f.is_active !== false);
    return formats.filter(f => f.discipline_id === disciplineFilter && f.is_active !== false);
  }, [formats, disciplineFilter]);

  const resolvedFormatFilter = formatFilter;

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

  // Pre-resolve classification for filtering
  const classificationByEventId = useMemo(() => {
    const map = {};
    for (const e of upcomingPublicEvents) {
      map[e.id] = resolveEventClassification(e, seriesMap, disciplineById, disciplineByName, formatById);
    }
    return map;
  }, [upcomingPublicEvents, seriesMap, disciplineById, disciplineByName, formatById]);

  // Events that have coordinates AND pass classification filters
  const mappableEvents = useMemo(
    () =>
      upcomingPublicEvents.filter((e) => {
        if (!getEventCoords(e, trackMap, geocodedCoords)) return false;
        const cls = classificationByEventId[e.id];
        if (disciplineFilter !== 'all' && cls?.disciplineId !== disciplineFilter) return false;
        if (resolvedFormatFilter !== 'all' && cls?.formatId !== resolvedFormatFilter) return false;
        return true;
      }),
    [upcomingPublicEvents, trackMap, geocodedCoords, classificationByEventId, disciplineFilter, resolvedFormatFilter]
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

  // Unique disciplines for legend — derived from filtered mappable events
  const activeDisciplines = useMemo(() => {
    const seen = new Map();
    mappableEvents.forEach((e) => {
      const cls = classificationByEventId[e.id];
      if (cls?.disciplineName && !seen.has(cls.disciplineName)) {
        seen.set(cls.disciplineName, cls.disciplineColor);
      }
    });
    return [...seen.entries()].map(([name, color]) => ({ name, color })).sort((a, b) => a.name.localeCompare(b.name));
  }, [mappableEvents, classificationByEventId]);

  // Initialize Google Map
  // With loading=async in the script URL, core classes (Map, Marker, etc.)
  // must be loaded via google.maps.importLibrary() before use.
  useEffect(() => {
    let cancelled = false;
    let interval;

    const init = async () => {
      // Poll until the bootstrap loader is available
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

      // With loading=async, importLibrary loads the core classes on demand
      await window.google.maps.importLibrary('maps');
      await window.google.maps.importLibrary('places');
      await window.google.maps.importLibrary('geocoding');

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

    init().catch((err) => console.error('EventMapTab init failed:', err));

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  // Update markers whenever display events, series, or geocoded coords change.
  // mapsReady is required in deps because the map initializes asynchronously
  // (via importLibrary) — without it, this effect runs once before the map
  // exists and never re-runs when it becomes ready.
  useEffect(() => {
    if (!mapsReady || !googleMapRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    displayEvents.forEach((event) => {
      const coords = getEventCoords(event, trackMap, geocodedCoords);
      if (!coords) return;
      const { disciplineColor: color } = classificationByEventId[event.id] || {};

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
  }, [mapsReady, displayEvents, userLocation, seriesMap, geocodedCoords, disciplineById, disciplineByName]);

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
  const selectedCoords = selectedEvent ? getEventCoords(selectedEvent, trackMap, geocodedCoords) : null;
  const selectedClassification = selectedEvent
    ? resolveEventClassification(selectedEvent, seriesMap, disciplineById, disciplineByName, formatById)
    : null;

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

      {/* Classification filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={disciplineFilter} onValueChange={(v) => { setDisciplineFilter(v); setFormatFilter('all'); }} disabled={!!disciplineFilterProp && !onDisciplineChange}>
          <SelectTrigger className="h-9 text-xs flex-1 min-w-[130px]">
            <SelectValue placeholder="Discipline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Disciplines</SelectItem>
            {disciplines.filter(d => d.is_active !== false).map(d => (
              <SelectItem key={d.id} value={d.id}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color_code }} />
                  {d.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={resolvedFormatFilter} onValueChange={setFormatFilter} disabled={availableFormats.length === 0}>
          <SelectTrigger className="h-9 text-xs flex-1 min-w-[120px]">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            {availableFormats.map(f => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(disciplineFilter !== 'all' || resolvedFormatFilter !== 'all') && (
          <button
            onClick={() => { setDisciplineFilter('all'); setFormatFilter('all'); }}
            className="h-8 px-3 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Discipline legend */}
      {activeDisciplines.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {activeDisciplines.map(({ name, color }) => (
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

        {selectedEvent && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
              style={{ backgroundColor: selectedClassification?.disciplineColor }}
            />
            <p className="font-bold text-sm leading-snug pr-6 mt-1">{selectedEvent.name}</p>
            {selectedEvent.series_name && (
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mt-0.5">
                {selectedEvent.series_name}
              </p>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedClassification?.disciplineName && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: selectedClassification.disciplineColor }}
                >
                  {selectedClassification.disciplineName}
                </span>
              )}
              {selectedClassification?.formatName && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {selectedClassification.formatName}
                </span>
              )}
            </div>
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
            const cls = classificationByEventId[event.id] || {};
            return (
              <Link
                key={event.id}
                to={`${createPageUrl('EventProfile')}?id=${event.id}`}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: cls.disciplineColor }} />
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
                <div className="flex flex-wrap gap-1 mt-2">
                  {cls.disciplineName && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: cls.disciplineColor }}
                    >
                      {cls.disciplineName}
                    </span>
                  )}
                  {cls.formatName && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {cls.formatName}
                    </span>
                  )}
                </div>
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