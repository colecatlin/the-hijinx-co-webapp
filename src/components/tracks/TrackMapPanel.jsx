import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Coffee, Hotel, Fuel, Utensils, ParkingCircle, Loader2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

const AMENITY_TYPES = [
  { key: 'restaurant', label: 'Restaurants', icon: Utensils, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'lodging', label: 'Hotels', icon: Hotel, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'gas_station', label: 'Gas Stations', icon: Fuel, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { key: 'cafe', label: 'Cafes', icon: Coffee, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'parking', label: 'Parking', icon: ParkingCircle, color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

function waitForGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google.maps);
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      if (window.google?.maps) {
        clearInterval(poll);
        resolve(window.google.maps);
      } else if (attempts > 50) {
        clearInterval(poll);
        reject(new Error('Google Maps did not load in time.'));
      }
    }, 200);
  });
}

async function ensureGoogleMaps() {
  if (window.google?.maps) return window.google.maps;
  // Try to load via the backend-secured script URL
  try {
    const res = await base44.functions.invoke('initGooglePlaces');
    const scriptUrl = res.data?.scriptUrl;
    if (scriptUrl && !document.getElementById('gm-script')) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'gm-script';
        script.src = scriptUrl;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  } catch (_) {}
  return waitForGoogleMaps();
}

export default function TrackMapPanel({ track }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const [activeAmenity, setActiveAmenity] = useState('restaurant');
  const [amenities, setAmenities] = useState([]);
  const [loadingAmenities, setLoadingAmenities] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [trackCoords, setTrackCoords] = useState(null);

  const address = [track.name, track.location_city, track.location_state, track.location_country]
    .filter(Boolean).join(', ');

  const locationLabel = [track.location_city, track.location_state, track.location_country]
    .filter(Boolean).join(', ');

  // Initialize map
  useEffect(() => {
    let cancelled = false;

    ensureGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapRef.current) return;

        const geocoder = new maps.Geocoder();
        geocoder.geocode({ address }, (results, status) => {
          if (cancelled) return;
          if (status !== 'OK' || !results?.[0]) {
            setMapError(`Could not locate "${track.name}" on the map.`);
            return;
          }

          const loc = results[0].geometry.location;
          const coords = { lat: loc.lat(), lng: loc.lng() };
          setTrackCoords(coords);

          const map = new maps.Map(mapRef.current, {
            center: coords,
            zoom: 14,
            mapTypeId: 'hybrid',
            mapTypeControl: true,
            mapTypeControlOptions: {
              style: maps.MapTypeControlStyle.DROPDOWN_MENU,
              mapTypeIds: ['roadmap', 'satellite', 'hybrid'],
            },
            streetViewControl: false,
            fullscreenControl: true,
          });
          mapInstanceRef.current = map;

          const marker = new maps.Marker({
            position: coords,
            map,
            title: track.name,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#00FFDA',
              fillOpacity: 1,
              strokeColor: '#232323',
              strokeWeight: 2,
            },
          });

          const infoWindow = new maps.InfoWindow({
            content: `<div style="font-family:sans-serif;padding:4px 2px;">
              <strong style="font-size:13px">${track.name}</strong><br/>
              <span style="color:#666;font-size:12px">${locationLabel}</span>
            </div>`,
          });
          marker.addListener('click', () => infoWindow.open(map, marker));
          infoWindow.open(map, marker);

          setMapReady(true);
        });
      })
      .catch((err) => {
        if (!cancelled) setMapError('Failed to load Google Maps.');
      });

    return () => { cancelled = true; };
  }, []);

  // Load nearby amenities when map is ready or type changes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !trackCoords) return;

    setLoadingAmenities(true);
    setAmenities([]);

    const maps = window.google.maps;
    const service = new maps.places.PlacesService(mapInstanceRef.current);

    service.nearbySearch(
      { location: trackCoords, radius: 5000, type: activeAmenity },
      (results, status) => {
        setLoadingAmenities(false);
        if (status === maps.places.PlacesServiceStatus.OK && results) {
          setAmenities(results.slice(0, 8));
        } else {
          setAmenities([]);
        }
      }
    );
  }, [mapReady, activeAmenity, trackCoords]);

  const amenityConfig = AMENITY_TYPES.find(a => a.key === activeAmenity);

  return (
    <div className="space-y-6">
      {/* Interactive map */}
      <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700 truncate">{address}</span>
        </div>
        {mapError ? (
          <div className="h-[380px] flex items-center justify-center bg-gray-50 text-gray-500 text-sm px-6 text-center">
            {mapError}
          </div>
        ) : (
          <div className="relative">
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading map...
                </div>
              </div>
            )}
            <div ref={mapRef} className="w-full h-[380px]" />
          </div>
        )}
      </div>

      {/* Track configuration details */}
      {[track.track_type, track.surface_type, track.length, track.banking].some(Boolean) && (
        <div>
          <h3 className="text-sm font-bold text-[#232323] uppercase tracking-wide mb-3">Circuit Configuration</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Type', value: track.track_type },
              { label: 'Surface', value: track.surface_type },
              { label: 'Length', value: track.length ? `${track.length} mi` : null },
              { label: 'Banking', value: track.banking },
            ].filter(i => i.value).map(item => (
              <div key={item.label} className="border border-gray-200 rounded-lg p-3 text-center bg-white">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">{item.label}</div>
                <div className="font-bold text-[#232323] text-sm">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Amenities */}
      <div>
        <h3 className="text-sm font-bold text-[#232323] uppercase tracking-wide mb-3">Local Amenities</h3>

        {/* Type filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {AMENITY_TYPES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveAmenity(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                activeAmenity === key
                  ? 'bg-[#232323] text-white border-[#232323]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Results */}
        {(!mapReady && !mapError) && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Waiting for map...
          </div>
        )}

        {mapReady && loadingAmenities && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Finding nearby {amenityConfig?.label.toLowerCase()}...
          </div>
        )}

        {mapReady && !loadingAmenities && amenities.length === 0 && (
          <p className="text-sm text-gray-400 py-4">
            No nearby {amenityConfig?.label.toLowerCase()} found within 5 km.
          </p>
        )}

        {mapReady && !loadingAmenities && amenities.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {amenities.map((place) => {
              const AmenityIcon = amenityConfig?.icon;
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;
              return (
                <a
                  key={place.place_id}
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-[#232323] hover:shadow-sm transition-all group"
                >
                  {AmenityIcon && (
                    <div className={`mt-0.5 p-1.5 rounded-md border flex-shrink-0 ${amenityConfig?.color}`}>
                      <AmenityIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#232323] group-hover:underline truncate">
                      {place.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {place.vicinity}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {place.rating && (
                        <Badge className="text-[10px] bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0 h-auto">
                          ★ {place.rating}{place.user_ratings_total ? ` (${place.user_ratings_total})` : ''}
                        </Badge>
                      )}
                      {place.opening_hours?.open_now !== undefined && (
                        <Badge className={`text-[10px] px-1.5 py-0 h-auto border ${
                          place.opening_hours.open_now
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {place.opening_hours.open_now ? 'Open' : 'Closed'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#232323] flex-shrink-0 mt-0.5 transition-colors" />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}